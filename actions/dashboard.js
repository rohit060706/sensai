// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// export const generateAIInsights = async (industry) => {
//   const prompt = `
//           Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
//           {
//             "salaryRanges": [
//               { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
//             ],
//             "growthRate": number,
//             "demandLevel": "High" | "Medium" | "Low",
//             "topSkills": ["skill1", "skill2"],
//             "marketOutlook": "Positive" | "Neutral" | "Negative",
//             "keyTrends": ["trend1", "trend2"],
//             "recommendedSkills": ["skill1", "skill2"]
//           }
          
//           IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
//           Include at least 5 common roles for salary ranges.
//           Growth rate should be a percentage.
//           Include at least 5 skills and trends.
//         `;

//   const result = await model.generateContent(prompt);
//   const response = result.response;
//   const text = response.text();
//   const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

//   return JSON.parse(cleanedText);
// };

// export async function getIndustryInsights() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//     include: {
//       industryInsight: true,
//     },
//   });

//   if (!user) throw new Error("User not found");

//   // If no insights exist, generate them
//   if (!user.industryInsight) {
//     const insights = await generateAIInsights(user.industry);

//     const industryInsight = await db.industryInsight.create({
//       data: {
//         industry: user.industry,
//         ...insights,
//         nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//       },
//     });

//     return industryInsight;
//   }

//   return user.industryInsight;
// }


"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ✅ Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateAIInsights = async (industry) => {
  try {
    // ✅ CRITICAL: Use gemini-2.5-flash-lite (current stable model)
    // Old models (gemini-1.5-flash, gemini-1.5-pro) are RETIRED and return 404
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite", // ✅ Active model with free tier
    });

    // ✅ Safety settings to prevent blocking
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

    // ✅ Generation config for consistent JSON output
    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: "application/json", // ✅ Forces JSON output
    };

    const prompt = `
Analyze the current state of the ${industry} industry in India and provide insights in the following JSON format:

{
  "salaryRanges": [
    { "role": "string", "min": number, "max": number, "median": number, "location": "India" }
  ],
  "growthRate": number,
  "demandLevel": "High" | "Medium" | "Low",
  "topSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "marketOutlook": "Positive" | "Neutral" | "Negative",
  "keyTrends": ["trend1", "trend2", "trend3", "trend4", "trend5"],
  "recommendedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
}

Include at least 5 relevant job roles with realistic salary ranges in INR for the Indian market.
Return ONLY valid JSON without any markdown formatting or explanations.
`;

    // ✅ Generate content with all settings
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig,
    });

    const response = result.response;

    // ✅ Check for safety blocks
    if (response.promptFeedback?.blockReason) {
      console.error("Prompt blocked:", response.promptFeedback.blockReason);
      throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
    }

    const text = response.text();
    
    if (!text) {
      console.error("Empty response from Gemini");
      throw new Error("Gemini returned an empty response");
    }

    // ✅ Clean and parse JSON
    const cleaned = text.replace(/```json|```/g, "").trim();
    const insights = JSON.parse(cleaned);

    console.log("✅ Successfully generated AI insights for:", industry);
    return insights;

  } catch (error) {
    console.error("Gemini AI Error:", error.message);
    
    // ✅ Check for rate limit errors - DON'T throw, use fallback
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn("⚠️ Rate limit hit - using mock data as fallback");
      return generateMockInsights(industry);
    }

    // ✅ Check for 404 errors (wrong model)
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      console.error("❌ Model not found - check model name is correct");
      return generateMockInsights(industry);
    }

    // ✅ For API key errors - throw to alert developer
    if (error.message?.includes("API key") || error.message?.includes("API_KEY")) {
      throw new Error("Invalid or missing Gemini API key. Check your .env file.");
    }

    // ✅ For service errors - use fallback
    if (error.message?.includes("500") || error.message?.includes("503")) {
      console.warn("⚠️ Gemini service unavailable - using mock data");
      return generateMockInsights(industry);
    }

    // ✅ For any other error - use fallback instead of crashing
    console.warn("⚠️ Unexpected error - using mock data as fallback");
    return generateMockInsights(industry);
  }
};

