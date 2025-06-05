/**
 * Scheduler Module
 * 
 * Handles scheduling and execution of content generation tasks
 */

const cron = require('node-cron');
const config = require('../config/config');
const logger = require('./logger');

// Store active scheduled tasks
const activeTasks = new Map();

/**
 * Schedule content generation tasks
 * @param {Function} taskFunction - The function to execute on schedule
 * @param {string} schedulePattern - Cron pattern for the schedule (defaults to config)
 * @param {object} options - Additional options for the task
 * @returns {boolean} Success indicator
 */
function scheduleTasks(taskFunction, schedulePattern = null, options = {}) {
  try {
    // Use provided pattern or the one from config
    const pattern = schedulePattern || config.general.publishInterval;
    
    if (!cron.validate(pattern)) {
      logger.error(`Invalid cron pattern: ${pattern}`);
      return false;
    }
    
    logger.info(`Scheduling content generation with pattern: ${pattern}`);
    
    // Create a unique ID for this task
    const taskId = `content-gen-${Date.now()}`;
    
    // Set up the cron job
    const task = cron.schedule(pattern, async () => {
      logger.info(`Running scheduled content generation task: ${taskId}`);
      
      try {
        // Execute the task function
        const result = await taskFunction(null, options);
        
        if (result.success) {
          logger.info(`Scheduled task ${taskId} completed successfully: ${result.topic}`);
          logger.info(`Published at: ${result.url}`);
        } else {
          logger.error(`Scheduled task ${taskId} failed: ${result.error}`);
        }
      } catch (error) {
        logger.error(`Error in scheduled task ${taskId}: ${error.message}`);
        logger.error(error.stack);
      }
    }, {
      scheduled: true,
      timezone: options.timezone || 'UTC'
    });
    
    // Store the task
    activeTasks.set(taskId, {
      id: taskId,
      pattern,
      task,
      options,
      createdAt: new Date().toISOString()
    });
    
    logger.info(`Task ${taskId} scheduled successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to schedule task: ${error.message}`);
    return false;
  }
}

/**
 * Stop a scheduled task
 * @param {string} taskId - ID of the task to stop
 * @returns {boolean} Success indicator
 */
function stopTask(taskId) {
  try {
    if (!activeTasks.has(taskId)) {
      logger.warn(`Task ${taskId} not found`);
      return false;
    }
    
    const taskInfo = activeTasks.get(taskId);
    taskInfo.task.stop();
    activeTasks.delete(taskId);
    
    logger.info(`Task ${taskId} stopped successfully`);
    return true;
  } catch (error) {
    logger.error(`Failed to stop task ${taskId}: ${error.message}`);
    return false;
  }
}

/**
 * Stop all scheduled tasks
 * @returns {number} Number of tasks stopped
 */
function stopAllTasks() {
  try {
    let count = 0;
    
    for (const [taskId, taskInfo] of activeTasks.entries()) {
      taskInfo.task.stop();
      activeTasks.delete(taskId);
      count++;
    }
    
    logger.info(`Stopped ${count} scheduled tasks`);
    return count;
  } catch (error) {
    logger.error(`Failed to stop all tasks: ${error.message}`);
    return 0;
  }
}

/**
 * Get information about all active tasks
 * @returns {Array} Array of task information objects
 */
function getActiveTasks() {
  const tasks = [];
  
  for (const [taskId, taskInfo] of activeTasks.entries()) {
    tasks.push({
      id: taskId,
      pattern: taskInfo.pattern,
      createdAt: taskInfo.createdAt,
      options: taskInfo.options
    });
  }
  
  return tasks;
}

/**
 * Schedule multiple tasks with different patterns
 * @param {Function} taskFunction - The function to execute on schedule
 * @param {Array} schedules - Array of schedule objects with pattern and options
 * @returns {number} Number of tasks scheduled
 */
function scheduleMultipleTasks(taskFunction, schedules) {
  try {
    let count = 0;
    
    for (const schedule of schedules) {
      if (scheduleTasks(taskFunction, schedule.pattern, schedule.options)) {
        count++;
      }
    }
    
    logger.info(`Scheduled ${count}/${schedules.length} tasks`);
    return count;
  } catch (error) {
    logger.error(`Failed to schedule multiple tasks: ${error.message}`);
    return 0;
  }
}

/**
 * Initialize the scheduler based on configuration
 */
function init() {
  try {
    logger.info('Initializing scheduler');
    
    // Schedule the default content generation task
    if (config.general.publishInterval) {
      scheduleTasks(null, config.general.publishInterval);
    }
    
    return true;
  } catch (error) {
    logger.error(`Scheduler initialization failed: ${error.message}`);
    return false;
  }
}

module.exports = {
  scheduleTasks,
  stopTask,
  stopAllTasks,
  getActiveTasks,
  scheduleMultipleTasks,
  init
};
