// ============================================================================
// Tutor scenarios for scripts/mock_gemini_server.js (offline tests only)
//   forPrompt(text)   -> lesson / doubt JSON for generateContent
//   liveSession(ws)   -> a Gemini Live conversation: speaks (audio + transcript),
//                        is interrupted by student audio, calls the board tools,
//                        and continues the lesson when asked.
// ============================================================================

const LESSON = {
  hook: 'Why does a comb rubbed in dry hair pull small bits of paper towards it?',
  basics: ['Everything is made of atoms, and atoms have tiny charged particles: protons (+) and electrons (−).', 'A force is a push or a pull.'],
  simple: [
    'Rubbing moves some electrons from your hair to the comb, so the comb gets extra negative charge.',
    'Charges push or pull each other even without touching: like charges push apart, unlike charges pull together.',
    'This push or pull is called the electrostatic force.',
    'The force gets stronger when the charges are bigger, and much weaker when they move apart.'
  ],
  analogy: 'Like two magnets on a table: bring them closer and the pull jumps up sharply.',
  main_diagram: { type: 'charges', title: 'Unlike charges attract', caption: 'Field lines go from +q to −q; the forces on the two charges are equal and opposite.', charges: [{ x: -0.45, y: 0, q: 1, label: '+q₁' }, { x: 0.45, y: 0, q: -1, label: '−q₂' }], showForces: true },
  points: [
    { title: "Coulomb's law", lines: ['$F = k\\dfrac{q_1 q_2}{r^2}$', '$F$: force between the charges, in newton (N)', '$q_1, q_2$: the two charges, in coulomb (C)', '$r$: distance between them, in metre (m)', '$k = 9 \\times 10^9\\ N\\,m^2/C^2$ in air'], diagram: { type: 'graph', title: 'Force falls fast with distance', caption: 'Double the distance and the force becomes one quarter.', x: { min: 0.5, max: 4, label: 'r' }, y: { min: 0, max: 4.2, label: 'F' }, curves: [{ fn: '1/x^2', label: 'F ∝ 1/r²' }], points: [{ x: 1, y: 1, label: 'F' }, { x: 2, y: 0.25, label: 'F/4' }] } },
    { title: 'Direction of the force', lines: ['The force acts along the line joining the two charges.', 'Like charges: away from each other (repulsion).', 'Unlike charges: towards each other (attraction).'], diagram: null }
  ],
  worked: { question: 'Two charges of $2\\,\\mu C$ each are $3\\,cm$ apart in air. Find the force.', steps: ['Write the law: $F = k q_1 q_2 / r^2$, because both are point charges.', 'Convert units: $q = 2\\times10^{-6}\\,C$, $r = 0.03\\,m$.', 'Substitute: $F = 9\\times10^9 \\times (2\\times10^{-6})^2 / (0.03)^2$.', 'Simplify: $F = 40\\,N$ (repulsive, since both are positive).'], answer: '$F = 40\\,N$, repulsive' },
  misconceptions: ['Wrong: the force halves when the distance doubles. Right: it becomes one quarter.'],
  remember: ['Always convert μC to C and cm to m before substituting.']
};

const DOUBT = {
  readable: true,
  question: 'Why does the force become one quarter when the distance doubles?',
  steps: [{ title: 'Look at the formula', lines: ['$F \\propto 1/r^2$', 'If $r$ becomes $2r$, then $r^2$ becomes $4r^2$.'] }, { title: 'So', lines: ['$F$ becomes $F/4$.'] }],
  answer: 'One quarter, because the distance is squared.',
  concept: 'Inverse-square law',
  tip: 'Square the distance factor, do not just divide by it.',
  diagram: { type: 'graph', title: 'Inverse square', x: { min: 0.5, max: 4, label: 'r' }, y: { min: 0, max: 4.2, label: 'F' }, curves: [{ fn: '1/x^2', label: 'F ∝ 1/r²' }], points: [{ x: 1, y: 1, label: 'F' }, { x: 2, y: 0.25, label: 'F/4' }] }
};

