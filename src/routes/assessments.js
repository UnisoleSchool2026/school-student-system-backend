// ============================================================================
// HAPS-AI SCHOLAR ASSISTANT: ASSESSMENTS & TEST SUBMISSION API ROUTER
// Manages teacher assignment creation, student test delivery, sub-second telemetry
// evaluation, dynamic concept mastery breakdown, and automated weekly report updates.
// ============================================================================

const express = require('express');
const router = express.Router();
const { inMemoryStore } = require('../config/database');
const { emitEvent } = require('../kafka/producer');
const { processTelemetryEvent } = require('../kafka/consumer');
const { generateWeeklyReport } = require('../services/smartReportService');
const { getAllClass10Questions } = require('../services/class10PyqBank');
const { generateLlmQuestion } = require('../services/llmQuestionEngine');
const { EXAM_BLUEPRINTS, analyzeBankCoverage, generatePatternMatchedExam } = require('../services/examPatternAnalyzer');
const { generatePersonalizedRemedialAssignment, verifyStudentFormula } = require('../services/remedialAssignmentService');
const { generateAssignmentDocxBuffer } = require('../services/docxExportService');
const { ensureQuestionHasRichOptions } = require('../services/questionOptionEngine');
const { quizTool, testTool, assignmentTool } = require('../services/pipelineTools');
const { resolvePatternForAssessment, getNegativePenalty } = require('../services/examPatternRegistry');
const subjectScope = require('../services/subjectScope');
const schedule = require('../services/scheduleService');
const {
  BOARD_BLUEPRINTS,
  generateBoardQuestionPaper,
  swapPaperQuestion,
  getAlternativeQuestions,
  addCustomQuestionToPaper,
  updatePaperQuestion,
  deletePaperQuestion
} = require('../services/boardPaperGeneratorService');

