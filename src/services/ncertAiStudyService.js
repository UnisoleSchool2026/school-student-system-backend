// ============================================================================
// NCERT AI STUDY SERVICE: Structured Summaries, Important Bullets & Quick Quizzes
// Features Two-Tier Persistent Disk & In-Memory Caching for Zero-Token Replay
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_FILE = path.join(__dirname, '../database/ncert_ai_study_cache.json');

// In-Memory RAM Cache Map
const memoryCache = new Map();

function loadCacheFromDisk() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach(k => {
        memoryCache.set(k, parsed[k]);
      });
      console.log(`[NCERT AI STUDY] Hydrated ${memoryCache.size} cached topic study aids from disk.`);
    }
  } catch (err) {
    console.warn('[NCERT AI STUDY] Warning: Could not read cache file:', err.message);
  }
}

function saveCacheToDisk() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = {};
    memoryCache.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[NCERT AI STUDY] Failed writing cache to disk:', err.message);
  }
}

// Load initial cache on module startup
loadCacheFromDisk();

function cleanJsonText(raw) {
  if (!raw) return '{}';
  let clean = raw.trim();
  if (clean.startsWith('```json')) clean = clean.slice(7);
  else if (clean.startsWith('```')) clean = clean.slice(3);
  if (clean.endsWith('```')) clean = clean.slice(0, -3);
  clean = clean.trim();
  const startIdx = clean.indexOf('{');
  const endIdx = clean.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    clean = clean.slice(startIdx, endIdx + 1);
  }
  return clean;
}

/**
 * Call Groq Cloud API for fast low-latency generation
 */
