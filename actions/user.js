// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { revalidatePath } from "next/cache";
// import { generateAIInsights } from "./dashboard";
// import { err } from "inngest/types";

// import { GoogleGenAI } from "@google/genai";

// // The client gets the API key from the environment variable `GEMINI_API_KEY`.
// const ai = new GoogleGenAI({});

// async function main() {
//   const response = await ai.models.generateContent({
//     model: "gemini-2.5-flash",
//     contents: "Explain how AI works in a few words",
//   });
//   console.log(response.text);
// }

// main();

// export async function updateUser(data) {
//   const { userId } = await auth();

//   if (!userId) throw new Error("Unauthorized");


//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     // Start a transaction to handle both operations
//     const result = await db.$transaction(
//       async (tx) => {
//         // First check if industry exists
//         let industryInsight = await tx.industryInsight.findUnique({
//           where: {
//             industry: data.industry,
//           },
//         });

//         // If industry doesn't exist, create it with default values
//         if (!industryInsight) {
//           const insights = await generateAIInsights(data.industry);

//           industryInsight = await db.industryInsight.create({
//             data: {
//               industry: data.industry,
//               ...insights,
//               nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//             },
//           });
//         }

//         // Now update the user
//         const updatedUser = await tx.user.update({
//           where: {
//             id: user.id,
//           },
//           data: {
//             industry: data.industry,
//             experience: data.experience,
//             bio: data.bio,
//             skills: data.skills,
//           },
//         });

//         return { updatedUser, industryInsight };
//       },
//       {
//         timeout: 10000, // default: 5000
//       }
//     );

//     revalidatePath("/");
//     return result.user;
//   } catch (error) {
//     console.error("Error updating user and industry:", error.message);
//     throw new Error("Failed to update profile" + error.message);
//   }
// }

// export async function getUserOnboardingStatus() {
//   const { userId } = await auth();

//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     const user = await db.user.findUnique({
//       where: {
//         clerkUserId: userId,
//       },
//       select: {
//         industry: true,
//       },
//     });

//     return {
//       isOnboarded: !!user?.industry,
//     };
//   } catch (error) {
//     console.error("Error checking onboarding status:", error);
//     throw new Error("Failed to check onboarding status");
//   }
// }

// // "use server";

// // import { revalidatePath } from "next/cache";

// // // TEMP: disable AI and Clerk logic too
// // export async function updateUser(data) {
// //   console.log("TEMP updateUser called with:", data);

// //   // Do nothing but pretend success
// //   return {
// //     success: true,
// //     message: "User updated in temporary dev mode.",
// //   };
// // }

// // export async function getUserOnboardingStatus() {
// //   // Always return true for onboarding
// //   return {
// //     isOnboarded: true,
// //   };
// // }

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

// -----------------------------------------------------
// UPDATE USER PROFILE
// -----------------------------------------------------
export async function updateUser(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const existingUser = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!existingUser) throw new Error("User not found");

  try {
    // ✅ STEP 1: Check if industry insight exists BEFORE transaction
    let industryInsight = await db.industryInsight.findUnique({
      where: { industry: data.industry },
    });

    // ✅ STEP 2: Generate AI insights OUTSIDE transaction if needed
    let newInsightsData = null;
    if (!industryInsight) {
      console.log(`Generating AI insights for: ${data.industry}`);
      newInsightsData = await generateAIInsights(data.industry);
    }

    // ✅ STEP 3: Fast DB transaction with pre-generated data
    const result = await db.$transaction(
      async (tx) => {
        // Create industry insight if we have new data
        if (newInsightsData) {
          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              ...newInsightsData,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Update user
        const updatedUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills ?? [], // ensure array
          },
        });

        return { updatedUser, industryInsight };
      },
      {
        maxWait: 5000, // Wait up to 5s for a transaction slot
        timeout: 10000, // Transaction can run up to 10s
      }
    );

    revalidatePath("/");

    console.log("✅ User profile updated successfully");
    return result.updatedUser;

  } catch (error) {
    console.error("Error updating user:", error);
    
    // Better error handling
    if (error.code === 'P2028') {
      throw new Error("Database operation timed out. Please try again.");
    }
    
    throw new Error("Failed to update profile");
  }
}

// -----------------------------------------------------
// CHECK ONBOARDING STATUS
// -----------------------------------------------------
export async function getUserOnboardingStatus() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) {
    return { isOnboarded: false };
  }

  return {
    isOnboarded: !!user.industry,
  };
}