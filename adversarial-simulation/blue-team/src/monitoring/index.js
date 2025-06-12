/**
 * Blue Team Monitoring System
 * 
 * This module collects and processes logs from the target application,
 * extracts features, and forwards them to the analysis system for
 * bot detection.
 */

const express = require('express');
const winston = require('winston');
const { Client } = require('@elastic/elasticsearch');
const Redis = require('redis');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load environment variables
dotenv.config({ path: '../../config/.env' });

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'monitoring-system' },
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

// Initialize Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
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

// Initialize Elasticsearch indices if they don't exist
async function initializeElasticsearch() {
  try {
    // Create indices for different log types
    const indices = [
      {
        name: 'request-logs',
        mapping: {
          properties: {
            timestamp: { type: 'date' },
            ip: { type: 'ip' },
            method: { type: 'keyword' },
            path: { type: 'keyword' },
            status: { type: 'integer' },
            userAgent: { type: 'text' },
            referer: { type: 'keyword' },
            responseTime: { type: 'float' },
            contentLength: { type: 'integer' },
            headers: { type: 'object' },
            geoip: {
              properties: {
                country_code: { type: 'keyword' },
                country_name: { type: 'keyword' },
                region_name: { type: 'keyword' },
                city_name: { type: 'keyword' },
                latitude: { type: 'float' },
                longitude: { type: 'float' }
              }
            },
            browser: {
              properties: {
                name: { type: 'keyword' },
                version: { type: 'keyword' },
                os: { type: 'keyword' }
              }
            },
            fingerprint: {
              properties: {
                hash: { type: 'keyword' },
                userAgent: { type: 'keyword' },
                headers: { type: 'keyword' },
                cookies: { type: 'keyword' },
                screenResolution: { type: 'keyword' },
                timezone: { type: 'keyword' },
                language: { type: 'keyword' },
                plugins: { type: 'keyword' }
              }
            },
            isBot: { type: 'boolean' },
            botScore: { type: 'float' },
            botScoreBreakdown: { type: 'object' }
          }
        }
      },
      {
        name: 'behavior-logs',
        mapping: {
          properties: {
            timestamp: { type: 'date' },
            sessionId: { type: 'keyword' },
            ip: { type: 'ip' },
            eventType: { type: 'keyword' },
            eventData: { type: 'object' },
            timeSinceLastEvent: { type: 'integer' },
            fingerprint: { type: 'keyword' },
            isBot: { type: 'boolean' },
            botScore: { type: 'float' }
          }
        }
      },
      {
        name: 'api-logs',
        mapping: {
          properties: {
            timestamp: { type: 'date' },
            ip: { type: 'ip' },
            endpoint: { type: 'keyword' },
            method: { type: 'keyword' },
            responseTime: { type: 'float' },
            status: { type: 'integer' },
            requestSize: { type: 'integer' },
            responseSize: { type: 'integer' },
            headers: { type: 'object' },
            fingerprint: { type: 'keyword' },
            isBot: { type: 'boolean' },
            botScore: { type: 'float' }
          }
        }
      },
      {
        name: 'detection-events',
        mapping: {
          properties: {
            timestamp: { type: 'date' },
            ip: { type: 'ip' },
            sessionId: { type: 'keyword' },
            detectionType: { type: 'keyword' },
            confidence: { type: 'float' },
            evidence: { type: 'object' },
            actionTaken: { type: 'keyword' }
          }
        }
      }
    ];

    for (const index of indices) {
      const exists = await esClient.indices.exists({ index: index.name });
      
      if (!exists) {
        logger.info(`Creating Elasticsearch index: ${index.name}`);
        await esClient.indices.create({
          index: index.name,
          body: {
            mappings: {
              properties: index.mapping.properties
            },
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0
            }
          }
        });
      }
    }
    
    logger.info('Elasticsearch indices initialized');
    
  } catch (error) {
    logger.error('Error initializing Elasticsearch indices:', error);
  }
}

