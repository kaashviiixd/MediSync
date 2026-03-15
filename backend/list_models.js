import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../.env' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  try {
    const models = await genAI.listModels();
    console.log("Available Models:");
    models.models.forEach(m => {
      console.log(`- ${m.name}`);
    });
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
