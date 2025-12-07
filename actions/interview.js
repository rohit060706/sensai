// "use server";

// import { db } from "@/lib/prisma";
// import { auth } from "@clerk/nextjs/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// export async function generateQuiz() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//     select: {
//       industry: true,
//       skills: true,
//     },
//   });

//   if (!user) throw new Error("User not found");

//   const prompt = `
//     Generate 10 technical interview questions for a ${
//       user.industry
//     } professional${
//     user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
//   }.
    
//     Each question should be multiple choice with 4 options.
    
//     Return the response in this JSON format only, no additional text:
//     {
//       "questions": [
//         {
//           "question": "string",
//           "options": ["string", "string", "string", "string"],
//           "correctAnswer": "string",
//           "explanation": "string"
//         }
//       ]
//     }
//   `;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = result.response;
//     const text = response.text();
//     const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
//     const quiz = JSON.parse(cleanedText);

//     return quiz.questions;
//   } catch (error) {
//     console.error("Error generating quiz:", error);
//     throw new Error("Failed to generate quiz questions");
//   }
// }

// export async function saveQuizResult(questions, answers, score) {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   const questionResults = questions.map((q, index) => ({
//     question: q.question,
//     answer: q.correctAnswer,
//     userAnswer: answers[index],
//     isCorrect: q.correctAnswer === answers[index],
//     explanation: q.explanation,
//   }));

//   // Get wrong answers
//   const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

//   // Only generate improvement tips if there are wrong answers
//   let improvementTip = null;
//   if (wrongAnswers.length > 0) {
//     const wrongQuestionsText = wrongAnswers
//       .map(
//         (q) =>
//           `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
//       )
//       .join("\n\n");

//     const improvementPrompt = `
//       The user got the following ${user.industry} technical interview questions wrong:

//       ${wrongQuestionsText}

//       Based on these mistakes, provide a concise, specific improvement tip.
//       Focus on the knowledge gaps revealed by these wrong answers.
//       Keep the response under 2 sentences and make it encouraging.
//       Don't explicitly mention the mistakes, instead focus on what to learn/practice.
//     `;

//     try {
//       const tipResult = await model.generateContent(improvementPrompt);

//       improvementTip = tipResult.response.text().trim();
//       console.log(improvementTip);
//     } catch (error) {
//       console.error("Error generating improvement tip:", error);
//       // Continue without improvement tip if generation fails
//     }
//   }

//   try {
//     const assessment = await db.assessment.create({
//       data: {
//         userId: user.id,
//         quizScore: score,
//         questions: questionResults,
//         category: "Technical",
//         improvementTip,
//       },
//     });

//     return assessment;
//   } catch (error) {
//     console.error("Error saving quiz result:", error);
//     throw new Error("Failed to save quiz result");
//   }
// }

// export async function getAssessments() {
//   const { userId } = await auth();
//   if (!userId) throw new Error("Unauthorized");

//   const user = await db.user.findUnique({
//     where: { clerkUserId: userId },
//   });

//   if (!user) throw new Error("User not found");

//   try {
//     const assessments = await db.assessment.findMany({
//       where: {
//         userId: user.id,
//       },
//       orderBy: {
//         createdAt: "asc",
//       },
//     });

//     return assessments;
//   } catch (error) {
//     console.error("Error fetching assessments:", error);
//     throw new Error("Failed to fetch assessments");
//   }
// }

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// ✅ Initialize Gemini with correct model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ✅ Helper function to get model with safety settings
const getModel = () => {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite", // ✅ Use the active model
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
  responseMimeType: "application/json", // Forces JSON output
};

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  const prompt = `
Generate 10 technical interview questions for a ${user.industry} professional${
    user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
}.

Each question should be multiple choice with 4 options.

Return the response in this JSON format only:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}
`;

  try {
    const model = getModel();
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig,
    });

    const response = result.response;

    // Check for blocks
    if (response.promptFeedback?.blockReason) {
      console.error("Prompt blocked:", response.promptFeedback.blockReason);
      throw new Error("Content generation was blocked. Please try again.");
    }

    const text = response.text();
    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Clean and parse JSON
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    console.log(`✅ Generated ${quiz.questions.length} quiz questions`);
    return quiz.questions;

  } catch (error) {
    console.error("Error generating quiz:", error);
    
    // Return mock quiz as fallback
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      console.warn("⚠️ Rate limit hit - returning mock quiz");
      return getMockQuiz();
    }
    
    throw new Error("Failed to generate quiz questions");
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Get wrong answers
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  // Only generate improvement tips if there are wrong answers
  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    improvementTip = await generateImprovementTip(user, wrongAnswers);
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    console.log(`✅ Quiz result saved: ${score}/10`);
    return assessment;

  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

