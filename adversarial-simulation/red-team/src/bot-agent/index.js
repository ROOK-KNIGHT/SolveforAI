/**
 * Bot Agent
 * 
 * Connects to the C2 server, receives commands, and executes them against
 * the target website using browser automation with evasion techniques.
 */

const { io } = require('socket.io-client');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const winston = require('winston');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const proxyChain = require('proxy-chain');

// Load environment variables
dotenv.config({ path: '../../config/.env' });

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bot-agent' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

// Bot configuration
const BOT_ID = process.env.BOT_ID || uuidv4();
const C2_SERVER_URL = process.env.C2_SERVER_URL || 'http://localhost:3000';
const TARGET_URL = process.env.TARGET_URL || 'https://solveforai.com';

// Connect to C2 server
const socket = io(C2_SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity
});

// Store browser instance
let browser = null;
let page = null;

// Status tracking
let currentStatus = 'idle';
let currentCommand = null;

/**
 * Initialize the browser with evasion techniques
 */
async function initBrowser() {
  try {
    logger.info('Initializing browser...');
    
    const options = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ]
    };
    
    // Add proxy if enabled
    if (process.env.PROXY_ENABLED === 'true' && process.env.PROXY_URL) {
      const newProxyUrl = await proxyChain.anonymizeProxy(process.env.PROXY_URL);
      options.args.push(`--proxy-server=${newProxyUrl}`);
      logger.info(`Using proxy: ${process.env.PROXY_URL} (anonymized)`);
    }
    
    // Launch browser
    browser = await puppeteer.launch(options);
    logger.info('Browser initialized');
    
    // Create new page
    page = await browser.newPage();
    
    // Set random viewport
    await page.setViewport({
      width: 1920,
      height: 1080
    });
    
    // Set random user agent if enabled
    if (process.env.FINGERPRINT_ROTATION === 'true') {
      await page.setUserAgent(getRandomUserAgent());
    }
    
    // Set extra headers to evade detection
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Add JavaScript evasion
    await page.evaluateOnNewDocument(() => {
      // Override navigator properties
      const newProto = navigator.__proto__;
      delete newProto.webdriver;
      
      // Override permissions
      navigator.permissions.query = (parameters) => {
        return Promise.resolve({ state: 'granted' });
      };
      
      // Add language plugins to make it look more human
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            {
              0: {
                type: 'application/pdf',
                suffixes: 'pdf',
                description: 'Portable Document Format'
              },
              name: 'Chrome PDF Plugin',
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer'
            }
          ];
        },
      });
    });
    
    logger.info('Browser evasion techniques applied');
    return true;
    
  } catch (error) {
    logger.error('Error initializing browser:', error);
    return false;
  }
}

/**
 * Handle commands from the C2 server
 */
async function handleCommand(commandObj) {
  const { id, command, params } = commandObj;
  
  logger.info(`Received command: ${command} (ID: ${id})`);
  currentCommand = id;
  
  try {
    // Update status to executing
    updateStatus('executing');
    
    let result = null;
    let error = null;
    
    // Execute command based on type
    switch (command) {
      case 'visit':
        result = await visitPage(params.url || TARGET_URL);
        break;
        
      case 'scrape':
        result = await scrapePage(params.selector);
        break;
        
      case 'interact':
        result = await interactWithPage(params);
        break;
        
      case 'api_request':
        result = await makeApiRequest(params);
        break;
        
      case 'restart_browser':
        result = await restartBrowser();
        break;
        
      case 'shutdown':
        await shutdown();
        return; // No need to send result for shutdown
        
      default:
        error = `Unknown command: ${command}`;
        logger.error(error);
    }
    
    // Send result back to C2 server
    sendResult(id, result, error);
    
  } catch (error) {
    logger.error(`Error executing command ${command}:`, error);
    sendResult(id, null, error.message);
  } finally {
    // Reset command and update status
    currentCommand = null;
    updateStatus('idle');
  }
}

/**
 * Visit a page with human-like behavior
 */
async function visitPage(url) {
  logger.info(`Visiting page: ${url}`);
  
  try {
    // Add timing jitter
    if (process.env.TIMING_JITTER === 'true') {
      await addRandomDelay();
    }
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Simulate human behavior if enabled
    if (process.env.SIMULATE_HUMAN_BEHAVIOR === 'true') {
      await simulateHumanBehavior();
    }
    
    // Get page title
    const title = await page.title();
    
    return {
      url,
      title,
      success: true
    };
    
  } catch (error) {
    logger.error(`Error visiting page ${url}:`, error);
    throw error;
  }
}

