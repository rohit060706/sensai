// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// export async function generateCoverLetter(data) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   const prompt = `
//     Write a professional cover letter for a ${data.jobTitle} position at ${
//     data.companyName
//   }.

//     About the candidate:
//     - Industry: ${user.industry}
//     - Years of Experience: ${user.experience}
//     - Skills: ${user.skills?.join(", ")}
//     - Professional Background: ${user.bio}

//     Job Description:
//     ${data.jobDescription}

//     Requirements:
//     1. Use a professional, enthusiastic tone
//     2. Highlight relevant skills and experience
//     3. Show understanding of the company's needs
//     4. Keep it concise (max 400 words)
//     5. Use proper business letter formatting in markdown
//     6. Include specific examples of achievements
//     7. Relate candidate's background to job requirements

//     Format the letter in markdown.
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const content = result.response.text().trim();

//     const coverLetter = await db.coverLetter.create({
//       data: {
//         content,
//         jobDescription: data.jobDescription,
//         companyName: data.companyName,
//         jobTitle: data.jobTitle,
//         status: "completed",
//         userId: user.id,
//       },
//     });

//     return coverLetter;
//   } catch (error) {
//     console.error("Error generating cover letter:", error.message);
//     throw new Error("Failed to generate cover letter");
//   }
// }

// export async function getCoverLetters() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   return await db.coverLetter.findMany({
//     where: {
//       userId: user.id,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// }

// export async function getCoverLetter(id) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   return await db.coverLetter.findUnique({
//     where: {
//       id,
//       userId: user.id,
//     },
//   });
// }

// export async function deleteCoverLetter(id) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   return await db.coverLetter.delete({
//     where: {
//       id,
//       userId: user.id,
//     },
//   });
// }


// // "use server";

// // // TEMP DEV MODE — no Clerk, no DB, no Prisma, no real Gemini calls

// // export async function generateCoverLetter(data) {
// //   console.log("TEMP generateCoverLetter called with:", data);

// //   const mockContent = `
// // # Cover Letter for ${data.jobTitle}

// // Dear Hiring Manager,

// // I am excited to apply for the position of **${data.jobTitle}** at **${data.companyName}**.
// // With strong motivation and foundational skills, I am confident in my ability
// // to contribute effectively to your organization.

// // ${
// //   data.jobDescription
// //     ? "Based on the job description provided, I am enthusiastic about this opportunity and eager to grow within the role."
// //     : ""
// // }

// // Thank you for considering my application.

// // Sincerely,  
// // **Dev Mode Candidate**
// // `;

// //   return {
// //     id: "dev-cover-letter-1",
// //     content: mockContent,
// //     companyName: data.companyName,
// //     jobTitle: data.jobTitle,
// //     jobDescription: data.jobDescription ?? "",
// //     status: "completed",
// //     createdAt: new Date(),
// //   };
// // }

// // export async function getCoverLetters() {
// //   console.log("TEMP getCoverLetters called");

// //   return [
// //     {
// //       id: "dev-cover-letter-1",
// //       content: "This is a mock cover letter stored in dev mode.",
// //       companyName: "Mock Company",
// //       jobTitle: "Mock Title",
// //       status: "completed",
// //       createdAt: new Date(),
// //     },
// //   ];
// // }

// // export async function getCoverLetter(id) {
// //   console.log("TEMP getCoverLetter called with id:", id);

// //   return {
// //     id,
// //     content: "This is a mock full cover letter in development mode.",
// //     companyName: "Mock Company",
// //     jobTitle: "Software Developer",
// //     status: "completed",
// //     createdAt: new Date(),
// //   };
// // }

// // export async function deleteCoverLetter(id) {
// //   console.log("TEMP deleteCoverLetter called with id:", id);

