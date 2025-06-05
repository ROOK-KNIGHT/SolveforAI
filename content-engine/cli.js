#!/usr/bin/env node

/**
 * Command-line interface for the Content Engine
 * 
 * Provides a user-friendly way to interact with the content engine
 * through command-line arguments and flags.
 */

// Load environment variables
require('dotenv').config();

const contentEngine = require('./index');
const { version } = require('./package.json');

// Parse command-line arguments
const args = parseArguments(process.argv.slice(2));

// Display help message if requested
if (args.help) {
  displayHelp();
  process.exit(0);
}

// Display version if requested
if (args.version) {
  console.log(`AI Content Engine v${version}`);
  process.exit(0);
}

// Handle different commands
async function main() {
  try {
    // Initialize the content engine
    await contentEngine.init();
    
    switch (args.command) {
      case 'generate':
        await handleGenerate();
        break;
      case 'schedule':
        await handleSchedule();
        break;
      case 'list-topics':
        await handleListTopics();
        break;
      case 'add-topic':
        await handleAddTopic();
        break;
      default:
        // Default to generate if no command is specified
        await handleGenerate();
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle the generate command
 */
async function handleGenerate() {
  const topic = args.topic ? { title: args.topic } : null;
  const options = {
    provider: args.provider,
    includeImages: args.images !== false,
    includeCodeExamples: args.code !== false,
    verbose: args.verbose
  };
  
  console.log(`Generating content${topic ? ` for topic: ${topic.title}` : ''}`);
  console.log(`Using provider: ${options.provider || 'random selection'}`);
  
  const result = await contentEngine.runImmediately(topic, options);
  
  if (result.success) {
    console.log('\n✅ Content generation completed successfully!');
    console.log(`Topic: ${result.topic}`);
    console.log(`URL: ${result.url}`);
    console.log(`Local path: ${result.localPath}`);
  } else {
    console.error('\n❌ Content generation failed!');
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

/**
 * Handle the schedule command
 */
async function handleSchedule() {
  const schedule = args.schedule || process.env.PUBLISH_SCHEDULE;
  const provider = args.provider;
  
  console.log(`Starting scheduler with pattern: ${schedule || 'default (daily at midnight)'}`);
  if (provider) {
    console.log(`Using provider: ${provider}`);
  }
  
  contentEngine.scheduleContentGeneration(schedule, { provider });
  
  console.log('Scheduler is running. Press Ctrl+C to stop.');
  
  // Keep the process running
  process.stdin.resume();
}

/**
 * Handle the list-topics command
 */
async function handleListTopics() {
  const topicGenerator = require('./modules/topicGenerator');
  const status = args.status || 'all';
  
  let topics;
  if (status === 'all') {
    // Load all topics
    const newTopics = await topicGenerator.getTopicsByStatus('new');
    const plannedTopics = await topicGenerator.getTopicsByStatus('planned');
    const inProgressTopics = await topicGenerator.getTopicsByStatus('in-progress');
    const publishedTopics = await topicGenerator.getTopicsByStatus('published');
    
    topics = {
      new: newTopics,
      planned: plannedTopics,
      'in-progress': inProgressTopics,
      published: publishedTopics
    };
    
    console.log(`\nAll Topics (${newTopics.length + plannedTopics.length + inProgressTopics.length + publishedTopics.length} total):`);
    console.log(`- New: ${newTopics.length}`);
    console.log(`- Planned: ${plannedTopics.length}`);
    console.log(`- In Progress: ${inProgressTopics.length}`);
    console.log(`- Published: ${publishedTopics.length}\n`);
  } else {
    // Load topics by status
    const filteredTopics = await topicGenerator.getTopicsByStatus(status);
    topics = { [status]: filteredTopics };
    console.log(`\nTopics with status "${status}" (${filteredTopics.length} total):`);
  }
  
  // Display topics by status
  for (const [topicStatus, topicList] of Object.entries(topics)) {
    if (topicList.length > 0) {
      console.log(`\n${topicStatus.toUpperCase()} TOPICS:`);
      topicList.forEach((topic, index) => {
        console.log(`${index + 1}. ${topic.title}`);
        console.log(`   Audience: ${topic.audience}`);
        console.log(`   Category: ${topic.category}`);
        if (topic.createdAt) {
          console.log(`   Created: ${new Date(topic.createdAt).toLocaleString()}`);
        }
        if (topic.updatedAt) {
          console.log(`   Updated: ${new Date(topic.updatedAt).toLocaleString()}`);
        }
        if (topic.generatedAt) {
          console.log(`   Generated: ${new Date(topic.generatedAt).toLocaleString()}`);
        }
        console.log('');
      });
    }
  }
}

/**
 * Handle the add-topic command
 */
async function handleAddTopic() {
  if (!args.topic) {
    console.error('Error: --topic is required for add-topic command');
    process.exit(1);
  }
  
  const topicGenerator = require('./modules/topicGenerator');
  
  const newTopic = {
    title: args.topic,
    description: args.description || `A tutorial about ${args.topic}`,
    audience: args.audience || 'intermediate',
    category: args.category || 'deep-learning',
    keywords: args.keywords ? args.keywords.split(',').map(k => k.trim()) : [args.topic],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'planned',
    generated: false
  };
  
  await topicGenerator.addTopicsToDatabase([newTopic]);
  
  console.log(`\n✅ Topic added successfully: ${newTopic.title}`);
  console.log(`Status: ${newTopic.status}`);
  console.log(`Category: ${newTopic.category}`);
  console.log(`Audience: ${newTopic.audience}`);
}

/**
 * Parse command-line arguments
 * @param {Array} args - Command-line arguments
 * @returns {object} Parsed arguments
 */
function parseArguments(args) {
  const parsedArgs = {
    command: null,
    topic: null,
    provider: null,
    schedule: null,
    status: null,
    description: null,
    audience: null,
    category: null,
    keywords: null,
    images: true,
    code: true,
    verbose: false,
    help: false,
    version: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Check for commands
    if (arg === 'generate' || arg === 'schedule' || arg === 'list-topics' || arg === 'add-topic') {
      parsedArgs.command = arg;
      continue;
    }
    
    // Check for flags
    if (arg.startsWith('--')) {
      const flag = arg.substring(2);
      
      if (flag === 'help') {
        parsedArgs.help = true;
      } else if (flag === 'version') {
        parsedArgs.version = true;
      } else if (flag === 'verbose') {
        parsedArgs.verbose = true;
      } else if (flag === 'no-images') {
        parsedArgs.images = false;
      } else if (flag === 'no-code') {
        parsedArgs.code = false;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        // Parse flags with values
        parsedArgs[flag] = args[i + 1];
        i++;
      }
    }
  }
  
  return parsedArgs;
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
AI Content Engine v${version}

USAGE:
  node cli.js [COMMAND] [OPTIONS]

COMMANDS:
  generate              Generate a single tutorial (default)
  schedule              Start the scheduler for regular content generation
  list-topics           List available topics
  add-topic             Add a new topic to the database

OPTIONS:
  --topic TEXT          Specify a tutorial topic
  --provider TEXT       Specify the AI provider (openAI or anthropic)
  --schedule TEXT       Specify a cron schedule pattern
  --status TEXT         Filter topics by status (new, planned, in-progress, published)
  --description TEXT    Topic description (for add-topic)
  --audience TEXT       Target audience (beginner, intermediate, advanced)
  --category TEXT       Content category
  --keywords TEXT       Comma-separated keywords
  --no-images           Disable image generation
  --no-code             Disable code example generation
  --verbose             Enable verbose logging
  --help                Display this help message
  --version             Display the version number

EXAMPLES:
  node cli.js generate --topic "Fine-tuning LLMs" --provider openAI
  node cli.js schedule --schedule "0 9 * * *" --provider anthropic
  node cli.js list-topics --status planned
  node cli.js add-topic --topic "Reinforcement Learning from Scratch" --audience beginner
  `);
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
