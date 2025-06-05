/**
 * Content Generator Module
 * 
 * Generates comprehensive tutorial content using AI providers
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const aiManager = require('./aiManager');
const logger = require('./logger');

/**
 * Generate a complete tutorial based on a topic
 * @param {object} topic - The topic object
 * @param {string} provider - The AI provider to use
 * @returns {object} Generated content object
 */
async function generateContent(topic, provider = 'openAI') {
  try {
    logger.info(`Generating content for topic: ${topic.title} using ${provider}`);
    
    // Generate the outline first
    const outline = await generateOutline(topic, provider);
    logger.info(`Generated outline with ${outline.sections.length} sections`);
    
    // Generate the introduction
    const introduction = await generateIntroduction(topic, provider);
    logger.info('Generated introduction');
    
    // Generate each section based on the outline
    const sections = await generateSections(topic, outline, provider);
    logger.info(`Generated ${sections.length} content sections`);
    
    // Generate the conclusion
    const conclusion = await generateConclusion(topic, outline, provider);
    logger.info('Generated conclusion');
    
    // Generate code examples if applicable
    let codeExamples = [];
    if (config.content.includeCodeExamples) {
      codeExamples = await generateCodeExamples(topic, outline, provider);
      logger.info(`Generated ${codeExamples.length} code examples`);
    }
    
    // Assemble the complete content
    const content = {
      title: topic.title,
      description: topic.description,
      audience: topic.audience,
      category: topic.category,
      keywords: topic.keywords,
      readingTime: calculateReadingTime(introduction, sections, conclusion),
      outline,
      introduction,
      sections,
      conclusion,
      codeExamples,
      generatedAt: new Date().toISOString(),
      provider
    };
    
    // Save raw content for reference
    await saveRawContent(content, topic.title);
    
    return content;
  } catch (error) {
    logger.error(`Content generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a structured outline for the tutorial
 * @param {object} topic - The topic object
 * @param {string} provider - The AI provider to use
 * @returns {object} Outline object with sections and subsections
 */
async function generateOutline(topic, provider) {
  try {
    const prompt = `
    Create a detailed, well-structured outline for a ${topic.audience}-level tutorial about "${topic.title}".
    
    The tutorial should be comprehensive and cover the following:
    - Clear explanations of key concepts
    - Practical examples and applications
    - Code samples where appropriate
    - Best practices and common pitfalls
    
    The outline should include:
    - An introduction section
    - 4-6 main content sections with 2-4 subsections each
    - A conclusion section
    
    Additional context about the topic:
    ${topic.description}
    
    Format the response as a JSON object with:
    - A "sections" array containing objects with "title" and "subsections" (array of strings)
    
    Make sure the structure is logical and builds knowledge progressively.`;
    
    const content = await aiManager.generateContent(prompt, provider, 'contentGeneration', {
      systemPrompt: 'You are an expert technical writer and educator specializing in AI and machine learning.'
    });
    
    // Parse the response into a JSON object
    let outlineData;
    try {
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, content];
      
      const jsonContent = jsonMatch[1].trim();
      outlineData = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error(`Failed to parse outline response as JSON: ${parseError.message}`);
      logger.debug(`Raw outline response: ${content}`);
      
      // Attempt a more lenient parsing approach
      try {
        const jsonCandidate = content.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        outlineData = JSON.parse(jsonCandidate);
      } catch (error) {
        throw new Error('Failed to parse outline response');
      }
    }
    
    return outlineData;
  } catch (error) {
    logger.error(`Outline generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate the introduction section of the tutorial
 * @param {object} topic - The topic object
 * @param {string} provider - The AI provider to use
 * @returns {string} Generated introduction content
 */
async function generateIntroduction(topic, provider) {
  try {
    const prompt = `
    Write an engaging and informative introduction for a ${topic.audience}-level tutorial titled "${topic.title}".
    
    The introduction should:
    - Hook the reader with the relevance and importance of the topic
    - Clearly explain what the reader will learn
    - Mention any prerequisites or background knowledge needed
    - Give a brief overview of what will be covered in the tutorial
    
    Additional context about the topic:
    ${topic.description}
    
    Keywords to naturally incorporate: ${topic.keywords ? topic.keywords.join(', ') : topic.title}
    
    Write approximately 300-400 words in a professional but approachable tone. Format the content using markdown with proper headings, paragraphs, and emphasis where appropriate.`;
    
    const introduction = await aiManager.generateContent(prompt, provider, 'contentGeneration', {
      systemPrompt: 'You are an expert technical writer specializing in creating engaging educational content about AI and machine learning.'
    });
    
    return introduction;
  } catch (error) {
    logger.error(`Introduction generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate content for each section in the outline
 * @param {object} topic - The topic object
 * @param {object} outline - The outline object
 * @param {string} provider - The AI provider to use
 * @returns {Array} Array of section objects with content
 */
async function generateSections(topic, outline, provider) {
  const sections = [];
  
  // Process each section in the outline
  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    
    // Skip introduction and conclusion as they're handled separately
    if (section.title.toLowerCase().includes('introduction') || 
        section.title.toLowerCase().includes('conclusion')) {
      continue;
    }
    
    try {
      logger.debug(`Generating content for section: ${section.title}`);
      
      const subsectionsText = section.subsections.map((ss, idx) => `${idx + 1}. ${ss}`).join('\n');
      
      const prompt = `
      Write comprehensive, educational content for the "${section.title}" section of our tutorial titled "${topic.title}".
      
      This section should cover the following subsections:
      ${subsectionsText}
      
      The content should be:
      - Appropriate for a ${topic.audience}-level audience
      - Rich with practical examples and explanations
      - Well-structured with clear headings and subheadings
      - Between 500-800 words total for this section
      
      Additional guidelines:
      - Incorporate relevant code examples where appropriate
      - Use markdown formatting for headings, code blocks, lists, etc.
      - Naturally incorporate some of these keywords where relevant: ${topic.keywords ? topic.keywords.join(', ') : topic.title}
      - Maintain a professional but conversational tone
      - Include practical tips or best practices where applicable
      
      Write detailed content for each subsection, with proper transitions between ideas.`;
      
      const content = await aiManager.generateContent(prompt, provider, 'contentGeneration', {
        systemPrompt: 'You are an expert technical writer specializing in creating educational content about AI and machine learning. Your content is known for being clear, practical, and technically accurate.'
      });
      
      sections.push({
        title: section.title,
        subsections: section.subsections,
        content,
        order: i
      });
      
      logger.debug(`Completed section: ${section.title} (${content.length} characters)`);
    } catch (error) {
      logger.error(`Failed to generate section "${section.title}": ${error.message}`);
      // Continue with other sections despite the error
    }
  }
  
  return sections.sort((a, b) => a.order - b.order);
}

/**
 * Generate the conclusion section of the tutorial
 * @param {object} topic - The topic object
 * @param {object} outline - The outline object
 * @param {string} provider - The AI provider to use
 * @returns {string} Generated conclusion content
 */
async function generateConclusion(topic, outline, provider) {
  try {
    const prompt = `
    Write an effective conclusion for a ${topic.audience}-level tutorial titled "${topic.title}".
    
    The tutorial covered these main sections:
    ${outline.sections.map(s => `- ${s.title}`).join('\n')}
    
    Your conclusion should:
    - Summarize the key points and concepts covered
    - Reinforce the main takeaways
    - Suggest next steps or further learning resources
    - Encourage the reader to apply what they've learned
    
    Additional context about the topic:
    ${topic.description}
    
    Write approximately 200-300 words in a professional but encouraging tone. Format the content using markdown with proper headings and paragraphs.`;
    
    const conclusion = await aiManager.generateContent(prompt, provider, 'contentGeneration', {
      systemPrompt: 'You are an expert technical writer specializing in creating educational content about AI and machine learning.'
    });
    
    return conclusion;
  } catch (error) {
    logger.error(`Conclusion generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate code examples for the tutorial
 * @param {object} topic - The topic object
 * @param {object} outline - The outline object
 * @param {string} provider - The AI provider to use
 * @returns {Array} Array of code example objects
 */
async function generateCodeExamples(topic, outline, provider) {
  try {
    const prompt = `
    Create 2-3 practical code examples for a ${topic.audience}-level tutorial titled "${topic.title}".
    
    The tutorial covers these main sections:
    ${outline.sections.map(s => `- ${s.title}`).join('\n')}
    
    For each code example:
    1. Provide a descriptive title
    2. Include a brief explanation of what the code demonstrates
    3. Write well-commented, working code that follows best practices
    4. Add a short explanation of how to run the code and expected outputs
    
    The examples should be practical, educational, and directly related to the tutorial content.
    Choose the most appropriate programming language(s) for this topic.
    
    Format each example with markdown, using proper code blocks with language specification.
    Return a JSON array of objects, each with "title", "description", "language", "code", and "explanation" properties.`;
    
    const content = await aiManager.generateContent(prompt, provider, 'codeGeneration', {
      systemPrompt: 'You are an expert software developer and educator specializing in AI and machine learning. You write clear, well-structured code examples that help learners understand complex concepts.'
    });
    
    // Parse the response into a JSON object
    let codeExamples;
    try {
      // Extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                        content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, content];
      
      const jsonContent = jsonMatch[1].trim();
      codeExamples = JSON.parse(jsonContent);
    } catch (parseError) {
      logger.error(`Failed to parse code examples response as JSON: ${parseError.message}`);
      logger.debug(`Raw code examples response: ${content}`);
      
      // Create a fallback structure to avoid failing the entire process
      codeExamples = [{
        title: "Code Example",
        description: "Generated code example",
        language: "python",
        code: content,
        explanation: "See code comments for explanation"
      }];
    }
    
    return codeExamples;
  } catch (error) {
    logger.error(`Code example generation failed: ${error.message}`);
    // Return an empty array instead of failing the entire process
    return [];
  }
}

/**
 * Calculate the reading time for the generated content
 * @param {string} introduction - Introduction content
 * @param {Array} sections - Array of section objects
 * @param {string} conclusion - Conclusion content
 * @returns {number} Estimated reading time in minutes
 */
function calculateReadingTime(introduction, sections, conclusion) {
  // Average reading speed: 200-250 words per minute
  const WORDS_PER_MINUTE = 225;
  
  // Count words in all content
  const introWords = introduction.split(/\s+/).length;
  const sectionWords = sections.reduce((total, section) => {
    return total + section.content.split(/\s+/).length;
  }, 0);
  const conclusionWords = conclusion.split(/\s+/).length;
  
  const totalWords = introWords + sectionWords + conclusionWords;
  const minutes = Math.ceil(totalWords / WORDS_PER_MINUTE);
  
  // Ensure minimum reading time and account for code examples, images, etc.
  return Math.max(config.content.defaultReadTime, minutes);
}

/**
 * Save the raw generated content for reference and debugging
 * @param {object} content - Generated content object
 * @param {string} title - Content title
 */
async function saveRawContent(content, title) {
  try {
    const slug = title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${slug}-${timestamp}.json`;
    const filePath = path.join(config.general.contentOutputDir, 'raw', filename);
    
    // Ensure the directory exists
    await fs.mkdir(path.join(config.general.contentOutputDir, 'raw'), { recursive: true });
    
    // Save the content as JSON
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    logger.debug(`Saved raw content to ${filePath}`);
  } catch (error) {
    logger.error(`Failed to save raw content: ${error.message}`);
    // Non-critical error, don't throw
  }
}

module.exports = {
  generateContent,
  generateOutline,
  generateIntroduction,
  generateSections,
  generateConclusion,
  generateCodeExamples
};
