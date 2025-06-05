/**
 * Content Formatter Module
 * 
 * Formats raw generated content into HTML for website publication
 */

const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const slugify = require('slugify');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Format raw content to HTML
 * @param {object} rawContent - Raw content object
 * @param {Array} images - Array of generated image URLs or paths
 * @returns {object} Formatted HTML content
 */
async function formatToHtml(rawContent, images = []) {
  try {
    logger.info(`Formatting content to HTML: ${rawContent.title}`);
    
    // Format introduction
    const introductionHtml = marked.parse(rawContent.introduction);
    
    // Format sections
    const sectionsHtml = rawContent.sections.map(section => {
      return {
        title: section.title,
        subsections: section.subsections,
        content: marked.parse(section.content),
        order: section.order
      };
    });
    
    // Format conclusion
    const conclusionHtml = marked.parse(rawContent.conclusion);
    
    // Format code examples
    const codeExamplesHtml = rawContent.codeExamples.map(example => {
      return {
        title: example.title,
        description: marked.parse(example.description),
        language: example.language,
        code: example.code,
        explanation: marked.parse(example.explanation)
      };
    });
    
    // Create table of contents
    const tableOfContents = generateTableOfContents(rawContent);
    
    // Map images to sections if available
    const mappedImages = mapImagesToSections(images, rawContent.sections);
    
    // Create HTML template
    const html = await generateHtmlTemplate(
      rawContent,
      introductionHtml,
      sectionsHtml,
      conclusionHtml,
      codeExamplesHtml,
      tableOfContents,
      mappedImages
    );
    
    // Generate metadata for SEO
    const metadata = generateMetadata(rawContent);
    
    return {
      html,
      metadata,
      images: mappedImages
    };
  } catch (error) {
    logger.error(`HTML formatting failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate a table of contents from the outline
 * @param {object} content - Raw content object
 * @returns {Array} Table of contents items
 */
function generateTableOfContents(content) {
  const toc = [];
  
  // Add introduction
  toc.push({
    id: 'introduction',
    title: 'Introduction',
    level: 1,
    order: 0
  });
  
  // Add sections and subsections
  content.sections.forEach((section, sectionIndex) => {
    // Skip if this is an introduction or conclusion section (already added separately)
    if (section.title.toLowerCase().includes('introduction') || 
        section.title.toLowerCase().includes('conclusion')) {
      return;
    }
    
    const sectionId = slugify(section.title, { lower: true, strict: true });
    
    toc.push({
      id: sectionId,
      title: section.title,
      level: 1,
      order: sectionIndex + 1
    });
    
    // Add subsections
    section.subsections.forEach((subsection, subsectionIndex) => {
      const subsectionId = `${sectionId}-${slugify(subsection, { lower: true, strict: true })}`;
      
      toc.push({
        id: subsectionId,
        title: subsection,
        level: 2,
        parentId: sectionId,
        order: subsectionIndex
      });
    });
  });
  
  // Add conclusion
  toc.push({
    id: 'conclusion',
    title: 'Conclusion',
    level: 1,
    order: content.sections.length + 1
  });
  
  // Add code examples section if available
  if (content.codeExamples && content.codeExamples.length > 0) {
    toc.push({
      id: 'code-examples',
      title: 'Code Examples',
      level: 1,
      order: content.sections.length + 2
    });
    
    // Add individual code examples
    content.codeExamples.forEach((example, index) => {
      const exampleId = `code-example-${index + 1}`;
      
      toc.push({
        id: exampleId,
        title: example.title,
        level: 2,
        parentId: 'code-examples',
        order: index
      });
    });
  }
  
  return toc;
}

/**
 * Map images to sections
 * @param {Array} images - Array of image URLs or paths
 * @param {Array} sections - Array of content sections
 * @returns {Array} Images mapped to sections
 */
function mapImagesToSections(images, sections) {
  const mappedImages = [];
  
  // If no images available, return empty array
  if (!images || images.length === 0) {
    return mappedImages;
  }
  
  // Reserve the first image for the featured image
  mappedImages.push({
    url: images[0],
    type: 'featured',
    alt: 'Featured image for the tutorial'
  });
  
  // Map remaining images to sections
  const remainingImages = images.slice(1);
  const contentSections = sections.filter(s => 
    !s.title.toLowerCase().includes('introduction') && 
    !s.title.toLowerCase().includes('conclusion')
  );
  
  // Map one image per section, or as many as available
  for (let i = 0; i < Math.min(contentSections.length, remainingImages.length); i++) {
    mappedImages.push({
      url: remainingImages[i],
      type: 'section',
      sectionTitle: contentSections[i].title,
      alt: `Illustration for ${contentSections[i].title}`
    });
  }
  
  return mappedImages;
}

/**
 * Generate HTML template for the tutorial
 * @param {object} rawContent - Original content object
 * @param {string} introductionHtml - Formatted introduction HTML
 * @param {Array} sectionsHtml - Array of formatted section objects
 * @param {string} conclusionHtml - Formatted conclusion HTML
 * @param {Array} codeExamplesHtml - Array of formatted code examples
 * @param {Array} tableOfContents - Table of contents array
 * @param {Array} images - Array of mapped images
 * @returns {string} Complete HTML template
 */
async function generateHtmlTemplate(
  rawContent,
  introductionHtml,
  sectionsHtml,
  conclusionHtml,
  codeExamplesHtml,
  tableOfContents,
  images
) {
  try {
    // Load the HTML template
    const templatePath = path.join(__dirname, '../templates/tutorial-template.html');
    let template = await fs.readFile(templatePath, 'utf8');
    
    // Get the featured image URL or use a default
    const featuredImage = images.find(img => img.type === 'featured');
    const featuredImageUrl = featuredImage ? featuredImage.url : 
      'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
    
    // Format the TOC HTML
    const tocHtml = generateTocHtml(tableOfContents);
    
    // Format the sections HTML
    const formattedSectionsHtml = sectionsHtml
      .sort((a, b) => a.order - b.order)
      .map(section => {
        const sectionId = slugify(section.title, { lower: true, strict: true });
        const sectionImage = images.find(img => img.sectionTitle === section.title);
        
        let sectionHtml = `
          <section id="${sectionId}">
            <h2>${section.title}</h2>
        `;
        
        // Add section image if available
        if (sectionImage) {
          sectionHtml += `
            <div class="tutorial-section-image">
              <img src="${sectionImage.url}" alt="${sectionImage.alt}">
            </div>
          `;
        }
        
        sectionHtml += section.content;
        sectionHtml += '</section>';
        
        return sectionHtml;
      }).join('\n');
    
    // Format the code examples HTML
    let codeExamplesSection = '';
    if (codeExamplesHtml.length > 0) {
      codeExamplesSection = `
        <section id="code-examples">
          <h2>Code Examples</h2>
      `;
      
      codeExamplesHtml.forEach((example, index) => {
        codeExamplesSection += `
          <div class="code-example" id="code-example-${index + 1}">
            <h3>${example.title}</h3>
            <div class="example-description">${example.description}</div>
            <div class="code-block">
              <pre><code class="language-${example.language}">${example.code}</code></pre>
            </div>
            <div class="example-explanation">${example.explanation}</div>
          </div>
        `;
      });
      
      codeExamplesSection += '</section>';
    }
    
    // Replace placeholders in the template
    template = template
      .replace(/{{title}}/g, rawContent.title)
      .replace(/{{description}}/g, rawContent.description)
      .replace(/{{author}}/g, config.general.defaultAuthor)
      .replace(/{{date}}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/{{category}}/g, rawContent.category)
      .replace(/{{readingTime}}/g, rawContent.readingTime)
      .replace(/{{audience}}/g, rawContent.audience)
      .replace(/{{keywords}}/g, rawContent.keywords ? rawContent.keywords.join(', ') : rawContent.title)
      .replace(/{{featuredImage}}/g, featuredImageUrl)
      .replace(/{{tableOfContents}}/g, tocHtml)
      .replace(/{{introduction}}/g, introductionHtml)
      .replace(/{{sections}}/g, formattedSectionsHtml)
      .replace(/{{conclusion}}/g, conclusionHtml)
      .replace(/{{codeExamples}}/g, codeExamplesSection);
    
    return template;
  } catch (error) {
    logger.error(`HTML template generation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate HTML for the table of contents
 * @param {Array} toc - Table of contents array
 * @returns {string} HTML for the table of contents
 */
function generateTocHtml(toc) {
  let html = '<div class="tutorial-toc"><h3>Table of Contents</h3><ul>';
  
  // Filter for top-level items first
  const topLevelItems = toc.filter(item => item.level === 1);
  
  topLevelItems.forEach(item => {
    html += `<li><a href="#${item.id}">${item.title}</a>`;
    
    // Add nested items if any
    const children = toc.filter(child => child.parentId === item.id);
    if (children.length > 0) {
      html += '<ul>';
      children.forEach(child => {
        html += `<li><a href="#${child.id}">${child.title}</a></li>`;
      });
      html += '</ul>';
    }
    
    html += '</li>';
  });
  
  html += '</ul></div>';
  return html;
}

/**
 * Generate metadata for SEO and OpenGraph
 * @param {object} content - Raw content object
 * @returns {object} Metadata object
 */
function generateMetadata(content) {
  // Create slug from title
  const slug = slugify(content.title, { lower: true, strict: true });
  
  // Generate SEO-friendly title
  const seoTitle = `${content.title} | Solve for AI`;
  
  // Generate meta description (truncate if needed)
  let metaDescription = content.description || content.title;
  if (metaDescription && metaDescription.length > config.seo.metaDescriptionLength) {
    metaDescription = metaDescription.substring(0, config.seo.metaDescriptionLength - 3) + '...';
  }
  
  // Format date for schema markup
  const publishDate = new Date().toISOString();
  
  // Build metadata object
  const metadata = {
    slug,
    title: content.title,
    seoTitle,
    metaDescription,
    category: content.category,
    audience: content.audience,
    keywords: content.keywords,
    publishDate,
    modifiedDate: publishDate,
    author: config.general.defaultAuthor,
    readingTime: content.readingTime
  };
  
  return metadata;
}

/**
 * Save formatted content to local file system
 * @param {object} formattedContent - Formatted content object
 * @param {object} metadata - Content metadata
 * @returns {string} Path to saved file
 */
async function saveLocal(formattedContent, metadata) {
  try {
    // Create a file path using the slug
    const outputDir = path.join(config.general.contentOutputDir, 'html');
    const filePath = path.join(outputDir, `${metadata.slug}.html`);
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write the HTML to file
    await fs.writeFile(filePath, formattedContent.html, 'utf8');
    logger.info(`Saved formatted HTML to ${filePath}`);
    
    // Save metadata separately
    const metadataPath = path.join(outputDir, `${metadata.slug}.metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    logger.debug(`Saved metadata to ${metadataPath}`);
    
    return filePath;
  } catch (error) {
    logger.error(`Failed to save formatted content: ${error.message}`);
    throw error;
  }
}

module.exports = {
  formatToHtml,
  generateMetadata,
  saveLocal
};
