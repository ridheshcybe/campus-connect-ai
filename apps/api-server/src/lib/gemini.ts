import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env";

let client: GoogleGenAI | null = null;

/**
 * Returns the singleton Gemini client, or null if GEMINI_API_KEY is not set.
 * Call this lazily — not at module load time — so tests without an API key still work.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null;
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}
