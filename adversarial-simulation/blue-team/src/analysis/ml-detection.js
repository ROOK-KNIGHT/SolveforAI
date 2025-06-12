/**
 * ML-Based Bot Detection System
 * 
 * This module implements machine learning algorithms for detecting bots
 * based on their behavior patterns, request characteristics, and fingerprints.
 */

const winston = require('winston');
const { Client } = require('@elastic/elasticsearch');
const Redis = require('redis');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// ML libraries
const { KMeans } = require('ml-kmeans');
const RandomForestClassifier = require('ml-random-forest').RandomForestClassifier;

// Load environment variables
dotenv.config({ path: '../../config/.env' });

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ml-detection' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
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

// Model storage
let requestModel = null;
let behaviorModel = null;
let fingerprintClusters = null;
let lastModelUpdate = 0;
const MODEL_UPDATE_INTERVAL = parseInt(process.env.MODEL_UPDATE_INTERVAL) || 3600; // 1 hour

/**
 * Train the models using recent data
 */
async function trainModels() {
  try {
    const now = Date.now();
    
    // Check if models need updating
    if (now - lastModelUpdate < MODEL_UPDATE_INTERVAL * 1000) {
      return;
    }
    
    logger.info('Training ML models...');
    
    // Train request model
    await trainRequestModel();
    
    // Train behavior model
    await trainBehaviorModel();
    
    // Create fingerprint clusters
    await clusterFingerprints();
    
    lastModelUpdate = now;
    logger.info('ML models trained successfully');
    
  } catch (error) {
    logger.error('Error training models:', error);
  }
}

/**
 * Train model for request-based bot detection
 */
async function trainRequestModel() {
  try {
    // Get training data from Elasticsearch
    const result = await esClient.search({
      index: 'request-logs',
      body: {
        query: {
          range: {
            timestamp: {
              gte: `now-${process.env.TRAINING_DATA_MAX_AGE || '7d'}`
            }
          }
        },
        size: 10000
      }
    });
    
    const logs = result.hits.hits.map(hit => hit._source);
    
    // Need at least 100 samples to train
    if (logs.length < 100) {
      logger.warn(`Not enough request logs to train model: ${logs.length}`);
      return;
    }
    
    // Extract features
    const features = logs.map(log => [
      // Request rate (requests per minute)
      log.requestsPerMinute || 0,
      // Response time
      log.responseTime || 0,
      // Path entropy (higher for random paths)
      calculateEntropy(log.path) || 0,
      // Header count
      Object.keys(log.headers || {}).length,
      // User agent length
      (log.userAgent || '').length,
      // Has referer (0/1)
      log.referer ? 1 : 0,
      // Content length
      log.contentLength || 0
    ]);
    
    // Extract labels (known bots vs. humans)
    const labels = logs.map(log => log.isBot ? 1 : 0);
    
    // Train random forest model
    requestModel = new RandomForestClassifier({
      nEstimators: 50,
      maxDepth: 10,
      seed: 42
    });
    
    requestModel.train(features, labels);
    logger.info(`Request model trained with ${logs.length} samples`);
    
  } catch (error) {
    logger.error('Error training request model:', error);
  }
}

/**
 * Train model for behavior-based bot detection
 */
