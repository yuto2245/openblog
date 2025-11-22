import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";

export const createAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const TECH_NEWS_PROMPT = `
You are a tech news scout. Find the most recent and interesting developments in software engineering, AI, and web development.
Provide a summary of 3 key stories.
Always use the Google Search tool to get the latest information.
`;

export const CODE_ASSISTANT_SYSTEM_INSTRUCTION = `
You are an expert senior React and TypeScript engineer.
Provide concise, correct, and modern code solutions.
When writing code, use best practices, prefer functional components, and ensure type safety.
`;

export const LIVE_COMPANION_SYSTEM_INSTRUCTION = `
You are a pair programming companion. You are helpful, enthusiastic, and brief.
You listen to the developer's thoughts and provide quick feedback or encouragement.
Keep responses short and conversational suitable for voice.
`;

// Search Tool Configuration
export const searchTool = {
  googleSearch: {}
};

// Helper to get URLs from grounding
export const extractGroundingUrls = (candidate: any) => {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  return chunks
    .filter((chunk: any) => chunk.web)
    .map((chunk: any) => ({
      title: chunk.web.title,
      uri: chunk.web.uri
    }));
};