// Process a single request log
async function processRequestLog(log) {
  try {
    // Extract browser fingerprint features
    log.fingerprint = extractFingerprint(log);
    
    // Get geolocation data
    log.geoip = await getGeoIP(log.ip);
    
    // Extract browser information
    log.browser = parseBrowser(log.userAgent);
    
    // Calculate bot score
    const botAnalysis = await analyzeRequest(log);
    log.isBot = botAnalysis.isBot;
    log.botScore = botAnalysis.score;
    log.botScoreBreakdown = botAnalysis.breakdown;
    
    // Store in Elasticsearch
    await esClient.index({
      index: 'request-logs',
      body: log
    });
    
    // Store latest bot score in Redis for quick lookup
    await redisClient.hSet('ip:bot-scores', log.ip, JSON.stringify({
      score: log.botScore,
      timestamp: log.timestamp,
      isBot: log.isBot
    }));
    
    // Notify analysis system via Socket.IO
    io.emit('new-request', {
      ip: log.ip,
      timestamp: log.timestamp,
      path: log.path,
      method: log.method,
      botScore: log.botScore,
      isBot: log.isBot
    });
    
    // If bot score is high, store detection event
    if (log.botScore > 0.7) {
      await storeDetectionEvent({
        timestamp: log.timestamp,
        ip: log.ip,
        sessionId: log.headers['x-session-id'] || 'unknown',
        detectionType: 'high-bot-score',
        confidence: log.botScore,
        evidence: {
          path: log.path,
          method: log.method,
          userAgent: log.userAgent,
          breakdown: log.botScoreBreakdown
        },
        actionTaken: log.botScore > 0.9 ? 'block' : 'flag'
      });
    }
    
    return log;
    
  } catch (error) {
    logger.error('Error processing request log:', error);
    throw error;
  }
}

// Process a single behavior log
async function processBehaviorLog(log) {
  try {
    // Calculate bot score based on behavior patterns
    const botAnalysis = await analyzeBehavior(log);
    log.isBot = botAnalysis.isBot;
    log.botScore = botAnalysis.score;
    
    // Store in Elasticsearch
    await esClient.index({
      index: 'behavior-logs',
      body: log
    });
    
    // Notify analysis system via Socket.IO
    io.emit('new-behavior', {
      sessionId: log.sessionId,
      timestamp: log.timestamp,
      eventType: log.eventType,
      botScore: log.botScore,
      isBot: log.isBot
    });
    
    // If bot score is high, store detection event
    if (log.botScore > 0.7) {
      await storeDetectionEvent({
        timestamp: log.timestamp,
        ip: log.ip,
        sessionId: log.sessionId,
        detectionType: 'suspicious-behavior',
        confidence: log.botScore,
        evidence: {
          eventType: log.eventType,
          eventData: log.eventData,
          timeSinceLastEvent: log.timeSinceLastEvent
        },
        actionTaken: log.botScore > 0.9 ? 'block-session' : 'flag-session'
      });
    }
    
    return log;
    
  } catch (error) {
    logger.error('Error processing behavior log:', error);
    throw error;
  }
}

// Process a single API log
async function processAPILog(log) {
  try {
    // Extract browser fingerprint features
    log.fingerprint = extractFingerprint(log);
    
    // Calculate bot score
    const botAnalysis = await analyzeAPIRequest(log);
    log.isBot = botAnalysis.isBot;
    log.botScore = botAnalysis.score;
    
    // Store in Elasticsearch
    await esClient.index({
      index: 'api-logs',
      body: log
    });
    
    // Notify analysis system via Socket.IO
    io.emit('new-api-request', {
      ip: log.ip,
      timestamp: log.timestamp,
      endpoint: log.endpoint,
      method: log.method,
      botScore: log.botScore,
      isBot: log.isBot
    });
    
    // If bot score is high, store detection event
    if (log.botScore > 0.7) {
      await storeDetectionEvent({
        timestamp: log.timestamp,
        ip: log.ip,
        sessionId: log.headers['x-session-id'] || 'unknown',
        detectionType: 'api-abuse',
        confidence: log.botScore,
        evidence: {
          endpoint: log.endpoint,
          method: log.method,
          responseTime: log.responseTime,
          requestSize: log.requestSize
        },
        actionTaken: log.botScore > 0.9 ? 'block-api' : 'rate-limit'
      });
    }
    
    return log;
    
  } catch (error) {
    logger.error('Error processing API log:', error);
    throw error;
  }
}