async function trainBehaviorModel() {
  try {
    // Get training data from Elasticsearch
    const result = await esClient.search({
      index: 'behavior-logs',
      body: {
        query: {
          range: {
            timestamp: {
              gte: `now-${process.env.TRAINING_DATA_MAX_AGE || '7d'}`
            }
          }
        },
        size: 10000
      }
    });
    
    const logs = result.hits.hits.map(hit => hit._source);
    
    // Need at least 100 samples to train
    if (logs.length < 100) {
      logger.warn(`Not enough behavior logs to train model: ${logs.length}`);
      return;
    }
    
    // Get session statistics
    const sessions = await getSessionStatistics();
    
    // Extract features
    const features = logs.map(log => {
      const session = sessions.find(s => s.sessionId === log.sessionId) || {};
      
      return [
        // Average time between events
        session.avgTimeBetweenEvents || 0,
        // Variance in time between events
        session.varianceTimeBetweenEvents || 0,
        // Mouse movement entropy
        session.mouseMovementEntropy || 0,
        // Click count
        session.clickCount || 0,
        // Scroll count
        session.scrollCount || 0,
        // Navigation count (page loads)
        session.navigationCount || 0,
        // Session duration in seconds
        session.durationSeconds || 0
      ];
    });
    
    // Extract labels (known bots vs. humans)
    const labels = logs.map(log => log.isBot ? 1 : 0);
    
    // Train random forest model
    behaviorModel = new RandomForestClassifier({
      nEstimators: 50,
      maxDepth: 10,
      seed: 42
    });
    
    behaviorModel.train(features, labels);
    logger.info(`Behavior model trained with ${logs.length} samples`);
    
  } catch (error) {
    logger.error('Error training behavior model:', error);
  }
}

/**
 * Cluster fingerprints to detect anomalous browsers
 */
async function clusterFingerprints() {
  try {
    // Get fingerprint data from Elasticsearch
    const result = await esClient.search({
      index: 'request-logs',
      body: {
        query: {
          range: {
            timestamp: {
              gte: `now-${process.env.TRAINING_DATA_MAX_AGE || '7d'}`
            }
          }
        },
        size: 10000,
        _source: ['fingerprint', 'ip', 'userAgent', 'timestamp', 'isBot']
      }
    });
    
    const logs = result.hits.hits.map(hit => hit._source);
    
    // Need at least 50 samples to cluster
    if (logs.length < 50) {
      logger.warn(`Not enough fingerprints to cluster: ${logs.length}`);
      return;
    }
    
    // Create a numeric representation of each fingerprint
    const fingerprintFeatures = [];
    const originalFingerprints = [];
    
    for (const log of logs) {
      if (!log.fingerprint) continue;
      
      // Create a feature vector for the fingerprint
      const features = [
        // User agent hash (convert to number)
        hashStringToNumber(log.fingerprint.userAgent || ''),
        // Headers hash
        hashStringToNumber(log.fingerprint.headers || ''),
        // Language hash
        hashStringToNumber(log.fingerprint.language || ''),
        // Cookie length
        (log.fingerprint.cookies || '').length
      ];
      
      fingerprintFeatures.push(features);
      originalFingerprints.push({
        hash: log.fingerprint.hash,
        userAgent: log.userAgent,
        ip: log.ip,
        timestamp: log.timestamp,
        isBot: log.isBot
      });
    }
    
    // Perform K-means clustering
    const k = Math.min(10, Math.ceil(fingerprintFeatures.length / 10)); // At most 10 clusters
    const kmeans = new KMeans(k);
    const clusterResult = kmeans.predict(fingerprintFeatures);
    
    // Analyze clusters for bot prevalence
    const clusters = [];
    for (let i = 0; i < k; i++) {
      const clusterIndices = clusterResult.filter(r => r === i);
      
      // Get fingerprints in this cluster
      const clusterFingerprints = clusterIndices.map(idx => originalFingerprints[idx]);
      
      // Calculate bot ratio in this cluster
      const botCount = clusterFingerprints.filter(f => f.isBot).length;
      const botRatio = clusterFingerprints.length > 0 ? botCount / clusterFingerprints.length : 0;
      
      clusters.push({
        id: i,
        size: clusterFingerprints.length,
        botRatio,
        fingerprints: clusterFingerprints.map(f => f.hash),
        botFingerprints: clusterFingerprints.filter(f => f.isBot).map(f => f.hash)
      });
    }
    
    fingerprintClusters = {
      clusters,
      model: kmeans,
      features: fingerprintFeatures,
      originalFingerprints
    };
    
    logger.info(`Fingerprint clustering complete: ${k} clusters created`);
    
  } catch (error) {
    logger.error('Error clustering fingerprints:', error);
  }
}

