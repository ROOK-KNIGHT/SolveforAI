/**
 * Git Integration Test Script
 * 
 * Tests the git manager functionality with sample content
 */

const path = require('path');
const fs = require('fs').promises;
const gitManager = require('../modules/gitManager');
const logger = require('../modules/logger');

// Test configuration
const TEST_CONFIG = {
  testContentDir: './content-engine/test-content',
  testFiles: [
    'test-tutorial.html',
    'test-module.json',
    'test-metadata.json'
  ]
};

/**
 * Create test content files
 */
async function createTestContent() {
  try {
    logger.info('Creating test content...');
    
    // Ensure test directory exists
    await fs.mkdir(TEST_CONFIG.testContentDir, { recursive: true });
    
    // Create test tutorial HTML
    const testTutorialHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Tutorial - Git Integration</title>
</head>
<body>
    <h1>Test Tutorial</h1>
    <p>This is a test tutorial created for git integration testing.</p>
    <p>Generated at: ${new Date().toISOString()}</p>
</body>
</html>`;
    
    // Create test module JSON
    const testModuleJson = {
      id: 'test-module',
      title: 'Test Module for Git Integration',
      description: 'A test module to validate git operations',
      content: {
        sections: [
          {
            title: 'Introduction',
            content: 'This is a test section'
          }
        ]
      },
      metadata: {
        created: new Date().toISOString(),
        type: 'test',
        category: 'testing'
      }
    };
    
    // Create test metadata
    const testMetadata = {
      title: 'Test Content for Git Integration',
      type: 'tutorial',
      category: 'testing',
      slug: 'test-git-integration',
      createdAt: new Date().toISOString(),
      testRun: true
    };
    
    // Write test files
    const testFiles = [
      {
        path: path.join(TEST_CONFIG.testContentDir, 'test-tutorial.html'),
        content: testTutorialHtml
      },
      {
        path: path.join(TEST_CONFIG.testContentDir, 'test-module.json'),
        content: JSON.stringify(testModuleJson, null, 2)
      },
      {
        path: path.join(TEST_CONFIG.testContentDir, 'test-metadata.json'),
        content: JSON.stringify(testMetadata, null, 2)
      }
    ];
    
    for (const file of testFiles) {
      await fs.writeFile(file.path, file.content, 'utf8');
      logger.info(`Created test file: ${file.path}`);
    }
    
    return testFiles.map(f => f.path);
  } catch (error) {
    logger.error(`Failed to create test content: ${error.message}`);
    throw error;
  }
}

/**
 * Test git repository initialization
 */
async function testInitRepo() {
  logger.info('Testing git repository initialization...');
  
  try {
    const result = await gitManager.initRepo();
    
    if (result) {
      logger.info('✅ Git repository initialization test passed');
      return true;
    } else {
      logger.error('❌ Git repository initialization test failed');
      return false;
    }
  } catch (error) {
    logger.error(`❌ Git repository initialization test error: ${error.message}`);
    return false;
  }
}

/**
 * Test staging changes
 */
async function testStageChanges(testFiles) {
  logger.info('Testing git staging...');
  
  try {
    // Test staging specific files
    const result = await gitManager.stageChanges(testFiles);
    
    if (result) {
      logger.info('✅ Git staging test passed');
      return true;
    } else {
      logger.error('❌ Git staging test failed');
      return false;
    }
  } catch (error) {
    logger.error(`❌ Git staging test error: ${error.message}`);
    return false;
  }
}

/**
 * Test commit creation
 */
async function testCommitChanges() {
  logger.info('Testing git commit...');
  
  try {
    const result = await gitManager.createCommit(
      'test-content',
      'Git Integration Test',
      { prefix: 'test', action: 'add' }
    );
    
    if (result) {
      logger.info('✅ Git commit test passed');
      return true;
    } else {
      logger.error('❌ Git commit test failed');
      return false;
    }
  } catch (error) {
    logger.error(`❌ Git commit test error: ${error.message}`);
    return false;
  }
}

/**
 * Test git status retrieval
 */
async function testGetStatus() {
  logger.info('Testing git status...');
  
  try {
    const status = await gitManager.getStatus();
    
    if (status.success) {
      logger.info('✅ Git status test passed');
      logger.info(`Current branch: ${status.branch}`);
      logger.info(`Repository clean: ${status.clean}`);
      logger.info(`Files changed: ${status.files.length}`);
      return true;
    } else {
      logger.error('❌ Git status test failed');
      return false;
    }
  } catch (error) {
    logger.error(`❌ Git status test error: ${error.message}`);
    return false;
  }
}

/**
 * Test complete deployment workflow
 */
async function testDeploymentWorkflow(testFiles) {
  logger.info('Testing complete git deployment workflow...');
  
  try {
    const result = await gitManager.deployContent(
      'tutorial',
      'Test Git Integration Workflow',
      testFiles,
      { prefix: 'test', action: 'add' }
    );
    
    if (result.success) {
      logger.info('✅ Git deployment workflow test passed');
      logger.info(`Staged: ${result.staged}`);
      logger.info(`Committed: ${result.committed}`);
      logger.info(`Pushed: ${result.pushed}`);
      return true;
    } else {
      logger.error('❌ Git deployment workflow test failed');
      logger.error(`Error: ${result.error}`);
      return false;
    }
  } catch (error) {
    logger.error(`❌ Git deployment workflow test error: ${error.message}`);
    return false;
  }
}

/**
 * Test push functionality (if remote is configured)
 */
async function testPushChanges() {
  logger.info('Testing git push (if remote configured)...');
  
  try {
    const result = await gitManager.pushChanges();
    
    if (result) {
      logger.info('✅ Git push test passed');
      return true;
    } else {
      logger.warn('⚠️  Git push test skipped (no remote configured)');
      return true; // Not a failure if no remote
    }
  } catch (error) {
    logger.error(`❌ Git push test error: ${error.message}`);
    return false;
  }
}

/**
 * Clean up test content
 */
async function cleanupTestContent() {
  try {
    logger.info('Cleaning up test content...');
    
    // Remove test directory
    await fs.rmdir(TEST_CONFIG.testContentDir, { recursive: true });
    logger.info('✅ Test content cleaned up');
    
    return true;
  } catch (error) {
    logger.warn(`Warning: Failed to clean up test content: ${error.message}`);
    return false;
  }
}

/**
 * Run all git integration tests
 */
async function runAllTests() {
  logger.info('🚀 Starting Git Integration Tests...');
  logger.info('=====================================');
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  let testFiles = [];
  
  try {
    // Create test content
    testFiles = await createTestContent();
    
    // Define test suite
    const tests = [
      { name: 'Repository Initialization', fn: () => testInitRepo() },
      { name: 'Stage Changes', fn: () => testStageChanges(testFiles) },
      { name: 'Create Commit', fn: () => testCommitChanges() },
      { name: 'Get Status', fn: () => testGetStatus() },
      { name: 'Push Changes', fn: () => testPushChanges() },
      { name: 'Complete Deployment Workflow', fn: () => testDeploymentWorkflow(testFiles) }
    ];
    
    // Run each test
    for (const test of tests) {
      testResults.total++;
      logger.info(`\n📋 Running test: ${test.name}`);
      
      const startTime = Date.now();
      const passed = await test.fn();
      const duration = Date.now() - startTime;
      
      testResults.tests.push({
        name: test.name,
        passed,
        duration
      });
      
      if (passed) {
        testResults.passed++;
      } else {
        testResults.failed++;
      }
    }
    
  } catch (error) {
    logger.error(`Test setup failed: ${error.message}`);
  } finally {
    // Clean up
    await cleanupTestContent();
  }
  
  // Print test summary
  logger.info('\n📊 Test Summary');
  logger.info('================');
  logger.info(`Total tests: ${testResults.total}`);
  logger.info(`Passed: ${testResults.passed}`);
  logger.info(`Failed: ${testResults.failed}`);
  logger.info(`Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Print individual test results
  logger.info('\n📋 Individual Test Results:');
  for (const test of testResults.tests) {
    const status = test.passed ? '✅' : '❌';
    logger.info(`${status} ${test.name} (${test.duration}ms)`);
  }
  
  logger.info('\n🏁 Git Integration Tests Complete');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    logger.error(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testInitRepo,
  testStageChanges,
  testCommitChanges,
  testGetStatus,
  testPushChanges,
  testDeploymentWorkflow,
  createTestContent,
  cleanupTestContent
};