// Store a detection event
async function storeDetectionEvent(event) {
  try {
    // Store in Elasticsearch
    await esClient.index({
      index: 'detection-events',
      body: event
    });
    
    // Store in Redis for quick access
    await redisClient.lPush('recent-detections', JSON.stringify(event));
    await redisClient.lTrim('recent-detections', 0, 99); // Keep only 100 most recent
    
    // Notify analysis system via Socket.IO
    io.emit('detection-event', event);
    
    logger.info(`Detection event stored: ${event.detectionType} for IP ${event.ip} with confidence ${event.confidence}`);
    
  } catch (error) {
    logger.error('Error storing detection event:', error);
  }
}

// Extract browser fingerprint
function extractFingerprint(log) {
  // Create a fingerprint hash from various browser attributes
  const components = [
    log.userAgent,
    JSON.stringify(log.headers),
    log.headers['accept-language'] || '',
    log.headers['accept-encoding'] || '',
    log.headers['accept'] || ''
  ];
  
  return {
    hash: createHash(components.join('|')),
    userAgent: log.userAgent,
    headers: Object.keys(log.headers).sort().join(','),
    cookies: log.headers.cookie || '',
    language: log.headers['accept-language'] || '',
    // These would typically come from client-side collection
    screenResolution: 'unknown',
    timezone: 'unknown',
    plugins: 'unknown'
  };
}

// Create a simple hash for fingerprinting
function createHash(str) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Get geolocation data for an IP
async function getGeoIP(ip) {
  // In a real implementation, this would use a GeoIP database
  // For this simulation, we'll use a simplified approach
  try {
    // Default values
    const geoData = {
      country_code: 'US',
      country_name: 'United States',
      region_name: 'California',
      city_name: 'San Francisco',
      latitude: 37.7749,
      longitude: -122.4194
    };
    
    // Check if we have cached data in Redis
    const cached = await redisClient.hGet('ip:geo', ip);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // In a real system, we would call a GeoIP API here
    // For simulation, we'll use randomized data based on IP
    // This is just to simulate different IPs being from different locations
    const ipSum = ip.split('.').reduce((sum, octet) => sum + parseInt(octet), 0);
    
    if (ipSum % 5 === 0) {
      geoData.country_code = 'GB';
      geoData.country_name = 'United Kingdom';
      geoData.region_name = 'England';
      geoData.city_name = 'London';
      geoData.latitude = 51.5074;
      geoData.longitude = -0.1278;
    } else if (ipSum % 5 === 1) {
      geoData.country_code = 'JP';
      geoData.country_name = 'Japan';
      geoData.region_name = 'Tokyo';
      geoData.city_name = 'Tokyo';
      geoData.latitude = 35.6762;
      geoData.longitude = 139.6503;
    } else if (ipSum % 5 === 2) {
      geoData.country_code = 'DE';
      geoData.country_name = 'Germany';
      geoData.region_name = 'Berlin';
      geoData.city_name = 'Berlin';
      geoData.latitude = 52.5200;
      geoData.longitude = 13.4050;
    } else if (ipSum % 5 === 3) {
      geoData.country_code = 'BR';
      geoData.country_name = 'Brazil';
      geoData.region_name = 'São Paulo';
      geoData.city_name = 'São Paulo';
      geoData.latitude = -23.5505;
      geoData.longitude = -46.6333;
    }
    
    // Cache in Redis
    await redisClient.hSet('ip:geo', ip, JSON.stringify(geoData));
    
    return geoData;
    
  } catch (error) {
    logger.error('Error getting GeoIP data:', error);
    return {
      country_code: 'UNKNOWN',
      country_name: 'Unknown',
      region_name: 'Unknown',
      city_name: 'Unknown',
      latitude: 0,
      longitude: 0
    };
  }
}

