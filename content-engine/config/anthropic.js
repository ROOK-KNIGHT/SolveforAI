/**
 * Anthropic API configuration
 * 
 * NOTE: Do not store actual API keys in this file.
 * Use environment variables in production.
 */

module.exports = {
  apiKey: process.env.ANTHROPIC_API_KEY || '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',
  
  // Default models to use for different purposes
  models: {
    contentGeneration: 'claude-3-opus-20240229',
    titleGeneration: 'claude-3-haiku-20240307',
    codeGeneration: 'claude-3-opus-20240229',
    summarization: 'claude-3-sonnet-20240229',
    ideaGeneration: 'claude-3-opus-20240229'
  },
  
  // Default parameters for API calls
  defaults: {
    temperature: 0.7,
    maxTokens: 4000,
    topP: 0.9,
    stopSequences: []
  },
  
  // Rate limiting settings
  rateLimits: {
    contentRequests: {
      maxPerMinute: 5,
      maxPerHour: 50, 
      maxPerDay: 500
    }
  },
  
  // Cost tracking
  costTracking: {
    enabled: true,
    maxDailyBudget: 10, // in USD
    alertThreshold: 0.8, // 80% of budget
    trackPerCategory: true
  },
  
  // Advanced settings
  advanced: {
    useStreamingAPI: true,
    systemPromptPrefix: "You are an expert AI and machine learning technical writer.",
    defaultFormat: "markdown"
  }
};
