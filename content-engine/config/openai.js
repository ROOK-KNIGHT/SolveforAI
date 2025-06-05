/**
 * OpenAI API configuration
 * 
 * NOTE: Do not store actual API keys in this file.
 * Use environment variables in production.
 */

module.exports = {
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
  organization: process.env.OPENAI_ORGANIZATION || '',
  
  // Default models to use for different purposes
  models: {
    contentGeneration: 'gpt-4-turbo',
    titleGeneration: 'gpt-4',
    codeGeneration: 'gpt-4-turbo',
    imageGeneration: 'dall-e-3',
    summarization: 'gpt-3.5-turbo',
    ideaGeneration: 'gpt-4'
  },
  
  // Default parameters for API calls
  defaults: {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1
  },
  
  // Image generation settings
  imageSettings: {
    size: '1024x1024',
    quality: 'standard',
    style: 'natural',
    defaultFormat: 'url'
  },
  
  // Rate limiting settings
  rateLimits: {
    contentRequests: {
      maxPerMinute: 5,
      maxPerHour: 50,
      maxPerDay: 500
    },
    imageRequests: {
      maxPerMinute: 5,
      maxPerHour: 20,
      maxPerDay: 100
    }
  },
  
  // Cost tracking
  costTracking: {
    enabled: true,
    maxDailyBudget: 10, // in USD
    alertThreshold: 0.8, // 80% of budget
    trackPerCategory: true
  }
};
