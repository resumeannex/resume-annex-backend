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
// 3. ENTERPRISE INTAKE CHAT (Context-Aware + Termination Logic)
app.post('/api/chat', async (req, res) => {
    try {
        // We now accept 'plan' from the frontend to know which package they bought
        const { messages, plan } = req.body; 
        if (!messages) return res.status(400).json({ error: 'No messages provided' });

        // Define Next Steps based on the Plan
        let nextStepsText = "Your optimized draft will be emailed to you within 3 business days.";
        if (plan === 'executive') {
            nextStepsText = "I will now prepare your briefing for the Senior Writer. Expect a scheduling link for your narrative strategy call within 24 hours.";
        } else if (plan === 'pro') {
            nextStepsText = "Our team will begin drafting your Professional documents immediately. Expect the first version via email in 48-72 hours.";
        } else if (plan === 'core') {
            nextStepsText = "We will process your ATS optimization and send the revised file shortly.";
        }

        // The "Enterprise" Persona with KILL SWITCH
        const systemPrompt = {
            role: "system",
            content: `You are the Senior Architect for Resume Annex. Your goal is to gather info, BUT you must respect the user's time.
            
            CORE RULES:
            1. Analyze the profile for gaps. Ask ONE short, high-impact question at a time.
            2. CRITICAL: If the user answers "no", "none", "nothing", "I'm done", or gives very short negative responses, DO NOT ASK MORE QUESTIONS.
            3. CRITICAL: If you have asked 3-4 questions already, wrap it up.
            
            CLOSING PROTOCOL:
            If the user is done or the conversation is stagnant, you MUST end the chat.
            Say exactly: "Thank you. I have captured everything I need. ${nextStepsText}"
            Do not ask "Is there anything else?". Just close the session.`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt, ...messages],
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content.trim() });

    } catch (error) {
        console.error("Chat Error:", error);
        res.status(500).json({ error: "AI Service Unavailable" });
    }
});
