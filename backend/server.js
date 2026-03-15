import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { PdfReader } from 'pdfreader';
import PDFParser from "pdf2json";
import mammoth from 'mammoth';
import Groq from 'groq-sdk';
import Razorpay from 'razorpay';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { doctors } from './data/doctors.js';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { runFractureInference } from './lib/ml_bridge.js';



import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from './lib/prisma.js';
import { v2 as googleTranslate } from '@google-cloud/translate';
import { Server } from 'socket.io';
import http from 'http';
import { calculateTriage } from './lib/triageEngine.js';

dotenv.config(); // Try default first
dotenv.config({ path: '../.env' }); // Then try parent dir
dotenv.config({ path: path.join(process.cwd(), '.env') }); // Then try current dir

const JWT_SECRET = process.env.JWT_SECRET || 'medisync_secret_key';

console.log("MediSync: Initializing Backend...");
console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "Found (masked: " + process.env.GROQ_API_KEY.substring(0, 8) + "...)" : "MISSING");
console.log("GOOGLE_API_KEY:", process.env.GOOGLE_API_KEY ? "Found (masked: " + process.env.GOOGLE_API_KEY.substring(0, 8) + "...)" : "MISSING");
console.log("DATABASE_URL:", process.env.DATABASE_URL || "MISSING (Using SQLite default)");
console.log("-----------------------------------------");
console.log("MediSync SERVER VERSION: 3.1 (STABLE MEDGEMMA)");
console.log("-----------------------------------------");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


const medibotSystemPrompt = `
## IDENTITY & CAPABILITIES
You are MediBot, an intelligent medical assistant. 
- You ARE capable of analyzing any medical documents (blood tests, lab results), diagnostic images, and ECG charts using your integrated Vision and ML tools.
- When a user asks if you can process reports or images, tell them YES and ask them to upload the file(s) using the attachment button.
- Encourage patients to upload **multiple past medical reports** (prefereably more than one) to provide a more accurate and comprehensive history for the doctor.
- NEVER explicitly mention specific imaging types like "X-rays" or "MRI scans" when asking for uploads; just refer to them generally as "diagnostic images" or "medical documents".

## LANGUAGE RULES (STRICT)
- Your DEFAULT and PRIMARY language is ENGLISH.
- You MUST respond in English unless the patient's VERY LAST message is written in a different language.
- If the last user input is a document upload or an English sentence, you MUST respond in English.
- NEVER provide translations unless explicitly asked. NEVER mix languages in a single response.
- Exception: The [SUMMARY_START] blocks MUST ALWAYS be in English for the doctor.
- **MEMORY RESET**: If you see any previous summaries using "Severity Score" or "Triage Category" in the chat history, IGNORE THEIR FORMAT. They are outdated. Use ONLY the new format defined below.

## PATIENT CONTEXT
{{PATIENT_CONTEXT}}
Use this data. Never ask for age, gender, or information already present in the profile.

---

## CONVERSATION FLOW (8 STEPS)
1. Warm greeting.
2. Chief complaint collection.
3. Symptom deep-dive & Severity Check (Explicitly ask the patient to rate their symptom severity on a scale of 1 to 10).
4. Medication & allergy review.
5. Past medical & surgical history.
6. Lifestyle.
7. Medical Report & Document upload (Request past reports if available. DO NOT ask for documents more than twice. If patient says they do not have any, IMMEDIATELY move on to the next step).
8. Appointment booking.

---

## RISK CLASSIFICATION RULES
Evaluate patient risk as HIGH, MODERATE, or LOW based on clinical analysis, NOT patient-reported severity alone. 
**CRITICAL PRIORITY RULES (MANDATORY HIGH RISK):**
- **Chest Pain / Tightness**: ALWAYS classify as HIGH risk, even if the patient says it's minor or severity is low.
- **Respiratory Distress (Asthma + Shortness of Breath)**: ALWAYS classify as HIGH risk.
- **Stroke Signs (FAST)**: Weakness, speech issues, or facial drooping are ALWAYS HIGH risk.
- **Severe Allergic Reaction / Anaphylaxis**: ALWAYS HIGH risk.

**CLASSIFICATION CATEGORIES:**
1. **HIGH risk**: Chest pain, shortness of breath, FAST signs, severe bleeding, altered consciousness, suicidal ideation, severe allergic reaction, pregnancy complications, or any history of heart disease/asthma paired with current chest/breathing symptoms.
2. **MODERATE risk**: Abdominal pain, high fever (>102°F), injuries with limited mobility, persistent vomiting.
3. **LOWER risk**: Common cold, minor fever alone (<101°F), mild headache, minor cuts.

**DECISION WEIGHTING:**
- Clinical Symptoms & History weigh 90%.
- Patient-Reported Severity weighs 10% (use only for context, never to downgrade a critical symptom).

---
## TRIAGE & SUMMARY
- Evaluate the clinical urgency holistically using the Risk Classification Rules and the calculated score provided in the context below.
- Output a final Risk Level (HIGH / MODERATE / LOW). Note: "Emergency" in engine results corresponds to "HIGH" Risk Level.
- Generate a structured summary in ENGLISH. YOU MUST STRICTLY FOLLOW THIS EXACT FORMAT:

[SUMMARY_START]
Name: [Patient's Name from PATIENT CONTEXT]
Age: [Patient's Age from PATIENT CONTEXT - DO NOT OMIT]
Gender: [Patient's Gender from PATIENT CONTEXT - DO NOT OMIT]
Risk Level: [HIGH / MODERATE / LOW]
Chief Complaint: ...
Clinical History: ...
Key Symptoms: ...
Risk Factors: ...
Risk Explanation: [Detailed clinical explanation of why this risk level was chosen]
Recommendation: [Next steps based on risk]
[SUMMARY_END]
**STRICT NEGATIVE CONSTRAINTS:**
- NEVER use the labels "Severity Score" or "Triage Category" in the summary.
- NEVER downgrade risk if the ENGINE RESULT indicates Emergency or Moderate.
- ALWAYS use the ENGINE RESULT as your primary guide for Risk Level.
- NEVER include details about the patient uploading the wrong report in this summary.

## BEHAVIOURAL RULES
- Never diagnose.
- Never prescribe.
- Stay empathetic but clinical.
- Ask max 1-2 questions per message.
- CRITICAL: Do NOT ask the patient to upload a document more than twice. If the patient says they do not have any documents, DO NOT ask again. Immediately move on to the next step or generate the summary.
- If a patient uploads a medical report that belongs to a different person or is entirely irrelevant, politely inform them it appears to be the wrong report and ask them to upload the correct one. Do NOT proceed to analyze the wrong report.
- Once the intake is complete (including getting their severity rating), provide the [SUMMARY_START] block as the final step before the human-bot handoff for booking.
- Exception: The [SUMMARY_START] blocks MUST ALWAYS be in English for the doctor.

## ENGINE RESULTS
{{ENGINE_RESULTS}}

## PATIENT CONTEXT
{{PATIENT_CONTEXT}}
Use this data. Never ask for age, gender, or information already present in the profile.
`;