// ✅ Separate function for improvement tip generation
async function generateImprovementTip(user, wrongAnswers) {
  const wrongQuestionsText = wrongAnswers
    .map(
      (q) =>
        `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
    )
    .join("\n\n");

  const improvementPrompt = `
The user got the following ${user.industry} technical interview questions wrong:

${wrongQuestionsText}

Based on these mistakes, provide a concise, specific improvement tip.
Focus on the knowledge gaps revealed by these wrong answers.
Keep the response under 2 sentences and make it encouraging.
Don't explicitly mention the mistakes, instead focus on what to learn/practice.
`;

  try {
    const model = getModel();
    
    const tipResult = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: improvementPrompt }] }],
      safetySettings,
      generationConfig: {
        ...generationConfig,
        responseMimeType: "text/plain", // Plain text for this one
      },
    });

    const tip = tipResult.response.text().trim();
    console.log("✅ Improvement tip generated");
    return tip;

  } catch (error) {
    console.error("Error generating improvement tip:", error);
    // Return generic tip as fallback
    return "Focus on strengthening your fundamentals and practice more problem-solving exercises.";
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc", // ✅ Changed to desc for most recent first
      },
    });

    return assessments;

  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}

// ✅ Mock quiz fallback for rate limits
function getMockQuiz() {
  return [
    {
      question: "What does REST stand for?",
      options: [
        "Representational State Transfer",
        "Remote Execution Syntax Tree",
        "Relational Service Technology",
        "Redundant System Technique",
      ],
      correctAnswer: "Representational State Transfer",
      explanation:
        "REST is an architectural style for designing networked applications.",
    },
    {
      question: "Which data structure uses FIFO?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      correctAnswer: "Queue",
      explanation: "Queues use First-In-First-Out ordering.",
    },
    {
      question: "Which keyword declares a constant in JavaScript?",
      options: ["var", "let", "static", "const"],
      correctAnswer: "const",
      explanation: "`const` is used to declare immutable variables.",
    },
    {
      question: "Which SQL command retrieves data?",
      options: ["UPDATE", "DELETE", "INSERT", "SELECT"],
      correctAnswer: "SELECT",
      explanation: "`SELECT` is used to fetch data from a database.",
    },
    {
      question: "Which is a JavaScript framework?",
      options: ["Django", "Flask", "React", "Laravel"],
      correctAnswer: "React",
      explanation: "React is a frontend JS library.",
    },
    {
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
      correctAnswer: "O(log n)",
      explanation: "Binary search halves the problem size each step.",
    },
    {
      question: "Which HTTP status means 'Not Found'?",
      options: ["200", "301", "404", "500"],
      correctAnswer: "404",
      explanation: "404 means the resource does not exist.",
    },
    {
      question: "Which is a NoSQL database?",
      options: ["MySQL", "PostgreSQL", "MongoDB", "SQLite"],
      correctAnswer: "MongoDB",
      explanation: "MongoDB stores documents in JSON-like format.",
    },
    {
      question: "Which tag is used to create a hyperlink in HTML?",
      options: ["<div>", "<span>", "<a>", "<link>"],
      correctAnswer: "<a>",
      explanation: "<a> defines a hyperlink.",
    },
    {
      question: "What does CSS stand for?",
      options: [
        "Computer Style Sheets",
        "Cascading Style Sheets",
        "Creative Styling Syntax",
        "Color Style Settings",
      ],
      correctAnswer: "Cascading Style Sheets",
      explanation: "CSS styles the layout of web pages.",
    },
  ];
}