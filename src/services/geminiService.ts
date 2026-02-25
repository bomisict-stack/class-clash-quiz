import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

export async function generateQuestions(grade: string, category: string): Promise<Question[]> {
  const prompt = `Generate 12 multiple-choice quiz questions for Grade ${grade} students in the category "${category}". 
  The questions should be educational and age-appropriate.
  Provide exactly 4 options for each question.
  Return the result as a JSON array of objects with the following structure:
  {
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact string of the correct option"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswer: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating questions:", error);
    // Fallback questions in case of API error
    return Array(12).fill(null).map((_, i) => ({
      question: `Sample Question ${i + 1} for Grade ${grade} (${category})`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctAnswer: "Option A"
    }));
  }
}
