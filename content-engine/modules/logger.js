/**
 * Logger module for the Content Engine
 * 
 * Provides standardized logging functionality across the application
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be changed at runtime)
let currentLogLevel = LOG_LEVELS.INFO;

// Log file paths
let logFilePath;
let errorLogFilePath;

/**
 * Initialize the logger
 */
async function init() {
  try {
    // Set up log file paths
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const logDir = config.general.logDir;
    
    // Create log directory if it doesn't exist
    await fs.mkdir(logDir, { recursive: true });
    
    // Set up log file paths with date
    logFilePath = path.join(logDir, `content-engine-${date}.log`);
    errorLogFilePath = path.join(logDir, `content-engine-errors-${date}.log`);
    
    // Log initialization
    await log('INFO', 'Logger initialized');
    
    return true;
  } catch (error) {
    console.error(`Failed to initialize logger: ${error.message}`);
    return false;
  }
}

/**
 * Set the current log level
 * @param {string} level - The log level to set ('ERROR', 'WARN', 'INFO', 'DEBUG')
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    currentLogLevel = LOG_LEVELS[level];
    log('INFO', `Log level set to ${level}`);
  } else {
    log('ERROR', `Invalid log level: ${level}`);
  }
}

/**
 * Write a log entry to the appropriate log file
 * @param {string} level - Log level
 * @param {string} message - Log message
 */
async function log(level, message) {
  if (LOG_LEVELS[level] === undefined) {
    level = 'INFO';
  }
  
  // Only log if the current log level is sufficient
  if (LOG_LEVELS[level] <= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    // Always output to console
    const consoleMethod = level === 'ERROR' ? 'error' : 
                          level === 'WARN' ? 'warn' : 
                          level === 'DEBUG' ? 'debug' : 'log';
    console[consoleMethod](`[${level}] ${message}`);
    
    // Initialize logger if not already done
    if (!logFilePath) {
      await init();
    }
    
    try {
      // Write to main log file (only if paths are available)
      if (logFilePath) {
        await fs.appendFile(logFilePath, logEntry);
        
        // Also write errors to error log
        if (level === 'ERROR' && errorLogFilePath) {
          await fs.appendFile(errorLogFilePath, logEntry);
        }
      }
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }
}

/**
 * Log at ERROR level
 * @param {string} message - Log message
 */
function error(message) {
  log('ERROR', message);
}

/**
 * Log at WARN level
 * @param {string} message - Log message
 */
function warn(message) {
  log('WARN', message);
}

/**
 * Log at INFO level
 * @param {string} message - Log message
 */
function info(message) {
  log('INFO', message);
}

/**
 * Log at DEBUG level
 * @param {string} message - Log message
 */
function debug(message) {
  log('DEBUG', message);
}

module.exports = {
  init,
  setLogLevel,
  log,
  error,
  warn,
  info,
  debug,
  LOG_LEVELS
};