// Parse browser information from user agent
function parseBrowser(userAgent) {
  try {
    // In a real implementation, this would use a user-agent parsing library
    // For this simulation, we'll use a simplified approach
    let name = 'Unknown';
    let version = 'Unknown';
    let os = 'Unknown';
    
    // Check for common browsers
    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      if (match) version = match[1];
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      if (match) version = match[1];
    }
    
    // Check for common operating systems
    if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }
    
    return { name, version, os };
    
  } catch (error) {
    logger.error('Error parsing browser information:', error);
    return { name: 'Unknown', version: 'Unknown', os: 'Unknown' };
  }
}

// Analyze a request for bot patterns
async function analyzeRequest(log) {
  try {
    // In a real implementation, this would use more sophisticated analysis
    // For this simulation, we'll use some simple heuristics
    
    let score = 0;
    const breakdown = {};
    
    // Check known bot user agents
    if (log.userAgent.includes('bot') || 
        log.userAgent.includes('crawler') || 
        log.userAgent.includes('spider')) {
      score += 0.8;
      breakdown.userAgent = 'Contains bot-like strings';
    }
    
    // Check for missing accept-language header
    if (!log.headers['accept-language']) {
      score += 0.3;
      breakdown.acceptLanguage = 'Missing accept-language header';
    }
    
    // Check for missing referer for non-root URLs
    if (log.path !== '/' && !log.referer) {
      score += 0.2;
      breakdown.referer = 'Missing referer for non-root URL';
    }
    
    // Check for unusual response times
    if (log.responseTime < 5) {
      score += 0.3;
      breakdown.responseTime = 'Unusually fast response time';
    }
    
    // Check request frequency from this IP
    const ipRequests = await getRecentRequestsCount(log.ip);
    if (ipRequests > 30) { // More than 30 requests in the last minute
      score += 0.4;
      breakdown.requestFrequency = `High request frequency: ${ipRequests} in the last minute`;
    }
    
    // Check for datacenters or proxy IPs
    const isDatacenterIP = await checkDatacenterIP(log.ip);
    if (isDatacenterIP) {
      score += 0.5;
      breakdown.ipType = 'Datacenter or proxy IP detected';
    }
    
    // Check for browser inconsistencies
    const browserConsistency = checkBrowserConsistency(log);
    if (!browserConsistency.consistent) {
      score += 0.6;
      breakdown.browserConsistency = browserConsistency.reason;
    }
    
    // Normalize score to 0-1 range
    score = Math.min(score, 1);
    
    return {
      isBot: score > 0.6,
      score,
      breakdown
    };
    
  } catch (error) {
    logger.error('Error analyzing request:', error);
    return { isBot: false, score: 0, breakdown: { error: error.message } };
  }
}

// Get the number of recent requests from an IP
async function getRecentRequestsCount(ip) {
  try {
    // Get requests from the last minute
    const result = await esClient.count({
      index: 'request-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { ip } },
              {
                range: {
                  timestamp: {
                    gte: 'now-1m'
                  }
                }
              }
            ]
          }
        }
      }
    });
    
    return result.count;
    
  } catch (error) {
    logger.error('Error getting recent requests count:', error);
    return 0;
  }
}

// Check if an IP is from a datacenter or proxy
async function checkDatacenterIP(ip) {
  try {
    // In a real implementation, this would use a database of datacenter IPs
    // For this simulation, we'll use a simplified approach
    
    // Check if we have cached data in Redis
    const cached = await redisClient.hGet('ip:datacenter', ip);
    if (cached !== null) {
      return cached === 'true';
    }
    
    // For simulation, randomly mark some IPs as datacenters
    // Based on IP structure (for demonstration only)
    const isDatacenter = ip.startsWith('34.') || 
                         ip.startsWith('35.') || 
                         ip.startsWith('52.') || 
                         ip.startsWith('54.') ||
                         ip.endsWith('.0') ||
                         ip.endsWith('.255');
    
    // Cache in Redis
    await redisClient.hSet('ip:datacenter', ip, isDatacenter.toString());
    
    return isDatacenter;
    
  } catch (error) {
    logger.error('Error checking datacenter IP:', error);
    return false;
  }
}

