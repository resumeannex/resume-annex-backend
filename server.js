/**
 * RESUME ANNEX - ENTERPRISE BACKEND v5.0 (Final)
 * Features: 
 * - Strict 4-Question Limit
 * - Auto-Generation of Final Resume (HTML/CSS)
 * - Context Merging (Old Resume + New Answers)
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

let openai;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
} catch (err) { console.error(err); }

app.use(helmet());
app.use(cors({ origin: '*' })); 
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ONLINE' }));

// 1. LIVE DEMO
app.post('/api/optimize', async (req, res) => {
    try {
        const { bulletPoint } = req.body;
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Rewrite this bullet point to be executive-level, quantified, and high-impact. Output ONLY the text." },
                { role: "user", content: bulletPoint }
            ],
            model: "gpt-4o",
        });
        res.json({ enhanced: completion.choices[0].message.content });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. UPLOAD
app.post('/api/upload', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        const pdfData = await pdf(req.file.buffer);
        const resumeText = pdfData.text.substring(0, 20000);

        const systemPrompt = {
            role: "system",
            content: `You are a Senior Resume Strategist.
            CONTEXT: User uploaded a resume (text below).
            GOAL: Ask 4 strategic questions to improve it.
            
            CURRENT STEP: 
            1. Acknowledge upload.
            2. Ask Question 1 (Focus on Career Aspirations or specific gap).
            
            RESUME: "${resumeText}"`
        };

        const completion = await openai.chat.completions.create({
            messages: [systemPrompt],
            model: "gpt-4o",
        });

        res.json({ 
            reply: completion.choices[0].message.content,
            initialContext: systemPrompt 
        });
    } catch (error) { res.status(500).json({ error: "Upload failed" }); }
});

// 3. CHAT & GENERATE
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, questionCount } = req.body;
        
        // --- CHECK TERMINATION CONDITIONS ---
        // Stop if: 4 questions answered OR user says "no/done"
        const lastUserMsg = messages[messages.length - 1].content.toLowerCase();
        const isFinished = questionCount >= 4 || 
                           ["no", "none", "done", "nothing"].some(word => lastUserMsg.includes(word));

        if (isFinished) {
            // --- GENERATION PHASE ---
            const generationPrompt = {
                role: "system",
                content: `TASK: The interview is over. WRITE THE FINAL RESUME.
                
                INSTRUCTIONS:
                1. Combine the Original Resume text (from history) with the User's Answers.
                2. Fix all gaps and improve the wording to "Executive" level.
                3. Output the result as a CLEAN, MODERN HTML Document.
                4. Use inline CSS for styling (font-family: Arial, clean whitespace, bold headers).
                5. Do NOT include markdown ticks (\`\`\`). Just the raw HTML.
                6. Structure: Header, Summary, Experience, Education, Skills.`
            };

            const completion = await openai.chat.completions.create({
                messages: [...messages, generationPrompt],
                model: "gpt-4o",
            });

            const finalHtml = completion.choices[0].message.content
                .replace(/```html/g, '').replace(/```/g, ''); // Clean formatting

            return res.json({ 
                reply: "Thank you. I have gathered all necessary data.",
                generatedResume: finalHtml, // Send the document
                isComplete: true
            });
        }

        // --- NORMAL CHAT PHASE ---
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o",
        });

        res.json({ reply: completion.choices[0].message.content, isComplete: false });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));