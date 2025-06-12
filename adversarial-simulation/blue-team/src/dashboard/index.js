/**
 * Blue Team Dashboard Server
 * 
 * This module provides a web interface for monitoring bot detection
 * and visualizing the results of the adversarial simulation.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const axios = require('axios');
const winston = require('winston');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../config/.env' });

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'dashboard' },
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

// Configuration
const PORT = process.env.PORT || 3002;
const MONITORING_API_URL = process.env.MONITORING_API_URL || 'http://localhost:3001';

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.json());

// Socket.IO connection
io.on('connection', (socket) => {
  logger.info(`Dashboard client connected: ${socket.id}`);
  
  // Forward monitoring events to dashboard clients
  const monitoringSocket = require('socket.io-client')(MONITORING_API_URL);
  
  // Forward events from monitoring server to dashboard clients
  monitoringSocket.on('new-request', (data) => {
    socket.emit('new-request', data);
  });
  
  monitoringSocket.on('new-behavior', (data) => {
    socket.emit('new-behavior', data);
  });
  
  monitoringSocket.on('new-api-request', (data) => {
    socket.emit('new-api-request', data);
  });
  
  monitoringSocket.on('detection-event', (data) => {
    socket.emit('detection-event', data);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Dashboard client disconnected: ${socket.id}`);
    monitoringSocket.disconnect();
  });
});

// API routes

// Get recent detections
app.get('/api/detections', async (req, res) => {
  try {
    const response = await axios.get(`${MONITORING_API_URL}/api/detections`);
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting detections:', error);
    res.status(500).json({ error: 'Failed to fetch detections' });
  }
});

// Get bot score for an IP
app.get('/api/bot-score/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const response = await axios.get(`${MONITORING_API_URL}/api/bot-score/${ip}`);
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting bot score:', error);
    res.status(500).json({ error: 'Failed to fetch bot score' });
  }
});

// Get request statistics
app.get('/api/stats/requests', async (req, res) => {
  try {
    // Get time range from query params, default to last hour
    const timeRange = req.query.timeRange || '1h';
    
    const response = await axios.get(`${MONITORING_API_URL}/api/stats/requests`, {
      params: { timeRange }
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting request statistics:', error);
    res.status(500).json({ error: 'Failed to fetch request statistics' });
  }
});

// Get behavior statistics
app.get('/api/stats/behavior', async (req, res) => {
  try {
    // Get time range from query params, default to last hour
    const timeRange = req.query.timeRange || '1h';
    
    const response = await axios.get(`${MONITORING_API_URL}/api/stats/behavior`, {
      params: { timeRange }
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting behavior statistics:', error);
    res.status(500).json({ error: 'Failed to fetch behavior statistics' });
  }
});

// Get API request statistics
app.get('/api/stats/api', async (req, res) => {
  try {
    // Get time range from query params, default to last hour
    const timeRange = req.query.timeRange || '1h';
    
    const response = await axios.get(`${MONITORING_API_URL}/api/stats/api`, {
      params: { timeRange }
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting API statistics:', error);
    res.status(500).json({ error: 'Failed to fetch API statistics' });
  }
});

// Get detection statistics
app.get('/api/stats/detections', async (req, res) => {
  try {
    // Get time range from query params, default to last hour
    const timeRange = req.query.timeRange || '1h';
    
    const response = await axios.get(`${MONITORING_API_URL}/api/stats/detections`, {
      params: { timeRange }
    });
    
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting detection statistics:', error);
    res.status(500).json({ error: 'Failed to fetch detection statistics' });
  }
});

// Get geolocations of bot traffic
app.get('/api/geomap', async (req, res) => {
  try {
    const response = await axios.get(`${MONITORING_API_URL}/api/geomap`);
    res.json(response.data);
  } catch (error) {
    logger.error('Error getting geomap data:', error);
    res.status(500).json({ error: 'Failed to fetch geomap data' });
  }
});

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Start server
server.listen(PORT, () => {
  logger.info(`Dashboard server running on port ${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down dashboard server...');
  server.close();
  process.exit(0);
});

// Export for testing
module.exports = { app, server, io };