// Check for browser fingerprint inconsistencies
function checkBrowserConsistency(log) {
  try {
    const { userAgent } = log;
    const headers = log.headers;
    
    // Check if headers match what we expect from the browser
    let inconsistencies = [];
    
    // Check if claiming to be Chrome but missing Chrome-specific headers
    if (userAgent.includes('Chrome/') && !headers['sec-ch-ua']) {
      inconsistencies.push('Chrome UA but missing sec-ch-ua header');
    }
    
    // Check if claiming to be mobile but screen resolution doesn't match
    if (userAgent.includes('Mobile') && log.fingerprint.screenResolution &&
        !log.fingerprint.screenResolution.includes('x')) {
      inconsistencies.push('Mobile UA but invalid screen resolution');
    }
    
    // Check if accept-language matches what we expect from the OS
    if (userAgent.includes('Mac OS X') && 
        headers['accept-language'] && 
        !headers['accept-language'].includes('en-US') && 
        !headers['accept-language'].includes('en')) {
      inconsistencies.push('Mac OS X UA but non-English language');
    }
    
    return {
      consistent: inconsistencies.length === 0,
      reason: inconsistencies.join(', ')
    };
    
  } catch (error) {
    logger.error('Error checking browser consistency:', error);
    return { consistent: true, reason: null };
  }
}

// Analyze behavior logs for bot patterns
async function analyzeBehavior(log) {
  try {
    // In a real implementation, this would use more sophisticated analysis
    // For this simulation, we'll use some simple heuristics
    
    let score = 0;
    
    // Check for unnatural timing between events
    if (log.timeSinceLastEvent !== null) {
      if (log.timeSinceLastEvent < 50) { // Too fast for human
        score += 0.4;
      } else if (log.timeSinceLastEvent > 10000 && log.timeSinceLastEvent < 10100) {
        // Suspiciously consistent timing around 10 seconds
        score += 0.3;
      }
    }
    
    // Check for unnatural mouse movements
    if (log.eventType === 'mousemove' && log.eventData) {
      // Check for perfectly straight lines or grid patterns
      const points = log.eventData.points || [];
      if (points.length >= 3) {
        const slopes = [];
        for (let i = 1; i < points.length; i++) {
          const dx = points[i].x - points[i-1].x;
          const dy = points[i].y - points[i-1].y;
          if (dx !== 0) {
            slopes.push(dy / dx);
          }
        }
        
        // Check if all slopes are the same (straight line)
        const allSame = slopes.every(s => Math.abs(s - slopes[0]) < 0.01);
        if (allSame) {
          score += 0.5;
        }
        
        // Check for perfect horizontal or vertical movements
        const perfectHorVer = slopes.every(s => Math.abs(s) < 0.01 || Math.abs(s) > 100);
        if (perfectHorVer) {
          score += 0.4;
        }
      }
    }
    
    // Check for click patterns
    if (log.eventType === 'click') {
      // Get recent clicks from the same session
      const result = await esClient.search({
        index: 'behavior-logs',
        body: {
          query: {
            bool: {
              must: [
                { term: { sessionId: log.sessionId } },
                { term: { eventType: 'click' } },
                {
                  range: {
                    timestamp: {
                      gte: 'now-1m'
                    }
                  }
                }
              ]
            }
          },
          sort: [
            { timestamp: { order: 'asc' } }
          ],
          size: 10
        }
      });
      
      const clicks = result.hits.hits.map(hit => hit._source);
      
      // Check for perfectly regular click timing
      if (clicks.length >= 3) {
        const intervals = [];
        for (let i = 1; i < clicks.length; i++) {
          const interval = new Date(clicks[i].timestamp) - new Date(clicks[i-1].timestamp);
          intervals.push(interval);
        }
        
        // Check if all intervals are nearly the same
        const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const allSimilar = intervals.every(i => Math.abs(i - avgInterval) < 50); // Within 50ms
        
        if (allSimilar) {
          score += 0.6;
        }
      }
    }
    
    // Check for scrolling patterns
    if (log.eventType === 'scroll') {
      // Check for perfectly even scrolling
      const scrolls = await esClient.search({
        index: 'behavior-logs',
        body: {
          query: {
            bool: {
              must: [
                { term: { sessionId: log.sessionId } },
                { term: { eventType: 'scroll' } },
                {
                  range: {
                    timestamp: {
                      gte: 'now-1m'
                    }
                  }
                }
              ]
            }
          },
          sort: [
            { timestamp: { order: 'asc' } }
          ],
          size: 10
        }
      });
      
      const scrollEvents = scrolls.hits.hits.map(hit => hit._source);
      
      if (scrollEvents.length >= 3) {
        const scrollAmounts = [];
        for (let i = 1; i < scrollEvents.length; i++) {
          if (scrollEvents[i].eventData && scrollEvents[i-1].eventData) {
            const amount = scrollEvents[i].eventData.scrollY - scrollEvents[i-1].eventData.scrollY;
            scrollAmounts.push(amount);
          }
        }
        
        // Check if all scroll amounts are the same
        if (scrollAmounts.length >= 2) {
          const allSame = scrollAmounts.every(a => a === scrollAmounts[0]);
          if (allSame) {
            score += 0.5;
          }
        }
      }
    }
    
    // Normalize score to 0-1 range
    score = Math.min(score, 1);
    
    return {
      isBot: score > 0.6,
      score
    };
    
  } catch (error) {
    logger.error('Error analyzing behavior:', error);
    return { isBot: false, score: 0 };
  }
}

