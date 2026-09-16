import { callAI } from './server/services/ai-service.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    // No keys configured
    process.env.GEMINI_API_KEY = '';
    process.env.OPENAI_API_KEY = '';
    console.log("Testing with no provider...");
    // Let's pass a non-existent provider ID to test the final catch-all throw
    const result = await callAI("What is photosynthesis?", "tutor", {}, "nonexistent");
    console.log("SUCCESS:", result);
  } catch (e) {
    console.error("ERROR:", e.message);
  }
}
test();
