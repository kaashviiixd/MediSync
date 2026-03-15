import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

async function testModel() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    try {
        const result = await model.generateContent("Hi");
        console.log("Success with gemini-pro");
        console.log(result.response.text());
    } catch (err) {
        console.error("Error with gemini-pro:", err.message);
    }
    
    const modelFlash = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    try {
        const result = await modelFlash.generateContent("Hi");
        console.log("Success with gemini-1.5-flash");
    } catch (err) {
        console.error("Error with gemini-1.5-flash:", err.message);
    }
}

testModel();
