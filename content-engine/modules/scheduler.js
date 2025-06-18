/**
 * Scheduler Module
 * 
 * Handles scheduling and execution of content generation tasks
 */

const cron = require('node-cron');
const config = require('../config/config');
const logger = require('./logger');
const topicGenerator = require('./topicGenerator');
const contentGenerator = require('./contentGenerator');
const moduleRenderer = require('./moduleRenderer');
const websiteIntegration = require('./websiteIntegration');
const aiManager = require('./aiManager');
const path = require('path');
const fs = require('fs').promises;
const slugify = require('slugify');

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
 * Main automated content generation function
 * This orchestrates the complete workflow using AI APIs
 * @param {object} topicOverride - Optional topic to use instead of auto-selecting
 * @param {object} options - Generation options
 * @returns {object} Result object with details
 */
async function generateAutomatedContent(topicOverride = null, options = {}) {
  const result = {
    success: false,
    topic: null,
    publicUrl: null,
    error: null
  };

  try {
    logger.info('🚀 Starting automated content generation...');
    
    // Step 0: Initialize AI providers
    logger.info('🔧 Step 0: Initializing AI Providers');
    await aiManager.initProviders();
    logger.info('AI providers initialized successfully');
    
    // Step 1: Get or generate a topic
    logger.info('📋 Step 1: Topic Selection');
    const topic = topicOverride || await topicGenerator.selectNextTopic();
    result.topic = topic;
    logger.info(`Selected topic: ${topic.title}`);

    // Step 2: Generate content using AI
    logger.info('🤖 Step 2: AI Content Generation');
    const generatedContent = await contentGenerator.generateContent(
      topic,
      options.provider || 'openAI'
    );
    logger.info(`Generated content: ${generatedContent.title}`);

    // Step 3: Create module data and render HTML
    logger.info('🎨 Step 3: Template Rendering');
    const moduleData = createModuleData(generatedContent, topic);
    const outputPath = await renderContentToFiles(moduleData);
    logger.info(`Rendered content to: ${outputPath.html}`);

    // Step 4: Deploy to website with git automation
    logger.info('🌐 Step 4: Website Deployment');
    const metadata = createMetadata(generatedContent, topic);
    const publicUrl = await websiteIntegration.uploadContent(outputPath.html, metadata);
    result.publicUrl = publicUrl;
    logger.info(`Published at: ${publicUrl}`);

    // Step 5: Update topic status
    await topicGenerator.markTopicAsGenerated(topic.title, outputPath.html);
    
    result.success = true;
    logger.info('✅ Automated content generation completed successfully!');
    
    return result;

  } catch (error) {
    result.error = error.message;
    logger.error(`❌ Automated content generation failed: ${error.message}`);
    
    // Update topic status to failed if we got that far
    if (result.topic) {
      try {
        await topicGenerator.updateTopicStatus(result.topic.title, 'failed');
      } catch (statusError) {
        logger.error(`Failed to update topic status: ${statusError.message}`);
      }
    }
    
    return result;
  }
}

/**
 * Create module data structure from generated content
 * @param {object} content - Generated content
 * @param {object} topic - Original topic
 * @returns {object} Module data object
 */
function createModuleData(content, topic) {
  return {
    id: slugify(content.title, { lower: true, strict: true }),
    title: content.title,
    description: content.description,
    category: content.category,
    audience: content.audience,
    readingTime: content.readingTime,
    publishDate: new Date().toISOString(),
    author: config.general.defaultAuthor,
    keywords: content.keywords || topic.keywords || [],
    content: {
      introduction: content.introduction,
      sections: content.sections.map(section => ({
        title: section.title,
        content: section.content,
        subsections: section.subsections || []
      })),
      conclusion: content.conclusion,
      codeExamples: content.codeExamples || []
    },
    metadata: {
      generated: true,
      generatedAt: content.generatedAt,
      provider: content.provider,
      originalTopic: topic
    }
  };
}

/**
 * Render content to JSON and HTML files
 * @param {object} moduleData - Module data object
 * @returns {object} File paths
 */
