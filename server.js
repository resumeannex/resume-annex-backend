/**
 * RESUME ANNEX - ENTERPRISE BACKEND (v2.0 Stable)
 * Fixes: CORS blocking, API Crashing, Error Logging
 */

require('dotenv').config(); 
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai'); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. ROBUST CONFIGURATION ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

// --- 2. SECURITY MIDDLEWARE ---
app.use(helmet());

// CRITICAL FIX: Allow your frontend to talk to this server
app.use(cors({
    origin: '*', // Temporarily allow all for debugging. In production, change to your domain.
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '10kb' }));

// --- 3. ROUTES ---

// Health Check - Call this to prove server is alive
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ONLINE', message: 'System Operational' });
});

// Live Demo Endpoint
app.post('/api/optimize', async (req, res) => {
    try {
        console.log("Optimization Request Received"); // Server Log
        const { bulletPoint } = req.body;
        
        if (!bulletPoint) return res.status(400).json({ error: 'No text provided' });

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Rewrite this resume bullet to be high-impact and quantified." },
                { role: "user", content: bulletPoint }
            ],
            model: "gpt-4o",
        });

        res.json({ enhanced: completion.choices[0].message.content.trim() });

    } catch (error) {
        console.error("AI Error:", error.message); // Logs exact error to Railway console
        res.status(500).json({ error: error.message || "AI Service Failed" });
    }
});

// Intake Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, plan } = req.body; 
        
        // Define closing message based on plan
        let closingMsg = "We will email your draft soon.";
        if (plan === 'executive') closingMsg = "I am preparing your brief for the Senior Writer. Expect a scheduling link shortly.";
        if (plan === 'pro') closingMsg = "We are drafting your documents. Expect an email in 48 hours.";

        const systemPrompt = {
            role: "system",
            content: `You are the Resume Annex Architect. 
            RULES:
            1. If the user says "no", "none", "done", or "nothing to add", YOU MUST END THE CHAT.
            2. To end the chat, strictly say: "Thank you. ${closingMsg}"
            3. Otherwise, ask ONE specific follow-up question based on the resume gap.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt, ...messages],
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content.trim() });

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`>>> Server Active on Port ${PORT}`);
});