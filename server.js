/**
 * RESUME ANNEX - ENTERPRISE BACKEND
 * ---------------------------------
 * Production-ready server structure implementing:
 * 1. Security Headers (Helmet)
 * 2. Rate Limiting (DDoS Protection)
 * 3. API Architecture
 * 4. REAL OpenAI Integration
 */

require('dotenv').config(); // Load environment variables
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai'); // Import OpenAI

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURATION ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Pulls key from Railway Variables
});

// --- MIDDLEWARE ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// --- RATE LIMITING ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, // Stricter limit for real AI (saves money)
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', apiLimiter);

// --- ROUTES ---

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Resume Annex AI' });
});

// REAL AI OPTIMIZATION
app.post('/api/optimize', async (req, res) => {
    try {
        const { bulletPoint } = req.body;

        if (!bulletPoint) {
            return res.status(400).json({ error: 'No content provided' });
        }

        // Call OpenAI GPT-4o or GPT-3.5-turbo
        const completion = await openai.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are an expert Executive Resume Writer. Your task is to rewrite the user's resume bullet point to be high-impact, results-oriented, and quantified. Use strong action verbs. Return ONLY the rewritten bullet point." 
                },
                { 
                    role: "user", 
                    content: `Rewrite this resume bullet point: "${bulletPoint}"` 
                }
            ],
            model: "gpt-3.5-turbo", // Use "gpt-4o" for better quality but higher cost
        });

        const enhancedText = completion.choices[0].message.content.trim();

        res.json({
            original: bulletPoint,
            enhanced: enhancedText
        });

    } catch (error) {
        console.error("OpenAI Error:", error);
        res.status(500).json({ error: "AI Service Unavailable" });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`>>> Resume Annex Enterprise Engine running on port ${PORT}`);
});