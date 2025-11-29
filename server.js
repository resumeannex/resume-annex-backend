/**
 * RESUME ANNEX - ENTERPRISE BACKEND v3.1 (Stable)
 * Features: PDF Text Extraction, Anti-Crash Startup, Robust Error Handling
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer'); // File handling
const pdf = require('pdf-parse'); // PDF reading

const app = express();
const upload = multer(); // Memory storage
const PORT = process.env.PORT || 3000;

// --- 1. SAFETY CHECK: PREVENT STARTUP CRASH ---
let openai;
try {
    if (!process.env.OPENAI_API_KEY) {
        console.error("CRITICAL ERROR: OPENAI_API_KEY is missing in Railway Variables.");
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (err) {
    console.error("OpenAI Initialization Failed:", err.message);
}

// --- 2. MIDDLEWARE ---
app.use(helmet());
app.use(cors({ origin: '*' })); // Allow all connections for now
app.use(express.json({ limit: '10mb' })); // Increased limit for larger PDFs

// --- 3. ROUTES ---

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ONLINE', 
        ai_status: openai ? 'CONNECTED' : 'DISCONNECTED' 
    });
});

// UPLOAD & PARSE ENDPOINT
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!openai) throw new Error("AI System is offline (Missing Key)");
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        console.log(`Processing file: ${req.file.originalname}`);

        // Extract Text
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text;

        // Initialize Chat with REAL Context
        const systemPrompt = {
            role: "system",
            content: `You are the Senior Architect. 
            CONTEXT: The user has uploaded a resume.
            RESUME TEXT: "${resumeText.substring(0, 15000)}" 
            
            TASK: 
            1. Analyze this text for gaps.
            2. Ask ONE clarifying question based ONLY on this text.
            3. Do not invent previous employers.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt],
            model: "gpt-4o",
        });

        res.json({ 
            reply: completion.choices[0].message.content,
            initialContext: systemPrompt 
        });

    } catch (error) {
        console.error("Upload Error:", error.message);
        res.status(500).json({ error: error.message || "Failed to process file" });
    }
});

// CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
    try {
        if (!openai) throw new Error("AI System is offline (Missing Key)");
        const { messages, plan } = req.body;
        
        let closingMsg = "We will email your draft within 48 hours.";
        if (plan === 'executive') closingMsg = "I am preparing your executive brief.";

        const systemPrompt = {
            role: "system",
            content: `You are the Resume Architect.
            RULES:
            1. Keep context of the resume provided.
            2. If user says "no", "done", or "none", say: "Thank you. ${closingMsg}" and stop.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt, ...messages],
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content });

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`>>> Server Running on Port ${PORT}`);
    console.log(`>>> AI Connection: ${openai ? 'Active' : 'Inactive (Check Logs)'}`);
});