/**
 * Get session statistics for behavioral analysis
 */
async function getSessionStatistics() {
  try {
    // Get all sessions
    const sessionsResult = await esClient.search({
      index: 'behavior-logs',
      body: {
        query: {
          range: {
            timestamp: {
              gte: `now-${process.env.TRAINING_DATA_MAX_AGE || '7d'}`
            }
          }
        },
        size: 0,
        aggs: {
          sessions: {
            terms: {
              field: 'sessionId',
              size: 1000
            },
            aggs: {
              events: {
                top_hits: {
                  size: 1000,
                  sort: [
                    { timestamp: { order: 'asc' } }
                  ]
                }
              },
              clicks: {
                filter: {
                  term: { eventType: 'click' }
                }
              },
              scrolls: {
                filter: {
                  term: { eventType: 'scroll' }
                }
              },
              navigations: {
                filter: {
                  term: { eventType: 'navigation' }
                }
              },
              first_event: {
                min: { field: 'timestamp' }
              },
              last_event: {
                max: { field: 'timestamp' }
              }
            }
          }
        }
      }
    });
    
    const sessions = [];
    
    for (const bucket of sessionsResult.aggregations.sessions.buckets) {
      const sessionId = bucket.key;
      const events = bucket.events.hits.hits.map(hit => hit._source);
      
      // Calculate time between events
      const timeBetweenEvents = [];
      for (let i = 1; i < events.length; i++) {
        const time1 = new Date(events[i-1].timestamp).getTime();
        const time2 = new Date(events[i].timestamp).getTime();
        timeBetweenEvents.push(time2 - time1);
      }
      
      // Calculate mean and variance
      const avgTimeBetweenEvents = timeBetweenEvents.length > 0 ? 
        timeBetweenEvents.reduce((a, b) => a + b, 0) / timeBetweenEvents.length : 0;
      
      const varianceTimeBetweenEvents = timeBetweenEvents.length > 0 ?
        timeBetweenEvents.reduce((a, b) => a + Math.pow(b - avgTimeBetweenEvents, 2), 0) / timeBetweenEvents.length : 0;
      
      // Extract mouse movements
      const mouseMovements = events.filter(e => e.eventType === 'mousemove');
      
      // Calculate mouse movement entropy
      let mouseMovementEntropy = 0;
      if (mouseMovements.length > 0) {
        const directions = [];
        for (let i = 1; i < mouseMovements.length; i++) {
          if (mouseMovements[i].eventData && mouseMovements[i].eventData.x && 
              mouseMovements[i-1].eventData && mouseMovements[i-1].eventData.x) {
            
            const dx = mouseMovements[i].eventData.x - mouseMovements[i-1].eventData.x;
            const dy = mouseMovements[i].eventData.y - mouseMovements[i-1].eventData.y;
            
            // Calculate direction as an angle in radians
            const direction = Math.atan2(dy, dx);
            directions.push(direction);
          }
        }
        
        mouseMovementEntropy = calculateEntropy(directions);
      }
      
      // Calculate session duration
      const firstEvent = new Date(bucket.first_event.value).getTime();
      const lastEvent = new Date(bucket.last_event.value).getTime();
      const durationSeconds = (lastEvent - firstEvent) / 1000;
      
      sessions.push({
        sessionId,
        eventCount: events.length,
        clickCount: bucket.clicks.doc_count,
        scrollCount: bucket.scrolls.doc_count,
        navigationCount: bucket.navigations.doc_count,
        avgTimeBetweenEvents,
        varianceTimeBetweenEvents,
        mouseMovementEntropy,
        durationSeconds
      });
    }
    
    return sessions;
    
  } catch (error) {
    logger.error('Error getting session statistics:', error);
    return [];
  }
}

/**
 * Analyze a request using the trained model
 * @param {Object} request The request to analyze
 * @returns {Object} Analysis results
 */