function forPrompt(text) {
  if (/"hook"/.test(text) && /"main_diagram"/.test(text)) return LESSON;
  if (/Student's question/.test(text)) return DOUBT;
  // NCERT reader help (2026-11-19)
  if (/Summarise this NCERT text/.test(text)) return { title: 'Electric charge in short', points: ['Charge is a basic property of matter.', 'Like charges repel; unlike charges attract.', 'The SI unit of charge is the coulomb (C).', 'Charge is conserved and quantised: $q = ne$.'], terms: [{ term: 'Quantisation', meaning: 'Charge comes only in whole-number multiples of $e$.' }], formulas: ['$q = ne$'] };
  if (/Explain this NCERT text/.test(text)) return { title: 'What is charge?', simple: ['Rub a comb on dry hair and it pulls bits of paper.', 'That pulling comes from electric charge.', 'There are two kinds: positive and negative.'], example: 'A balloon rubbed on a sweater sticks to the wall.', remember: 'Like repel, unlike attract.' };
  if (/^The image is a figure/.test(text) && /Explain the FIGURE/.test(text)) return { title: 'Two charges and the line joining them', what: 'The figure shows a positive and a negative charge and the force between them.', parts: [{ label: '+q', meaning: 'a positive charge' }, { label: '-q', meaning: 'a negative charge' }], steps: ['Find the two charges.', 'The line shows they pull each other.', 'Unlike charges attract.'], remember: 'Unlike charges attract.' };
  if (/^The image is a figure/.test(text) && /MCQs/.test(text)) return { questions: [{ q: 'What does the figure show?', options: ['Two attracting charges', 'A lens', 'A circuit', 'A wave'], answer: 0, why: 'A +q and a -q joined by a line.' }] };
  if (/^The image is a figure/.test(text) && /The student asks/.test(text)) return { title: 'Your question', simple: ['They attract because the charges are unlike.'], example: '', remember: 'Unlike charges attract.' };
  if (/Make a quiz ONLY from this NCERT text/.test(text)) return { questions: [{ q: 'What is the SI unit of charge?', options: ['Ampere', 'Coulomb', 'Volt', 'Ohm'], answer: 1, why: 'The text says charge is measured in coulomb.' }, { q: 'Two positive charges will', options: ['attract', 'repel', 'not interact', 'merge'], answer: 1, why: 'Like charges repel.' }, { q: 'Charge on a body is always', options: ['any value', 'a multiple of $e$', 'zero', 'negative'], answer: 1, why: 'Charge is quantised: $q = ne$.' }] };
  // Question Bank (2026-11-24): detailed solutions and AI question drafts
  if (/QB_DETAILED_SOLUTION/.test(text)) return { steps: [{ title: 'Write what is given', text: 'Force in air $F_{air} = 40\\,N$, force in the medium $F_{med} = 8\\,N$.' }, { title: 'Use the definition', text: 'The dielectric constant is $K = \\dfrac{F_{air}}{F_{med}}$ because the medium reduces the force by the factor $K$.' }, { title: 'Put in the numbers', text: '$K = \\dfrac{40}{8} = 5$' }], final_answer: '$K = 5$', concept: 'Coulomb force in a medium is $F/K$.' };
  if (/QB_GENERATE_QUESTIONS/.test(text)) {
    const n = Math.min(10, Number((/COUNT=(\d+)/.exec(text) || [])[1]) || 3);
    return { questions: Array.from({ length: n }, (_, i) => ({ question: `Draft question ${i + 1}: a body moves with $v = ${i + 2}\\,m/s$ for $${i + 3}\\,s$. How far does it go?`, options: [`$${(i + 2) * (i + 3)}\\,m$`, `$${i + 5}\\,m$`, `$${(i + 2) * (i + 3) * 2}\\,m$`, `$${i + 1}\\,m$`], answer: 'A', solution: `Distance $= v t = ${i + 2} \\times ${i + 3} = ${(i + 2) * (i + 3)}\\,m$.`, topic: 'Uniform motion', difficulty: 'EASY', marks: 1 })) };
  }
  return null;
}

// 120 ms of a quiet, speech-like tone at 24 kHz, as base64 PCM16 (Gemini Live output format).
function audioChunk(seed) {
  const n = 2880;
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / 24000;
    const v = 0.08 * Math.sin(2 * Math.PI * (180 + 40 * Math.sin(seed + t * 6)) * t) * (0.6 + 0.4 * Math.sin(t * 20 + seed));
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf.toString('base64');
}

function liveSession(ws, log) {
  let speaking = null; // { timer }
  let pending = null; // function to run after a toolResponse
  let studentChunks = 0;
  let quietTimer = null;
  let interruptedThisTurn = false;
  const send = obj => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

  function speak(text, done) {
    const words = text.split(' ');
    const parts = [];
    for (let i = 0; i < words.length; i += 5) parts.push(words.slice(i, i + 5).join(' ') + ' ');
    let k = 0;
    speaking = { timer: setInterval(() => {
      if (k >= parts.length) {
        clearInterval(speaking.timer);
        speaking = null;
        send({ serverContent: { turnComplete: true } });
        if (done) done();
        return;
      }
      send({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: 'audio/pcm;rate=24000', data: audioChunk(k) } }] }, outputTranscription: { text: parts[k] } } });
      k += 1;
    }, 110) };
  }

  function stopSpeaking() {
    if (speaking) { clearInterval(speaking.timer); speaking = null; }
  }

  function answerDoubt(question) {
    send({ toolCall: { functionCalls: [{ id: 'call_diagram_1', name: 'show_diagram', args: { diagram_json: JSON.stringify(DOUBT.diagram) } }] } });
    pending = () => {
      send({ toolCall: { functionCalls: [{ id: 'call_board_1', name: 'write_on_board', args: { title: 'Why one quarter?', lines: ['$F \\propto 1/r^2$', 'Double $r$: $r^2$ becomes 4 times', 'So $F$ becomes $F/4$'] } }] } });
      pending = () => speak(`Bahut achha sawaal. Dekho, board par graph dekho. Force distance ke square se divide hota hai, isliye distance double karo to force chaar guna kam ho jaata hai. Samjha? Shall we continue?`);
    };
    log({ kind: 'live-doubt', question: String(question).slice(0, 120) });
  }

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch (e) { return; }
    if (msg.setup) {
      const s = msg.setup;
      const sys = (((s.systemInstruction || {}).parts || [])[0] || {}).text || '';
      log({ kind: 'live-setup', model: s.model, voice: (((s.generationConfig || {}).speechConfig || {}).voiceConfig || {}).prebuiltVoiceConfig, tools: ((s.tools || [])[0] || {}).functionDeclarations ? s.tools[0].functionDeclarations.map(f => f.name) : [], hinglish: /Hinglish/.test(sys), sysChars: sys.length });
      send({ setupComplete: {} });
      return;
    }
    if (msg.clientContent) {
      const text = ((msg.clientContent.turns || []).map(t => (t.parts || []).map(p => p.text || '').join(' ')).join(' ')).trim();
      log({ kind: 'live-text', text: text.slice(0, 200) });
      stopSpeaking();
      if (/^BOARD PART/.test(text)) {
        const title = (/: ([^\n.]+)/.exec(text) || [])[1] || 'this part';
        interruptedThisTurn = false;
        speak(`Accha, ab ${title} dekhte hain. Board par jo likha hai uska matlab simple hai. Socho tum apne baal mein comb ghuma rahe ho, aur kaagaz ke tukde comb ki taraf kheench jaate hain. Yahi electrostatic force hai. Theek hai?`);
      } else if (/continue|aage|chalo|yes/i.test(text) && !/STUDENT ASKS/.test(text)) {
        send({ toolCall: { functionCalls: [{ id: 'call_continue_1', name: 'continue_lesson', args: {} }] } });
        pending = () => speak('Chalo, aage badhte hain.');
      } else {
        answerDoubt(text);
      }
      return;
    }
    if (msg.toolResponse) {
      log({ kind: 'live-tool-response', responses: (msg.toolResponse.functionResponses || []).map(r => `${r.name}:${JSON.stringify(r.response).slice(0, 80)}`) });
      const next = pending;
      pending = null;
      if (next) setTimeout(next, 150);
      return;
    }
    if (msg.realtimeInput) {
      if (msg.realtimeInput.audio || msg.realtimeInput.mediaChunks) {
        studentChunks += 1;
        if (speaking && studentChunks >= 3 && !interruptedThisTurn) {
          interruptedThisTurn = true;
          stopSpeaking();
          send({ serverContent: { interrupted: true } });
          log({ kind: 'live-interrupted' });
        }
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => {
          if (studentChunks >= 3) {
            const q = 'Sir, distance double karne par force chaar guna kam kyun hota hai?';
            send({ serverContent: { inputTranscription: { text: q } } });
            studentChunks = 0;
            answerDoubt(q);
          }
        }, 700);
      }
      if (msg.realtimeInput.audioStreamEnd) log({ kind: 'live-audio-end' });
    }
  });
  ws.on('close', () => { stopSpeaking(); clearTimeout(quietTimer); log({ kind: 'live-close' }); });
}

module.exports = { forPrompt, liveSession, LESSON, DOUBT };