// Analyze API requests for bot patterns
async function analyzeAPIRequest(log) {
  try {
    // In a real implementation, this would use more sophisticated analysis
    // For this simulation, we'll use some simple heuristics
    
    let score = 0;
    
    // Check API request frequency
    const apiRequests = await getRecentAPIRequestsCount(log.ip, log.endpoint);
    if (apiRequests > 20) { // More than 20 API requests to the same endpoint in the last minute
      score += 0.5;
    }
    
    // Check for missing or suspicious headers
    if (!log.headers['user-agent'] || 
        !log.headers['content-type'] || 
        !log.headers['accept']) {
      score += 0.3;
    }
    
    // Check for API requests with very consistent timing
    const timingConsistency = await checkAPITimingConsistency(log.ip, log.endpoint);
    if (timingConsistency > 0.8) {
      score += 0.4;
    }
    
    // Check for unusual payload sizes
    if (log.requestSize > 0 && log.requestSize < 10) {
      score += 0.2; // Suspiciously small non-empty payload
    }
    
    // Check for abnormal response size
    if (log.responseSize > 0 && log.responseSize < 20) {
      score += 0.2; // Suspiciously small non-empty response
    }
    
    // Normalize score to 0-1 range
    score = Math.min(score, 1);
    
    return {
      isBot: score > 0.6,
      score
    };
    
  } catch (error) {
    logger.error('Error analyzing API request:', error);
    return { isBot: false, score: 0 };
  }
}

// Get the number of recent API requests from an IP to an endpoint
async function getRecentAPIRequestsCount(ip, endpoint) {
  try {
    // Get API requests from the last minute
    const result = await esClient.count({
      index: 'api-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { ip } },
              { term: { endpoint } },
              {
                range: {
                  timestamp: {
                    gte: 'now-1m'
                  }
                }
              }
            ]
          }
        }
      }
    });
    
    return result.count;
    
  } catch (error) {
    logger.error('Error getting recent API requests count:', error);
    return 0;
  }
}

