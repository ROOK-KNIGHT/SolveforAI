/**
 * Test Script for Automated Content Generation
 * 
 * Tests the complete workflow:
 * 1. Topic generation/selection
 * 2. AI content generation
 * 3. Template rendering
 * 4. Website integration
 * 5. Git deployment
 */

const scheduler = require('../modules/scheduler');
const logger = require('../modules/logger');

/**
 * Test automated content generation
 */
async function testAutomatedContentGeneration() {
  try {
    logger.info('🧪 Testing Automated Content Generation Workflow...');
    logger.info('================================================');
    
    // Test with a sample topic
    const testTopic = {
      title: 'Introduction to Neural Networks',
      description: 'A beginner-friendly guide to understanding neural networks and their applications in AI',
      audience: 'beginner',
      category: 'deep-learning',
      readingTime: 10,
      keywords: ['neural-networks', 'deep-learning', 'ai', 'machine-learning'],
      status: 'new',
      generated: false
    };
    
    logger.info(`🎯 Testing with topic: ${testTopic.title}`);
    
    // Run the automated content generation
    const result = await scheduler.generateAutomatedContent(testTopic, {
      provider: 'openAI' // You can change this to 'anthropic' if preferred
    });
    
    // Check results
    if (result.success) {
      logger.info('✅ Automated content generation test PASSED!');
      logger.info(`📖 Topic: ${result.topic.title}`);
      logger.info(`🌐 Published URL: ${result.publicUrl}`);
      logger.info('');
      logger.info('🎉 The complete workflow is working:');
      logger.info('   ✓ Topic selection');
      logger.info('   ✓ AI content generation');
      logger.info('   ✓ Template rendering');
      logger.info('   ✓ Website integration');
      logger.info('   ✓ Git deployment');
    } else {
      logger.error('❌ Automated content generation test FAILED!');
      logger.error(`Error: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    logger.error(`❌ Test failed with error: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

/**
 * Test scheduler initialization
 */
async function testSchedulerInit() {
  try {
    logger.info('🧪 Testing Scheduler Initialization...');
    
    const initResult = scheduler.init();
    
    if (initResult) {
      logger.info('✅ Scheduler initialization test PASSED!');
      logger.info('📅 Automated content generation is now scheduled');
      
      // Show active tasks
      const activeTasks = scheduler.getActiveTasks();
      logger.info(`📋 Active scheduled tasks: ${activeTasks.length}`);
      
      activeTasks.forEach((task, index) => {
        logger.info(`   ${index + 1}. Task ID: ${task.id}`);
        logger.info(`      Pattern: ${task.pattern}`);
        logger.info(`      Created: ${task.createdAt}`);
      });
      
    } else {
      logger.error('❌ Scheduler initialization test FAILED!');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error(`❌ Scheduler test failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    logger.info('🚀 Starting Automated Content Generation Tests...');
    logger.info('==================================================');
    
    // Test 1: Scheduler initialization
    await testSchedulerInit();
    logger.info('');
    
    // Test 2: Manual content generation
    await testAutomatedContentGeneration();
    logger.info('');
    
    logger.info('🎉 All tests completed successfully!');
    logger.info('');
    logger.info('🤖 Your automated content generation system is ready!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Configure your AI API keys in the config files');
    logger.info('2. Adjust the schedule pattern in config.js if needed');
    logger.info('3. Start the scheduler to begin automated content generation');
    logger.info('');
    logger.info('Current schedule: Daily at midnight (0 0 * * *)');
    logger.info('Change this in content-engine/config/config.js under general.publishInterval');
    
  } catch (error) {
    logger.error(`❌ Test suite failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logger.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testAutomatedContentGeneration,
  testSchedulerInit,
  runAllTests
};