// ✅ Industry-specific mock data generator
const generateMockInsights = (industry) => {
  const industryData = {
    Technology: {
      roles: [
        { role: "Software Engineer", min: 500000, max: 2000000, median: 1200000 },
        { role: "Backend Developer", min: 600000, max: 2200000, median: 1300000 },
        { role: "Frontend Developer", min: 450000, max: 1800000, median: 1100000 },
        { role: "DevOps Engineer", min: 700000, max: 2500000, median: 1500000 },
        { role: "Data Analyst", min: 400000, max: 1600000, median: 900000 },
      ],
      growthRate: 12.5,
      topSkills: ["React", "Node.js", "SQL", "Cloud", "System Design"],
      keyTrends: ["AI Adoption", "Cloud Migration", "Automation", "Remote Work", "Cybersecurity"],
      recommendedSkills: ["Docker", "TypeScript", "API Development", "AWS", "Git"],
    },
    Finance: {
      roles: [
        { role: "Financial Analyst", min: 400000, max: 1500000, median: 900000 },
        { role: "Investment Banker", min: 800000, max: 3000000, median: 1800000 },
        { role: "Risk Manager", min: 600000, max: 2000000, median: 1200000 },
        { role: "Accountant", min: 350000, max: 1200000, median: 700000 },
        { role: "Financial Controller", min: 900000, max: 2500000, median: 1600000 },
      ],
      growthRate: 8.5,
      topSkills: ["Financial Modeling", "Excel", "Risk Analysis", "Regulations", "Data Analysis"],
      keyTrends: ["FinTech Growth", "Digital Banking", "Crypto Adoption", "ESG Investing", "AI in Finance"],
      recommendedSkills: ["Python", "Power BI", "SQL", "Bloomberg Terminal", "Financial Planning"],
    },
    Healthcare: {
      roles: [
        { role: "Medical Officer", min: 800000, max: 2500000, median: 1500000 },
        { role: "Healthcare Administrator", min: 500000, max: 1800000, median: 1000000 },
        { role: "Nurse Practitioner", min: 400000, max: 1200000, median: 700000 },
        { role: "Medical Researcher", min: 600000, max: 2000000, median: 1200000 },
        { role: "Pharmacist", min: 350000, max: 1000000, median: 600000 },
      ],
      growthRate: 9.0,
      topSkills: ["Patient Care", "Medical Knowledge", "Healthcare IT", "Communication", "Clinical Skills"],
      keyTrends: ["Telemedicine", "AI Diagnostics", "Preventive Care", "Digital Health", "Personalized Medicine"],
      recommendedSkills: ["EMR Systems", "Healthcare Analytics", "Medical Coding", "Public Health", "Research Methods"],
    },
    Education: {
      roles: [
        { role: "Teacher", min: 300000, max: 800000, median: 500000 },
        { role: "Principal", min: 600000, max: 1500000, median: 1000000 },
        { role: "Education Consultant", min: 400000, max: 1200000, median: 700000 },
        { role: "Curriculum Developer", min: 450000, max: 1000000, median: 650000 },
        { role: "Academic Coordinator", min: 350000, max: 900000, median: 550000 },
      ],
      growthRate: 7.0,
      topSkills: ["Pedagogy", "Ed-Tech", "Curriculum Design", "Assessment", "Student Engagement"],
      keyTrends: ["Online Learning", "Hybrid Education", "AI Tutoring", "Skill-Based Learning", "Gamification"],
      recommendedSkills: ["LMS Platforms", "Digital Content Creation", "Data Analytics", "Educational Psychology", "Communication"],
    },
    Marketing: {
      roles: [
        { role: "Digital Marketing Manager", min: 500000, max: 1800000, median: 1100000 },
        { role: "SEO Specialist", min: 350000, max: 1200000, median: 700000 },
        { role: "Content Strategist", min: 400000, max: 1500000, median: 900000 },
        { role: "Social Media Manager", min: 300000, max: 1000000, median: 600000 },
        { role: "Brand Manager", min: 600000, max: 2000000, median: 1200000 },
      ],
      growthRate: 10.0,
      topSkills: ["SEO", "Content Marketing", "Social Media", "Analytics", "Brand Strategy"],
      keyTrends: ["AI Marketing", "Influencer Marketing", "Video Content", "Personalization", "Voice Search"],
      recommendedSkills: ["Google Ads", "Meta Ads", "Marketing Automation", "A/B Testing", "CRM Tools"],
    },
  };

  const data = industryData[industry] || industryData.Technology;

  return {
    salaryRanges: data.roles.map(role => ({ ...role, location: "India" })),
    growthRate: data.growthRate,
    demandLevel: "High",
    topSkills: data.topSkills,
    marketOutlook: "Positive",
    keyTrends: data.keyTrends,
    recommendedSkills: data.recommendedSkills,
  };
};

export async function getIndustryInsights() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist → generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  // ✅ Check if insights need updating (older than 7 days)
  const needsUpdate = user.industryInsight.nextUpdate < new Date();
  
  if (needsUpdate) {
    console.log("Insights outdated, regenerating...");
    const insights = await generateAIInsights(user.industry);

    const updatedInsight = await db.industryInsight.update({
      where: { id: user.industryInsight.id },
      data: {
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    });

    return updatedInsight;
  }

  return user.industryInsight;
}
