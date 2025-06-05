/**
 * Topic Generator Module
 * 
 * Generates and manages topics for AI/ML tutorial content
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const aiManager = require('./aiManager');
const logger = require('./logger');

// Path to the topics database file
const TOPICS_DB_PATH = path.join(config.general.contentOutputDir, 'topics-database.json');

/**
 * Load the topics database
 * @returns {Array} Array of topic objects
 */
async function loadTopicsDatabase() {
  try {
    const data = await fs.readFile(TOPICS_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or has invalid JSON, create a new database
    logger.info('Creating new topics database');
    const initialTopics = [];
    await saveTopicsDatabase(initialTopics);
    return initialTopics;
  }
}

/**
 * Save the topics database
 * @param {Array} topics - Array of topic objects
 */
async function saveTopicsDatabase(topics) {
  try {
    await fs.writeFile(TOPICS_DB_PATH, JSON.stringify(topics, null, 2), 'utf8');
    logger.debug(`Saved ${topics.length} topics to database`);
  } catch (error) {
    logger.error(`Failed to save topics database: ${error.message}`);
    throw error;
  }
}

/**
 * Generate new topics using AI
 * @param {number} count - Number of topics to generate
 * @param {string} provider - AI provider to use
 * @returns {Array} Array of generated topics
 */
async function generateNewTopics(count = 5, provider = 'openAI') {
  try {
    logger.info(`Generating ${count} new topics using ${provider}`);
    
    const prompt = `Generate ${count} unique, interesting tutorial topics about AI and machine learning. 
    Focus on current trends, practical applications, and topics that would interest developers and data scientists.
    
    For each topic, provide:
    1. A catchy title (80 characters max)
    2. A brief description (200 characters max)
    3. Target audience (beginner, intermediate, or advanced)
    4. Primary category from this list: ${config.website.categories.join(', ')}
    5. Estimated reading time in minutes
    6. 3-5 relevant keywords
    
    Return the results as a valid JSON array of objects with the properties: title, description, audience, category, readingTime, and keywords (array).`;
    
    const content = await aiManager.generateContent(prompt, provider, 'ideaGeneration', {
      systemPrompt: 'You are an expert AI and machine learning content strategist with deep knowledge of current trends and technologies.'
    });
    
    // Parse the response into a JSON object
    let topicsData;
    try {
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, content];
      
      const jsonContent = jsonMatch[1].trim();
      topicsData = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error(`Failed to parse AI response as JSON: ${parseError.message}`);
      logger.debug(`Raw AI response: ${content}`);
      throw new Error('Failed to parse topic generation response');
    }
    
    // Add timestamps and status to topics
    const timestamp = new Date().toISOString();
    const processedTopics = topicsData.map(topic => ({
      ...topic,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'new',
      generated: false
    }));
    
    logger.info(`Successfully generated ${processedTopics.length} topics`);
    return processedTopics;
  } catch (error) {
    logger.error(`Topic generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Add topics to the database
 * @param {Array} newTopics - Array of new topic objects
 * @returns {Array} Updated topics database
 */
async function addTopicsToDatabase(newTopics) {
  try {
    const existingTopics = await loadTopicsDatabase();
    
    // Check for duplicates by title similarity
    const filteredNewTopics = newTopics.filter(newTopic => {
      return !existingTopics.some(existingTopic => {
        const newTitle = newTopic.title.toLowerCase();
        const existingTitle = existingTopic.title.toLowerCase();
        return newTitle === existingTitle || 
               newTitle.includes(existingTitle) || 
               existingTitle.includes(newTitle);
      });
    });
    
    if (filteredNewTopics.length < newTopics.length) {
      logger.info(`Filtered out ${newTopics.length - filteredNewTopics.length} duplicate topics`);
    }
    
    // Add new topics to the database
    const updatedTopics = [...existingTopics, ...filteredNewTopics];
    await saveTopicsDatabase(updatedTopics);
    
    logger.info(`Added ${filteredNewTopics.length} topics to database (total: ${updatedTopics.length})`);
    return updatedTopics;
  } catch (error) {
    logger.error(`Failed to add topics to database: ${error.message}`);
    throw error;
  }
}

/**
 * Get topics filtered by status
 * @param {string} status - Topic status ('new', 'planned', 'in-progress', 'published')
 * @returns {Array} Filtered topics
 */
async function getTopicsByStatus(status) {
  try {
    const topics = await loadTopicsDatabase();
    return topics.filter(topic => topic.status === status);
  } catch (error) {
    logger.error(`Failed to get topics by status: ${error.message}`);
    throw error;
  }
}

/**
 * Update a topic's status
 * @param {string} topicTitle - Title of the topic to update
 * @param {string} newStatus - New status value
 * @returns {boolean} Success indicator
 */
async function updateTopicStatus(topicTitle, newStatus) {
  try {
    const topics = await loadTopicsDatabase();
    
    const topicIndex = topics.findIndex(t => t.title === topicTitle);
    if (topicIndex === -1) {
      logger.warn(`Topic not found: ${topicTitle}`);
      return false;
    }
    
    topics[topicIndex].status = newStatus;
    topics[topicIndex].updatedAt = new Date().toISOString();
    
    await saveTopicsDatabase(topics);
    logger.info(`Updated topic status: ${topicTitle} -> ${newStatus}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to update topic status: ${error.message}`);
    throw error;
  }
}

/**
 * Mark a topic as generated
 * @param {string} topicTitle - Title of the topic
 * @param {string} contentPath - Path to the generated content
 * @returns {boolean} Success indicator
 */
async function markTopicAsGenerated(topicTitle, contentPath) {
  try {
    const topics = await loadTopicsDatabase();
    
    const topicIndex = topics.findIndex(t => t.title === topicTitle);
    if (topicIndex === -1) {
      logger.warn(`Topic not found: ${topicTitle}`);
      return false;
    }
    
    topics[topicIndex].generated = true;
    topics[topicIndex].status = 'published';
    topics[topicIndex].contentPath = contentPath;
    topics[topicIndex].generatedAt = new Date().toISOString();
    topics[topicIndex].updatedAt = new Date().toISOString();
    
    await saveTopicsDatabase(topics);
    logger.info(`Marked topic as generated: ${topicTitle}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to mark topic as generated: ${error.message}`);
    throw error;
  }
}

/**
 * Select the next topic for generation
 * @returns {object} Selected topic or null if no topics available
 */
async function selectNextTopic() {
  try {
    // First, look for topics with 'planned' status
    let plannedTopics = await getTopicsByStatus('planned');
    
    // If no planned topics, look for 'new' topics
    if (plannedTopics.length === 0) {
      logger.info('No planned topics found, checking for new topics');
      plannedTopics = await getTopicsByStatus('new');
    }
    
    // If still no topics, generate new ones
    if (plannedTopics.length === 0) {
      logger.info('No available topics, generating new ones');
      const newTopics = await generateNewTopics(5);
      await addTopicsToDatabase(newTopics);
      plannedTopics = newTopics;
    }
    
    // Select a topic (could implement more sophisticated selection logic here)
    const selectedTopic = plannedTopics[0];
    
    // Update status to 'in-progress'
    await updateTopicStatus(selectedTopic.title, 'in-progress');
    
    logger.info(`Selected topic for generation: ${selectedTopic.title}`);
    return selectedTopic;
  } catch (error) {
    logger.error(`Failed to select next topic: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a topic with AI if none is provided
 * @param {object} topic - Optional topic object
 * @returns {object} A topic object
 */
async function generateTopic(topic = null) {
  if (topic) {
    logger.info(`Using provided topic: ${topic.title}`);
    return topic;
  }
  
  logger.info('No topic provided, selecting from database or generating new one');
  return await selectNextTopic();
}

module.exports = {
  generateNewTopics,
  addTopicsToDatabase,
  getTopicsByStatus,
  updateTopicStatus,
  markTopicAsGenerated,
  selectNextTopic,
  generateTopic
};
