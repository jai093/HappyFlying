// TravelIntell Express server - watched v5 with auto port-clearing
const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

// Security & Utility Headers Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// SLIDING WINDOW RATE LIMITER (DDOS & Quota Protection: 30 requests/min per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function rateLimiter(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const userRecord = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > userRecord.resetTime) {
        userRecord.count = 1;
        userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        userRecord.count++;
    }

    rateLimitMap.set(ip, userRecord);

    if (userRecord.count > MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded. Please wait a minute before making more requests.',
            retryAfterSeconds: Math.ceil((userRecord.resetTime - now) / 1000)
        });
    }
    next();
}

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// Load tours database
const toursDbPath = path.join(__dirname, 'tours_db.json');
let toursData = [];

try {
    const rawData = fs.readFileSync(toursDbPath, 'utf8');
    toursData = JSON.parse(rawData);
    console.log(`Loaded ${toursData.length} tours successfully.`);
} catch (error) {
    console.error('Failed to load tours_db.json:', error);
}

// Ollama Cloud configuration - loads from process.env for Vercel deployment security
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "e9f10951a7c34ac2b037e4846877fee5.iRJ7UDzbxYzJ9cnAhs8OY1_O";
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "https://ollama.com";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gpt-oss:120b";

// ENTERPRISE LRU CACHE WITH TTL & MAX SIZE BOUND
class BoundedLRUCache {
    constructor(maxItems = 500, ttlMs = 2 * 60 * 60 * 1000) {
        this.maxItems = maxItems;
        this.ttlMs = ttlMs;
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // Refresh position for LRU
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.value;
    }