async function callGroq({ apiKey, systemPrompt, userPrompt }) {
  const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'qwen-2.5-32b'];
  let lastErr = null;
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 3000
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Groq ${model} ${res.status}: ${txt}`);
      }
      const data = await res.json();
      const rawText = data.choices[0].message.content;
      const parsed = JSON.parse(cleanJsonText(rawText));
      return { data: parsed, modelUsed: `Groq (${model})`, usage: data.usage };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Groq calls failed');
}

/**
 * Call Google Gemini API
 */
async function callGemini({ apiKey, systemPrompt, userPrompt }) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
  let lastErr = null;
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}\n\nReturn ONLY a JSON object.` }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Gemini ${model} ${res.status}: ${txt}`);
      }
      const data = await res.json();
      const rawText = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(cleanJsonText(rawText));
      return { data: parsed, modelUsed: `Gemini (${model})`, usage: data.usageMetadata };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Gemini calls failed');
}

/**
 * Deterministic pedagogical fallback ensuring 100% offline uptime
 * Formatted with simple student-friendly wording and clean LaTeX notation
 */
function buildFallbackStudyAid(topic) {
  const code = topic.code || '';
  const title = topic.title || 'Curriculum Section';
  const text = topic.content_text || '';

  // Extract key sentences
  const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 10);
  const cleanSentences = sentences.map(s => s.trim().replace(/^[\d.]+\s*/, ''));

  // Simple conceptual summary
  const simpleOverview = cleanSentences.length > 0
    ? cleanSentences.slice(0, 2).join(' ')
    : `In this section, you learn the core principles of $${title}$. Understanding how variables interact is essential for solving numericals and conceptual board questions.`;

  // Extract LaTeX equations if present
  const mathMatches = text.match(/\$[^$]+\$/g) || [];
  const formulas = mathMatches.slice(0, 4).map((m, idx) => ({
    name: `Formula ${idx + 1}`,
    latex: m,
    note: 'Standard relation for this section'
  }));

  if (formulas.length === 0) {
    formulas.push({
      name: 'Governing Formula',
      latex: '$q = ne$',
      note: 'where $n$ is an integer and $e = 1.602 \\times 10^{-19}\\,\\text{C}$'
    });
  }

  return {
    summary_notes: {
      overview: simpleOverview,
      core_concepts: [
        {
          title: 'Core Idea',
          detail: cleanSentences[0] || `The fundamental idea behind $${title}$ describes how quantities behave under standard conditions.`
        },
        {
          title: 'Mathematical Relation',
          detail: cleanSentences[1] || `The governing relation uses ${formulas[0].latex} to connect physical properties.`
        },
        {
          title: 'Key Takeaway',
          detail: 'Always check that physical quantities have matching SI units before performing calculations.'
        }
      ],
      key_definitions: [
        {
          term: title,
          definition: cleanSentences[0] || `The primary concept describing physical interactions in this section.`
        }
      ]
    },
    bullet_points: {
      high_yield_takeaways: [
        `Understand the physical meaning of each variable in ${formulas[0].latex}.`,
        'Keep track of vector directions and coordinate signs (positive vs negative).',
        'In board exams, writing the governing formula first awards 1 full step mark.'
      ],
      governing_formulas: formulas,
      exam_traps: [
        {
          trap: 'Forgetting to convert units to SI (e.g. converting cm to m or $\\mu\\text{C}$ to $\\text{C}$)',
          remedy: 'Convert all given values into meters ($1\\,\\text{m} = 100\\,\\text{cm}$) and Coulombs ($1\\,\\mu\\text{C} = 10^{-6}\\,\\text{C}$) before multiplying.'
        },
        {
          trap: 'Treating vectors as plain scalars',
          remedy: 'Resolve quantities into $x$ and $y$ components and add vectorially.'
        }
      ]
    },
    quick_quiz: [
      {
        id: `q_${code}_1`,
        question: `Which of the following statements about "${title}" is correct?`,
        options: [
          { key: 'A', text: cleanSentences[0] || `The quantity follows conservation rules in closed systems.` },
          { key: 'B', text: 'It completely violates energy and charge conservation principles.' },
          { key: 'C', text: 'The value is always zero regardless of experimental setup.' },
          { key: 'D', text: 'It only applies to uncharged neutral matter at absolute zero.' }
        ],
        correct_answer: 'A',
        explanation: `Option A is correct: "${cleanSentences[0] || 'The quantity follows conservation rules in closed systems.'}".`
      },
      {
        id: `q_${code}_2`,
        question: `What is the most common mistake students make when solving numericals for "${title}"?`,
        options: [
          { key: 'A', text: 'Forgetting Cartesian signs and unit conversions (e.g., cm to m).' },
          { key: 'B', text: 'Writing down the governing formula and checking SI units.' },
          { key: 'C', text: 'Drawing a labelled diagram to identify vector directions.' },
          { key: 'D', text: 'Stating the final answer with proper physical units.' }
        ],
        correct_answer: 'A',
        explanation: 'Failing to convert prefixes like cm to m or forgetting positive/negative signs is the most common student error.'
      },
      {
        id: `q_${code}_3`,
        question: `Which governing equation applies to "${title}"?`,
        options: [
          { key: 'A', text: formulas[0].latex },
          { key: 'B', text: '$PV = nRT^3$' },
          { key: 'C', text: '$\\lambda = \\frac{h}{mv^2}$' },
          { key: 'D', text: '$v^2 = u^2 - 4as$' }
        ],
        correct_answer: 'A',
        explanation: `Option A (${formulas[0].latex}) is the correct formula for this topic.`
      }
    ]
  };
}

/**
 * Generate complete AI Study Package via Multi-LLM Orchestrator
 */
async function generateAiStudyPayload(topic) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const systemPrompt = `You are an elite tutor who explains high school science concepts simply and clearly.
Analyze the provided textbook topic and produce a simple, clear, student-friendly study guide in valid JSON format.

CRITICAL FORMATTING GUIDELINES:
1. SIMPLE WORDING: Use simple, plain, conversational English that is very easy for a student to understand. Avoid dense academic jargon and overly long sentences.
2. CLEAN LATEX: Format all mathematical formulas, physical quantities, variables, numbers with units, and equations in clean standard LaTeX enclosed in single dollar signs (e.g. $q = ne$, $F = 10\\,\\text{N}$, $e = 1.6 \\times 10^{-19}\\,\\text{C}$, $\\frac{1}{4\\pi\\varepsilon_0}$).
3. NO "ACCORDING TO NCERT": In the quiz questions, NEVER start any question with "According to NCERT...", "According to the NCERT curriculum...", "According to the textbook...", or "As per NCERT...". Write direct, engaging questions like "Which of the following is true regarding...", "What happens when...", or "What is the primary governing formula for...".

