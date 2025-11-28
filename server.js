/**
 * RESUME ANNEX - ENTERPRISE BACKEND
 * ---------------------------------
 * Production-ready server structure implementing:
 * 1. Security Headers (Helmet)
 * 2. Rate Limiting (DDoS Protection)
 * 3. API Architecture
 */

const express = require('express');
const helmet = require('helmet'); // Security headers
const cors = require('cors');     // Cross-origin resource sharing
const rateLimit = require('express-rate-limit'); // Prevent abuse

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. ENTERPRISE SECURITY MIDDLEWARE ---
app.use(helmet()); // Protects against XSS and header attacks
app.use(cors());   // Allows frontend to communicate securely
app.use(express.json({ limit: '10kb' })); // Prevents large payload attacks

// --- 2. RATE LIMITING (Cost Control) ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: "Too many requests from this IP, please try again later."
});
app.use('/api/', apiLimiter);

// --- 3. API ENDPOINTS ---

// Health Check (For Monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', environment: 'production' });
});

// AI Optimization Endpoint (Mock)
app.post('/api/optimize', (req, res) => {
    const { bulletPoint } = req.body;
    
    // In real production, this calls OpenAI/Gemini API
    // We mock it here for the prototype
    if (!bulletPoint) {
        return res.status(400).json({ error: 'No content provided' });
    }

    res.json({
        original: bulletPoint,
        enhanced: "Spearheaded a strategic initiative that increased efficiency by 20%...",
        metrics: { ats_score: 85, impact: "High" }
    });
});

// Subscription Webhook (Stripe Integration Placeholder)
app.post('/api/webhooks/stripe', (req, res) => {
    // This receives payment confirmation from Stripe
    console.log("Payment received");
    res.status(200).send('Received');
});

// --- 4. SERVE FRONTEND (Production Mode) ---
app.use(express.static('.')); // Serves your HTML files

// --- 5. START SERVER ---
app.listen(PORT, () => {
    console.log(`>>> Resume Annex Enterprise Engine running on port ${PORT}`);
    console.log(`>>> Security Protocols: ACTIVE`);
});