// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { revalidatePath } from "next/cache";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// export async function saveResume(content) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     const resume = await db.resume.upsert({
//       where: {
//         userId: user.id,
//       },
//       update: {
//         content,
//       },
//       create: {
//         userId: user.id,
//         content,
//       },
//     });

//     revalidatePath("/resume");
//     return resume;
//   } catch (error) {
//     console.error("Error saving resume:", error);
//     throw new Error("Failed to save resume");
//   }
// }

// export async function getResume() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   return await db.resume.findUnique({
//     where: {
//       userId: user.id,
//     },
//   });
// }

// export async function improveWithAI({ current, type }) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//     include: {
//       industryInsight: true,
//     },
//   });

//   if (!user) throw new Error("User not found");

//   const prompt = `
//     As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
//     Make it more impactful, quantifiable, and aligned with industry standards.
//     Current content: "${current}"

//     Requirements:
//     1. Use action verbs
//     2. Include metrics and results where possible
//     3. Highlight relevant technical skills
//     4. Keep it concise but detailed
//     5. Focus on achievements over responsibilities
//     6. Use industry-specific keywords
    
//     Format the response as a single paragraph without any additional text or explanations.
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = result.response;
//     const improvedContent = response.text().trim();
//     return improvedContent;
//   } catch (error) {
//     console.error("Error improving content:", error);
//     throw new Error("Failed to improve content");
//   }
// }

// // "use server";

// // // TEMP DEV MODE — no database, no Clerk authentication
// // // All resume functions return mock data so the UI works.

// // export async function saveResume(content) {
// //   console.log("TEMP saveResume called with:", content);

// //   // Pretend resume was saved
// //   return {
// //     id: "temp-resume-id",
// //     userId: "devUser",
// //     content,
// //     createdAt: new Date(),
// //     updatedAt: new Date(),
// //   };
// // }

// // export async function getResume() {
// //   console.log("TEMP getResume called");

// //   // Pretend we found a resume
// //   return {
// //     id: "temp-resume-id",
// //     userId: "devUser",
// //     content: "This is a placeholder resume in development mode.",
// //     createdAt: new Date(),
// //     updatedAt: new Date(),
// //   };
// // }

// // export async function improveWithAI({ current, type }) {
// //   console.log("TEMP improveWithAI called:", { current, type });

// //   // Return a mock AI improvement
// //   return `Improved (${type}):
// //   Demonstrated strong ${type} capabilities by enhancing content quality and
// //   delivering consistent improvements throughout development.`;
// // }


"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// ✅ Initialize Gemini with correct model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Helper function to get model
const getModel = () => {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", // ✅ Active model
  });
};

// ✅ Safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// ✅ Generation config
const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 2048,
};

export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const resume = await db.resume.upsert({
      where: {
        userId: user.id,
      },
      update: {
        content,
      },
      create: {
        userId: user.id,
        content,
      },
    });

    revalidatePath("/resume");
    console.log("✅ Resume saved successfully");
    return resume;

  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  return await db.resume.findUnique({
    where: {
      userId: user.id,
    },
  });
}

export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // ✅ Enhanced prompt with better context
  const industryContext = user.industryInsight
    ? `\nKey skills in ${user.industry}: ${user.industryInsight.topSkills?.join(", ")}`
    : "";

  const prompt = `
As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
Make it more impactful, quantifiable, and aligned with industry standards.

Current content: "${current}"
${industryContext}

Requirements:
1. Use strong action verbs (e.g., Led, Architected, Optimized, Delivered)
2. Include metrics and quantifiable results where possible
3. Highlight relevant technical skills and technologies
4. Keep it concise but detailed (2-3 sentences)
5. Focus on achievements and impact over responsibilities
6. Use industry-specific keywords that would pass ATS systems
7. Demonstrate leadership, innovation, or problem-solving

Format the response as a single paragraph without any additional text, explanations, or preamble.
Start directly with the improved content.
`;

  try {
    const model = getModel();
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig,
    });

    const response = result.response;

    // ✅ Check for blocks
    if (response.promptFeedback?.blockReason) {
      console.error("Prompt blocked:", response.promptFeedback.blockReason);
      throw new Error("Content generation was blocked. Please try rephrasing.");
    }

    const improvedContent = response.text().trim();
    
    if (!improvedContent) {
      throw new Error("Empty response from AI");
    }

    console.log(`✅ ${type} improved with AI`);
    return improvedContent;

  } catch (error) {
    console.error("Error improving content:", error);
    
    // ✅ Handle rate limits gracefully
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn("⚠️ Rate limit hit - returning enhanced version");
      return enhanceContentManually(current, type);
    }
    
    if (error.message?.includes("blocked")) {
      throw new Error("Content was blocked. Please try different wording.");
    }
    
    throw new Error("Failed to improve content. Please try again.");
  }
}

// ✅ Fallback function for rate limits
function enhanceContentManually(current, type) {
  // Simple enhancement when AI is unavailable
  const actionVerbs = ["Led", "Developed", "Implemented", "Optimized", "Architected", "Delivered"];
  const randomVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
  
  return `${randomVerb} ${current.toLowerCase()}. Achieved measurable improvements through strategic implementation and cross-functional collaboration.`;
}

// ✅ NEW: Batch improve multiple sections at once
export async function improveMultipleSections(sections) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  try {
    const improvements = [];

    // Improve each section one by one
    for (const section of sections) {
      const improved = await improveWithAI({
        current: section.content,
        type: section.type,
      });
      
      improvements.push({
        id: section.id,
        improved,
      });
    }

    return improvements;

  } catch (error) {
    console.error("Error batch improving:", error);
    throw new Error("Failed to improve sections");
  }
}

// ✅ NEW: Generate resume summary based on user profile
export async function generateResumeSummary() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
Write a compelling professional summary for a ${user.industry} professional with ${user.experience || "entry-level"} experience.

Skills: ${user.skills?.join(", ") || "General technical skills"}
Industry: ${user.industry}
Bio: ${user.bio || "N/A"}

Create a 3-4 sentence professional summary that:
1. Highlights core competencies and expertise
2. Mentions years of experience
3. Shows career achievements or impact
4. Ends with career goals or value proposition

Write in first person without using "I" or "my". Be confident and achievement-focused.
`;

  try {
    const model = getModel();
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig,
    });

    const summary = result.response.text().trim();
    console.log("✅ Resume summary generated");
    return summary;

  } catch (error) {
    console.error("Error generating summary:", error);
    
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      // Return generic summary as fallback
      return `Experienced ${user.industry} professional with ${user.experience || "proven"} expertise. Skilled in ${user.skills?.slice(0, 3).join(", ") || "various technologies"}. Passionate about delivering high-quality solutions and driving business impact.`;
    }
    
    throw new Error("Failed to generate summary");
  }
}