/**
 * Scrape content from the page
 */
async function scrapePage(selector) {
  logger.info(`Scraping page content with selector: ${selector}`);
  
  try {
    // Add timing jitter
    if (process.env.TIMING_JITTER === 'true') {
      await addRandomDelay();
    }
    
    // Use a default selector if none provided
    const actualSelector = selector || 'body';
    
    // Wait for selector to be available
    await page.waitForSelector(actualSelector, { timeout: 5000 });
    
    // Extract text
    const text = await page.$eval(actualSelector, el => el.innerText);
    
    // Extract links if selector is body
    let links = [];
    if (actualSelector === 'body') {
      links = await page.$$eval('a', anchors => anchors.map(a => ({
        text: a.textContent.trim(),
        href: a.href
      })));
    }
    
    return {
      text,
      links,
      success: true
    };
    
  } catch (error) {
    logger.error(`Error scraping page:`, error);
    throw error;
  }
}

/**
 * Interact with the page (click, type, etc.)
 */
async function interactWithPage(params) {
  const { action, selector, value } = params;
  
  logger.info(`Interacting with page: ${action} on ${selector}`);
  
  try {
    // Add timing jitter
    if (process.env.TIMING_JITTER === 'true') {
      await addRandomDelay();
    }
    
    // Wait for selector
    await page.waitForSelector(selector, { timeout: 5000 });
    
    // Perform action
    switch (action) {
      case 'click':
        await page.click(selector);
        break;
        
      case 'type':
        await page.type(selector, value, { delay: 50 }); // Human-like typing
        break;
        
      case 'select':
        await page.select(selector, value);
        break;
        
      case 'scroll':
        await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, selector);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    // Wait for any network activity to settle
    await page.waitForNetworkIdle({ idleTime: 500 });
    
    return {
      action,
      selector,
      success: true
    };
    
  } catch (error) {
    logger.error(`Error interacting with page:`, error);
    throw error;
  }
}

/**
 * Make an API request to the target
 */