// 1. GET /api/assessments - List all test assignments
router.get('/', (req, res) => {
  try {
    let list = inMemoryStore.assessments || [];
    const { subject, subjectKey, teacherSubjectKey, section, classId, status, studentId } = req.query;
    const sKey = (teacherSubjectKey || subjectKey || subject || '').toUpperCase().trim();
    if (sKey) {
      // Subject isolation: subject AND class/grade must belong to this teacher's scope
      // (keeps Class 10 Maths and senior Maths apart, and Biology out of Non-Medical classes).
      list = subjectScope.isKnownSubject(sKey)
        ? list.filter(a => subjectScope.assessmentInScope(sKey, a))
        : list.filter(a => (a.subjectKey || '').toUpperCase() === sKey || (a.subject || '').toUpperCase() === sKey);
    }

    const secFilter = (section || classId || '').trim().toLowerCase();
    if (secFilter) {
      // Exact class match only (a test without a class must never leak into every class).
      list = list.filter(a => (a.section || a.targetClass || '').trim().toLowerCase() === secFilter);
    }

    const statusFilter = (status || '').toUpperCase().trim();
    if (statusFilter) {
      list = list.filter(a => {
        const aStatus = (a.status || 'PUBLISHED').toUpperCase().trim();
        return aStatus === statusFilter;
      });
    }

    // Students only see a scheduled test while it is open (and not after they submitted it).
    const sid = String(studentId || '').trim();
    const forStudent = sid || String(req.query.availableOnly || '') === '1';
    if (forStudent) {
      list = list.filter(a => {
        if (sid && Array.isArray(a.assignedStudentIds) && a.assignedStudentIds.length && !a.assignedStudentIds.includes(sid)) return false;
        if (!a.schedule) return true;
        if (sid && schedule.hasSubmitted('TEST', a.id, sid)) return false;
        if (sid && schedule.hasStarted('TEST', a.id, sid)) {
          const st = schedule.findStart('TEST', a.id, sid);
          return Date.now() <= schedule.deadlineFor(a.schedule, Date.parse(st.startedAt)) + schedule.GRACE_MS;
        }
        return schedule.stateOf(a.schedule) === 'OPEN';
      });
    }

    res.json({
      success: true,
      count: list.length,
      serverNow: new Date().toISOString(),
      assessments: list.map(a => ({
        id: a.id,
        code: a.code || `Test ${a.id.slice(-2)}`,
        title: a.title,
        description: a.description,
        teacherName: a.teacherName,
        grade: a.grade,
        section: a.section || a.targetClass,
        targetClass: a.targetClass || a.section,
        board: a.board,
        subject: a.subject,
        chapter: a.chapter,
        topic: a.topic,
        duration: a.duration || `${a.durationMinutes || 45} Mins`,
        durationMinutes: a.durationMinutes || 45,
        totalMarks: a.totalMarks,
        questionCount: a.questions ? a.questions.length : (a.totalQuestions || 0),
        status: a.status || 'PUBLISHED',
        schedule: schedule.view(a.schedule, sid ? schedule.findStart('TEST', a.id, sid) : null),
        createdAt: a.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /api/assessments/:id - Fetch full assessment with questions
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);

    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const sid = String(req.query.studentId || '').trim();
    if (sid && assessment.schedule && !schedule.hasStarted('TEST', id, sid)) {
      return res.status(403).json({ success: false, error: 'Press Start to open this test.', schedule: schedule.view(assessment.schedule, schedule.findStart('TEST', id, sid)) });
    }

    res.json({ success: true, assessment: sid ? Object.assign({}, assessment, { schedule: schedule.view(assessment.schedule, schedule.findStart('TEST', id, sid)) }) : assessment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/:id/start { studentId } - student presses Start on a scheduled test.
// Returns the test with its questions and the student's deadline (the clock runs on the server).
router.post('/:id/start', (req, res) => {
  try {
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === req.params.id);
    if (!assessment || (assessment.status || 'PUBLISHED') === 'DRAFT') return res.status(404).json({ success: false, error: 'Test not found.' });
    const studentId = String((req.body || {}).studentId || '').trim();
    const v = schedule.start('TEST', assessment.id, assessment.schedule, studentId);
    res.json({ success: true, assessment: Object.assign({}, assessment, { schedule: v }) });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/assessments - Teacher publishes a new test assignment
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description = '',
      teacherName = '',
      grade = '10',
      section = 'Science-A',
      board = 'CBSE',
      subject = 'Science',
      durationMinutes = 30,
      totalMarks = 20,
      questions = []
    } = req.body;
    let sched = null;
    try { sched = schedule.normalize(req.body.schedule, { defaultDuration: Number(durationMinutes) || 30 }); } catch (e) { return res.status(e.status || 400).json({ success: false, error: e.message }); }

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Assessment title and at least one question are required.'
      });
    }

    const newAssessment = {
      id: `asgn_${Date.now()}`,
      title,
      description,
      teacherName,
      grade,
      section,
      board,
      subject,
      durationMinutes: sched && sched.mode === 'DURATION' ? sched.durationMinutes : (Number(durationMinutes) || 30),
      totalMarks: Number(totalMarks) || (questions.length * 4),
      schedule: sched,
      // A test built from questions picked in the Question Bank starts as a draft, so the teacher
      // can review it and choose when students take it before publishing.
      status: String(req.body.status || '').toUpperCase() === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      teacherSubjectKey: req.body.teacherSubjectKey ? String(req.body.teacherSubjectKey).toUpperCase() : undefined,
      targetClass: section,
      questions: questions.map((rawQ, idx) => {
        const q = ensureQuestionHasRichOptions({ ...rawQ });
        return {
          id: q.id || `q_asgn_${Date.now()}_${idx + 1}`,
          topic: q.topic || q.chapter || 'Science Core',
          subtopic: q.subtopic || (q.ncert_mapping ? q.ncert_mapping.ncert_section : 'General'),
          grade: q.grade || grade,
          board: q.curriculum_board || board,
          question_type: q.question_type || 'MCQ_SINGLE',
          difficulty: q.difficulty || 'MEDIUM',
          benchmark_time_seconds: Number(q.benchmark_time_seconds) || 90,
          question_latex: q.question_latex,
          options_latex: q.options_latex || [],
          correct_answer: q.correct_answer || q.correct_answer_latex || ((q.options_latex || []).find(o => o && o.is_correct) || {}).key || null,
          solution_latex: q.solution_latex || '',
          socratic_hints: q.socratic_hints || [],
          ncert_mapping: q.ncert_mapping || null,
          step_rubric: q.step_rubric || [],
          marks: Number(q.marks || q.marks_weightage) || undefined,
          chapter_name: q.chapter_name || q.chapter || undefined,
          question_format: q.question_format || undefined,
          source_question_id: rawQ.id || undefined
        };
      }),
      createdAt: new Date().toISOString()
    };

    if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
    inMemoryStore.assessments.unshift(newAssessment);

    // Emit event to Kafka stream
    if (newAssessment.status !== 'DRAFT') await emitEvent('assessment.published', newAssessment.id, {
      title: newAssessment.title,
      grade: newAssessment.grade,
      teacher: newAssessment.teacherName,
      questionCount: newAssessment.questions.length
    });

    res.status(201).json({
      success: true,
      message: newAssessment.status === 'DRAFT' ? 'Draft test created.' : 'Assessment published successfully to class roster.',
      assessment: newAssessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/assessments/:id/submit - Student submits test, generates telemetry & diagnostics
router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentId = 'b0000000-0000-0000-0000-000000000001',
      studentName = 'Aryan Sharma',
      answers = []
    } = req.body;

    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    try { schedule.checkSubmit('TEST', id, assessment.schedule, studentId); } catch (e) { return res.status(e.status || 403).json({ success: false, error: e.message }); }
    if (assessment.schedule) schedule.markSubmitted('TEST', id, studentId);

    let rawScore = 0;
    const examBoard = String(assessment.board || assessment.curriculum_board || '').toUpperCase();
    const isCompetitiveExam = examBoard.includes('JEE') || examBoard.includes('NEET');
    // Negative marking comes from the Exam Pattern Template Registry (registry/templates/exam_patterns.json).
    // An explicit assessment.negativeMarks still wins; the JEE/NEET string check is the last-resort fallback.
    const examPattern = resolvePatternForAssessment(assessment);
    const patternPenalty = getNegativePenalty(examPattern);
    const hasExplicitNeg = assessment.negativeMarks !== undefined && assessment.negativeMarks !== null;
    const negativePenalty = hasExplicitNeg
      ? Math.abs(Number(assessment.negativeMarks) || 0)
      : (patternPenalty !== null ? patternPenalty : (isCompetitiveExam ? 1.0 : 0.0));
    const totalMarks = Number(assessment.totalMarks) || (assessment.questions.length * 4);
    const defaultMarksPerQ = assessment.questions.length > 0
      ? Number((totalMarks / assessment.questions.length).toFixed(2))
      : 4.0;
    const questionBreakdown = [];
    let totalTimeSpent = 0;

    let normalizedAnswers = [];
    if (Array.isArray(answers)) {
      normalizedAnswers = answers;
    } else if (answers && typeof answers === 'object') {
      normalizedAnswers = Object.entries(answers).map(([k, v]) => {
        if (typeof v === 'object' && v !== null) return { questionIndex: Number(k), ...v };
        return { questionIndex: Number(k), selectedOption: String(v) };
      });
    }

    // Evaluate each question
    for (let i = 0; i < assessment.questions.length; i++) {
      const q = assessment.questions[i];
      const studentAns = normalizedAnswers.find(a => a.questionId === q.id || a.questionIndex === (i + 1)) || normalizedAnswers[i] || {};
      const selected = studentAns.selectedOption || null;
      const timeSpent = Number(studentAns.timeSpentSeconds) || 45;
      const hesitation = Number(studentAns.hesitationSeconds) || 8;
      const hintsUsed = Number(studentAns.hintsUsed) || 0;
      totalTimeSpent += timeSpent;

      // The answer key comes from the question; a question without one is never auto-marked correct
      // (it used to fall back to "B"). Numerical answers count when within 1% (or 0.01).
      const keyed = Array.isArray(q.options_latex) ? q.options_latex.find(o => o && o.is_correct) : null;
      const expectedAnswer = String((keyed && keyed.key) || q.correct_answer || q.correct_answer_latex || '').trim();
      const numericQ = /NUMERIC|INTEGER/.test(String(q.type || q.question_type || '').toUpperCase()) && !(q.options_latex || []).length;
      const numOf = v => { const m = /-?\d+(?:\.\d+)?(?:e-?\d+)?/i.exec(String(v || '').replace(/,/g, '')); return m ? Number(m[0]) : null; };
      const isCorrect = Boolean(selected && expectedAnswer && (numericQ
        ? (numOf(selected) !== null && numOf(expectedAnswer) !== null && Math.abs(numOf(selected) - numOf(expectedAnswer)) <= Math.max(0.01, Math.abs(numOf(expectedAnswer)) * 0.01))
        : selected.trim().toUpperCase() === expectedAnswer.toUpperCase()));

      const qPositiveMarks = q.marks !== undefined ? Number(q.marks) : defaultMarksPerQ;
      const qNeg = q.negative !== undefined && q.negative !== null ? Math.abs(Number(q.negative) || 0) : negativePenalty;
      const marksForQ = isCorrect ? qPositiveMarks : (selected ? -qNeg : 0.0);
      rawScore += marksForQ;

      const benchmark = q.benchmark_time_seconds || 90;
      let category = 'FAST_ACCURATE';
      if (isCorrect) {
        category = timeSpent > (benchmark * 1.3) ? 'SLOW_ACCURATE' : 'FAST_ACCURATE';
      } else {
        category = timeSpent > (benchmark * 1.3) ? 'SLOW_MISCONCEPTION' : 'FAST_CARELESS_SLIP';
      }

      // Record Telemetry Event
      const telemetryPayload = {
        action: 'QuestionTelemetryRecorded',
        studentId,
        questionId: q.id,
        assessmentId: id,
        timeSpentSeconds: timeSpent,
        hesitationSeconds: hesitation,
        attemptStatus: isCorrect ? 'CORRECT' : 'INCORRECT',
        selectedOption: selected,
        topic: q.topic || 'Science',
        subtopic: q.subtopic || 'General',
        benchmarkSeconds: benchmark,
        hintsUsed,
        category
      };

      // Emit to Kafka & update local concept mastery
      const event = await emitEvent('telemetry.question-timer', studentId, telemetryPayload);
      processTelemetryEvent(event);

      inMemoryStore.telemetry.push({
        id: `tel_${Date.now()}_${i}`,
        ...telemetryPayload,
        recordedAt: new Date().toISOString()
      });

      questionBreakdown.push({
        questionIndex: i + 1,
        questionId: q.id,
        subtopic: q.subtopic || q.topic || assessment.chapterName || 'General',
        topic: q.topic || assessment.chapterName || assessment.subject || 'General',
        subject: assessment.subject || 'Biology',
        selectedOption: selected,
        correctAnswer: expectedAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        benchmarkSeconds: benchmark,
        category,
        marksAwarded: marksForQ
      });
    }

    const totalScore = Math.max(0, Number(rawScore.toFixed(2)));
    const percentage = totalMarks > 0
      ? Math.max(0, Math.min(100, Math.round((totalScore / totalMarks) * 100)))
      : 0;

    // Dynamic Concept Classification for this student
    const studentMastery = inMemoryStore.conceptMastery.filter(m => m.student_id === studentId);
    const mastered = studentMastery.filter(m => m.mastery_status === 'MASTERED');
    const recap = studentMastery.filter(m => m.mastery_status === 'NEEDS_RECAP');
    const weak = studentMastery.filter(m => m.mastery_status === 'CRITICAL_WEAKNESS');

    // Automatically regenerate Weekly Smart Report with fresh diagnostic data
    const updatedReport = await generateWeeklyReport(studentId);
    inMemoryStore.weeklyReports.unshift(updatedReport);

    // Save to inMemoryStore.submissions for real-time teacher classroom analytics
    if (!inMemoryStore.submissions) inMemoryStore.submissions = [];
    const studentUser = (inMemoryStore.users || []).find(u => u.id === studentId);
    const submissionRecord = {
      submissionId: `sub_${id}_${studentId}_${Date.now()}`,
      assessmentId: id,
      assessmentTitle: assessment.title,
      subject: assessment.subject || 'Biology',
      subjectKey: assessment.subjectKey || 'BIOLOGY',
      chapterName: assessment.chapterName || '',
      studentId,
      studentName: studentName || studentUser?.full_name || ((assessment.subjectKey === 'BIOLOGY' || assessment.subject === 'Biology') ? 'Ananya Thakur' : 'Aryan Sharma'),
      rollNumber: studentUser?.roll_number || ((assessment.subjectKey === 'BIOLOGY' || assessment.subject === 'Biology') ? '12-M-01' : '12-NM-01'),
      grade: assessment.grade || '12',
      section: assessment.section || ((assessment.subjectKey === 'BIOLOGY' || assessment.subject === 'Biology') ? '12-Med' : '12-NonMed'),
      totalScore,
      totalMarks,
      percentage,
      totalTimeSpentSeconds: totalTimeSpent,
      smartCardSummary: `Scored ${percentage}% on ${assessment.title} (${assessment.subject || 'Science'}). Mastered ${mastered.length} subtopics, needs recap on ${recap.length}, critical weakness on ${weak.length}.`,
      questionBreakdown: questionBreakdown.map(qb => {
        let errorType = 'NONE';
        if (!qb.isCorrect) {
          errorType = qb.timeSpentSeconds > (qb.benchmarkSeconds * 1.5) ? 'TIME_PRESSURE' : 'CONCEPTUAL';
        }
        return {
          ...qb,
          mistakeClassification: {
            type: errorType,
            label: qb.isCorrect ? 'Correct Execution' : (errorType === 'TIME_PRESSURE' ? 'Time Pressure Hesitation' : 'Conceptual Error'),
            explanation: qb.isCorrect ? 'Accurate problem solution.' : 'Error in formula or concept execution.'
          }
        };
      }),
      submittedAt: new Date().toISOString()
    };
    inMemoryStore.submissions.unshift(submissionRecord);

    // 4. Generate Personalized Remedial Assignment based on exact questions missed & formulas
    // STRICT CONTEXT: Preserves subject, subjectKey, grade, and chapterName!
    const personalizedAssignment = generatePersonalizedRemedialAssignment({
      studentId,
      studentName: studentName || studentUser?.full_name || ((assessment.subjectKey === 'BIOLOGY' || assessment.subject === 'Biology') ? 'Ananya Thakur' : 'Aryan Sharma'),
      rollNumber: studentUser?.roll_number || ((assessment.subjectKey === 'BIOLOGY' || assessment.subject === 'Biology') ? '12-M-01' : '11-S-24'),
      assessmentId: id,
      assessmentTitle: assessment.title,
      subject: assessment.subject || 'Biology',
      subjectKey: assessment.subjectKey || 'BIOLOGY',
      grade: assessment.grade || '12',
      chapterName: assessment.chapterName || '',
      questionBreakdown
    });

    if (!inMemoryStore.remedialAssignments) inMemoryStore.remedialAssignments = [];
    inMemoryStore.remedialAssignments.unshift(personalizedAssignment);

    res.json({
      success: true,
      message: 'Test submitted and evaluated with sub-second diagnostic classification.',
      results: {
        assessmentId: id,
        assessmentTitle: assessment.title,
        subject: assessment.subject || 'Biology',
        subjectKey: assessment.subjectKey || 'BIOLOGY',
        chapterName: assessment.chapterName || '',
        studentId,
        studentName,
        totalQuestions: assessment.questions.length,
        examPatternId: examPattern ? examPattern.patternId : null,
        negativeMarkingApplied: negativePenalty,
        totalScore,
        totalMarks,
        percentage,
        totalTimeSpentSeconds: totalTimeSpent,
        questionBreakdown,
        diagnosticMatrix: {
          masteredCount: mastered.length,
          recapCount: recap.length,
          weakCount: weak.length,
          mastered: mastered.map(m => m.subtopic),
          recap: recap.map(m => m.subtopic),
          weak: weak.map(m => m.subtopic)
        },
        weeklyReportId: updatedReport.id,
        personalizedAssignment
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4a. GET /api/assessments/remedial/:id - Fetch personalized remedial assignment
router.get('/remedial/:id', (req, res) => {
  try {
    const { id } = req.params;
    const assignments = inMemoryStore.remedialAssignments || [];
    const found = assignments.find(a => a.assignmentId === id);
    if (!found) {
      if (assignments.length > 0) return res.json({ success: true, assignment: assignments[0] });
      return res.status(404).json({ success: false, error: 'Remedial assignment not found' });
    }
    res.json({ success: true, assignment: found });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4b. POST /api/assessments/remedial/verify-formula - Verify student formula input with LaTeX feedback
router.post('/remedial/verify-formula', (req, res) => {
  try {
    const { subtopic = 'Verhulst-Pearl Logistic Growth Equation', formulaInput, studentInput, subject = 'Biology' } = req.body;
    const input = formulaInput || studentInput || '';
    const evaluation = verifyStudentFormula(subtopic, input, subject);
    res.json({ success: true, ...evaluation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4c. POST /api/assessments/remedial/generate - Generate on-demand personalized remedial assignment
router.post('/remedial/generate', (req, res) => {
  try {
    const {
      studentId = 'b0000000-0000-0000-0000-000000000001',
      studentName = 'Aryan Sharma',
      rollNumber = '11-S-24',
      assessmentId = 'asgn_01',
      assessmentTitle = 'Classroom Assessment',
      subject = 'Biology',
      subjectKey = 'BIOLOGY',
      grade = '12',
      chapterName = '',
      questionBreakdown = []
    } = req.body;

    const assignment = generatePersonalizedRemedialAssignment({
      studentId,
      studentName,
      rollNumber,
      assessmentId,
      assessmentTitle,
      subject,
      subjectKey,
      grade,
      chapterName,
      questionBreakdown
    });

    if (!inMemoryStore.remedialAssignments) inMemoryStore.remedialAssignments = [];
    inMemoryStore.remedialAssignments.unshift(assignment);

    res.json({ success: true, assignment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4c-1. Pipeline Tool Endpoints: quizTool, testTool, assignmentTool
router.post('/tools/quiz', async (req, res) => {
  try {
    const quiz = await quizTool.createQuiz(req.body);
    res.status(201).json({ success: true, tool: 'quizTool', quiz });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tools/test', async (req, res) => {
  try {
    const test = await testTool.createTest(req.body);
    res.status(201).json({ success: true, tool: 'testTool', test });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/tools/remedial', (req, res) => {
  try {
    const remedial = assignmentTool.generateRemedialAssignment(req.body);
    if (!inMemoryStore.remedialAssignments) inMemoryStore.remedialAssignments = [];
    inMemoryStore.remedialAssignments.unshift(remedial);
    res.status(201).json({ success: true, tool: 'assignmentTool', remedial });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4d. POST /api/assessments/remedial/export-docx - Export personalized remedial assignment as plain Microsoft Word (.docx)
router.post('/remedial/export-docx', async (req, res) => {
  try {
    const payload = req.body.assignment || req.body;
    const studentName = payload.studentName || 'Student';
    const filename = `HAPS_Remedial_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
    const docxBuffer = await generateAssignmentDocxBuffer(payload);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4e. POST /api/assessments/export-docx - Export any test / quiz / worksheet as plain Microsoft Word (.docx)
router.post('/export-docx', async (req, res) => {
  try {
    const payload = req.body.assessment || req.body;
    const title = payload.title || 'Assignment';
    const filename = `HAPS_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
    const docxBuffer = await generateAssignmentDocxBuffer(payload);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4f. GET /api/assessments/:id/export-docx - Download test / remedial assignment by ID as Word document (.docx)
router.get('/:id/export-docx', async (req, res) => {
  try {
    const { id } = req.params;
    const all = [
      ...(inMemoryStore.assessments || []),
      ...(inMemoryStore.remedialAssignments || [])
    ];
    const found = all.find(a => a.id === id || a.assignmentId === id);
    if (!found) {
      return res.status(404).json({ success: false, error: 'Assessment not found' });
    }
    const title = found.title || 'Assignment';
    const filename = `HAPS_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.docx`;
    const docxBuffer = await generateAssignmentDocxBuffer(found);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', docxBuffer.length);
    res.send(docxBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/assessments/auto-generate - 1-Click Auto-Generate Competitive Exam / Board Quiz
router.post('/auto-generate', async (req, res) => {
  try {
    const {
      examType = 'JEE_MAIN',
      grade = '10',
      subject = 'Science',
      questionCount = 5,
      targetSection = '10-Science-A',
      title = null
    } = req.body;

    const count = Math.min(30, Math.max(1, Number(questionCount) || 5));
    const selectedQuestions = [];

    // 1. Gather matching questions from NCERT PYQ bank & in-memory store
    const pyqs = getAllClass10Questions().filter(q => 
      q.subject.toLowerCase() === subject.toLowerCase() || subject === 'ALL'
    );
    const storeQuestions = (inMemoryStore.questions || []).filter(q =>
      (String(q.grade) === String(grade) || !q.grade) &&
      (q.subject?.toLowerCase() === subject.toLowerCase() || q.topic?.toLowerCase().includes(subject.toLowerCase()))
    );

    const combinedPool = [...pyqs, ...storeQuestions];
    
    // Deduplicate by question_latex
    const seen = new Set();
    const uniquePool = [];
    combinedPool.forEach(q => {
      if (!seen.has(q.question_latex)) {
        seen.add(q.question_latex);
        uniquePool.push(q);
      }
    });

    // Shuffle pool
    const shuffled = uniquePool.sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selectedQuestions.push(shuffled[i]);
    }

    // 2. If more questions needed, generate dynamically via LLM Engine
    if (selectedQuestions.length < count) {
      const remaining = count - selectedQuestions.length;
      console.log(`[ASSESSMENT AUTO-GEN] Generating ${remaining} supplementary questions via LLM Engine...`);
      for (let j = 0; j < remaining; j++) {
        try {
          const freshQ = await generateLlmQuestion({
            grade,
            subject,
            chapter: j % 2 === 0 ? 'Light – Reflection and Refraction' : 'Electricity',
            board: examType === 'HP_BOARDS' ? 'HP_BOARD' : (examType === 'CBSE_BOARDS' ? 'CBSE' : 'JEE_MAIN'),
            difficulty: examType === 'OLYMPIAD' ? 'OLYMPIAD_LEVEL' : (examType.includes('JEE') ? 'HARD' : 'MEDIUM'),
            questionType: examType.includes('JEE') || examType.includes('NEET') ? 'MCQ_SINGLE' : 'NUMERICAL',
            provider: 'auto'
          });
          if (freshQ && freshQ.question_latex) {
            selectedQuestions.push(freshQ);
          }
        } catch (e) {
          console.warn('[ASSESSMENT AUTO-GEN] LLM supplementary generation fallback:', e.message);
        }
      }
    }

    const testTitle = title || `${grade === '10' ? 'Class 10' : 'Class 11'} ${subject} ${examType.replace(/_/g, ' ')} Auto-Diagnostic Quiz`;
    const durationMinutes = Math.max(15, count * 3);
    const totalMarks = count * 4;

    const newAssessment = {
      id: `asgn_auto_${Date.now()}`,
      title: testTitle,
      description: `Auto-generated ${examType} competitive assessment with ${selectedQuestions.length} curated questions.`,
      teacherName: 'HAPS-AI Auto-Examiner',
      grade: String(grade),
      section: targetSection,
      board: examType,
      subject,
      durationMinutes,
      totalMarks,
      questions: selectedQuestions.map((rawQ, idx) => {
        const q = ensureQuestionHasRichOptions({ ...rawQ });
        return {
          id: q.id || `q_auto_${Date.now()}_${idx + 1}`,
          topic: q.topic || q.chapter || 'Science Core',
          subtopic: q.subtopic || (q.ncert_mapping ? q.ncert_mapping.ncert_section : 'Standard'),
          grade: q.grade || grade,
          board: q.curriculum_board || examType,
          question_type: q.question_type || 'MCQ_SINGLE',
          difficulty: q.difficulty || 'MEDIUM',
          benchmark_time_seconds: Number(q.benchmark_time_seconds) || 90,
          question_latex: q.question_latex,
          options_latex: q.options_latex || [],
          correct_answer: q.correct_answer || q.correct_answer_latex || ((q.options_latex || []).find(o => o && o.is_correct) || {}).key || null,
          solution_latex: q.solution_latex || '',
          socratic_hints: q.socratic_hints || [],
          ncert_mapping: q.ncert_mapping || null,
          step_rubric: q.step_rubric || []
        };
      }),
      createdAt: new Date().toISOString()
    };

    if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
    inMemoryStore.assessments.unshift(newAssessment);

    // Emit event to Kafka stream
    await emitEvent('assessment.published', newAssessment.id, {
      title: newAssessment.title,
      examType,
      grade: newAssessment.grade,
      questionCount: newAssessment.questions.length
    });

    res.status(201).json({
      success: true,
      message: `Auto-generated ${examType} test paper with ${newAssessment.questions.length} questions.`,
      assessment: newAssessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 5B. TEACHER UNIT TEST CREATOR: MARKS-DISTRIBUTED DRAFT GENERATOR & CUSTOMIZER
// ============================================================================

function normalizeUnitTestQuestion(q, idx, fallbackMarks, typeLabel, chapter, topic) {
  let rawText = (q.question_latex || q.questionText || `Question ${idx + 1}`).trim();
  let options = Array.isArray(q.options_latex) && q.options_latex.length >= 2
    ? [...q.options_latex]
    : (Array.isArray(q.options) && q.options.length >= 2 ? [...q.options] : []);
  let solution = q.solution_latex || q.solution || '';
  let correctAnswer = q.correct_answer || q.correct_answer_latex || 'A';

  // 1. Strip PDF/OCR exam header noise
  rawText = rawText.replace(/CBSE\s*ADDITIONAL PRACTICE QUESTIONS[\s\S]*?All questions are compulsory\.\s*/i, '');
  rawText = rawText.replace(/This question paper has [^\n]+(?:\n|$)/i, '');
  rawText = rawText.replace(/All the sections are compulsory\.(?:\n|$)/i, '');
  rawText = rawText.replace(/Section A contains [^\n]+(?:\n|$)/i, '');
  rawText = rawText.replace(/There is no overall choice[^\n]+(?:\n|$)/i, '');
  rawText = rawText.replace(/Use of calculators is not allowed\.(?:\n|$)/i, '');
  rawText = rawText.replace(/Q\.No\s+Questions\s+Marks(?:\n|$)/i, '');

  // 2. Remove footer page numbers
  rawText = rawText.replace(/\n?--\s*\d+\s*of\s*\d+\s*--/g, '');

  // 3. Extract embedded options if options array is empty
  const optRegex = /(?:^|\n)\s*([A-D])[\.\)]\s+([\s\S]*?)(?=(?:\n\s*[A-D][\.\)]\s+)|\n?--|\s*$)/g;
  const matches = [...rawText.matchAll(optRegex)];
  if (matches.length >= 4 && options.length === 0) {
    const extracted = [];
    const keys = ['A', 'B', 'C', 'D'];
    let valid = true;
    for (let i = 0; i < 4; i++) {
      if (matches[i][1].toUpperCase() !== keys[i]) { valid = false; break; }
      extracted.push({
        key: keys[i],
        latex: matches[i][2].trim(),
        is_correct: false
      });
    }
    if (valid) {
      options = extracted;
      const firstOptIndex = rawText.indexOf(matches[0][0]);
      if (firstOptIndex !== -1) {
        rawText = rawText.substring(0, firstOptIndex).trim();
      }
    }
  }

  // 4. Specifically ensure Questions 1 and 2 follow the exact clean layout and options structure as Q3, Q4, Q5
  if (/^μF,\s*then\s*find\s*the\s*energy/i.test(rawText.trim()) || q.id === 'snr_p_inj_1794902408449_628') {
    rawText = "A camera usually operates at 1.5 V and this potential difference is not sufficient to emit light energy using flash. For this purpose, the flash circuit of the camera has a capacitor that is charged to 300 V–330 V using various electrical components. If the voltage generated across the plates of the capacitor is 300 V and the capacitance of the parallel plate capacitor used is $100\\,\\mu\\text{F}$, find the energy released when the trigger button on the camera is pressed.";
    if (options.length === 0) {
      options = [
        { key: 'A', latex: '$4.5\\,\\text{J}$', is_correct: true, distractor_trap: null },
        { key: 'B', latex: '$0.45\\,\\text{J}$', is_correct: false, distractor_trap: 'Power-of-10 or unit conversion arithmetic slip' },
        { key: 'C', latex: '$45\\,\\text{J}$', is_correct: false, distractor_trap: 'Omitted factor of 10 in microfarad conversion' },
        { key: 'D', latex: '$9.0\\,\\text{J}$', is_correct: false, distractor_trap: 'Omitted factor of 1/2 in energy formula' }
      ];
    }
    correctAnswer = 'A';
    if (!solution) {
      solution = "Energy released when the trigger button on the camera is pressed: $$E = \\frac{1}{2} C V^2 = \\frac{1}{2} \\times (100 \\times 10^{-6}\\,\\text{F}) \\times (300\\,\\text{V})^2 = 4.5\\,\\text{J}$$.";
    }
  } else if (/rotating the dipole to a position of unstable equilibrium/i.test(rawText) || q.id === 'snr_p_inj_1794902408453_179') {
    rawText = "An electric dipole having a dipole moment of $4 \\times 10^{-9}\\,\\text{C}\\cdot\\text{m}$ is placed in a uniform electric field such that the dipole is in stable equilibrium. If the magnitude of the electric field is $3 \\times 10^3\\,\\text{N/C}$, what is the work done in rotating the dipole to a position of unstable equilibrium?";
    if (options.length === 0 || options.every(o => !o.is_correct)) {
      options = [
        { key: 'A', latex: 'Zero', is_correct: false, distractor_trap: 'Confuses net force with work done' },
        { key: 'B', latex: '$1.2 \\times 10^{-5}\\,\\text{J}$', is_correct: false, distractor_trap: 'Computed work for rotation to 90° instead of 180°' },
        { key: 'C', latex: '$2.4 \\times 10^{-5}\\,\\text{J}$', is_correct: true, distractor_trap: null },
        { key: 'D', latex: '$-1.2 \\times 10^{-5}\\,\\text{J}$', is_correct: false, distractor_trap: 'Negative sign error in potential energy difference' }
      ];
    }
    correctAnswer = 'C';
    if (!solution) {
      solution = "Work done in rotating dipole from stable equilibrium ($\\theta_1 = 0^\\circ$) to unstable equilibrium ($\\theta_2 = 180^\\circ$): $$W = -pE(\\cos 180^\\circ - \\cos 0^\\circ) = 2pE = 2 \\times (4 \\times 10^{-9}\\,\\text{C}\\cdot\\text{m}) \\times (3 \\times 10^3\\,\\text{N/C}) = 2.4 \\times 10^{-5}\\,\\text{J}$$.";
    }
  }

  // 5. Ensure options has is_correct property assigned
  if (options.length > 0) {
    const hasCorrect = options.some(o => o.is_correct);
    if (!hasCorrect) {
      const match = options.find(o => o.key === correctAnswer || (q.correct_answer_latex && (o.latex || '').includes(q.correct_answer_latex)));
      if (match) match.is_correct = true;
      else options[0].is_correct = true;
    }
  }

  rawText = rawText.replace(/\n\s*--[\s\S]*$/, '').trim();

  const marks = q.marks || fallbackMarks || 1;
  return {
    ...q,
    id: q.id || `q_test_${Date.now()}_${idx + 1}`,
    questionIndex: idx + 1,
    marks: marks,
    marks_weightage: marks,
    typeLabel: q.typeLabel || typeLabel || `${marks} Mark${marks > 1 ? 's' : ''}`,
    topic: q.topic || topic || chapter || 'Curriculum Focus',
    subtopic: q.subtopic || 'Core Concept',
    chapter_name: q.chapter_name || chapter || 'Main Chapter',
    question_latex: rawText,
    options_latex: options,
    options: options,
    correct_answer: correctAnswer,
    correct_answer_latex: q.correct_answer_latex || (options.find(o => o.is_correct)?.latex) || correctAnswer,
    solution_latex: solution,
    socratic_hints: q.socratic_hints || []
  };
}

// POST /api/assessments/unit-test/generate-draft - Assemble draft test with marks breakdown
router.post('/unit-test/generate-draft', (req, res) => {
  try {
    const {
      title,
      subject = 'Physics',
      grade = '12',
      section = '12-NonMed',
      chapter,
      topic,
      durationMinutes = 45,
      marksBreakdown = {},
      teacherName = 'Dr. Vikram Sharma'
    } = req.body;

    const scopeError = subjectScope.checkTeacherWrite(req.body.teacherSubjectKey, { subjectKey: req.body.subjectKey || subject, section, grade });
    if (scopeError) return res.status(scopeError.status).json({ success: false, error: scopeError.error });

    const count1M = Math.max(0, parseInt(marksBreakdown.count1M ?? 5, 10));
    const count2M = Math.max(0, parseInt(marksBreakdown.count2M ?? 3, 10));
    const count3M = Math.max(0, parseInt(marksBreakdown.count3M ?? 3, 10));
    const count5M = Math.max(0, parseInt(marksBreakdown.count5M ?? 1, 10));

    const totalQuestions = count1M + count2M + count3M + count5M;
    const totalMarks = (count1M * 1) + (count2M * 2) + (count3M * 3) + (count5M * 5);

    if (totalQuestions === 0) {
      return res.status(400).json({ success: false, error: 'Please specify at least 1 question across marks breakdown.' });
    }

    const sUpper = (subject || '').toUpperCase();
    const isC10 = String(grade) === '10';
    let bankKey = 'senior_physics';
    if (isC10) {
      bankKey = sUpper.includes('MATH') ? 'class10_maths' : 'class10_science';
    } else {
      if (sUpper.includes('PHYS')) bankKey = 'senior_physics';
      else if (sUpper.includes('CHEM')) bankKey = 'senior_chemistry';
      else if (sUpper.includes('BIO')) bankKey = 'senior_biology';
      else if (sUpper.includes('MATH')) bankKey = 'senior_mathematics';
    }

    const allBankQuestions = (inMemoryStore.subjectBanks && inMemoryStore.subjectBanks[bankKey]) ? inMemoryStore.subjectBanks[bankKey] : [];

    let candidatePool = allBankQuestions;
    if (chapter) {
      const chClean = chapter.toLowerCase().replace(/chapter\s*[0-9]+:?/i, '').trim();
      const chapterMatches = allBankQuestions.filter(q => {
        const qCh = (q.chapter_name || q.chapter || '').toLowerCase();
        return qCh.includes(chClean) || chClean.includes(qCh);
      });
      if (chapterMatches.length > 0) {
        candidatePool = chapterMatches;
      }
    }

    const selectedQuestions = [];
    const usedIds = new Set();

    function inferBankMarks(q) {
      const explicit = Number(q.marks_weightage || q.marks || (q.ncert_mapping && q.ncert_mapping.marks));
      if (Number.isFinite(explicit) && explicit > 0) return explicit;
      const app = String(q.pyq_appearance || q.question_source || '');
      if (/5\s*-?\s*mark/i.test(app) || q.question_format === 'SUBJECTIVE_LONG') return 5;
      if (/4\s*-?\s*mark|case\s*-?\s*study/i.test(app) || q.question_format === 'CASE_STUDY') return 4;
      if (/3\s*-?\s*mark/i.test(app)) return 3;
      if (/2\s*-?\s*mark/i.test(app)) return 2;
      if (q.question_format === 'MCQ_SINGLE' && Array.isArray(q.options_latex) && q.options_latex.length >= 2) return 1;
      return 1;
    }

    const pickQuestionsForMarks = (targetMarks, neededCount, typeLabel) => {
      if (neededCount <= 0) return;
      // 1. First search chapter-filtered candidatePool for exact marks
      const exact = candidatePool.filter(q => !usedIds.has(q.id) && inferBankMarks(q) === targetMarks);
      for (const q of exact) {
        if (selectedQuestions.length >= totalQuestions) break;
        usedIds.add(q.id);
        selectedQuestions.push({
          ...q,
          marks: targetMarks,
          marks_weightage: targetMarks,
          typeLabel
        });
        if (selectedQuestions.filter(sq => sq.marks === targetMarks).length >= neededCount) break;
      }

      // 2. If neededCount not met, search the full subject bank for exact marks
      const currentOfThisMark = selectedQuestions.filter(sq => sq.marks === targetMarks).length;
      if (currentOfThisMark < neededCount) {
        const exactBank = allBankQuestions.filter(q => !usedIds.has(q.id) && inferBankMarks(q) === targetMarks);
        for (const q of exactBank) {
          if (selectedQuestions.length >= totalQuestions) break;
          usedIds.add(q.id);
          selectedQuestions.push({
            ...q,
            marks: targetMarks,
            marks_weightage: targetMarks,
            typeLabel
          });
          if (selectedQuestions.filter(sq => sq.marks === targetMarks).length >= neededCount) break;
        }
      }
    };

    pickQuestionsForMarks(1, count1M, '1 Mark (Objective/MCQ)');
    pickQuestionsForMarks(2, count2M, '2 Marks (Short Conceptual)');
    pickQuestionsForMarks(3, count3M, '3 Marks (Numerical/Reasoning)');
    pickQuestionsForMarks(5, count5M, '5 Marks (Long Derivation/Problem)');

    const formattedQuestions = selectedQuestions.map((q, idx) => 
      normalizeUnitTestQuestion(q, idx, q.marks, q.typeLabel, chapter, topic)
    );

    const testId = `test_unit_${Date.now()}`;
    const testCode = `Test ${String((inMemoryStore.assessments || []).length + 1).padStart(2, '0')}`;
    const finalTitle = title || `${chapter || subject} Assessment (${totalMarks} Marks)`;

    const newAssessment = {
      id: testId,
      code: testCode,
      title: finalTitle,
      chapter: chapter || 'Unit Assessment',
      topic: topic || chapter || 'Core Syllabus',
      targetClass: section,
      grade: String(grade),
      section: section,
      subject: subject,
      subjectKey: bankKey,
      duration: `${durationMinutes} Mins`,
      durationMinutes: Number(durationMinutes),
      totalMarks: totalMarks,
      totalQuestions: formattedQuestions.length,
      marksBreakdown: { count1M, count2M, count3M, count5M },
      status: 'DRAFT', // Unpublished by default!
      teacherName: teacherName,
      questions: formattedQuestions,
      createdAt: new Date().toISOString()
    };

    if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
    inMemoryStore.assessments.unshift(newAssessment);

    res.status(201).json({
      success: true,
      message: 'Draft assessment assembled. Ready for teacher preview & custom question edits.',
      assessment: newAssessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/:id/publish - Set status to PUBLISHED so class students can see and take test
router.post('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: `Assessment "${id}" not found.` });
    }

    try {
      assessment.schedule = schedule.normalize((req.body || {}).schedule, { defaultDuration: Number(assessment.durationMinutes) || 60 });
    } catch (e) {
      return res.status(e.status || 400).json({ success: false, error: e.message });
    }
    if (assessment.schedule && assessment.schedule.mode === 'DURATION') {
      assessment.durationMinutes = assessment.schedule.durationMinutes;
      assessment.duration = `${assessment.schedule.durationMinutes} Mins`;
    }
    assessment.status = 'PUBLISHED';
    assessment.publishedAt = new Date().toISOString();

    // Emit event to Kafka/Telemetry
    try {
      await emitEvent('assessment.published', assessment.id, {
        title: assessment.title,
        grade: assessment.grade,
        section: assessment.section || assessment.targetClass,
        questionCount: assessment.questions ? assessment.questions.length : 0
      });
    } catch (e) {}

    res.json({
      success: true,
      message: assessment.schedule
        ? `Test "${assessment.title}" is scheduled for ${assessment.section || assessment.targetClass}: open ${schedule.when(assessment.schedule.opensAt)} to ${schedule.when(assessment.schedule.closesAt)}.`
        : `Test "${assessment.title}" is now published to ${assessment.section || assessment.targetClass}!`,
      assessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/:id/swap-question - Swap question in assessment
router.post('/:id/swap-question', (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex, newQuestionId } = req.body;
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: `Assessment "${id}" not found.` });
    }

    const qIdx = parseInt(questionIndex, 10) - 1;
    if (qIdx < 0 || qIdx >= (assessment.questions || []).length) {
      return res.status(400).json({ success: false, error: 'Invalid questionIndex.' });
    }

    const currentQ = assessment.questions[qIdx];
    const targetMarks = Number(currentQ.marks || currentQ.marks_weightage || 1);
    const bankKey = assessment.subjectKey || 'senior_physics';
    const bankPool = (inMemoryStore.subjectBanks && inMemoryStore.subjectBanks[bankKey]) ? inMemoryStore.subjectBanks[bankKey] : [];

    const existingIds = new Set((assessment.questions || []).map(q => q.id));

    function inferBankQuestionMarks(q) {
      const explicit = Number(q.marks_weightage || q.marks || (q.ncert_mapping && q.ncert_mapping.marks));
      if (Number.isFinite(explicit) && explicit > 0) return explicit;
      const app = String(q.pyq_appearance || q.question_source || '');
      if (/5\s*-?\s*mark/i.test(app) || q.question_format === 'SUBJECTIVE_LONG') return 5;
      if (/4\s*-?\s*mark|case\s*-?\s*study/i.test(app) || q.question_format === 'CASE_STUDY') return 4;
      if (/3\s*-?\s*mark/i.test(app)) return 3;
      if (/2\s*-?\s*mark/i.test(app)) return 2;
      if (q.question_format === 'MCQ_SINGLE' && Array.isArray(q.options_latex) && q.options_latex.length >= 2) return 1;
      return 1;
    }

    let replacement = null;
    if (newQuestionId) {
      const found = bankPool.find(q => q.id === newQuestionId);
      if (found) {
        const foundMarks = inferBankQuestionMarks(found);
        if (foundMarks !== targetMarks) {
          return res.status(400).json({
            success: false,
            error: `Cannot swap a ${targetMarks}-mark question with a ${foundMarks}-mark question. Question marks must strictly match.`
          });
        }
        replacement = found;
      }
    }
    if (!replacement) {
      // Find candidate with strictly same original marks
      replacement = bankPool.find(q => !existingIds.has(q.id) && inferBankQuestionMarks(q) === targetMarks);
    }

    if (!replacement) {
      return res.status(400).json({
        success: false,
        error: `No alternative questions matching strictly ${targetMarks} marks available to swap.`
      });
    }

    const swapped = normalizeUnitTestQuestion(
      replacement,
      qIdx,
      targetMarks,
      currentQ.typeLabel || `${targetMarks} Mark${targetMarks > 1 ? 's' : ''}`,
      assessment.chapter,
      assessment.topic
    );

    assessment.questions[qIdx] = swapped;
    // Strictly maintain original mark allocation
    assessment.totalMarks = (assessment.questions || []).reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

    res.json({
      success: true,
      message: `Question ${qIdx + 1} swapped successfully with a matching ${targetMarks}-mark question.`,
      swappedQuestion: swapped,
      assessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/:id/delete-question - Delete question from assessment
router.post('/:id/delete-question', (req, res) => {
  try {
    const { id } = req.params;
    const { questionIndex } = req.body;
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: `Assessment "${id}" not found.` });
    }

    const qIdx = parseInt(questionIndex, 10) - 1;
    if (qIdx < 0 || qIdx >= (assessment.questions || []).length) {
      return res.status(400).json({ success: false, error: 'Invalid questionIndex.' });
    }

    if (assessment.questions.length <= 1) {
      return res.status(400).json({ success: false, error: 'Assessment must contain at least 1 question.' });
    }

    const deletedQ = assessment.questions.splice(qIdx, 1)[0];
    assessment.questions.forEach((q, idx) => { q.questionIndex = idx + 1; });
    assessment.totalQuestions = assessment.questions.length;
    assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + Number(q.marks || 1), 0);

    res.json({
      success: true,
      message: `Question ${qIdx + 1} deleted.`,
      deletedQuestion: deletedQ,
      assessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/:id/add-question - Add question to assessment
router.post('/:id/add-question', (req, res) => {
  try {
    const { id } = req.params;
    const { marks = 2, customQuestion } = req.body;
    const assessment = (inMemoryStore.assessments || []).find(a => a.id === id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: `Assessment "${id}" not found.` });
    }

    let addedQ = null;
    const targetMarks = Number(marks || 2);
    if (customQuestion && customQuestion.question_latex) {
      addedQ = {
        id: `q_custom_${Date.now()}`,
        questionIndex: assessment.questions.length + 1,
        marks: targetMarks,
        marks_weightage: targetMarks,
        typeLabel: `${targetMarks} Mark${targetMarks > 1 ? 's' : ''}`,
        topic: customQuestion.topic || assessment.topic,
        chapter_name: customQuestion.chapter_name || assessment.chapter,
        question_latex: customQuestion.question_latex,
        options_latex: customQuestion.options_latex || [],
        correct_answer: customQuestion.correct_answer || 'A',
        correct_answer_latex: customQuestion.correct_answer || 'A',
        solution_latex: customQuestion.solution_latex || ''
      };
    } else {
      const bankKey = assessment.subjectKey || 'senior_physics';
      const bankPool = (inMemoryStore.subjectBanks && inMemoryStore.subjectBanks[bankKey]) ? inMemoryStore.subjectBanks[bankKey] : [];
      const existingIds = new Set((assessment.questions || []).map(q => q.id));
      const candidate = bankPool.find(q => !existingIds.has(q.id) && Number(q.marks_weightage || q.marks || 1) === targetMarks) || bankPool.find(q => !existingIds.has(q.id));

      if (!candidate) {
        return res.status(400).json({ success: false, error: 'No available question found to add.' });
      }

      addedQ = {
        ...candidate,
        id: candidate.id || `q_add_${Date.now()}`,
        questionIndex: assessment.questions.length + 1,
        marks: targetMarks,
        marks_weightage: targetMarks,
        typeLabel: `${targetMarks} Mark${targetMarks > 1 ? 's' : ''}`,
        question_latex: candidate.question_latex,
        options_latex: candidate.options_latex || [],
        correct_answer: candidate.correct_answer || candidate.correct_answer_latex || 'A',
        correct_answer_latex: candidate.correct_answer_latex || candidate.correct_answer || 'A',
        solution_latex: candidate.solution_latex || ''
      };
    }

    assessment.questions.push(addedQ);
    assessment.totalQuestions = assessment.questions.length;
    assessment.totalMarks = assessment.questions.reduce((sum, q) => sum + Number(q.marks || 1), 0);

    res.json({
      success: true,
      message: `Question added (${targetMarks} Marks).`,
      addedQuestion: addedQ,
      assessment
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 6. AI PATTERN-MATCHED EXAM GENERATION (JEE MAIN, NEET, CBSE & HP BOARD)
// ============================================================================

// GET /api/assessments/pattern-exam/blueprints - List official exam blueprints
router.get('/pattern-exam/blueprints', (req, res) => {
  try {
    const list = Object.keys(EXAM_BLUEPRINTS).map(k => ({
      id: k,
      name: EXAM_BLUEPRINTS[k].name,
      grade: EXAM_BLUEPRINTS[k].grade,
      stream: EXAM_BLUEPRINTS[k].stream,
      subjects: EXAM_BLUEPRINTS[k].subjects,
      markingScheme: EXAM_BLUEPRINTS[k].markingScheme,
      defaultBenchmarkSeconds: EXAM_BLUEPRINTS[k].defaultBenchmarkSeconds,
      sections: EXAM_BLUEPRINTS[k].sections,
      highYieldTopics: EXAM_BLUEPRINTS[k].highYieldTopics
    }));
    res.json({ success: true, count: list.length, blueprints: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/pattern-exam/analyze - AI Pattern Analysis of question bank
router.post('/pattern-exam/analyze', (req, res) => {
  try {
    const { blueprintId = 'JEE_MAIN_NON_MED' } = req.body;
    const blueprint = EXAM_BLUEPRINTS[blueprintId];
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: `Unknown blueprint "${blueprintId}". Available: ${Object.keys(EXAM_BLUEPRINTS).join(', ')}`
      });
    }

    const banks = inMemoryStore.subjectBanks || {};
    const allQuestions = [];
    Object.values(banks).forEach(arr => {
      if (Array.isArray(arr)) allQuestions.push(...arr);
    });

    const analysis = analyzeBankCoverage(blueprintId, allQuestions);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assessments/pattern-exam/generate - 1-Click AI Pattern Exam Paper Generator
router.post('/pattern-exam/generate', async (req, res) => {
  try {
    const {
      blueprintId = 'JEE_MAIN_NON_MED',
      mode = 'QUICK_DIAGNOSTIC', // 'QUICK_DIAGNOSTIC' (6-12 Qs) or 'FULL_MOCK' (30-90 Qs)
      targetSection = '11-Science-A',
      title = null
    } = req.body;

    const blueprint = EXAM_BLUEPRINTS[blueprintId];
    if (!blueprint) {
      return res.status(404).json({
        success: false,
        error: `Invalid blueprintId. Choose from: ${Object.keys(EXAM_BLUEPRINTS).join(', ')}`
      });
    }

    const generatedExam = await generatePatternMatchedExam({
      blueprintId,
      mode,
      subjectBank: inMemoryStore.subjectBanks || {},
      title,
      targetSection
    });

    if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
    inMemoryStore.assessments.unshift(generatedExam);

    // Emit event to telemetry / event stream
    await emitEvent('assessment.published', generatedExam.id, {
      title: generatedExam.title,
      examType: blueprintId,
      stream: generatedExam.stream,
      grade: generatedExam.grade,
      questionCount: generatedExam.questions.length,
      totalMarks: generatedExam.totalMarks
    });

    res.status(201).json({
      success: true,
      message: `Successfully synthesized ${blueprint.name} test paper matching the official exam pattern.`,
      exam: generatedExam
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// BOARD QUESTION PAPER GENERATOR & TEACHER CUSTOMIZER API ENDPOINTS
// ============================================================================

// Global cache for live board paper customization sessions
if (!inMemoryStore.generatedBoardPapers) {
  inMemoryStore.generatedBoardPapers = {};
}

// 1. GET /api/assessments/board-paper/blueprints - List available CBSE & HP Board blueprints
router.get('/board-paper/blueprints', (req, res) => {
  try {
    const list = Object.values(BOARD_BLUEPRINTS).map(b => ({
      blueprintId: b.blueprintId,
      board: b.board,
      grade: b.grade,
      subject: b.subject,
      title: b.title,
      totalMarks: b.totalMarks,
      timeAllowedHours: b.timeAllowedHours,
      sectionsCount: b.sections.length
    }));
    res.json({ success: true, blueprints: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/assessments/board-paper/generate - Generate full-length board paper
router.post('/board-paper/generate', async (req, res) => {
  try {
    const {
      board = 'CBSE',
      grade = '12',
      subject = 'Physics',
      schoolName = 'HIM ACADEMY PUBLIC SCHOOL (HAPS)',
      academicYear = '2025–26',
      customTitle = null
    } = req.body;

    const scopeError = subjectScope.checkTeacherWrite(req.body.teacherSubjectKey, { subjectKey: subject, grade });
    if (scopeError) return res.status(scopeError.status).json({ success: false, error: scopeError.error });
    if (req.body.teacherSubjectKey && !subjectScope.allowedGrades(req.body.teacherSubjectKey).has(String(grade))) {
      return res.status(403).json({ success: false, error: `Subject isolation: ${req.body.teacherSubjectKey} faculty does not teach Class ${grade}.` });
    }

    const paper = generateBoardQuestionPaper({
      board,
      grade,
      subject,
      schoolName,
      academicYear,
      customTitle
    });

    inMemoryStore.generatedBoardPapers[paper.id] = paper;

    // Also register into general assessments pool for student access
    if (!inMemoryStore.assessments) inMemoryStore.assessments = [];
    const allQuestionsFlat = [];
    paper.sections.forEach(s => allQuestionsFlat.push(...s.questions));
    inMemoryStore.assessments.unshift({
      id: paper.id,
      title: paper.title,
      description: `Official ${paper.board} Board Examination (${paper.totalMarks} Marks, ${paper.timeAllowedHours} Hours)`,
      teacherName: 'HAPS Senior Board Faculty',
      grade: paper.grade,
      section: `${paper.grade}-Board-Prep`,
      board: paper.board,
      subject: paper.subject,
      durationMinutes: paper.timeAllowedMinutes,
      totalMarks: paper.totalMarks,
      questions: allQuestionsFlat,
      paperStructure: paper,
      createdAt: paper.createdAt
    });

    res.status(201).json({
      success: true,
      message: `Generated full-length ${paper.board} Board Question Paper for ${paper.subject} (${paper.totalMarks} Marks, ${paper.totalQuestions} Questions).`,
      paper
    });
  } catch (err) {
    console.error('[BOARD PAPER GENERATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/assessments/board-paper/:id - Fetch generated paper with full sections
router.get('/board-paper/:id', (req, res) => {
  try {
    const { id } = req.params;
    let paper = inMemoryStore.generatedBoardPapers[id];

    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Question paper not found.' });
    }

    res.json({ success: true, paper });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. POST /api/assessments/board-paper/:id/swap-question - Teacher swaps a question with an alternative
router.post('/board-paper/:id/swap-question', (req, res) => {
  try {
    const { id } = req.params;
    const questionId = req.body.questionId || req.body.targetQuestionId;
    const replacementQuestionId = req.body.replacementQuestionId || req.body.newQuestionId || null;
    const customQuestion = req.body.customQuestion || null;

    let paper = inMemoryStore.generatedBoardPapers[id];
    if (!paper && req.body.paper) {
      paper = req.body.paper;
    }
    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found.' });

    const result = swapPaperQuestion({
      paper,
      questionId,
      replacementQuestionId,
      customQuestion
    });

    inMemoryStore.generatedBoardPapers[id] = result.paper;
    res.json({
      success: true,
      message: 'Question swapped successfully.',
      paper: result.paper,
      replacedQuestion: result.replacedQuestion,
      newQuestion: result.newQuestion
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET /api/assessments/board-paper/:id/alternatives - Fetch 3-5 alternative matching questions
router.get('/board-paper/:id/alternatives', (req, res) => {
  try {
    const { id } = req.params;
    const { marks = 1, excludeIds = '', topic = null, subject: querySubject, grade: queryGrade } = req.query;

    let paper = inMemoryStore.generatedBoardPapers[id];
    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    const subject = querySubject || (paper ? paper.subject : 'Physics');
    const grade = queryGrade || (paper ? paper.grade : '12');
    const excludeArr = excludeIds ? excludeIds.split(',') : [];

    const alternatives = getAlternativeQuestions({
      subject,
      grade,
      marks: Number(marks),
      excludeIds: excludeArr,
      topic
    });

    res.json({ success: true, alternatives });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/assessments/board-paper/:id/add-custom-question - Teacher adds their own question
router.post('/board-paper/:id/add-custom-question', (req, res) => {
  try {
    const { id } = req.params;
    const { sectionId, questionData } = req.body;

    let paper = inMemoryStore.generatedBoardPapers[id];
    if (!paper && req.body.paper) {
      paper = req.body.paper;
    }
    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found.' });

    const result = addCustomQuestionToPaper({
      paper,
      sectionId,
      questionData
    });

    inMemoryStore.generatedBoardPapers[id] = result.paper;
    res.status(201).json({
      success: true,
      message: 'Custom question added successfully to question paper.',
      paper: result.paper,
      addedQuestion: result.addedQuestion
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. PUT /api/assessments/board-paper/:id/update-question - Teacher edits question in-place
router.put('/board-paper/:id/update-question', (req, res) => {
  try {
    const { id } = req.params;
    const { questionId, updatedData } = req.body;

    let paper = inMemoryStore.generatedBoardPapers[id];
    if (!paper && req.body.paper) {
      paper = req.body.paper;
    }
    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found.' });

    const updatedPaper = updatePaperQuestion({
      paper,
      questionId,
      updatedData
    });

    inMemoryStore.generatedBoardPapers[id] = updatedPaper;
    res.json({
      success: true,
      message: 'Question updated successfully.',
      paper: updatedPaper
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. DELETE /api/assessments/board-paper/:id/delete-question - Teacher removes a question
router.delete('/board-paper/:id/delete-question', (req, res) => {
  try {
    const { id } = req.params;
    const { questionId } = req.body;

    let paper = inMemoryStore.generatedBoardPapers[id];
    if (!paper && req.body.paper) {
      paper = req.body.paper;
    }
    if (!paper) {
      const asgn = (inMemoryStore.assessments || []).find(a => a.id === id);
      if (asgn && asgn.paperStructure) paper = asgn.paperStructure;
    }

    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found.' });

    const updatedPaper = deletePaperQuestion({
      paper,
      questionId
    });

    inMemoryStore.generatedBoardPapers[id] = updatedPaper;
    res.json({
      success: true,
      message: 'Question removed from paper and numbers re-sequenced.',
      paper: updatedPaper
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;


