/**
 * Main configuration file for the AI Content Engine
 */

module.exports = {
  // General settings
  general: {
    contentOutputDir: './content-engine/content',
    logDir: './content-engine/logs',
    maxConcurrentRequests: 2,
    publishInterval: '0 0 * * *', // Daily at midnight (cron format)
    defaultLanguage: 'en',
    defaultAuthor: 'AI Content Team'
  },
  
  // Website configuration
  website: {
    domain: 'https://solveforai.com',
    tutorialsPath: './tutorials',
    uploadsPath: './assets/images/generated',
    dateFormat: 'MMMM D, YYYY',
    tutorialTypes: ['beginner', 'intermediate', 'advanced'],
    categories: [
      'deep-learning',
      'computer-vision',
      'nlp',
      'reinforcement-learning',
      'data-science',
      'ai-ethics',
      'prompt-engineering',
      'generative-ai'
    ]
  },
  
  // Content generation settings
  content: {
    minWordsPerTutorial: 1500,
    maxWordsPerTutorial: 3000,
    includeCodeExamples: true,
    includeTOC: true,
    includeImages: true,
    defaultReadTime: 15, // minutes
    imgPromptStyle: 'Professional, digital illustration of [TOPIC], blue tech theme, high quality'
  },
  
  // AI service provider configuration
  aiProviders: {
    // Configuration will be loaded from separate files
    openAI: require('./openai'),
    anthropic: require('./anthropic')
  },
  
  // SEO settings
  seo: {
    generateMetaDescription: true,
    metaDescriptionLength: 155,
    includeSchemaMarkup: true,
    keywordDensity: 1.5, // percentage
    autoGenerateTags: true
  },
  
  // Social media sharing
  social: {
    autoPostToTwitter: false, // Set to true to enable auto-posting
    autoPostToLinkedIn: false,
    socialImageDimensions: {
      width: 1200,
      height: 630
    }
  }
};
