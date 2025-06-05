/**
 * Image Generator Module
 * 
 * Generates images for tutorial content using AI services
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const config = require('../config/config');
const aiManager = require('./aiManager');
const logger = require('./logger');

/**
 * Generate images for a topic
 * @param {object} topic - The topic object
 * @param {number} count - Number of images to generate
 * @returns {Array} Array of image URLs or paths
 */
async function generateImages(topic, count = 3) {
  try {
    logger.info(`Generating ${count} images for topic: ${topic.title}`);
    
    // Generate image prompts based on the topic
    const imagePrompts = await generateImagePrompts(topic, count);
    logger.debug(`Generated ${imagePrompts.length} image prompts`);
    
    // Generate images using the prompts
    const images = [];
    for (let i = 0; i < imagePrompts.length; i++) {
      try {
        const imageUrl = await generateImageWithOpenAI(imagePrompts[i]);
        if (imageUrl) {
          images.push(imageUrl);
          logger.debug(`Generated image ${i + 1}/${imagePrompts.length}`);
        }
      } catch (error) {
        logger.error(`Failed to generate image ${i + 1}: ${error.message}`);
        // Continue with other images
      }
    }
    
    // Save images locally if they are URLs
    const savedImages = await saveImagesToLocal(images, topic.title);
    
    logger.info(`Successfully generated ${savedImages.length} images for topic: ${topic.title}`);
    return savedImages;
  } catch (error) {
    logger.error(`Image generation failed: ${error.message}`);
    return [];
  }
}

/**
 * Generate prompts for image generation
 * @param {object} topic - The topic object
 * @param {number} count - Number of prompts to generate
 * @returns {Array} Array of image prompts
 */
async function generateImagePrompts(topic, count) {
  try {
    const basePrompt = config.content.imgPromptStyle;
    
    const prompt = `
    Create ${count} unique, detailed image prompts for a tutorial about "${topic.title}".
    
    The prompts should:
    1. Be suitable for DALL-E or similar image generation AI
    2. Represent different aspects of the topic
    3. Be detailed and specific enough to generate high-quality technical illustrations
    4. Have a consistent style but varied content
    5. Be appropriate for an educational context
    
    Additional context about the topic:
    ${topic.description}
    
    Keywords to incorporate: ${topic.keywords ? topic.keywords.join(', ') : topic.title}
    
    Each prompt should follow this template style but with your own specific details:
    "${basePrompt}"
    
    Return just a JSON array of strings with each prompt. No other text.`;
    
    const content = await aiManager.generateContent(prompt, 'openAI', 'contentGeneration', {
      systemPrompt: 'You are an expert at creating detailed image generation prompts that produce high-quality, consistent educational imagery.'
    });
    
    // Parse the response into a JSON array
    let promptsData;
    try {
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, content];
      
      const jsonContent = jsonMatch[1].trim();
      promptsData = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error(`Failed to parse prompts response as JSON: ${parseError.message}`);
      logger.debug(`Raw prompts response: ${content}`);
      
      // Fallback: try to extract anything that looks like prompts
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      promptsData = lines.slice(0, count).map(line => {
        // Remove any list markers or quotes
        return line.replace(/^\s*\d+\.\s*/, '')
                  .replace(/^['"]/, '')
                  .replace(/['"]$/, '')
                  .trim();
      });
    }
    
    // Ensure we have the requested number of prompts
    while (promptsData.length < count) {
      const defaultPrompt = `${basePrompt.replace('[TOPIC]', topic.title)}`;
      promptsData.push(defaultPrompt);
    }
    
    // Trim to the requested count
    return promptsData.slice(0, count);
  } catch (error) {
    logger.error(`Image prompt generation failed: ${error.message}`);
    
    // Return default prompts
    const defaultPrompts = [];
    for (let i = 0; i < count; i++) {
      let prompt = config.content.imgPromptStyle.replace('[TOPIC]', topic.title);
      if (i === 0) {
        prompt += ', concept overview';
      } else if (i === 1) {
        prompt += ', detailed diagram';
      } else {
        prompt += `, example ${i}`;
      }
      defaultPrompts.push(prompt);
    }
    
    return defaultPrompts;
  }
}

/**
 * Generate an image using OpenAI's DALL-E API
 * @param {string} prompt - The image generation prompt
 * @returns {string} The URL of the generated image
 */
async function generateImageWithOpenAI(prompt) {
  try {
    const imageUrl = await aiManager.generateImages(prompt, {
      count: 1,
      size: config.aiProviders.openAI.imageSettings.size,
      quality: config.aiProviders.openAI.imageSettings.quality,
      style: config.aiProviders.openAI.imageSettings.style
    });
    
    return imageUrl[0];
  } catch (error) {
    logger.error(`OpenAI image generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Save remote images to local storage
 * @param {Array} imageUrls - Array of image URLs
 * @param {string} topicTitle - Title of the topic
 * @returns {Array} Array of local file paths
 */
async function saveImagesToLocal(imageUrls, topicTitle) {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }
  
  const savedImages = [];
  const outputDir = path.join(config.general.contentOutputDir, 'images');
  
  // Ensure the directory exists
  await fs.mkdir(outputDir, { recursive: true });
  
  // Create a slug from the topic title
  const slug = topicTitle.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    
    try {
      // Only download if it's a URL
      if (imageUrl.startsWith('http')) {
        // Generate a filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${slug}-image-${i + 1}-${timestamp}.png`;
        const filePath = path.join(outputDir, filename);
        
        // Download the image
        const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'arraybuffer'
        });
        
        // Save the image
        await fs.writeFile(filePath, Buffer.from(response.data, 'binary'));
        logger.debug(`Saved image to ${filePath}`);
        
        savedImages.push({
          url: filePath,
          prompt: imageUrl,
          type: i === 0 ? 'featured' : 'section'
        });
      } else {
        // It's already a local path
        savedImages.push({
          url: imageUrl,
          type: i === 0 ? 'featured' : 'section'
        });
      }
    } catch (error) {
      logger.error(`Failed to save image ${i + 1}: ${error.message}`);
      // Add the original URL as a fallback
      savedImages.push({
        url: imageUrl,
        type: i === 0 ? 'featured' : 'section'
      });
    }
  }
  
  return savedImages;
}

module.exports = {
  generateImages,
  generateImagePrompts,
  generateImageWithOpenAI,
  saveImagesToLocal
};
