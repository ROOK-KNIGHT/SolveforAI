/**
 * AI Manager Module
 * 
 * Manages interactions with AI service providers (OpenAI and Anthropic)
 */

const { OpenAI } = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const config = require('../config/config');
const logger = require('./logger');

// AI service provider instances
let openAIClient = null;
let anthropicClient = null;

/**
 * Initialize the AI service providers
 */
async function initProviders() {
  try {
    // Initialize OpenAI
    openAIClient = new OpenAI({
      apiKey: config.aiProviders.openAI.apiKey,
      organization: config.aiProviders.openAI.organization || undefined
    });
    logger.info('OpenAI client initialized');
    
    // Initialize Anthropic
    anthropicClient = new Anthropic({
      apiKey: config.aiProviders.anthropic.apiKey
    });
    logger.info('Anthropic client initialized');
    
    return true;
  } catch (error) {
    logger.error(`Failed to initialize AI providers: ${error.message}`);
    return false;
  }
}

/**
 * Get the appropriate client for the specified provider
 * @param {string} provider - The AI provider to use ('openAI' or 'anthropic')
 * @returns {object} The AI client
 */
function getClient(provider) {
  if (provider === 'openAI') {
    if (!openAIClient) {
      throw new Error('OpenAI client not initialized');
    }
    return openAIClient;
  } else if (provider === 'anthropic') {
    if (!anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }
    return anthropicClient;
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Get a model for a specific purpose
 * @param {string} provider - The AI provider to use ('openAI' or 'anthropic')
 * @param {string} purpose - The purpose (e.g., 'contentGeneration', 'titleGeneration')
 * @returns {string} The model name
 */
function getModelForPurpose(provider, purpose) {
  const providerConfig = config.aiProviders[provider];
  if (!providerConfig || !providerConfig.models[purpose]) {
    throw new Error(`No model configured for provider ${provider} and purpose ${purpose}`);
  }
  return providerConfig.models[purpose];
}

/**
 * Generate text using OpenAI
 * @param {string} prompt - The prompt for content generation
 * @param {string} purpose - The purpose (e.g., 'contentGeneration', 'titleGeneration')
 * @param {object} options - Additional options
 * @returns {string} The generated text
 */
async function generateWithOpenAI(prompt, purpose, options = {}) {
  try {
    const model = options.model || getModelForPurpose('openAI', purpose);
    const defaultOptions = config.aiProviders.openAI.defaults;
    
    logger.debug(`Generating with OpenAI model: ${model}`);
    logger.debug(`Prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
    
    const response = await openAIClient.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: options.systemPrompt || 'You are an expert in AI and machine learning.' },
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || defaultOptions.temperature,
      max_tokens: options.maxTokens || defaultOptions.maxTokens,
      top_p: options.topP || defaultOptions.topP,
      frequency_penalty: options.frequencyPenalty || defaultOptions.frequencyPenalty,
      presence_penalty: options.presencePenalty || defaultOptions.presencePenalty
    });
    
    const content = response.choices[0].message.content;
    logger.debug(`Generated ${content.length} characters with OpenAI`);
    
    return content;
  } catch (error) {
    logger.error(`OpenAI generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate text using Anthropic
 * @param {string} prompt - The prompt for content generation
 * @param {string} purpose - The purpose (e.g., 'contentGeneration', 'titleGeneration')
 * @param {object} options - Additional options
 * @returns {string} The generated text
 */
async function generateWithAnthropic(prompt, purpose, options = {}) {
  try {
    const model = options.model || getModelForPurpose('anthropic', purpose);
    const defaultOptions = config.aiProviders.anthropic.defaults;
    const systemPrompt = options.systemPrompt || config.aiProviders.anthropic.advanced.systemPromptPrefix;
    
    logger.debug(`Generating with Anthropic model: ${model}`);
    logger.debug(`Prompt (first 100 chars): ${prompt.substring(0, 100)}...`);
    
    const response = await anthropicClient.messages.create({
      model: model,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || defaultOptions.temperature,
      max_tokens: options.maxTokens || defaultOptions.maxTokens,
      top_p: options.topP || defaultOptions.topP,
      stop_sequences: options.stopSequences || defaultOptions.stopSequences
    });
    
    const content = response.content[0].text;
    logger.debug(`Generated ${content.length} characters with Anthropic`);
    
    return content;
  } catch (error) {
    logger.error(`Anthropic generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate images using OpenAI's DALL-E
 * @param {string} prompt - The image generation prompt
 * @param {object} options - Additional options
 * @returns {Array} An array of image URLs or base64 data
 */
async function generateImages(prompt, options = {}) {
  try {
    const imageSettings = config.aiProviders.openAI.imageSettings;
    
    logger.debug(`Generating images with prompt: ${prompt}`);
    
    const response = await openAIClient.images.generate({
      model: options.model || config.aiProviders.openAI.models.imageGeneration,
      prompt: prompt,
      n: options.count || 1,
      size: options.size || imageSettings.size,
      quality: options.quality || imageSettings.quality,
      style: options.style || imageSettings.style,
      response_format: options.responseFormat || imageSettings.defaultFormat
    });
    
    const images = response.data.map(image => {
      return image.url || image.b64_json;
    });
    
    logger.debug(`Generated ${images.length} images`);
    
    return images;
  } catch (error) {
    logger.error(`Image generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate content using the specified provider
 * @param {string} prompt - The prompt for content generation
 * @param {string} provider - The AI provider to use ('openAI' or 'anthropic')
 * @param {string} purpose - The purpose (e.g., 'contentGeneration', 'titleGeneration')
 * @param {object} options - Additional options
 * @returns {string} The generated content
 */
async function generateContent(prompt, provider, purpose, options = {}) {
  if (provider === 'openAI') {
    return await generateWithOpenAI(prompt, purpose, options);
  } else if (provider === 'anthropic') {
    return await generateWithAnthropic(prompt, purpose, options);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

module.exports = {
  initProviders,
  getClient,
  getModelForPurpose,
  generateWithOpenAI,
  generateWithAnthropic,
  generateImages,
  generateContent
};