// Check for suspiciously consistent API request timing
async function checkAPITimingConsistency(ip, endpoint) {
  try {
    // Get API requests from the last 5 minutes
    const result = await esClient.search({
      index: 'api-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { ip } },
              { term: { endpoint } },
              {
                range: {
                  timestamp: {
                    gte: 'now-5m'
                  }
                }
              }
            ]
          }
        },
        sort: [
          { timestamp: { order: 'asc' } }
        ],
        size: 100
      }
    });
    
    const requests = result.hits.hits.map(hit => hit._source);
    
    // Need at least 3 requests to check timing
    if (requests.length < 3) {
      return 0;
    }
    
    // Calculate intervals between requests
    const intervals = [];
    for (let i = 1; i < requests.length; i++) {
      const interval = new Date(requests[i].timestamp) - new Date(requests[i-1].timestamp);
      intervals.push(interval);
    }
    
    // Calculate standard deviation and mean
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate coefficient of variation (CV)
    // Lower CV means more consistent timing
    const cv = stdDev / mean;
    
    // Convert to a 0-1 score (1 = very consistent timing)
    // If CV is less than 0.1, timing is very consistent (score approaching 1)
    // If CV is greater than 1, timing is very inconsistent (score approaching 0)
    const consistencyScore = Math.max(0, Math.min(1, 1 - cv));
    
    return consistencyScore;
    
  } catch (error) {
    logger.error('Error checking API timing consistency:', error);
    return 0;
  }
}

// API endpoints for receiving logs
app.use(express.json({ limit: '1mb' }));

// Endpoint for receiving request logs
app.post('/api/logs/request', async (req, res) => {
  try {
    const log = req.body;
    
    // Validate log
    if (!log.ip || !log.method || !log.path) {
      return res.status(400).json({ error: 'Invalid log format' });
    }
    
    // Add timestamp if not present
    if (!log.timestamp) {
      log.timestamp = new Date().toISOString();
    }
    
    // Process log
    await processRequestLog(log);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Error processing request log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for receiving behavior logs
app.post('/api/logs/behavior', async (req, res) => {
  try {
    const log = req.body;
    
    // Validate log
    if (!log.sessionId || !log.eventType) {
      return res.status(400).json({ error: 'Invalid log format' });
    }
    
    // Add timestamp if not present
    if (!log.timestamp) {
      log.timestamp = new Date().toISOString();
    }
    
    // Process log
    await processBehaviorLog(log);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Error processing behavior log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for receiving API logs
app.post('/api/logs/api', async (req, res) => {
  try {
    const log = req.body;
    
    // Validate log
    if (!log.ip || !log.endpoint || !log.method) {
      return res.status(400).json({ error: 'Invalid log format' });
    }
    
    // Add timestamp if not present
    if (!log.timestamp) {
      log.timestamp = new Date().toISOString();
    }
    
    // Process log
    await processAPILog(log);
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Error processing API log:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent detections
app.get('/api/detections', async (req, res) => {
  try {
    // Get recent detections from Redis
    const detections = await redisClient.lRange('recent-detections', 0, 99);
    const parsedDetections = detections.map(d => JSON.parse(d));
    
    res.json({ detections: parsedDetections });
    
  } catch (error) {
    logger.error('Error getting recent detections:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bot score for an IP
app.get('/api/bot-score/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    // Get bot score from Redis
    const score = await redisClient.hGet('ip:bot-scores', ip);
    
    if (!score) {
      return res.json({ ip, score: 0, isBot: false });
    }
    
    res.json({ ip, ...JSON.parse(score) });
    
  } catch (error) {
    logger.error('Error getting bot score:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Analysis client connected: ${socket.id}`);
  
  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`Analysis client disconnected: ${socket.id}`);
  });
});

// Initialize Elasticsearch and start server
async function start() {
  try {
    // Initialize Elasticsearch indices
    await initializeElasticsearch();
    
    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`Monitoring server listening on port ${PORT}`);
    });
    
  } catch (error) {
    logger.error('Error starting monitoring system:', error);
    process.exit(1);
  }
}

// Clean up resources on shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down monitoring system...');
  await redisClient.quit();
  server.close();
  process.exit(0);
});

// Start the monitoring system
start();

// Export for testing
module.exports = { app, server, io, redisClient, esClient };