Output strictly valid JSON with this exact schema:
{
  "summary_notes": {
    "overview": "Simple 2-sentence summary in plain English with clean LaTeX",
    "core_concepts": [
      { "title": "Concept Name", "detail": "Simple, intuitive explanation using clean LaTeX like $F = ma$" }
    ],
    "key_definitions": [
      { "term": "Term", "definition": "Clear, simple definition" }
    ]
  },
  "bullet_points": {
    "high_yield_takeaways": [
      "Short, simple bullet point with LaTeX if needed",
      "Short, simple bullet point with LaTeX if needed"
    ],
    "governing_formulas": [
      { "name": "Formula Name", "latex": "$clean_equation$", "note": "Simple note on what variables mean" }
    ],
    "exam_traps": [
      { "trap": "Common mistake in simple words", "remedy": "Simple advice on how to avoid it" }
    ]
  },
  "quick_quiz": [
    {
      "id": "q1",
      "question": "Direct question without saying 'According to NCERT'?",
      "options": [
        { "key": "A", "text": "Option A with clean LaTeX" },
        { "key": "B", "text": "Option B with clean LaTeX" },
        { "key": "C", "text": "Option C with clean LaTeX" },
        { "key": "D", "text": "Option D with clean LaTeX" }
      ],
      "correct_answer": "A",
      "explanation": "Simple explanation in plain English."
    }
  ]
}`;

  const userPrompt = `Topic Code: ${topic.code || ''}
Topic Title: ${topic.title}
NCERT Extracted Content:
"""
${(topic.content_text || '').slice(0, 3000)}
"""

Please formulate the complete JSON study aid package.`;

  // 1. Try Groq (Llama 3.3 70B)
  if (groqKey) {
    try {
      console.log(`[NCERT AI STUDY] Requesting Groq LPU for "${topic.title}"...`);
      const res = await callGroq({ apiKey: groqKey, systemPrompt, userPrompt });
      if (res && res.data && res.data.summary_notes && res.data.quick_quiz) {
        return {
          ...res.data,
          llm_provider: res.modelUsed,
          token_usage: res.usage || null,
          is_ai_generated: true
        };
      }
    } catch (e) {
      console.warn('[NCERT AI STUDY] Groq attempt failed:', e.message);
    }
  }

  // 2. Try Gemini
  if (geminiKey) {
    try {
      console.log(`[NCERT AI STUDY] Requesting Gemini for "${topic.title}"...`);
      const res = await callGemini({ apiKey: geminiKey, systemPrompt, userPrompt });
      if (res && res.data && res.data.summary_notes && res.data.quick_quiz) {
        return {
          ...res.data,
          llm_provider: res.modelUsed,
          token_usage: res.usage || null,
          is_ai_generated: true
        };
      }
    } catch (e) {
      console.warn('[NCERT AI STUDY] Gemini attempt failed:', e.message);
    }
  }

  // 3. Fallback to deterministic curriculum generator
  console.log(`[NCERT AI STUDY] Generating deterministic curriculum study aid for "${topic.title}"...`);
  const fallback = buildFallbackStudyAid(topic);
  return {
    ...fallback,
    llm_provider: 'NCERT Curriculum Engine (Deterministic High-Yield)',
    token_usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    is_ai_generated: false
  };
}

/**
 * Public method: Get Study Aid with Two-Tier Caching
 */
async function getTopicAiStudy(topic, forceRefresh = false) {
  if (!topic || !topic.id) throw new Error('Topic is required');

  const cacheKey = `topic_study_${topic.id}`;

  // Check Cache if not forcing refresh
  if (!forceRefresh && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    cached.cache_hits = (cached.cache_hits || 0) + 1;
    return {
      topic_id: topic.id,
      topic_title: topic.title,
      topic_code: topic.code,
      cached: true,
      cached_at: cached.cached_at,
      cache_hits: cached.cache_hits,
      llm_provider: cached.llm_provider,
      token_savings_description: '0 LLM tokens consumed (Retrieved from persistent disk/RAM cache)',
      summary_notes: cached.summary_notes,
      bullet_points: cached.bullet_points,
      quick_quiz: cached.quick_quiz
    };
  }

  // Generate study aid payload
  const generated = await generateAiStudyPayload(topic);

  const payload = {
    topic_id: topic.id,
    topic_title: topic.title,
    topic_code: topic.code,
    cached: false,
    cached_at: new Date().toISOString(),
    cache_hits: 1,
    llm_provider: generated.llm_provider,
    token_usage: generated.token_usage,
    summary_notes: generated.summary_notes,
    bullet_points: generated.bullet_points,
    quick_quiz: generated.quick_quiz
  };

  // Cache in Memory
  memoryCache.set(cacheKey, payload);

  // Persist to Disk asynchronously
  setTimeout(saveCacheToDisk, 50);

  return payload;
}

module.exports = {
  getTopicAiStudy,
  loadCacheFromDisk,
  saveCacheToDisk,
  buildFallbackStudyAid
};