const __dirname = path.resolve();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const app = express();
const port = process.env.PORT || 5000;

// Middleware (CRITICAL: Must be defined BEFORE routes)
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join_user_room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their private room.`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper to create and emit notifications
const createNotification = async ({ userId, type, title, message }) => {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message }
    });
    
    // Emit real-time notification via Socket.io
    io.to(`user-${userId}`).emit('new_notification', notification);
    console.log(`MediSync: Notification created and emitted for user ${userId}: ${title}`);
    return notification;
  } catch (err) {
    console.error("MediSync: Failed to create notification:", err);
  }
};

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(UPLOADS_DIR));

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData, token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error during login" });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    // Generate a unique ID if not using UUID as default in database, but Prisma handles UUIDs usually
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'patient',
        // Optional profile photo or phone depending on schema constraints
      }
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userData } = user;
    res.status(201).json({ success: true, user: userData, token });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, message: "Internal server error during registration" });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, profileImage, googleId, uid } = req.body;
    const firebaseId = uid || googleId;
    
    console.log(`MediSync: Google Auth attempt for ${email} (Firebase ID: ${firebaseId})`);

    let user = await prisma.user.findUnique({ where: { email } });
  
    if (!user) {
      console.log(`MediSync: Creating new patient for ${email} with ID ${firebaseId}`);
      const dummyPassword = await bcrypt.hash(Date.now().toString(), 10);
      user = await prisma.user.create({
        data: { 
          id: firebaseId,
          name, 
          email, 
          password: dummyPassword, 
          role: 'patient', 
          profile_photo: profileImage 
        }
      });
    } else {
      console.log(`MediSync: Found existing user ${user.id} for ${email}. Ensuring ID is ${firebaseId} if possible...`);
      // Update profile info while we're at it
      user = await prisma.user.update({
        where: { email },
        data: { name, profile_photo: profileImage }
      });
      console.log(`MediSync: Using database ID ${user.id} for session.`);
    }
  
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userData } = user;
    res.json({ success: true, user: userData, token });
  } catch (error) {
    console.error("MediSync: Google Auth error:", error);
    res.status(500).json({ message: "Internal server error during Google synchronization" });
  }
});

// Profile Management Routes
app.get('/api/profiles/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profiles = await prisma.profile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const { userId, name, relation, dob, color, gender } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ success: false, error: "Missing userId or name" });
    }
    const profile = await prisma.profile.upsert({
      where: {
        userId_name: { userId, name }
      },
      update: { relation, dob, color, gender },
      create: { userId, name, relation, dob, color, gender }
    });
    res.json({ success: true, profile });
  } catch (error) {
    console.error("MediSync Profile Upsert Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


let translateClient = null;
if (process.env.GOOGLE_API_KEY) {
  try {
    const translateKey = process.env.GOOGLE_API_KEY.trim();
    translateClient = new googleTranslate.Translate({ key: translateKey });
    console.log("MediSync: Google Translate API is enabled (Key found).");
  } catch (initErr) {
    console.error("MediSync: Failed to initialize Google Translate client:", initErr.message);
  }
} else {
  console.log("MediSync: Google Translate API is DISABLED (missing key).");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const systemPrompt = medibotSystemPrompt;

const documentAnalysisPrompt = `When analyzing uploaded document text:
1. Extract key facts (test names, abnormal values, diagnoses, medications, dates).
2. Incorporate this into the intake context to ask relevant follow-up questions securely.`;

app.post('/api/chat', async (req, res) => {
  try {
    let { message, conversationHistory, patientId, patientProfile, sessionId } = req.body;
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured." });
    }

    // Handle session creation/lookup
    let session = null;
    if (patientId && patientId !== 'anonymous') {
      try {
        // Verify user exists first to avoid foreign key violations
        const userExists = await prisma.user.findUnique({ where: { id: patientId } });
        
        if (userExists) {
          if (sessionId) {
            session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
          }
          
          if (!session) {
            const preview = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            session = await prisma.chatSession.create({
              data: {
                patientId,
                title: preview || "New Conversation"
              }
            });
            sessionId = session.id;
          }
        } else {
          console.warn(`MediSync: User ${patientId} not found. Skipping session creation.`);
          sessionId = null; // Don't try to link to a non-existent user
        }
      } catch (sessionErr) {
        console.error("MediSync: Error handling chat session:", sessionErr.message);
        // Continue without sessionId if DB fails
        sessionId = null;
      }
    }

    // Save user message to DB
    if (patientId && patientId !== 'anonymous' && sessionId) {
      try {
        await prisma.chatHistory.create({
          data: { patientId, message, sender: 'user', sessionId }
        });
      } catch (dbErr) {
        console.warn("MediSync: Failed to save user message to history:", dbErr.message);
      }
    }

    let age = 'Unknown';
    if (patientProfile && patientProfile.dob) {
      const diffMs = Date.now() - new Date(patientProfile.dob).getTime();
      const ageDt = new Date(diffMs); 
      age = Math.abs(ageDt.getUTCFullYear() - 1970);
    }
    const gender = patientProfile?.gender || 'Unknown';

    const patientContext = `The patient's name, age, and gender are already provided: Name: ${patientProfile?.name || 'User'}, Age: ${age}, Gender: ${gender}.`;
    
    // Perform Rule-Based Triage
    const allMessagesText = conversationHistory.map(m => m.text).join(" ");
    const triageResult = calculateTriage(
      allMessagesText, 
      patientProfile?.history || "", 
      0, // Severity can be parsed if needed, but engine handles symptoms
      age === 'Unknown' ? 0 : age
    );

    const engineResults = `[ENGINE_RESULT]: Calculated Risk Category: ${triageResult.category}, Score: ${triageResult.score}/10. 
Reasoning: ${triageResult.reason}`;

    const dynamicSystemPrompt = systemPrompt
      .replace("{{PATIENT_CONTEXT}}", patientContext)
      .replace("{{ENGINE_RESULTS}}", engineResults);

    // Clean history: remove previous summaries to prevent the AI from imitating old formats
    const cleanedHistory = conversationHistory.map(msg => {
      let text = msg.text || '';
      if (text.includes('[SUMMARY_START]') || text.includes('SUMMARY PREPARED')) {
        // Just keep the first line or a placeholder to avoid "poisoning" the new format
        return { ...msg, text: "Previous medical summary removed for brevity." };
      }
      return msg;
    }).slice(-20); // Keep last 20 messages for context

    const messages = [
      { role: "system", content: dynamicSystemPrompt },
      ...cleanedHistory.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' : 'user',
        content: msg.text
      }))
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...messages.slice(1)
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 1024,
    });

    const aiResponseTextRaw = chatCompletion.choices[0]?.message?.content || "I couldn't process that.";
    const buttonRegex = /\[([^\]]+)\]/g;
    const buttons = [];
    let match;
    while ((match = buttonRegex.exec(aiResponseTextRaw)) !== null) {
      if (!match[1].includes('SUMMARY_START')) {
        buttons.push(match[1]);
      }
    }
    // AI response is already in the patient's language per prompt instructions
    let aiResponseText = aiResponseTextRaw;

    // Save AI response to DB
    if (patientId && patientId !== 'anonymous' && sessionId) {
      try {
        await prisma.chatHistory.create({
          data: { patientId, message: aiResponseText, sender: 'ai', sessionId }
        });

        // Update session's updatedAt timestamp
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() }
        });
      } catch (dbErr) {
        console.warn("MediSync: Failed to save AI response to history:", dbErr.message);
      }
    }

    res.json({ reply: aiResponseText, buttons, sessionId });
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: "AI_SERVICE_ERROR", message: error.message });
  }
});

