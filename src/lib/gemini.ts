import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const getGeminiResponse = async (prompt: string, systemInstruction?: string) => {
  try {
    const model = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are Zenith, a helpful study and habit companion. Be encouraging, concise, and insightful.",
      },
    });
    const response = await model;
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having a bit of trouble connecting right now. Let's try again in a moment!";
  }
};

export const getWellbeingQuote = async (mood: string) => {
  const prompt = `The user is feeling ${mood}. Provide a short, famous, and deeply relevant quote to encourage or resonate with them, followed by a one-sentence reflection.`;
  return getGeminiResponse(prompt, "You are a wise and empathetic mentor.");
};

export const analyzeSyllabus = async (syllabusText: string) => {
  const prompt = `Analyze this syllabus and break it down into a list of key topics or modules for tracking progress. Return the result as a JSON array of strings. Syllabus: ${syllabusText}`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  try {
    return JSON.parse(response.text);
  } catch (e) {
    return ["General Study"];
  }
};