async function renderContentToFiles(moduleData) {
  // Determine output directory
  const outputDir = path.join(config.general.contentOutputDir, '..', 'output', moduleData.category);
  await fs.mkdir(outputDir, { recursive: true });
  
  // Save JSON data
  const jsonPath = path.join(outputDir, `${moduleData.id}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(moduleData, null, 2), 'utf8');

  // Render HTML using simple tutorial template
  const htmlPath = path.join(outputDir, `${moduleData.id}.html`);
  const htmlContent = renderTutorialHTML(moduleData);
  await fs.writeFile(htmlPath, htmlContent, 'utf8');

  return { json: jsonPath, html: htmlPath };
}

/**
 * Render tutorial content to HTML
 * @param {object} moduleData - Module data object
 * @returns {string} HTML content
 */
function renderTutorialHTML(moduleData) {
  // Generate table of contents
  const generateTOC = () => {
    let toc = '<ul>\n';
    if (moduleData.content.introduction) {
      toc += '    <li><a href="#introduction">Introduction</a></li>\n';
    }
    moduleData.content.sections.forEach((section, index) => {
      const slug = slugify(section.title, { lower: true, strict: true });
      toc += `    <li><a href="#${slug}">${section.title}</a></li>\n`;
      if (section.subsections && section.subsections.length > 0) {
        toc += '        <ul>\n';
        section.subsections.forEach(subsection => {
          const subSlug = slugify(`${section.title}-${subsection}`, { lower: true, strict: true });
          toc += `            <li><a href="#${subSlug}">${subsection}</a></li>\n`;
        });
        toc += '        </ul>\n';
      }
    });
    if (moduleData.content.conclusion) {
      toc += '    <li><a href="#conclusion">Conclusion</a></li>\n';
    }
    if (moduleData.content.codeExamples && moduleData.content.codeExamples.length > 0) {
      toc += '    <li><a href="#code-examples">Code Examples</a></li>\n';
    }
    toc += '</ul>';
    return toc;
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${moduleData.title} | Solve for AI</title>
    <meta name="description" content="${moduleData.description}">
    <meta name="keywords" content="${moduleData.keywords.join(', ')}">
    <link rel="stylesheet" href="../assets/css/style.css">
    <link rel="stylesheet" href="../assets/css/tutorials.css">
</head>
<body>
    <header>
        <div class="container header-container">
            <div class="logo">
                <a href="../index.html">Solve<span> for AI</span></a>
            </div>
            <nav>
                <ul>
                    <li><a href="../index.html">Home</a></li>
                    <li><a href="../tutorials.html" class="active">Tutorials</a></li>
                    <li><a href="../learning-paths.html">Learning Paths</a></li>
                    <li><a href="../tools.html">AI Tools</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <div class="tutorial-container">
        <article class="tutorial-content">
            <header class="tutorial-header">
                <h1>${moduleData.title}</h1>
                <div class="tutorial-meta">
                    <span class="category">${capitalizeFirst(moduleData.category)}</span>
                    <span class="reading-time">${moduleData.readingTime} min read</span>
                    <span class="publish-date">Updated: ${new Date(moduleData.publishDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>

                <div class="author-info">
                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Author photo" class="author-photo">
                    <div class="author-details">
                        <span class="author-name">${moduleData.author}</span>
                        <span class="author-title">AI Research Engineer</span>
                    </div>
                </div>

                <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="${moduleData.title}" class="hero-image">

                <div class="table-of-contents">
                    <h3>Table of Contents</h3>
                    ${generateTOC()}
                </div>
            </header>

            <section class="tutorial-body">
                ${moduleData.content.introduction ? `
                <section id="introduction">
                    <h2>Introduction</h2>
                    ${convertMarkdownToHTML(moduleData.content.introduction)}
                </section>
                
                <div class="advertisement">
                    <h4>Your Ad Could Be Here</h4>
                    <p>This is where a real content advertisement would appear.</p>
                    <a href="#" class="ad-link">Learn More</a>
                </div>
                ` : ''}

                ${moduleData.content.sections.map((section, index) => {
                  const sectionSlug = slugify(section.title, { lower: true, strict: true });
                  return `
                  <section id="${sectionSlug}">
                      <h2>${section.title}</h2>
                      <img src="https://images.unsplash.com/photo-${1550000000 + index}000-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Illustration for ${section.title}" class="section-image">
                      ${convertMarkdownToHTML(section.content)}
                      
                      ${section.subsections && section.subsections.length > 0 ? 
                        section.subsections.map(subsection => {
                          const subSlug = slugify(`${section.title}-${subsection}`, { lower: true, strict: true });
                          return `<h3 id="${subSlug}">${subsection}</h3>`;
                        }).join('') : ''}
                  </section>
                  ${index === Math.floor(moduleData.content.sections.length / 2) ? `
                  <div class="advertisement">
                      <h4>Your Ad Could Be Here</h4>
                      <p>This is where a real content advertisement would appear.</p>
                      <a href="#" class="ad-link">Learn More</a>
                  </div>
                  ` : ''}
                  `;
                }).join('')}

                ${moduleData.content.conclusion ? `
                <section id="conclusion">
                    <h2>Conclusion</h2>
                    ${convertMarkdownToHTML(moduleData.content.conclusion)}
                </section>
                ` : ''}

                ${moduleData.content.codeExamples && moduleData.content.codeExamples.length > 0 ? `
                <section id="code-examples">
                    <h2>Code Examples</h2>
                    ${moduleData.content.codeExamples.map((example, index) => `
                    <div class="code-example">
                        <h3 id="code-example-${index + 1}">Code Example</h3>
                        <p>${example.description}</p>
                        <pre><code class="language-${example.language}">${escapeHTML(example.code)}</code></pre>
                        ${example.explanation ? `<p class="explanation">${example.explanation}</p>` : ''}
                    </div>
                    `).join('')}
                </section>
                ` : ''}

                <div class="tutorial-rating">
                    <h3>Was this tutorial helpful?</h3>
                    <div class="stars">★ ★ ★ ★ ★</div>
                </div>

                <div class="related-tutorials">
                    <h3>Related Tutorials</h3>
                    <div class="tutorial-grid">
                        <a href="../tutorials/building-custom-gpt-applications.html" class="tutorial-card">
                            <img src="https://images.unsplash.com/photo-1555952494-efd681c7e3f9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Building Custom GPT Applications">
                            <h4>Building Custom GPT Applications</h4>
                        </a>
                        <a href="../tutorials/neural-networks-explained.html" class="tutorial-card">
                            <img src="https://images.unsplash.com/photo-1542281286-9e0a16bb7366?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Neural Networks Explained">
                            <h4>Neural Networks Explained</h4>
                        </a>
                    </div>
                </div>
            </section>
        </article>

        <aside class="sidebar">
            <div class="newsletter-signup">
                <h3>Subscribe for More AI & ML Tutorials</h3>
                <p>Get weekly tutorials, guides, and AI resources delivered directly to your inbox.</p>
                <form>
                    <input type="email" placeholder="Enter your email">
                    <button type="submit">Subscribe</button>
                </form>
            </div>

            <div class="advertisement sidebar-ad">
                <h4>Your Ad Could Be Here</h4>
                <p>This is where a real sidebar advertisement would appear.</p>
                <a href="#" class="ad-link">Learn More</a>
            </div>

            <div class="category-info">
                <h3>Category</h3>
                <a href="../categories/${moduleData.category}.html">${capitalizeFirst(moduleData.category)}</a>
            </div>

            <div class="popular-tutorials">
                <h3>Popular Tutorials</h3>
                <ul>
                    <li><a href="../tutorials/machine-learning-beginners-guide.html">Machine Learning: A Complete Beginner's Guide</a> 45K views</li>
                    <li><a href="../tutorials/pytorch-vs-tensorflow.html">PyTorch vs TensorFlow: Which One Should You Learn?</a> 32K views</li>
                    <li><a href="../tutorials/deep-learning-image-classification.html">Image Classification with Deep Learning</a> 28K views</li>
                    <li><a href="../tutorials/natural-language-processing-basics.html">NLP Basics: Understanding Language with AI</a> 24K views</li>
                </ul>
            </div>

            <div class="topics">
                <h3>Explore Topics</h3>
                <ul>
                    <li><a href="../categories/deep-learning.html">Deep Learning <span>42</span></a></li>
                    <li><a href="../categories/computer-vision.html">Computer Vision <span>38</span></a></li>
                    <li><a href="../categories/nlp.html">Natural Language Processing <span>35</span></a></li>
                    <li><a href="../categories/reinforcement-learning.html">Reinforcement Learning <span>24</span></a></li>
                    <li><a href="../categories/data-science.html">Data Science <span>56</span></a></li>
                    <li><a href="../categories/ai-ethics.html">AI Ethics <span>18</span></a></li>
                </ul>
            </div>

            <div class="advertisement sidebar-ad">
                <h4>Your Ad Could Be Here</h4>
                <p>This is where a real sidebar advertisement would appear.</p>
                <a href="#" class="ad-link">Learn More</a>
            </div>

            <div class="social-share">
                <h3>Share</h3>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?url=https%3A%2F%2Fsolveforai.com%2Ftutorials%2F${moduleData.id}&text=${encodeURIComponent(moduleData.title)}%20%7C%20Solve%20for%20AI" title="Share on Twitter">🐦</a>
                    <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fsolveforai.com%2Ftutorials%2F${moduleData.id}" title="Share on Facebook">📘</a>
                    <a href="https://www.linkedin.com/shareArticle?mini=true&url=https%3A%2F%2Fsolveforai.com%2Ftutorials%2F${moduleData.id}&title=${encodeURIComponent(moduleData.title)}%20%7C%20Solve%20for%20AI" title="Share on LinkedIn">💼</a>
                    <a href="https://www.reddit.com/submit?url=https%3A%2F%2Fsolveforai.com%2Ftutorials%2F${moduleData.id}&title=${encodeURIComponent(moduleData.title)}%20%7C%20Solve%20for%20AI" title="Share on Reddit">🔴</a>
                    <a href="mailto:?subject=${encodeURIComponent(moduleData.title)}%20%7C%20Solve%20for%20AI&body=Check out this article: https%3A%2F%2Fsolveforai.com%2Ftutorials%2F${moduleData.id}" title="Share via Email">📧</a>
                </div>
            </div>
        </aside>
    </div>

    <footer>
        <div class="container">
            <p>&copy; 2025 Solve for AI. All rights reserved.</p>
        </div>
    </footer>

    <script src="../assets/js/main.js"></script>
</body>
</html>`;

  return html;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert basic markdown to HTML
 * @param {string} markdown - Markdown text
 * @returns {string} HTML text
 */
function convertMarkdownToHTML(markdown) {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/^<p><\/p>/, '')
    .replace(/<\/p>$/, '</p>');
}

/**
 * Escape HTML characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Create metadata for website integration
 * @param {object} content - Generated content
 * @param {object} topic - Original topic
 * @returns {object} Metadata object
 */
function createMetadata(content, topic) {
  const slug = slugify(content.title, { lower: true, strict: true });
  
  return {
    title: content.title,
    slug: slug,
    description: content.description,
    metaDescription: content.description.substring(0, 155),
    category: content.category,
    audience: content.audience,
    readingTime: content.readingTime,
    keywords: content.keywords || topic.keywords || [],
    publishDate: new Date().toISOString(),
    author: config.general.defaultAuthor,
    generated: true,
    originalTopic: topic
  };
}

/**
 * Initialize the scheduler with automated content generation
 */
function init() {
  try {
    logger.info('Initializing automated content scheduler...');
    
    // Schedule the automated content generation task
    if (config.general.publishInterval) {
      scheduleTasks(generateAutomatedContent, config.general.publishInterval);
      logger.info(`Scheduled automated content generation: ${config.general.publishInterval}`);
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
  generateAutomatedContent,
  init
};

// If this script is run directly, initialize the scheduler
if (require.main === module) {
  console.log('🚀 Starting AI Content Generation Scheduler...');
  console.log('==============================================');
  
  // Initialize the scheduler
  init();
  
  console.log('✅ Scheduler is now running!');
  console.log('📅 Content will be generated automatically based on your schedule');
  console.log('⏰ Current schedule: Daily at midnight (0 0 * * *)');
  console.log('');
  console.log('🔄 To stop the scheduler, press Ctrl+C');
  console.log('📊 Check logs in content-engine/logs/ for detailed information');
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping scheduler...');
    stopAllTasks();
    console.log('✅ Scheduler stopped');
    process.exit(0);
  });
}