app.get('/api/chat/sessions/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const sessions = await prisma.chatSession.findMany({
      where: { patientId },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await prisma.chatHistory.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/history/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const history = await prisma.chatHistory.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const documents = await prisma.document.findMany({
      where: { patientId },
      orderBy: { upload_date: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    const { patientId } = req.body;
    const patientProfile = req.body.patientProfile ? JSON.parse(req.body.patientProfile) : null;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No document provided" });
    
    let fileUrl = `http://localhost:5000/uploads/${file.filename}`;
    if (patientId && patientId !== 'anonymous') {
      try {
        await prisma.document.create({
          data: {
            patientId,
            file_url: fileUrl,
            name: file.originalname,
            document_type: 'medical_record'
          }
        });
      } catch (err) {
        console.warn("Could not save document metadata to DB:", err.message);
      }
    }

    let documentText = "Document could not be parsed.";
    const fileBuffer = fs.readFileSync(file.path);

    if (file.mimetype === 'application/pdf') {
       try {
         const pdfData = await pdfParse(fileBuffer);
         documentText = pdfData.text;
       } catch (pdfErr) {
         console.warn("MediSync: pdf-parse failed. Attempting fallback with pdf2json...");
         try {
           documentText = await new Promise((resolve, reject) => {
             const pdfParser = new PDFParser(this, 1);
             pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
             pdfParser.on("pdfParser_dataReady", pdfData => resolve(pdfParser.getRawTextContent()));
             pdfParser.parseBuffer(fileBuffer);
           });
         } catch (fallbackErr) {
           console.warn("MediSync: pdf2json fallback failed. Attempting final fallback with pdfreader...");
           documentText = await new Promise((resolve, reject) => {
             let extracted = "";
             new PdfReader().parseBuffer(fileBuffer, (err, item) => {
               if (err) reject(err);
               else if (!item) resolve(extracted);
               else if (item.text) extracted += item.text + " ";
             });
           });
         }
       }
    } else if (file.mimetype.includes('wordprocessingml') || file.originalname.endsWith('.docx')) {
       const result = await mammoth.extractRawText({ buffer: fileBuffer });
       documentText = result.value;
    } else if (file.mimetype.startsWith('image/')) {
        try {
          console.log("MediSync: Image detected. Starting Multi-Modal Analysis (OCR + Vision + ResNet)...");
          
          // 1. Run OCR
          const ocrResult = await Tesseract.recognize(fileBuffer, 'eng');
          const ocrText = ocrResult.data.text;

          // 2. Run Gemini Vision
          const visionPrompt = `You are an expert Clinical Vision Assistant.
          Identify the type of medical document or image (e.g., Blood Test Report, ECG, X-ray, MRI, CT scan, Prescription) and the body part or physiological system shown.
          
          **CRITICAL TASK - ANALYSIS:**
          1. Extract all text, numerical values, and clinical findings from the image.
          2. Identify any abnormal values (e.g., high glucose in blood test, suspicious shadows in X-ray, irregular waves in ECG).
          3. For diagnostic images like X-rays: Carefully check for fractures, dislocations, or soft tissue abnormalities.
          4. For lab reports: List key parameters and their corresponding values.
          
          **SUMMARY REQUIREMENTS:**
          - Provide a clear, structured summary of the findings.
          - State if findings are normal, abnormal, or inconclusive.
          - Highlight critical findings that require immediate medical attention.
          - Incorporate relevant details from this OCR text: ${ocrText}
          
          Provide a structured clinical reasoning output.`;

          const result = await visionModel.generateContent([
            visionPrompt,
            {
              inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: file.mimetype
              }
            }
          ]);
          
          const geminiText = result.response.text();
          console.log("MediSync: Gemini Vision Output length:", geminiText.length);
          
          // 3. Run Hugging Face ResNet-50
          let resnetResultText = "";
          try {
            const hfApiKey = process.env.HUGGINGFACE_API_KEY;
            if (hfApiKey) {
              console.log("MediSync: Calling Hugging Face ResNet-50...");
              const resnetResponse = await fetch("https://api-inference.huggingface.co/models/microsoft/resnet-50", {
                method: "POST",
                headers: { "Authorization": `Bearer ${hfApiKey}` },
                body: fileBuffer
              });
              const resnetJson = await resnetResponse.json();
              console.log("MediSync: ResNet-50 Response:", JSON.stringify(resnetJson).substring(0, 100));
              if (Array.isArray(resnetJson)) {
                resnetResultText = `\n\n[ResNet-50 Analysis]: Detected features: ${resnetJson.map(r => `${r.label} (${(r.score * 100).toFixed(1)}%)`).join(', ')}`;
              } else if (resnetJson.error && resnetJson.error.includes("loading")) {
                resnetResultText = "\n\n[ResNet-50 Analysis]: Model is currently loading, skipping secondary check.";
              }
            }
          } catch (hfErr) {
            console.warn("MediSync: Hugging Face ResNet-50 failed:", hfErr.message);
          }

          // 4. Optional: Run Local ML Inference (Bridge)
          let mlResultText = "";
          try {
            const mlResult = await runFractureInference(file.path);
            if (mlResult && !mlResult.error) {
              mlResultText = `\n\n[Local ML Inference]: ${mlResult.detected ? "FRACTURE DETECTED" : "No obvious fracture detected by local model"}. Confidence: ${(mlResult.confidence * 100).toFixed(2)}%.`;
              console.log("MediSync: Local ML Inference Complete.");
            } else if (mlResult?.error === "Model file not found") {
              console.log("MediSync: Local model missing, skipping ML bridge.");
            }
          } catch (mlErr) {
            console.warn("MediSync: ML Bridge failed:", mlErr.message);
          }
          
          documentText = (geminiText || "No vision analysis available.") + resnetResultText + mlResultText;
          console.log("MediSync: Final documentText length:", documentText.length);
          console.log("MediSync: Vision Analysis Complete.");
        } catch (err) {
          console.error("MediSync: Vision/OCR Failed:", err);
          documentText = "Document could not be parsed: Visual analysis failed.";
        }
    }


    const patientContext = `The patient's name, age, and gender are already provided: Name: ${patientProfile?.name || 'User'}, Age: ${age}, Gender: ${gender}.`;
    
    // Perform Rule-Based Triage (include document context if possible)
    const triageResult = calculateTriage(
      documentText, 
      patientProfile?.history || "", 
      0, 
      age === 'Unknown' ? 0 : age
    );

    const engineResults = `[ENGINE_RESULT]: Calculated Risk Category: ${triageResult.category}, Score: ${triageResult.score}/10. 
Reasoning: ${triageResult.reason}`;

    const dynamicSystemPrompt = systemPrompt
      .replace("{{PATIENT_CONTEXT}}", patientContext)
      .replace("{{ENGINE_RESULTS}}", engineResults);

    const analysisMessage = `You are MediBot. Analyze this medical text from an uploaded document in the context of the current patient (${patientProfile?.name}). If the document clearly belongs to someone else or is completely irrelevant, tell the patient to upload the correct report and DO NOT analyze it. Otherwise, extract key findings and suggest the next follow-up question following the clinical flow.\n\nDOCUMENT TEXT:\n${documentText.substring(0, 3000)}`;
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        { role: "user", content: analysisMessage }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.5,
      max_tokens: 1024,
    });

    const aiResponseText = chatCompletion.choices[0]?.message?.content || "I analyzed your document.";
    
    res.json({ 
      reply: aiResponseText, 
      documentText, 
      fileUrl: fileUrl,
      fileName: file.filename,
      originalName: file.originalname
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to process document." });
  }
});