    set(key, value) {
        if (this.cache.size >= this.maxItems) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
}

const responseCache = new BoundedLRUCache(500, 2 * 60 * 60 * 1000);

// API: Get all tours
app.get('/api/tours', (req, res) => {
    res.json(toursData);
});

// API: Agent Chat routing (RAG-infused SSE Streaming with Rate Limiting)
app.post('/api/agent/chat', rateLimiter, async (req, res) => {
    const { messages, selectedTourId } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Missing or invalid messages array parameter.' });
    }

    // 0. Cache Check
    const lastMsgContent = messages[messages.length - 1]?.content || "";
    const cacheKey = `${selectedTourId || 'general'}_${lastMsgContent.trim()}`;
    
    if (responseCache.has(cacheKey)) {
        console.log(`[Cache Hit] Serving response for: "${lastMsgContent.substring(0, 30)}..."`);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const cachedContent = responseCache.get(cacheKey);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: cachedContent } }] })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
    }

    // 1. Gather context
    let injectedContext = "";
    
    // Check if a specific tour is selected
    if (selectedTourId) {
        const selectedTour = toursData.find(t => t.id === parseInt(selectedTourId));
        if (selectedTour) {
            injectedContext += `\n[SELECTED TOUR CONTEXT]\n`;
            injectedContext += `Title: ${selectedTour.title}\n`;
            injectedContext += `Segment: ${selectedTour.segment} (${selectedTour.region})\n`;
            injectedContext += `Duration: ${selectedTour.duration}\n`;
            injectedContext += `Price: ${selectedTour.price}\n`;
            injectedContext += `Best Seasons: ${selectedTour.seasons.join(', ')}\n`;
            injectedContext += `Inclusions: ${selectedTour.inclusions.join(', ')}\n`;
            injectedContext += `Exclusions: ${selectedTour.exclusions.join(', ')}\n`;
            if (selectedTour.warnings && selectedTour.warnings.length > 0) {
                injectedContext += `Important Warnings/Regulations: ${selectedTour.warnings.join('; ')}\n`;
            }
            injectedContext += `Itinerary Timeline:\n`;
            selectedTour.days.forEach(d => {
                injectedContext += `- ${d.day} (${d.title}): ${d.description.substring(0, 150)}...\n`;
            });
        }
    } else {
        // Run simple RAG keyword match based on user's last message
        const lastMessage = messages[messages.length - 1]?.content || "";
        const words = lastMessage.toLowerCase().split(/\s+/);
        
        // Find matching tours
        const matches = toursData.filter(t => {
            return words.some(w => w.length > 3 && (t.title.toLowerCase().includes(w) || t.region.toLowerCase().includes(w)));
        }).slice(0, 3); // limit to top 3
        
        if (matches.length > 0) {
            injectedContext += `\n[RELEVANT TOUR PRODUCTS DETECTED IN DATABASE]\n`;
            matches.forEach(t => {
                injectedContext += `- Tour ID ${t.id}: ${t.title} (${t.duration}, Price: ${t.price}, Best Seasons: ${t.seasons.join(', ')})\n`;
            });
        }
    }

    // 2. Build system instruction
    const systemPrompt = `You are FlyAgent, an elite AI Director of Marketing, Digital Growth, and Sales Strategy for HappyFlying Tours & Travels (https://happyflyingtravels.com/). 
You operate like ChatGPT and Gemini — intelligent, adaptive, conversational, and hyper-efficient.

CONVERSATIONAL BEHAVIOR RULES:
1. GREETINGS & CASUAL INPUTS: If the user says hello or a short greeting (e.g. "hey", "hi", "hello", "good morning"), respond warmly, concisely (1-3 sentences max), and ask how you can help them boost sales, craft campaigns, or generate ad copy today. DO NOT dump massive unwanted marketing templates unless explicitly asked.
2. SPECIFIC MARKETING & SALES TASKS: When asked for campaigns, social media posts, ad copy, sales scripts, SEO strategies, or digital marketing advice, deliver world-class, ready-to-use executive materials instantly.
3. CONVERSATIONAL FLOW: Be direct, clear, professional, and action-oriented. Adapt your response length strictly to the user's prompt.

CRITICAL FORMATTING INSTRUCTION: Do NOT use asterisks (*) anywhere in your output. Do not use Markdown asterisks like **bold** or * italic. Use clean headers, hyphen '-' or bullet '•' for lists.

${injectedContext ? `Use the following tour data from HappyFlying's catalog to construct your answer:\n${injectedContext}` : "You have access to HappyFlying's catalog of 152 domestic and international tour packages."}`;

    // Construct full messages list for the API
    const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
    ];

    try {
        console.log(`Sending streaming prompt to Ollama cloud completions API for model ${OLLAMA_MODEL}...`);
        
        const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OLLAMA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: apiMessages,
                stream: true // Enable streaming!
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Ollama API responded with status ${response.status}: ${errText}`);
        }

        // Set headers for SSE streaming to the client
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            let chunkText = decoder.decode(value);
            
            // Strip raw asterisks from stream output
            chunkText = chunkText.replace(/\*/g, '');
            res.write(chunkText);
            
            // Extract content to save in cache
            const lines = chunkText.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        const content = json.choices[0]?.delta?.content || "";
                        fullContent += content;
                    } catch (e) {}
                }
            }
        }

        // Cache the completed completion content
        responseCache.set(cacheKey, fullContent);
        res.end();
    } catch (error) {
        console.error('Error in chat streaming:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'AI Agent is temporarily offline. Please verify API configuration or try again.' });
        } else {
            res.write('\ndata: {"error": "Stream interrupted"}\n');
            res.end();
        }
    }
});

// API: Generate Custom Itinerary (DB-aware, reference-enriched with Rate Limiting)
app.post('/api/agent/generate-itinerary', rateLimiter, async (req, res) => {
    const { start, destination, days, theme } = req.body;

    if (!start || !destination || !days || !theme) {
        return res.status(400).json({ error: 'Missing start, destination, days, or theme parameters.' });
    }

    // ── STEP 1: Find relevant reference tours from the database ──────────────────
    const destLower = destination.toLowerCase().trim();
    const startLower = start.toLowerCase().trim();

    const METADATA_TITLE_PATTERNS = [
        'overview', 'meal plan', 'hotel to be', 'inclusions', 'exclusions',
        'inclusion', 'exclusion', 'please note', 'important note', 'highlights',
        'package cost', 'vehicle', 'rooms', 'travel date', 'brief itinerary',
        'the cost includes', 'best time', 'how to reach', 'things to do',
        'shopping', 'restaurants', 'standard hotel', 'deluxe hotel'
    ];

    function isRealDay(dayObj) {
        const dayLabel = (dayObj.day || '').trim();
        const title = (dayObj.title || '').trim().toLowerCase();
        if (METADATA_TITLE_PATTERNS.some(kw => title.includes(kw))) return false;
        if (/^Day\s*(\(?\s*\d+\s*\)?|[IVX]+)/i.test(dayLabel)) return true;
        if (dayLabel.toLowerCase().startsWith('section') && /^Day\s*(\(?\s*\d+\s*\)?|[IVX]+)/i.test(dayObj.title||'')) return true;
        return (dayObj.description || '').length > 10;
    }

    function extractCleanTitle(title) {
        let cleaned = (title || '').trim();
        cleaned = cleaned.replace(/^Day\s*\(?\s*\d+\s*\)?\s*[-\u2013\u2014:\s]*/i, '');
        cleaned = cleaned.replace(/^DAY\s*\(\s*[\dIVX]+\s*\)\s*/i, '');
        return cleaned.trim();
    }

    // Score tours by keyword overlap with destination/start
    const destWords = destLower.split(/[\s,]+/).filter(w => w.length > 2);
    const startWords = startLower.split(/[\s,]+/).filter(w => w.length > 2);

    const scoredTours = toursData.map(tour => {
        const tourText = `${tour.title} ${tour.region} ${(tour.days||[]).map(d=>d.title||'').join(' ')}`.toLowerCase();
        let score = 0;
        destWords.forEach(w => { if (tourText.includes(w)) score += 3; });
        startWords.forEach(w => { if (tourText.includes(w)) score += 1; });
        return { tour, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    // Take up to 3 best-matching reference tours
    const refTours = scoredTours.slice(0, 3).map(x => x.tour);

    // ── STEP 2: Build reference context from real DB itineraries ─────────────────
    let referenceContext = '';
    if (refTours.length > 0) {
        referenceContext = `\n\nREFERENCE ITINERARIES FROM HAPPYFLYING DATABASE (use for inspiration and realistic detail):\n`;
        refTours.forEach((tour, i) => {
            const realDays = (tour.days || []).filter(isRealDay);
            if (realDays.length === 0) return;
            referenceContext += `\nReference ${i + 1}: "${tour.title}" (${tour.duration})\n`;
            realDays.slice(0, parseInt(days)).forEach((d, idx) => {
                const titleClean = extractCleanTitle(d.title || '');
                referenceContext += `  Day ${idx + 1}: ${titleClean}\n`;
                const descSnippet = (d.description || '').replace(/\n/g, ' ').substring(0, 200);
                if (descSnippet) referenceContext += `    ${descSnippet}...\n`;
            });
        });
    }

    // ── STEP 3: Craft the AI prompt ───────────────────────────────────────────────
    const systemPrompt = `You are a senior travel expert for HappyFlying Tours and Travels LLP (India). 
You write authentic, human-crafted day-by-day travel itineraries.
${referenceContext}
CRITICAL RULES:
- Every day's "title" field MUST be a clear, evocative location/sight title (e.g. "Tbilisi – Gori – Uplistsikhe Cave Town", "Delhi to Manali Scenic Drive", "Solang Valley Snow Sports & Local Markets").
- NEVER use bare day numbers like "Day 4", "Day 6", or "Day 01" as the title. The title MUST specify the destination places/attractions visited that day.
- Do NOT use asterisks (*) anywhere in your JSON string outputs. Use plain clean text.

OUTPUT FORMAT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.
Schema:
[
  {
    "day": "Day 01",
    "title": "Clear Evocative Location Title (e.g. Arrival in Tbilisi & Old Town Cable Car)",
    "description": "2-4 sentences of rich detail covering morning activities, lunch, afternoon sightseeing, evening plans, and overnight stay. Mention specific real place names, hotel types, and local experiences. Use '- ' bullet points for activities."
  }
]`;

    const userPrompt = `Create a detailed ${days}-day travel itinerary departing from ${start} and travelling to ${destination}.
Theme: ${theme}.
Requirements:
- Day 01 must cover the journey from ${start} to ${destination} (flights/transfers as appropriate)
- Last day must cover departure/return from ${destination} to ${start}
- Middle days should cover the best sights, local food, and experiences in ${destination} based on the theme "${theme}"
- Use real, specific place names from ${destination}
- Keep it practical and achievable`;

    try {
        console.log(`[generate-itinerary] ${start} → ${destination} (${days}d, ${theme}). Ref tours: ${refTours.map(t=>t.title).join(', ') || 'none'}`);

        const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OLLAMA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`AI API error ${response.status}: ${errText.substring(0, 300)}`);
        }

        const data = await response.json();
        let content = (data.choices[0]?.message?.content || '').trim();

        // Strip markdown blocks if model adds them anyway
        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

        let itineraryJson;
        try {
            itineraryJson = JSON.parse(content);
            // Handle wrapped object: { "itinerary": [...] } or { "days": [...] }
            if (!Array.isArray(itineraryJson) && typeof itineraryJson === 'object') {
                const key = Object.keys(itineraryJson).find(k => Array.isArray(itineraryJson[k]));
                if (key) itineraryJson = itineraryJson[key];
            }
        } catch (e) {
            console.error('[generate-itinerary] JSON parse failed. Raw content:', content.substring(0, 500));
            throw new Error('AI returned an unreadable itinerary. Please try again.');
        }

        if (!Array.isArray(itineraryJson) || itineraryJson.length === 0) {
            throw new Error('AI returned an empty itinerary array. Please try again.');
        }

        const cleanedItinerary = itineraryJson.map(item => ({
            day: (item.day || '').replace(/\*/g, '').trim(),
            title: (item.title || '').replace(/\*/g, '').trim(),
            description: (item.description || '').replace(/\*/g, '').trim()
        }));

        res.json({
            itinerary: cleanedItinerary,
            referenceTours: refTours.map(t => ({ id: t.id, title: t.title }))
        });

    } catch (error) {
        console.error('[generate-itinerary] Error:', error.message);
        res.status(500).json({ error: error.message || 'Itinerary generator is temporarily offline.' });
    }
});

// Automatically clear any zombie processes holding our port before binding
function freePortIfOccupied(port) {
    try {
        if (process.platform === 'win32') {
            const stdout = execSync('netstat -ano', { encoding: 'utf8' });
            const lines = stdout.split('\n').filter(l => l.includes(':' + port) && l.includes('LISTENING'));
            const pidsToKill = new Set();
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0' && pid !== String(process.pid)) {
                    pidsToKill.add(pid);
                }
            });
            pidsToKill.forEach(pid => {
                console.log(`[Server] Freeing port ${port} by terminating lingering process PID ${pid}...`);
                try {
                    execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                } catch (e) {}
            });
        }
    } catch (e) {
        // Ignored
    }
}

// Start Server with Auto-Retry & Graceful Shutdown
let currentServer = null;

function startServer(retryCount = 0) {
    freePortIfOccupied(PORT);

    currentServer = app.listen(PORT, () => {
        console.log(`TravelIntell Full-Stack server running at http://localhost:${PORT}`);
    });

    currentServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            if (retryCount < 5) {
                console.log(`[Server] Port ${PORT} busy during restart. Retrying in 400ms... (attempt ${retryCount + 1}/5)`);
                setTimeout(() => {
                    startServer(retryCount + 1);
                }, 400);
            } else {
                console.error(`\n[Server Error] Port ${PORT} is occupied by another application after 5 retries.`);
                process.exit(1);
            }
        } else {
            console.error('[Server Error]', err);
        }
    });
}

const cleanup = () => {
    if (currentServer) {
        currentServer.close(() => {
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
};

// Serve root route index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

if (process.env.VERCEL !== '1') {
    startServer();
}

module.exports = app;