async function analyzeRequest(request) {
  try {
    // Make sure models are trained
    if (!requestModel) {
      await trainModels();
      
      // If still no model, use heuristic approach
      if (!requestModel) {
        return heuristicRequestAnalysis(request);
      }
    }
    
    // Extract features
    const features = [
      // Request rate (requests per minute)
      request.requestsPerMinute || 0,
      // Response time
      request.responseTime || 0,
      // Path entropy
      calculateEntropy(request.path) || 0,
      // Header count
      Object.keys(request.headers || {}).length,
      // User agent length
      (request.userAgent || '').length,
      // Has referer (0/1)
      request.referer ? 1 : 0,
      // Content length
      request.contentLength || 0
    ];
    
    // Predict using the model
    const prediction = requestModel.predict([features])[0];
    const probabilities = requestModel.predictProbability([features])[0];
    
    // Analyze fingerprint clustering
    let fingerprintScore = 0;
    if (fingerprintClusters && request.fingerprint) {
      fingerprintScore = await analyzeFingerprintCluster(request.fingerprint);
    }
    
    // Combine model prediction with fingerprint analysis
    const combinedScore = (probabilities[1] + fingerprintScore) / 2;
    
    return {
      isBot: combinedScore > (parseFloat(process.env.BOT_SCORE_THRESHOLD) || 0.6),
      score: combinedScore,
      confidence: probabilities[1],
      fingerprintScore
    };
    
  } catch (error) {
    logger.error('Error analyzing request with ML:', error);
    return heuristicRequestAnalysis(request);
  }
}

/**
 * Analyze behavior using the trained model
 * @param {Object} behavior The behavior to analyze
 * @returns {Object} Analysis results
 */
async function analyzeBehavior(behavior) {
  try {
    // Make sure models are trained
    if (!behaviorModel) {
      await trainModels();
      
      // If still no model, use heuristic approach
      if (!behaviorModel) {
        return heuristicBehaviorAnalysis(behavior);
      }
    }
    
    // Get session statistics
    const sessions = await getSessionStatistics();
    const session = sessions.find(s => s.sessionId === behavior.sessionId) || {};
    
    // Extract features
    const features = [
      // Average time between events
      session.avgTimeBetweenEvents || 0,
      // Variance in time between events
      session.varianceTimeBetweenEvents || 0,
      // Mouse movement entropy
      session.mouseMovementEntropy || 0,
      // Click count
      session.clickCount || 0,
      // Scroll count
      session.scrollCount || 0,
      // Navigation count
      session.navigationCount || 0,
      // Session duration in seconds
      session.durationSeconds || 0
    ];
    
    // Predict using the model
    const prediction = behaviorModel.predict([features])[0];
    const probabilities = behaviorModel.predictProbability([features])[0];
    
    return {
      isBot: prediction === 1,
      score: probabilities[1],
      confidence: probabilities[1]
    };
    
  } catch (error) {
    logger.error('Error analyzing behavior with ML:', error);
    return heuristicBehaviorAnalysis(behavior);
  }
}

/**
 * Analyze fingerprint clustering
 * @param {Object} fingerprint The fingerprint to analyze
 * @returns {number} Bot probability score
 */
async function analyzeFingerprintCluster(fingerprint) {
  try {
    if (!fingerprintClusters || !fingerprintClusters.clusters) {
      return 0;
    }
    
    // Create feature vector for the fingerprint
    const features = [
      // User agent hash
      hashStringToNumber(fingerprint.userAgent || ''),
      // Headers hash
      hashStringToNumber(fingerprint.headers || ''),
      // Language hash
      hashStringToNumber(fingerprint.language || ''),
      // Cookie length
      (fingerprint.cookies || '').length
    ];
    
    // Find which cluster this fingerprint belongs to
    const clusterIndex = fingerprintClusters.model.predict([features])[0];
    const cluster = fingerprintClusters.clusters.find(c => c.id === clusterIndex);
    
    if (!cluster) {
      return 0;
    }
    
    // Check if this exact fingerprint hash is known to be a bot
    if (fingerprint.hash && cluster.botFingerprints.includes(fingerprint.hash)) {
      return 1;
    }
    
    // Return the bot ratio for this cluster
    return cluster.botRatio;
    
  } catch (error) {
    logger.error('Error analyzing fingerprint cluster:', error);
    return 0;
  }
}