app.post('/api/recommend-doctors', async (req, res) => {
  const { patientData } = req.body;
  const validSpecs = ["General Physician", "Cardiologist", "Neurologist", "Dermatologist", "Orthopedic", "Pediatrician", "ENT Specialist", "Gastroenterologist", "Pulmonologist", "Gynecologist"];

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a medical triage system. Your job is to analyze the patient's symptoms and recommend EXACTLY ONE specialization from this list: ${validSpecs.join(', ')}. 
          RULES:
          - If the symptoms involve muscle pain, joint pain, or bone injuries, YOU MUST recommend "Orthopedic".
          - If the patient is female and the issue is specifically about reproductive health or pregnancy, recommend "Gynecologist". Do NOT recommend Gynecologist for general issues like muscle pain, even if the patient is female.
          - If symptoms involve the heart, use Cardiologist.
          - If symptoms involve skin, use Dermatologist.
          - If the patient is a young child, use Pediatrician.
          - For minor, general, or unspecific issues like fever, cold, or generic pain, use "General Physician".
          Return strictly in JSON: { "specialization": "Name", "reason": "A short, professional reason why this specialist is best suited." }`
        },
        { role: "user", content: JSON.stringify(patientData) }
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" }
    });

    const aiResponseRaw = JSON.parse(completion.choices[0].message.content);
    let recommendedSpec = aiResponseRaw.specialization?.trim();
    
    const matchingDoctors = await prisma.user.findMany({
      where: {
        role: 'doctor',
        doctorProfile: { specialization: { contains: recommendedSpec } }
      },
      include: { doctorProfile: true }
    });

    res.json({
      recommended_specialization: recommendedSpec,
      reason: aiResponseRaw.reason,
      recommended_doctors: matchingDoctors.slice(0, 6)
    });
  } catch (error) {
    console.error("Recommendation Error:", error);
    res.status(500).json({ error: "Failed to recommend doctors" });
  }
});

app.get('/api/doctors', async (req, res) => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'doctor' },
      include: { doctorProfile: true }
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/doctor/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { 
        OR: [{ email: username }, { email: `${username}@medisync.com` }],
        role: 'doctor'
      },
      include: { doctorProfile: true }
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      const { password: _, ...userData } = user;
      // Ensure the top-level 'id' is ALWAYS the User ID, not the Profile ID
      const finalDoctorData = {
        ...userData.doctorProfile,
        ...userData,
        id: user.id 
      };
      res.json({ success: true, doctor: finalDoctorData, token });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/doctor/profile', async (req, res) => {
  try {
    const { userId, name, specialization, hospital, experience, consultation_fee, available_time_slots } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: "Missing userId" });
    }

    // Update user name if provided
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name }
      });
    }

    const updatedProfile = await prisma.doctorProfile.upsert({
      where: { userId },
      update: {
        specialization,
        hospital,
        experience: experience ? parseInt(experience) : undefined,
        consultation_fee: consultation_fee ? parseFloat(consultation_fee) : undefined,
        available_time_slots: available_time_slots ? (typeof available_time_slots === 'string' ? available_time_slots : JSON.stringify(available_time_slots)) : undefined
      },
      create: {
        userId,
        specialization: specialization || 'General Physician',
        hospital,
        experience: experience ? parseInt(experience) : 0,
        consultation_fee: consultation_fee ? parseFloat(consultation_fee) : 0,
        available_time_slots: available_time_slots ? (typeof available_time_slots === 'string' ? available_time_slots : JSON.stringify(available_time_slots)) : JSON.stringify([])
      }
    });

    res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error("MediSync Doctor Profile Update Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


app.get('/api/appointments/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      include: { 
        doctor: { include: { doctorProfile: true } },
        profile: true
      },
      orderBy: { appointment_date: 'asc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor-specific appointments
app.get('/api/appointments/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      include: { 
        patient: { select: { name: true, email: true } },
        profile: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/appointments/book', async (req, res) => {
  try {
    const { doctorId, patientId, appointmentDate, appointmentTime, status, ai_summary, medical_records, profileId } = req.body;
    let patient_name = req.body.patient_name;
    let finalProfileId = profileId;

    console.log("**************************************************");
    console.log("MediSync: NEW BOOKING REQUEST RECEIVED");
    console.log(`- Date: ${appointmentDate} | Time: ${appointmentTime}`);

    if (!doctorId || !patientId || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ success: false, error: "Missing required booking fields" });
    }

    // --- PAST DATE/TIME VALIDATION ---
    try {
      const now = new Date();
      
      // Parse appointment date (expected format: YYYY-MM-DD)
      const appDateTime = new Date(appointmentDate);
      
      // Parse appointment time (expected format: "HH:MM AM/PM")
      const [time, ampm] = appointmentTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      appDateTime.setHours(hours, minutes, 0, 0);
      
      if (appDateTime < now) {
        console.warn(`MediSync: Rejecting booking for past time: ${appDateTime.toISOString()} (Now: ${now.toISOString()})`);
        return res.status(400).json({ 
          success: false, 
          error: "Cannot book an appointment in the past. Please select a future time slot." 
        });
      }
    } catch (parseErr) {
      console.error("MediSync: Date validation error:", parseErr);
      // If we can't parse it, we'll continue but this is a red flag
    }
    // ---------------------------------
    console.log(`- Doctor ID: ${doctorId}`);
    console.log(`- Patient ID (Account): ${patientId}`);
    console.log(`- Profile ID: ${finalProfileId}`);
    console.log(`- Patient Name (Person): ${patient_name}`);
    console.log(`- Date: ${appointmentDate} | Time: ${appointmentTime}`);
    console.log("**************************************************");

    if (!doctorId || !patientId) {
      return res.status(400).json({ success: false, error: "Missing doctorId or patientId" });
    }

    // Double check patient existence to prevent P2003
    const patientExists = await prisma.user.findUnique({ where: { id: patientId } });
    if (!patientExists) {
      console.error(`MediSync: Booking failed. Patient ID ${patientId} not found in database!`);
      return res.status(404).json({ 
        success: false, 
        error: `Patient ID ${patientId} does not exist in our system. Please try logging out and back in.` 
      });
    }

    // Auto-create profile if patient_name provided but profileId is missing
    if (!finalProfileId && patient_name) {
      try {
        const profile = await prisma.profile.upsert({
          where: { userId_name: { userId: patientId, name: patient_name } },
          update: {},
          create: { userId: patientId, name: patient_name, relation: 'Self', color: 'bg-mediteal' }
        });
        finalProfileId = profile.id;
        console.log(`MediSync: Linked appointment to profile: ${profile.name} (${profile.id})`);
      } catch (profileErr) {
        console.error("MediSync: Failed to auto-sync profile during booking:", profileErr);
      }
    }

    const doctorExists = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctorExists) {
      console.error(`MediSync: Booking failed. Doctor ID ${doctorId} not found in database!`);
      return res.status(404).json({ success: false, error: "Doctor not found" });
    }

    // --- Parse AI Triage Classification ---
    let severityScore = null;
    let triageCategory = null;
    if (ai_summary) {
      // Support both old and new field names for backward compatibility
      const scoreMatch = ai_summary.match(/(?:Severity Score|Risk Level):\s*([\d\w]+)/i);
      if (scoreMatch) {
         const scoreVal = scoreMatch[1].toUpperCase();
         if (scoreVal === 'HIGH' || scoreVal === 'EMERGENCY') severityScore = 9;
         else if (scoreVal === 'MODERATE') severityScore = 5;
         else if (scoreVal === 'LOW' || scoreVal === 'NORMAL') severityScore = 2;
         else {
           const parsed = parseInt(scoreVal, 10);
           if (!isNaN(parsed)) severityScore = parsed;
         }
      }
      
      const categoryMatch = ai_summary.match(/(?:Triage Category|Risk Level):\s*(Normal|Moderate|Emergency|HIGH|LOW|MODERATE)/i);
      if (categoryMatch) {
         const cat = categoryMatch[1].toUpperCase();
         if (cat === 'HIGH' || cat === 'EMERGENCY') triageCategory = 'Emergency';
         else if (cat === 'LOW' || cat === 'NORMAL') triageCategory = 'Normal';
         else if (cat === 'MODERATE') triageCategory = 'Moderate';
         else triageCategory = categoryMatch[1].charAt(0).toUpperCase() + categoryMatch[1].slice(1).toLowerCase();
      }
    }
    // --------------------------------------

    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        profileId: finalProfileId,
        patient_name: patient_name, 
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        appointment_type: req.body.appointmentType || 'Video Call',
        status: status || 'Scheduled',
        ai_generated_summary: ai_summary,
        severity_score: severityScore,
        triage_category: triageCategory,
        medical_records: JSON.stringify(medical_records),
        payment_id: req.body.paymentId
      }
    });
    
    // Create notifications for the doctor
    await createNotification({
      userId: doctorId,
      type: 'appointment_booked',
      title: 'New Appointment Booked',
      message: `A new appointment has been scheduled by ${patient_name} for ${appointmentDate} at ${appointmentTime}.`
    });

    // Also notify the patient
    await createNotification({
      userId: patientId,
      type: 'appointment_booked',
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. ${doctorExists.name} has been successfully booked for ${appointmentDate} at ${appointmentTime}. Status: Pending Approval.`
    });

    // Emit real-time appointment update to patient
    io.to(`user-${patientId}`).emit('appointment_booked', {
      appointmentId: appointment.id,
      doctorName: doctorExists.name,
      date: appointmentDate,
      time: appointmentTime,
      status: appointment.status
    });

    if (req.body.paymentId) {
      await createNotification({
        userId: doctorId,
        type: 'payment_success',
        title: 'Payment Received',
        message: `Payment of ₹${doctorExists.doctorProfile?.consultation_fee || 500} recorded for appointment with ${patient_name}.`
      });
    }

    console.log("MediSync: Appointment created successfully:", appointment.id);
    res.json({ success: true, appointment });
  } catch (error) {
    console.error("MediSync: Booking route error:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      technical_details: error.code // Prisma error code
    });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`MediSync: Updating appointment ${id} status to: ${status}`);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status }
    });

    res.json({ success: true, appointment });
  } catch (error) {
    console.error("MediSync: Status update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/appointments/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime } = req.body;
    
    console.log(`MediSync: Rescheduling appointment ${id} to ${appointmentDate} at ${appointmentTime}`);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { 
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'Rescheduled'
      }
    });

    res.json({ success: true, appointment });
  } catch (error) {
    console.error("MediSync: Reschedule error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder',
});

