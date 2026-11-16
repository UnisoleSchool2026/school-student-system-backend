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
 */
function buildFallbackStudyAid(topic) {
  const code = topic.code || '';
  const title = topic.title || 'NCERT Section';
  const text = topic.content_text || '';

  // Extract key sentences
  const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 10);
  const core1 = sentences[0] || `${title} is a fundamental concept in the canonical NCERT syllabus.`;
  const core2 = sentences[1] || 'It establishes foundational relationships evaluated in board and national entrance exams.';
  const core3 = sentences[2] || 'Precise statement of laws and adherence to SI units are strictly required.';

  // Extract LaTeX equations if present
  const mathMatches = text.match(/\$[^$]+\$/g) || [];
  const formulas = mathMatches.slice(0, 4).map((m, idx) => ({
    name: `Governing Relation ${idx + 1}`,
    latex: m,
    note: 'Standard NCERT formulation'
  }));

  if (formulas.length === 0) {
    formulas.push({
      name: 'Governing Principle',
      latex: '$E \\propto \\frac{1}{r^2}$ or $\\sum F = ma$',
      note: 'Foundational formulation for this curriculum section'
    });
  }

  return {
    summary_notes: {
      overview: sentences.slice(0, 3).join(' ') || `${title} introduces core theoretical definitions and relationships.`,
      core_concepts: [
        { title: 'Foundational Principle', detail: core1 },
        { title: 'Analytical Formulation', detail: core2 },
        { title: 'Curriculum Importance', detail: core3 }
      ],
      key_definitions: [
        { term: title, definition: core1 }
      ]
    },
    bullet_points: {
      high_yield_takeaways: [
        `Master the explicit definition of "${title}" verbatim per standard NCERT terminology.`,
        'Ensure dimensional balance and standard SI units across all calculations.',
        'Graph sketch questions and sign conventions carry dedicated step marks in CBSE board evaluations.'
      ],
      governing_formulas: formulas,
      exam_traps: [
        { trap: 'Confusing scalar addition with vector superposition', remedy: 'Always resolve field or force vectors into perpendicular components before computing net magnitudes.' },
        { trap: 'Forgetting Cartesian sign convention in numerical substitution', remedy: 'Establish origin and coordinate axes before applying governing formula.' }
      ]
    },
    quick_quiz: [
      {
        id: `q_${code}_1`,
        question: `According to the NCERT curriculum for "${title}", which statement is conceptually accurate?`,
        options: [
          { key: 'A', text: core1 },
          { key: 'B', text: 'The phenomenon violates universal conservation principles in closed systems.' },
          { key: 'C', text: 'It is independent of physical boundary conditions and material permittivity.' },
          { key: 'D', text: 'It can only be defined for macroscopic continuous media, failing at atomic scales.' }
        ],
        correct_answer: 'A',
        explanation: `Option A is correct: "${core1}". This is explicitly highlighted in the NCERT syllabus.`
      },
      {
        id: `q_${code}_2`,
        question: `What is the primary examination pitfall students encounter when solving problems on "${title}"?`,
        options: [
          { key: 'A', text: 'Misidentifying vector orientations and skipping Cartesian sign conventions.' },
          { key: 'B', text: 'Applying dimensional analysis to check formula validity.' },
          { key: 'C', text: 'Using standard SI units for final calculations.' },
          { key: 'D', text: 'Drawing a labelled schematic before substituting values.' }
        ],
        correct_answer: 'A',
        explanation: 'Failing to respect vector directions and coordinate sign conventions is the most frequent deduction in board marking schemes.'
      },
      {
        id: `q_${code}_3`,
        question: `Which governing equation or relationship corresponds to "${title}"?`,
        options: [
          { key: 'A', text: formulas[0].latex },
          { key: 'B', text: '$PV = nRT^2$' },
          { key: 'C', text: '$\\Delta x \\cdot \\Delta p < \\frac{h}{4\\pi}$' },
          { key: 'D', text: '$v = u - 2at^2$' }
        ],
        correct_answer: 'A',
        explanation: `The valid NCERT formulation for this concept is ${formulas[0].latex}.`
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

  const systemPrompt = `You are an elite NCERT Academic Pedagogy & Curriculum Expert.
Your task is to analyze the provided extracted textbook text for a specific NCERT topic, and produce a high-yield study aid package containing:
1. short notes & executive summary
2. important bullet points (high-yield exam takeaways, key formulas with LaTeX, common traps)
3. a quick quiz (3 high-quality multiple choice questions with answer keys and explanations)

All mathematical expressions MUST be enclosed in valid LaTeX ($...$ or $$...$$).
Output strictly valid JSON matching this schema:
{
  "summary_notes": {
    "overview": "Clear 2-3 sentence conceptual overview",
    "core_concepts": [
      { "title": "Concept Name", "detail": "Detailed explanation with LaTeX formulas" }
    ],
    "key_definitions": [
      { "term": "Term", "definition": "Exact definition" }
    ]
  },
  "bullet_points": {
    "high_yield_takeaways": [
      "Key point 1",
      "Key point 2"
    ],
    "governing_formulas": [
      { "name": "Formula Name", "latex": "$equation$", "note": "Where variables represent..." }
    ],
    "exam_traps": [
      { "trap": "Common student error", "remedy": "How to avoid it" }
    ]
  },
  "quick_quiz": [
    {
      "id": "q1",
      "question": "Question text with LaTeX?",
      "options": [
        { "key": "A", "text": "Option A" },
        { "key": "B", "text": "Option B" },
        { "key": "C", "text": "Option C" },
        { "key": "D", "text": "Option D" }
      ],
      "correct_answer": "A",
      "explanation": "Why A is correct and why other options are incorrect."
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
