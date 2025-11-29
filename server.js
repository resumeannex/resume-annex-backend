/**
 * RESUME ANNEX - ENTERPRISE BACKEND v4.0 (Production)
 * Features: 
 * - PDF Text Extraction
 * - Anti-Hallucination Context
 * - Focused Career Interview Logic (Aspirations, Education, Experience)
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer'); 
const pdf = require('pdf-parse'); 

const app = express();
const upload = multer(); 
const PORT = process.env.PORT || 3000;

// Initialize OpenAI safely
let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
        console.warn("WARNING: OPENAI_API_KEY is missing.");
    }
} catch (err) {
    console.error("OpenAI Init Error:", err);
}

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' })); 
app.use(express.json({ limit: '10mb' }));

// --- ROUTES ---

app.get('/health', (req, res) => res.status(200).json({ status: 'ONLINE' }));

// 1. LIVE DEMO ENDPOINT (Restored)
app.post('/api/optimize', async (req, res) => {
    try {
        if (!openai) throw new Error("AI Offline");
        const { bulletPoint } = req.body;
        
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are an Executive Resume Writer. Rewrite the input bullet point to be high-impact, quantified, and results-driven. Output ONLY the rewritten bullet." },
                { role: "user", content: `Optimize: "${bulletPoint}"` }
            ],
            model: "gpt-4o",
        });

        res.json({ enhanced: completion.choices[0].message.content.trim() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. RESUME UPLOAD & PARSE
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!openai) throw new Error("AI Offline");
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Extract Text
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text.substring(0, 15000); // Limit context size

        // System Prompt: Career Coach Persona
        // Instructions: Do NOT output the analysis. Only output the question.
        const systemPrompt = {
            role: "system",
            content: `You are a Senior Career Strategist for Resume Annex. 
            
            CONTEXT: The user has just uploaded their resume text (provided below).
            
            YOUR GOAL: Conduct a professional intake interview to prepare for writing their resume.
            
            RULES:
            1. Do NOT output lists like "Gap Analysis" or "Findings". 
            2. Be conversational. Act like a human recruiter.
            3. Start by acknowledging the file upload.
            4. Ask ONE strategic question focused on: Career Aspirations, Specific Experience details, or Educational clarifications.
            5. Do NOT have two conversations at once.
            
            RESUME DATA: "${resumeText}"`
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
        console.error("Upload Error:", error);
        res.status(500).json({ error: "File processing failed." });
    }
});

// 3. CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
    try {
        if (!openai) throw new Error("AI Offline");
        const { messages } = req.body;

        const completion = await openai.chat.completions.create({
            messages: messages, // History passed from frontend
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`>>> Server Running on ${PORT}`));