app.post('/api/payment/create-order', async (req, res) => {
  const { amount } = req.body;
  try {
    const options = { amount: amount * 100, currency: "INR", receipt: `receipt_${Date.now()}` };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Payment failed" });
  }
});

// Jitsi Meeting Routes
const generateJitsiToken = (user, room) => {
    const appId = process.env.JITSI_APP_ID;
    const kid = process.env.JITSI_KID;
    const privateKey = process.env.JITSI_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!appId || !privateKey || !kid) {
        console.warn("MediSync: Jitsi JaaS credentials not fully configured. Using public mode.");
        return null;
    }

    const payload = {
        aud: 'jitsi',
        iss: 'chat',
        sub: appId,
        room: "*", // Allow all rooms for this token to simplify for now, or match specific room
        context: {
            user: {
                id: user.id || 'anonymous',
                name: user.name || 'User',
                email: user.email || '',
                avatar: user.avatar || '',
                moderator: user.role === 'doctor'
            },
            features: {
                livestreaming: true,
                'file-upload': true,
                'outbound-call': true,
                'sip-outbound-call': false,
                transcription: true,
                'list-visitors': false,
                recording: true,
                flip: false
            }
        },
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 2), // 2 hours
        nbf: Math.floor(Date.now() / 1000) - 10
    };

    try {
        return jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: kid });
    } catch (e) {
        console.error("MediSync: Jitsi Token signing failed:", e);
        return null;
    }
};

