/**
 * Git Manager Module
 * 
 * Handles automated git operations for content deployment
 */

const simpleGit = require('simple-git');
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

// Initialize git instance
const git = simpleGit(process.cwd());

/**
 * Initialize git repository if needed
 * @returns {boolean} Success indicator
 */
async function initRepo() {
  try {
    // Check if git is already initialized
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      logger.info('Initializing git repository...');
      await git.init();
      logger.info('Git repository initialized');
      return true;
    } else {
      logger.info('Git repository already exists');
      return true;
    }
  } catch (error) {
    logger.error(`Failed to initialize git repository: ${error.message}`);
    return false;
  }
}

/**
 * Stage changes for commit
 * @param {Array} files - Array of file paths to stage (optional, stages all if empty)
 * @returns {boolean} Success indicator
 */
async function stageChanges(files = []) {
  try {
    logger.info('Staging changes...');
    
    if (files.length > 0) {
      // Stage specific files
      await git.add(files);
      logger.info(`Staged ${files.length} files`);
    } else {
      // Stage all changes
      await git.add('.');
      logger.info('Staged all changes');
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to stage changes: ${error.message}`);
    return false;
  }
}

/**
 * Create a commit with standardized message
 * @param {string} type - Type of content (tutorial, module, tool, etc.)
 * @param {string} title - Title of the content
 * @param {object} options - Additional commit options
 * @returns {boolean} Success indicator
 */
async function createCommit(type, title, options = {}) {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const commitMessage = generateCommitMessage(type, title, timestamp, options);
    
    logger.info(`Creating commit: ${commitMessage}`);
    
    // Check if there are any changes to commit
    const status = await git.status();
    if (status.files.length === 0) {
      logger.info('No changes to commit');
      return true;
    }
    
    await git.commit(commitMessage);
    logger.info(`Commit created successfully: ${commitMessage}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to create commit: ${error.message}`);
    return false;
  }
}

/**
 * Push changes to remote repository
 * @param {string} remote - Remote name (default: origin)
 * @param {string} branch - Branch name (default: main)
 * @returns {boolean} Success indicator
 */
async function pushChanges(remote = 'origin', branch = 'main') {
  try {
    logger.info(`Pushing changes to ${remote}/${branch}...`);
    
    // Check if remote exists
    const remotes = await git.getRemotes(true);
    const remoteExists = remotes.some(r => r.name === remote);
    
    if (!remoteExists) {
      logger.warn(`Remote '${remote}' not found. Skipping push.`);
      return false;
    }
    
    // Push changes
    await git.push(remote, branch);
    logger.info(`Changes pushed successfully to ${remote}/${branch}`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to push changes: ${error.message}`);
    return false;
  }
}

/**
 * Complete git workflow: stage, commit, and push
 * @param {string} type - Content type
 * @param {string} title - Content title
 * @param {Array} files - Files to stage (optional)
 * @param {object} options - Additional options
 * @returns {object} Result object with success status and details
 */
async function deployContent(type, title, files = [], options = {}) {
  const result = {
    success: false,
    staged: false,
    committed: false,
    pushed: false,
    error: null
  };
  
  try {
    // Initialize repo if needed
    await initRepo();
    
    // Stage changes
    result.staged = await stageChanges(files);
    if (!result.staged) {
      throw new Error('Failed to stage changes');
    }
    
    // Create commit
    result.committed = await createCommit(type, title, options);
    if (!result.committed) {
      throw new Error('Failed to create commit');
    }
    
    // Push changes (if enabled in config)
    if (config.git && config.git.autoPush) {
      result.pushed = await pushChanges(
        config.git.remote || 'origin',
        config.git.branch || 'main'
      );
    } else {
      result.pushed = true; // Skip push but mark as successful
      logger.info('Auto-push disabled, skipping push step');
    }
    
    result.success = result.staged && result.committed && result.pushed;
    logger.info(`Git deployment ${result.success ? 'completed' : 'partially completed'}`);
    
    return result;
  } catch (error) {
    result.error = error.message;
    logger.error(`Git deployment failed: ${error.message}`);
    return result;
  }
}

/**
 * Generate standardized commit message
 * @param {string} type - Content type
 * @param {string} title - Content title
 * @param {string} timestamp - Timestamp
 * @param {object} options - Additional options
 * @returns {string} Formatted commit message
 */
function generateCommitMessage(type, title, timestamp, options = {}) {
  const prefix = options.prefix || 'content';
  const action = options.action || 'add';
  
  // Clean title for commit message
  const cleanTitle = title.replace(/[^\w\s-]/g, '').trim();
  
  return `${prefix}: ${action} ${type} - ${cleanTitle} (${timestamp})`;
}

/**
 * Get current git status
 * @returns {object} Git status information
 */
async function getStatus() {
  try {
    const status = await git.status();
    return {
      success: true,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      files: status.files,
      clean: status.files.length === 0
    };
  } catch (error) {
    logger.error(`Failed to get git status: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle git operation errors with retry logic
 * @param {Function} operation - The git operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {boolean} Success indicator
 */
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      logger.warn(`Git operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt === maxRetries) {
        logger.error(`Git operation failed after ${maxRetries} attempts`);
        return false;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  initRepo,
  stageChanges,
  createCommit,
  pushChanges,
  deployContent,
  getStatus,
  withRetry,
  generateCommitMessage
};