// //   return {
// //     success: true,
// //     deletedId: id,
// //   };
// // }

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

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

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true, // ✅ Include industry insights for better context
    },
  });

  if (!user) throw new Error("User not found");

  // ✅ Enhanced prompt with industry context
  const industryKeywords = user.industryInsight?.topSkills?.join(", ") || "";

  const prompt = `
Write a professional, compelling cover letter for a ${data.jobTitle} position at ${data.companyName}.

About the candidate:
- Industry: ${user.industry}
- Years of Experience: ${user.experience || "Entry-level"}
- Core Skills: ${user.skills?.join(", ") || "General skills"}
- Professional Background: ${user.bio || "Motivated professional"}
${industryKeywords ? `- Industry-relevant skills: ${industryKeywords}` : ""}

Job Description:
${data.jobDescription || "No job description provided"}

Requirements:
1. Use a professional, enthusiastic, and confident tone
2. Highlight 2-3 specific skills that match the job requirements
3. Include concrete examples of achievements or experience
4. Show genuine interest in the company and role
5. Keep it concise (300-400 words maximum)
6. Use proper business letter formatting in markdown
7. Address how the candidate's background aligns with the role
8. End with a strong call to action

Structure:
- Opening paragraph: Express interest and mention the position
- Body paragraphs (2-3): Highlight relevant experience, skills, and achievements
- Closing paragraph: Express enthusiasm and request an interview

Format the letter in markdown with proper sections.
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
      throw new Error("Content generation was blocked. Please try again with different wording.");
    }

    const content = response.text().trim();

    if (!content) {
      throw new Error("Empty response from AI");
    }

    // ✅ Save to database
    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription || "",
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    console.log(`✅ Cover letter generated for ${data.jobTitle} at ${data.companyName}`);
    return coverLetter;

  } catch (error) {
    console.error("Error generating cover letter:", error.message);

    // ✅ Handle rate limits with fallback
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn("⚠️ Rate limit hit - generating simple cover letter");

      const fallbackContent = generateFallbackCoverLetter(user, data);

      const coverLetter = await db.coverLetter.create({
        data: {
          content: fallbackContent,
          jobDescription: data.jobDescription || "",
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          status: "completed",
          userId: user.id,
        },
      });

      return coverLetter;
    }

    if (error.message?.includes("blocked")) {
      throw new Error("Content was blocked by safety filters. Please try different wording.");
    }

    throw new Error("Failed to generate cover letter. Please try again.");
  }
}

// ✅ Fallback cover letter generator
function generateFallbackCoverLetter(user, data) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
# Cover Letter

**${currentDate}**

Dear Hiring Manager,

I am writing to express my strong interest in the **${data.jobTitle}** position at **${data.companyName}**. With ${user.experience || "relevant"} experience in ${user.industry} and a proven track record of success, I am confident in my ability to contribute effectively to your team.

## Relevant Experience

Throughout my career, I have developed expertise in ${user.skills?.slice(0, 3).join(", ") || "various technologies and methodologies"}. My background in ${user.industry} has equipped me with the skills necessary to excel in this role and deliver measurable results.

${user.bio ? `\n${user.bio}\n` : ""}

## Why ${data.companyName}

I am particularly excited about this opportunity at ${data.companyName} because it aligns perfectly with my career goals and professional interests. I am eager to bring my skills and experience to your organization and contribute to your continued success.

## Next Steps

I would welcome the opportunity to discuss how my background and skills would benefit ${data.companyName}. Thank you for considering my application. I look forward to speaking with you soon.

Sincerely,

**${user.name || "Applicant"}**  
${user.email || ""}  
${user.location || ""}
`;
}

export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const coverLetters = await db.coverLetter.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return coverLetters;

  } catch (error) {
    console.error("Error fetching cover letters:", error);
    throw new Error("Failed to fetch cover letters");
  }
}

export async function getCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const coverLetter = await db.coverLetter.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!coverLetter) {
      throw new Error("Cover letter not found");
    }

    return coverLetter;

  } catch (error) {
    console.error("Error fetching cover letter:", error);
    throw new Error("Failed to fetch cover letter");
  }
}

export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const deleted = await db.coverLetter.delete({
      where: {
        id,
        userId: user.id,
      },
    });

    console.log(`✅ Cover letter deleted: ${id}`);
    return deleted;

  } catch (error) {
    console.error("Error deleting cover letter:", error);
    throw new Error("Failed to delete cover letter");
  }
}

// ✅ NEW: Update existing cover letter
export async function updateCoverLetter(id, content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const updated = await db.coverLetter.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        content,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Cover letter updated: ${id}`);
    return updated;

  } catch (error) {
    console.error("Error updating cover letter:", error);
    throw new Error("Failed to update cover letter");
  }
}

// ✅ NEW: Regenerate cover letter with AI improvements
export async function regenerateCoverLetter(id, improvementNotes) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const existingLetter = await db.coverLetter.findUnique({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingLetter) {
      throw new Error("Cover letter not found");
    }

    const prompt = `
Improve the following cover letter based on these notes:

Current Cover Letter:
${existingLetter.content}

Improvement Notes:
${improvementNotes || "Make it more compelling and professional"}

Requirements:
1. Maintain the same structure but enhance the content
2. Make it more impactful and persuasive
3. Keep all factual information accurate
4. Improve the tone and language
5. Format in markdown

Return only the improved cover letter, no explanations.
`;

    const model = getModel();

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig,
    });

    const improvedContent = result.response.text().trim();

    const updated = await db.coverLetter.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        content: improvedContent,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Cover letter regenerated: ${id}`);
    return updated;

  } catch (error) {
    console.error("Error regenerating cover letter:", error);
    throw new Error("Failed to regenerate cover letter");
  }
}