app.post('/api/meetings/start', async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;
    console.log("MediSync: Starting meeting initialization...", { patientId, doctorId, appointmentId });

    if (!patientId || !doctorId) {
      console.error("MediSync: Missing required IDs for meeting");
      return res.status(400).json({ success: false, error: "Missing patientId or doctorId" });
    }

    const roomId = `medisync-${uuidv4().substring(0, 8)}`;
    console.log("MediSync: Generated Room ID:", roomId);

    const meeting = await prisma.meeting.create({
      data: {
        roomId,
        doctorId,
        patientId,
        appointmentId,
        status: 'active',
        started_at: new Date()
      }
    });

    // Generate JaaS data
    const jitsiDomain = process.env.JITSI_APP_ID ? "8x8.vc" : "meet.jit.si";
    const jitsiAppID = process.env.JITSI_APP_ID || null;

    // Notify the patient via Socket.io
    const doctor = await prisma.user.findUnique({ 
        where: { id: doctorId },
        include: { doctorProfile: true }
    });
    
    console.log(`MediSync SOCKET: Attempting to notify patient ${patientId} about meeting ${roomId}`);
    
    const patientUser = await prisma.user.findUnique({ where: { id: patientId } });
    const patientToken = generateJitsiToken(patientUser || { id: patientId, name: 'Patient', role: 'patient' }, roomId);

    io.to(`user-${patientId}`).emit('meeting_invite', {
      roomId,
      doctorName: doctor?.name,
      specialty: doctor?.doctorProfile?.specialization || 'General Physician',
      appointmentId,
      jitsiDomain,
      jitsiAppID,
      jwt: patientToken
    });
    
    console.log(`MediSync SOCKET: Invite emitted to user-${patientId}`);

    // Generate token for the doctor (moderator)
    const doctorToken = generateJitsiToken(doctor, roomId);

    res.json({ 
      success: true, 
      roomId, 
      jitsiDomain, 
      jitsiAppID,
      jwt: doctorToken,
      meetingId: meeting.id 
    });
  } catch (error) {
    console.error("Error starting meeting:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/meetings/join', async (req, res) => {
  try {
    const { roomId, userId, role } = req.body;
    const meeting = await prisma.meeting.update({
      where: { roomId },
      data: { status: 'active' }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ success: true, roomId, displayName: user.name, meetingId: meeting.id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/meetings/details/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`MediSync: Fetching details for room: ${roomId}`);

    const meeting = await prisma.meeting.findUnique({
      where: { roomId },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: { include: { doctorProfile: true } }
          }
        }
      }
    });

    if (!meeting) {
      return res.status(404).json({ success: false, error: "Meeting not found" });
    }

    // Generate JaaS data
    const jitsiDomain = process.env.JITSI_APP_ID ? "8x8.vc" : "meet.jit.si";
    const jitsiAppID = process.env.JITSI_APP_ID || null;

    // Determine user context for token generation (simplified: usually extract from auth middleware)
    // For now, we return the base meeting/appointment data.
    // The frontend should ideally send its own token or we detect role from session.
    
    res.json({
      success: true,
      roomId: meeting.roomId,
      appointment: {
        ...meeting.appointment,
        patientName: meeting.appointment?.patient_name || meeting.appointment?.patient?.name
      },
      jitsiDomain,
      jitsiAppID,
      status: meeting.status
    });
  } catch (error) {
    console.error("MediSync: Error fetching meeting details:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/meetings/prescription', async (req, res) => {
  try {
    const { meetingId, doctorId, patientId, diagnosis, medications, notes, followUpDate } = req.body;
    
    const prescription = await prisma.prescription.create({
      data: {
        meetingId,
        doctorId,
        patientId,
        diagnosis,
        medications: JSON.stringify(medications),
        notes,
        follow_up_date: followUpDate,
        // pdf_url logic placeholder
      }
    });

    // Notify patient
    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    io.to(`user-${patientId}`).emit('prescription_ready', {
      prescriptionId: prescription.id,
      doctorName: doctor?.name,
      diagnosis
    });

    res.json({ success: true, prescription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notifications API
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to last 50
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/notifications/read-all/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

server.listen(port, () => {
  console.log(`MediSync Backend running on http://localhost:${port}`);
});
