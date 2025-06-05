/**
 * Content Engine - Main Entry Point
 * 
 * This script orchestrates the automatic generation and publication of
 * AI and ML tutorials using OpenAI and Anthropic APIs.
 */

// Core Node.js modules
const path = require('path');
const fs = require('fs').promises;

// Load configuration
const config = require('./config/config');

// Load modules
const logger = require('./modules/logger');
const contentGenerator = require('./modules/contentGenerator');
const contentFormatter = require('./modules/contentFormatter');
const websiteIntegration = require('./modules/websiteIntegration');
const scheduler = require('./modules/scheduler');
const aiManager = require('./modules/aiManager');
const topicGenerator = require('./modules/topicGenerator');
const imageGenerator = require('./modules/imageGenerator');

// Initialize the logger
logger.init();

/**
 * Main function to generate and publish content
 */
async function generateAndPublish(topic = null, options = {}) {
  try {
    logger.info('Starting content generation process');
    
    // Step 1: Generate or use the provided topic
    const contentTopic = topic || await topicGenerator.generateTopic();
    logger.info(`Topic selected: ${contentTopic.title}`);
    
    // Step 2: Determine which AI provider to use
    const provider = options.provider || 
      (Math.random() > 0.5 ? 'openAI' : 'anthropic');
    logger.info(`Using AI provider: ${provider}`);
    
    // Step 3: Generate the content
    const rawContent = await contentGenerator.generateContent(contentTopic, provider);
    logger.info('Raw content generated successfully');
    
    // Step 4: Generate images if configured
    let images = [];
    if (config.content.includeImages) {
      images = await imageGenerator.generateImages(contentTopic);
      logger.info(`Generated ${images.length} images for the content`);
    }
    
    // Step 5: Format the content with HTML
    const formattedContent = await contentFormatter.formatToHtml(rawContent, images);
    logger.info('Content formatted to HTML successfully');
    
    // Step 6: Prepare metadata
    const metadata = contentFormatter.generateMetadata(rawContent, contentTopic);
    logger.info('Metadata generated successfully');
    
    // Step 7: Save content to local directory
    const localPath = await contentFormatter.saveLocal(formattedContent, metadata);
    logger.info(`Content saved locally to: ${localPath}`);
    
    // Step 8: Upload to website
    const publicUrl = await websiteIntegration.uploadContent(localPath, metadata);
    logger.info(`Content published successfully at: ${publicUrl}`);
    
    return {
      success: true,
      topic: contentTopic.title,
      url: publicUrl,
      localPath
    };
  } catch (error) {
    logger.error(`Content generation failed: ${error.message}`);
    logger.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Schedule content generation based on configuration
 */
function scheduleContentGeneration() {
  scheduler.scheduleTasks(generateAndPublish);
  logger.info(`Content generation scheduled with pattern: ${config.general.publishInterval}`);
}

/**
 * Run content generation immediately
 */
async function runImmediately(topic = null, options = {}) {
  const result = await generateAndPublish(topic, options);
  return result;
}

/**
 * Initialize the content engine
 */
async function init() {
  try {
    // Check if required directories exist and create them if needed
    await ensureDirectoriesExist();
    
    // Initialize AI providers
    await aiManager.initProviders();
    
    // Start the scheduler if configured
    if (process.env.SCHEDULE_CONTENT === 'true') {
      scheduleContentGeneration();
    }
    
    logger.info('Content Engine initialized successfully');
    return true;
  } catch (error) {
    logger.error(`Initialization failed: ${error.message}`);
    logger.error(error.stack);
    return false;
  }
}

/**
 * Ensure all required directories exist
 */
async function ensureDirectoriesExist() {
  const dirs = [
    config.general.contentOutputDir,
    config.general.logDir,
    config.website.uploadsPath
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.debug(`Directory ensured: ${dir}`);
    } catch (error) {
      logger.error(`Failed to create directory ${dir}: ${error.message}`);
      throw error;
    }
  }
}

// Export the module functions
module.exports = {
  init,
  generateAndPublish,
  scheduleContentGeneration,
  runImmediately
};

// If run directly (not imported), initialize and run once
if (require.main === module) {
  (async () => {
    const initialized = await init();
    if (initialized) {
      const topic = process.argv[2] ? { title: process.argv[2] } : null;
      const result = await runImmediately(topic);
      
      if (result.success) {
        logger.info(`Content generated successfully: ${result.url}`);
        process.exit(0);
      } else {
        logger.error(`Failed to generate content: ${result.error}`);
        process.exit(1);
      }
    }
  })();
}
