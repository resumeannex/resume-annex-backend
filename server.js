/**
 * RESUME ANNEX - ENTERPRISE BACKEND v3.0
 * Features: PDF Text Extraction, Anti-Hallucination, Session Management
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const OpenAI = require('openai');
const multer = require('multer'); // Handle file uploads
const pdf = require('pdf-parse'); // Read PDF text

const app = express();
const upload = multer(); // Memory storage for uploads
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. UPLOAD & PARSE ENDPOINT (The Fix for Hallucinations)
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        // Extract Text from PDF
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text;

        // Initialize Chat with REAL Resume Data
        const systemPrompt = {
            role: "system",
            content: `You are the Senior Architect. 
            CONTEXT: The user has uploaded a resume. The text is below.
            RESUME TEXT: "${resumeText.substring(0, 10000)}" 
            
            TASK: 
            1. Analyze this specific text for missing metrics or vague claims.
            2. Ask ONE clarifying question based ONLY on this text.
            3. If the resume is empty or unreadable, ask them to paste the text.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt],
            model: "gpt-4o",
        });

        res.json({ 
            reply: completion.choices[0].message.content,
            initialContext: systemPrompt // Send this back so frontend remembers it
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "Could not read file. Please try pasting text." });
    }
});

// 2. CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, plan } = req.body;
        
        // Closing Logic
        let closingMsg = "We will email your draft within 48 hours.";
        if (plan === 'executive') closingMsg = "I am preparing your executive brief.";

        const systemPrompt = {
            role: "system",
            content: `You are the Resume Architect.
            RULES:
            1. Keep context of the resume text provided earlier.
            2. If user says "no", "done", or "none", say: "Thank you. ${closingMsg}" and stop.
            3. Otherwise, ask the next strategic question.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt, ...messages],
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));