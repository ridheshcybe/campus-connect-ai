import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null;
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}