async function makeApiRequest(params) {
  const { endpoint, method, headers, body } = params;
  
  logger.info(`Making API request to: ${endpoint}`);
  
  try {
    // Add timing jitter
    if (process.env.TIMING_JITTER === 'true') {
      await addRandomDelay();
    }
    
    // Use browser's fetch
    const result = await page.evaluate(async (endpoint, method, headers, body) => {
      const response = await fetch(endpoint, {
        method: method || 'GET',
        headers: headers || {
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      
      const status = response.status;
      const statusText = response.statusText;
      
      try {
        const data = await response.json();
        return { status, statusText, data };
      } catch (e) {
        const text = await response.text();
        return { status, statusText, text };
      }
    }, endpoint, method, headers, body);
    
    return {
      endpoint,
      method: method || 'GET',
      ...result,
      success: result.status >= 200 && result.status < 300
    };
    
  } catch (error) {
    logger.error(`Error making API request:`, error);
    throw error;
  }
}

/**
 * Restart the browser
 */
async function restartBrowser() {
  logger.info('Restarting browser...');
  
  try {
    // Close existing browser if open
    if (browser) {
      await browser.close();
    }
    
    // Initialize new browser
    const success = await initBrowser();
    
    return {
      success,
      message: success ? 'Browser restarted successfully' : 'Failed to restart browser'
    };
    
  } catch (error) {
    logger.error('Error restarting browser:', error);
    throw error;
  }
}

/**
 * Shutdown the bot agent
 */
async function shutdown() {
  logger.info('Shutting down bot agent...');
  
  try {
    // Close browser if open
    if (browser) {
      await browser.close();
    }
    
    // Disconnect from C2 server
    socket.disconnect();
    
    // Exit process
    process.exit(0);
    
  } catch (error) {
    logger.error('Error shutting down:', error);
    process.exit(1);
  }
}

/**
 * Send command result back to C2 server
 */
function sendResult(commandId, result, error) {
  socket.emit('result', {
    botId: BOT_ID,
    commandId,
    result,
    error,
    timestamp: Date.now()
  });
  
  logger.info(`Result sent for command ${commandId}`);
}

/**
 * Update bot status
 */
function updateStatus(status) {
  currentStatus = status;
  
  socket.emit('status', {
    status,
    timestamp: Date.now()
  });
  
  logger.info(`Status updated: ${status}`);
}

/**
 * Add random delay to simulate human timing
 */
async function addRandomDelay() {
  const minDelay = parseInt(process.env.TIMING_MIN_DELAY) || 500;
  const maxDelay = parseInt(process.env.TIMING_MAX_DELAY) || 3000;
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  
  logger.debug(`Adding random delay: ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Simulate human behavior on the page
 */
async function simulateHumanBehavior() {
  logger.info('Simulating human behavior...');
  
  // Random mouse movements
  if (process.env.MOUSE_MOVEMENT === 'true') {
    await simulateMouseMovement();
  }
  
  // Random scrolling
  if (process.env.SCROLL_BEHAVIOR === 'true') {
    await simulateScrolling();
  }
  
  // Random clicks if enabled
  if (process.env.RANDOM_CLICKS === 'true') {
    await simulateRandomClicks();
  }
}

/**
 * Simulate mouse movement
 */
async function simulateMouseMovement() {
  logger.debug('Simulating mouse movement...');
  
  // Get viewport dimensions
  const dimensions = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });
  
  // Move mouse to 3-5 random positions
  const movements = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < movements; i++) {
    const x = Math.floor(Math.random() * dimensions.width);
    const y = Math.floor(Math.random() * dimensions.height);
    
    await page.mouse.move(x, y, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

/**
 * Simulate scrolling behavior
 */
async function simulateScrolling() {
  logger.debug('Simulating scrolling behavior...');
  
  // Get page height
  const pageHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  
  // Scroll down in steps
  const scrollSteps = Math.min(Math.ceil(pageHeight / viewportHeight), 5);
  
  for (let i = 1; i <= scrollSteps; i++) {
    await page.evaluate((step, totalSteps, viewportHeight) => {
      window.scrollTo({
        top: (step / totalSteps) * (document.body.scrollHeight - viewportHeight),
        behavior: 'smooth'
      });
    }, i, scrollSteps, viewportHeight);
    
    // Random pause between scrolls
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  }
  
  // 50% chance to scroll back up
  if (Math.random() > 0.5) {
    for (let i = scrollSteps; i >= 0; i--) {
      await page.evaluate((step, totalSteps, viewportHeight) => {
        window.scrollTo({
          top: (step / totalSteps) * (document.body.scrollHeight - viewportHeight),
          behavior: 'smooth'
        });
      }, i, scrollSteps, viewportHeight);
      
      // Random pause between scrolls
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    }
  }
}

/**
 * Simulate random clicks on non-critical elements
 */
async function simulateRandomClicks() {
  logger.debug('Simulating random clicks...');
  
  // Find safe elements to click (paragraphs, divs, spans)
  const clickableElements = await page.evaluate(() => {
    const elements = [];
    
    // Function to check if element is visible and not a button/link
    function isClickableButSafe(element) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      
      // Avoid links, buttons, inputs
      if (element.tagName === 'A' || element.tagName === 'BUTTON' || 
          element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return false;
      }
      
      return true;
    }
    
    // Find paragraphs, divs, and spans
    const safeElements = [...document.querySelectorAll('p, div, span')];
    
    // Filter for visible elements and get their positions
    for (const el of safeElements) {
      if (isClickableButSafe(el)) {
        const rect = el.getBoundingClientRect();
        elements.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    }
    
    // Return a random subset (up to 3 elements)
    return elements.slice(0, Math.min(elements.length, 3));
  });
  
  // Click on 1-3 random elements
  for (const element of clickableElements) {
    await page.mouse.click(element.x, element.y);
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  }
}

/**
 * Get a random user agent
 */
function getRandomUserAgent() {
  const userAgents = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    
    // Chrome on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    
    // Firefox on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    
    // Safari on macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55'
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Socket.io event handlers
socket.on('connect', async () => {
  logger.info(`Connected to C2 server at ${C2_SERVER_URL} with ID: ${socket.id}`);
  
  // Initialize browser
  const success = await initBrowser();
  
  if (success) {
    updateStatus('idle');
  } else {
    updateStatus('error');
  }
});

socket.on('disconnect', () => {
  logger.info('Disconnected from C2 server');
  updateStatus('disconnected');
});

socket.on('connect_error', (error) => {
  logger.error('Connection error:', error.message);
});

socket.on('command', handleCommand);

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal');
  await shutdown();
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  await shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  
  // Try to send error to C2 server if connected
  if (socket.connected && currentCommand) {
    sendResult(currentCommand, null, `Uncaught exception: ${error.message}`);
  }
});

// Start the bot agent
logger.info('Bot agent starting...');
