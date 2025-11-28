/**
 * RESUME ANNEX - ENTERPRISE BACKEND
 * ---------------------------------
 * Enterprise-grade server implementing:
 * 1. GPT-4o Intelligence (The "Best Agent")
 * 2. Context-Aware Chat (Intake)
 * 3. Gap Analysis Strategy
 */

require('dotenv').config(); 
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai'); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, 
});

// --- MIDDLEWARE ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// --- RATE LIMITING ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', apiLimiter);

// --- ROUTES ---

// 1. Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Resume Annex AI', model: 'gpt-4o' });
});

// 2. LIVE DEMO (Bullet Point Rewrite)
app.post('/api/optimize', async (req, res) => {
    try {
        const { bulletPoint } = req.body;
        if (!bulletPoint) return res.status(400).json({ error: 'No content' });

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "You are an Executive Resume Writer. Rewrite the input to be high-impact, quantified, and results-driven." },
                { role: "user", content: `Optimize this bullet: "${bulletPoint}"` }
            ],
            model: "gpt-4o", // Upgraded to smartest model
        });

        res.json({ enhanced: completion.choices[0].message.content.trim() });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI Service Unavailable" });
    }
});

// 3. ENTERPRISE INTAKE CHAT (The "Gap Analyzer")
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body; 
        if (!messages) return res.status(400).json({ error: 'No messages provided' });

        // The "Enterprise" Persona
        const systemPrompt = {
            role: "system",
            content: `You are the Senior Architect for Resume Annex. Your goal is to analyze the candidate's profile for "Gaps" (missing metrics, vague leadership, undefined scope).
            
            STRATEGY:
            1. Start by acknowledging the resume upload.
            2. Immediately identify a potential "Gap" based on their introduction. 
            3. Ask ONE short, high-impact question to fill that gap.
            4. Be conversational but authoritative. Do not be generic.
            
            Example: "I see you led the sales team, but I don't see the revenue impact. What was the specific % growth you drove in 2024?"`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt, ...messages],
            model: "gpt-4o", // Best intelligence agent
        });

        res.json({ reply: completion.choices[0].message.content.trim() });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "AI Service Unavailable" });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`>>> Resume Annex Enterprise Engine running on port ${PORT}`);
});