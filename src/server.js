// ============================================================================
// UNISOLE AI SCHOOL: PRIMARY API GATEWAY & WEBSOCKET SERVER
// Unisole AI School Scholar Assistant
// ============================================================================

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const { initDatabase } = require('./config/database');
const { initKafkaProducer } = require('./kafka/producer');
const { initKafkaConsumer, setBroadcastCallback } = require('./kafka/consumer');

const questionsRouter = require('./routes/questions');
const telemetryRouter = require('./routes/telemetry');
const analyticsRouter = require('./routes/analytics');
const handwrittenRouter = require('./routes/handwritten');
const reportsRouter = require('./routes/reports');
const uploadRouter = require('./routes/upload');
const notificationsRouter = require('./routes/notifications');
const assessmentsRouter = require('./routes/assessments');
const curriculumRouter = require('./routes/curriculum');
const voiceTutorRouter = require('./routes/voiceTutor');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware (CORS configured for decoupled frontend origins)
const defaultLocalOrigins = [
  'http://localhost:3008',
  'http://127.0.0.1:3008',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const envOriginsRaw = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL]
  .filter(Boolean)
  .join(',');
const allowAllOrigins = !envOriginsRaw || envOriginsRaw.split(',').map(s => s.trim()).includes('*');
const allowedOrigins = new Set([
  ...defaultLocalOrigins,
  ...envOriginsRaw.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(s => s && s !== '*')
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowAllOrigins) return callback(null, true);
    const clean = origin.replace(/\/+$/, '');
    if (allowedOrigins.has(clean)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// WebSocket Client Hub for Real-time Classroom Telemetry
const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  console.log(`[WEBSOCKET] Client connected. Total active streams: ${wsClients.size}`);

  ws.send(JSON.stringify({
    type: 'CONNECTION_ESTABLISHED',
    message: 'Connected to HAPS-AI Real-Time Telemetry Stream Bus',
    timestamp: new Date().toISOString()
  }));

  // Handle incoming student telemetry stream over WebSocket
  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      console.log(`[WEBSOCKET INCOMING] Type: ${msg.type} from student ${msg.studentId || 'anon'}`);

      // Broadcast student telemetry to all connected teacher screens
      broadcastToClients({
        ...msg,
        broadcastTime: new Date().toISOString()
      });
    } catch (err) {
      console.error('[WEBSOCKET MSG PARSE ERROR]', err.message);
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[WEBSOCKET] Client disconnected. Remaining: ${wsClients.size}`);
  });
});

// Broadcast helper for Kafka consumer events
function broadcastToClients(data) {
  const messageStr = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) { // OPEN
      client.send(messageStr);
    }
  }
}

setBroadcastCallback(broadcastToClients);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Unisole AI School Scholar Assistant API Gateway',
    school: 'Unisole AI School',
    curriculumSupport: ['HP_BOARD', 'CBSE', 'JEE_MAIN', 'JEE_ADVANCED', 'NEET', 'OLYMPIAD'],
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    activeWebSockets: wsClients.size
  });
});

// Mount Routes
app.use('/api/questions', questionsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/handwritten', handwrittenRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/curriculum', curriculumRouter);
app.use('/api/voice-tutor', voiceTutorRouter);

// Standalone Backend API Gateway Root
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Unisole AI School Scholar Assistant API & WebSocket Gateway',
    mode: 'standalone-backend',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler for unhandled endpoints
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found on HAPS-AI Gateway' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT SERVER ERROR]', err.stack);
  res.status(500).json({ success: false, error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 5050;

async function bootstrap() {
  console.log('------------------------------------------------------------');
  console.log('BOOTSTRAPPING HAPS-AI SCHOLAR ASSISTANT (STAGING/PROD)');
  console.log('------------------------------------------------------------');

  initDatabase();

  server.listen(PORT, async () => {
    console.log(`[SERVER] HAPS-AI Gateway listening on port ${PORT}`);
    console.log(`[SERVER] Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`[SERVER] WebSocket server live at ws://localhost:${PORT}`);

    // Asynchronously connect Kafka without blocking server startup
    try {
      await initKafkaProducer();
      await initKafkaConsumer();
    } catch (e) {
      console.warn('[SERVER] Kafka optional connection notice:', e.message);
    }
  });
}

if (require.main === module) {
  bootstrap();
} else {
  initDatabase();
}

module.exports = { app, server };