/**
 * Fallback heuristic request analysis
 * @param {Object} request The request to analyze
 * @returns {Object} Analysis results
 */
function heuristicRequestAnalysis(request) {
  let score = 0;
  
  // Check known bot user agents
  if (request.userAgent && (
    request.userAgent.includes('bot') || 
    request.userAgent.includes('crawler') || 
    request.userAgent.includes('spider'))) {
    score += 0.8;
  }
  
  // Check for missing accept-language header
  if (!request.headers || !request.headers['accept-language']) {
    score += 0.3;
  }
  
  // Check for missing referer for non-root URLs
  if (request.path && request.path !== '/' && !request.referer) {
    score += 0.2;
  }
  
  // Check for unusual response times
  if (request.responseTime !== undefined && request.responseTime < 5) {
    score += 0.3;
  }
  
  // Normalize score to 0-1 range
  score = Math.min(score, 1);
  
  return {
    isBot: score > (parseFloat(process.env.BOT_SCORE_THRESHOLD) || 0.6),
    score,
    confidence: score
  };
}

/**
 * Fallback heuristic behavior analysis
 * @param {Object} behavior The behavior to analyze
 * @returns {Object} Analysis results
 */
function heuristicBehaviorAnalysis(behavior) {
  let score = 0;
  
  // Check for unnatural timing between events
  if (behavior.timeSinceLastEvent !== undefined && behavior.timeSinceLastEvent !== null) {
    if (behavior.timeSinceLastEvent < 50) { // Too fast for human
      score += 0.4;
    } else if (behavior.timeSinceLastEvent > 10000 && behavior.timeSinceLastEvent < 10100) {
      // Suspiciously consistent timing around 10 seconds
      score += 0.3;
    }
  }
  
  // Check for unusual event patterns
  if (behavior.eventType === 'mousemove' && behavior.eventData && behavior.eventData.points) {
    const points = behavior.eventData.points;
    if (points.length >= 3) {
      // Check for perfectly straight lines
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
    }
  }
  
  // Normalize score to 0-1 range
  score = Math.min(score, 1);
  
  return {
    isBot: score > (parseFloat(process.env.BOT_SCORE_THRESHOLD) || 0.6),
    score,
    confidence: score
  };
}

/**
 * Calculate Shannon entropy of a string or array
 * @param {string|Array} data The data to calculate entropy for
 * @returns {number} Entropy value
 */
function calculateEntropy(data) {
  if (!data) return 0;
  
  const getFrequencies = (arr) => {
    const freq = {};
    for (const item of arr) {
      freq[item] = (freq[item] || 0) + 1;
    }
    return freq;
  };
  
  let frequencies;
  if (typeof data === 'string') {
    frequencies = getFrequencies(data.split(''));
  } else if (Array.isArray(data)) {
    frequencies = getFrequencies(data);
  } else {
    return 0;
  }
  
  const len = typeof data === 'string' ? data.length : data.length;
  let entropy = 0;
  
  for (const key in frequencies) {
    const p = frequencies[key] / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * Hash a string to a number for clustering
 * @param {string} str The string to hash
 * @returns {number} A numeric hash
 */
function hashStringToNumber(str) {
  if (!str) return 0;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Normalize to a float between 0 and 1
  return Math.abs(hash) / 2147483647;
}

// Initialize models on startup
trainModels().catch(err => logger.error('Error initializing models:', err));

// Export the analysis functions
module.exports = {
  analyzeRequest,
  analyzeBehavior,
  trainModels
};
