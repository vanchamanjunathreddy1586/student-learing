import 'dotenv/config';
import { callAI } from './server/services/ai-service.js';

async function test() {
  try {
    const res = await callAI("What is 2+2? Answer in one sentence.", "chat", {}, "gemini", false);
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();
