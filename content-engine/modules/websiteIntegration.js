/**
 * Website Integration Module
 * 
 * Handles integration with the website for content publishing
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Upload content to the website
 * @param {string} localPath - Path to the local HTML file
 * @param {object} metadata - Content metadata
 * @returns {string} Public URL of the published content
 */
async function uploadContent(localPath, metadata) {
  try {
    logger.info(`Uploading content: ${metadata.title}`);
    
    // Get the HTML content
    const htmlContent = await fs.readFile(localPath, 'utf8');
    
    // Create a new file in the tutorials directory
    const filename = `${metadata.slug}.html`;
    const destPath = path.join(config.website.tutorialsPath, filename);
    
    // Ensure destination directory exists
    await fs.mkdir(config.website.tutorialsPath, { recursive: true });
    
    // Write the file to the tutorials directory
    await fs.writeFile(destPath, htmlContent, 'utf8');
    logger.info(`Saved tutorial file to: ${destPath}`);
    
    // Update the website's tutorial index if needed
    await updateTutorialIndex(metadata);
    
    // Update sitemap if needed
    await updateSitemap(metadata);
    
    // Determine the public URL
    const publicUrl = `${config.website.domain}/tutorials/${filename}`;
    logger.info(`Content published at: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    logger.error(`Content upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Update the tutorial index page with the new content
 * @param {object} metadata - Content metadata
 */
async function updateTutorialIndex(metadata) {
  try {
    const indexPath = path.join(process.cwd(), 'tutorials.html');
    
    // Check if the index file exists
    let indexContent;
    try {
      indexContent = await fs.readFile(indexPath, 'utf8');
    } catch (error) {
      // If file doesn't exist, create a basic template
      indexContent = await createTutorialIndexTemplate();
    }
    
    // Create an HTML card for the new tutorial
    const tutorialCard = createTutorialCard(metadata);
    
    // Insert the new tutorial card at the beginning of the tutorials list
    const tutorialsListStartMarker = '<!-- Tutorials List Start -->';
    const tutorialsListEndMarker = '<!-- Tutorials List End -->';
    
    const startIndex = indexContent.indexOf(tutorialsListStartMarker) + tutorialsListStartMarker.length;
    const endIndex = indexContent.indexOf(tutorialsListEndMarker);
    
    if (startIndex > 0 && endIndex > startIndex) {
      const newIndexContent = 
        indexContent.substring(0, startIndex) + 
        '\n        ' + tutorialCard + 
        indexContent.substring(startIndex);
      
      await fs.writeFile(indexPath, newIndexContent, 'utf8');
      logger.info(`Updated tutorials index page with new content: ${metadata.title}`);
    } else {
      logger.warn('Could not find tutorials list markers in index page');
    }
  } catch (error) {
    logger.error(`Failed to update tutorial index: ${error.message}`);
    // Continue despite error - this is not critical
  }
}

/**
 * Create a tutorial card HTML for the index page
 * @param {object} metadata - Content metadata
 * @returns {string} HTML for the tutorial card
 */
function createTutorialCard(metadata) {
  const levelClass = metadata.audience.toLowerCase();
  
  return `
        <!-- Tutorial Card for ${metadata.title} -->
        <div class="tutorial-card">
            <div class="tutorial-image">
                <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="${metadata.title}">
            </div>
            <div class="tutorial-content">
                <h3>${metadata.title}</h3>
                <div class="tutorial-meta">
                    <span>${metadata.audience}</span>
                    <span><i class="far fa-clock"></i> ${metadata.readingTime} min read</span>
                </div>
                <div class="tutorial-excerpt">
                    <p>${metadata.metaDescription}</p>
                </div>
                <a href="tutorials/${metadata.slug}.html" class="btn btn-primary">Read Tutorial</a>
            </div>
        </div>
  `;
}

/**
 * Create a basic tutorial index template if it doesn't exist
 * @returns {string} HTML template for the tutorials index
 */
async function createTutorialIndexTemplate() {
  const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Browse our comprehensive collection of AI and Machine Learning tutorials">
    <title>Tutorials | Solve for AI</title>
    
    <!-- Font imports -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Fira+Code&display=swap" rel="stylesheet">
    
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <!-- Header -->
    <header>
        <div class="container header-container">
            <div class="logo">
                <a href="index.html">Solve<span> for AI</span></a>
            </div>
            
            <nav>
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="tutorials.html" class="active">Tutorials</a></li>
                    <li><a href="learning-paths.html">Learning Paths</a></li>
                    <li><a href="tools.html">AI Tools</a></li>
                    <li><a href="about.html">About</a></li>
                </ul>
            </nav>
            
            <div class="dark-mode-toggle" title="Toggle Dark Mode">🌙</div>
            <div class="mobile-menu"><i class="fas fa-bars"></i></div>
        </div>
    </header>
    
    <!-- Main Content -->
    <div class="container">
        <h1>AI & Machine Learning Tutorials</h1>
        <p class="subtitle">Browse our comprehensive collection of AI and machine learning tutorials, from beginner guides to advanced techniques.</p>
        
        <!-- Tutorial Filters -->
        <div class="tutorial-filters">
            <div class="filter-group">
                <label>Category:</label>
                <select id="category-filter">
                    <option value="all">All Categories</option>
                    <option value="deep-learning">Deep Learning</option>
                    <option value="computer-vision">Computer Vision</option>
                    <option value="nlp">Natural Language Processing</option>
                    <option value="reinforcement-learning">Reinforcement Learning</option>
                    <option value="data-science">Data Science</option>
                    <option value="ai-ethics">AI Ethics</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>Level:</label>
                <select id="level-filter">
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label>Sort By:</label>
                <select id="sort-filter">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="popular">Most Popular</option>
                </select>
            </div>
        </div>
        
        <!-- Tutorials List -->
        <div class="tutorials-list">
            <!-- Tutorials List Start -->
            <!-- New tutorials will be inserted here -->
            <!-- Tutorials List End -->
        </div>
    </div>
    
    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-container">
                <div class="footer-section">
                    <h4>Solve for AI</h4>
                    <p>Your comprehensive resource for AI and machine learning tutorials, from basic concepts to advanced techniques.</p>
                    <div class="social-links">
                        <a href="#"><i class="fab fa-twitter"></i></a>
                        <a href="#"><i class="fab fa-github"></i></a>
                        <a href="#"><i class="fab fa-linkedin"></i></a>
                        <a href="#"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
                
                <div class="footer-section">
                    <h4>Quick Links</h4>
                    <ul class="footer-links">
                        <li><a href="tutorials.html">All Tutorials</a></li>
                        <li><a href="learning-paths.html">Learning Paths</a></li>
                        <li><a href="tools.html">AI Tools & Resources</a></li>
                        <li><a href="blog.html">Blog</a></li>
                    </ul>
                </div>
                
                <div class="footer-section">
                    <h4>Popular Topics</h4>
                    <ul class="footer-links">
                        <li><a href="topics/deep-learning.html">Deep Learning</a></li>
                        <li><a href="topics/computer-vision.html">Computer Vision</a></li>
                        <li><a href="topics/nlp.html">Natural Language Processing</a></li>
                        <li><a href="topics/reinforcement-learning.html">Reinforcement Learning</a></li>
                    </ul>
                </div>
                
                <div class="footer-section">
                    <h4>Subscribe</h4>
                    <p>Get weekly AI tutorials and resources delivered directly to your inbox.</p>
                    <form class="newsletter-form">
                        <input type="email" placeholder="Your email address" required>
                        <button type="submit"><i class="fas fa-paper-plane"></i></button>
                    </form>
                </div>
            </div>
            
            <div class="copyright">
                <p>&copy; 2025 Solve for AI. All rights reserved.</p>
                <ul class="footer-links" style="display: flex; justify-content: center; margin-top: 1rem;">
                    <li><a href="privacy.html">Privacy Policy</a></li>
                    <li><a href="terms.html">Terms of Service</a></li>
                    <li><a href="contact.html">Contact Us</a></li>
                </ul>
            </div>
        </div>
    </footer>
    
    <!-- Custom JavaScript -->
    <script src="assets/js/main.js"></script>
</body>
</html>`;

  // Save the template
  await fs.writeFile(path.join(process.cwd(), 'tutorials.html'), template, 'utf8');
  logger.info('Created new tutorials index template');
  
  return template;
}

/**
 * Update the website's sitemap with the new content
 * @param {object} metadata - Content metadata
 */
async function updateSitemap(metadata) {
  try {
    const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
    
    // Check if sitemap exists
    let sitemapContent;
    try {
      sitemapContent = await fs.readFile(sitemapPath, 'utf8');
    } catch (error) {
      // If file doesn't exist, create a basic sitemap
      sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${config.website.domain}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${config.website.domain}/tutorials.html</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;
    }
    
    // Create a new URL entry
    const urlEntry = `
  <url>
    <loc>${config.website.domain}/tutorials/${metadata.slug}.html</loc>
    <lastmod>${metadata.publishDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    
    // Insert the new URL before the closing urlset tag
    const closingTag = '</urlset>';
    const insertPosition = sitemapContent.lastIndexOf(closingTag);
    
    if (insertPosition > 0) {
      const newSitemapContent = 
        sitemapContent.substring(0, insertPosition) + 
        urlEntry + 
        sitemapContent.substring(insertPosition);
      
      await fs.writeFile(sitemapPath, newSitemapContent, 'utf8');
      logger.info(`Updated sitemap with new content: ${metadata.title}`);
    } else {
      logger.warn('Could not find closing urlset tag in sitemap');
    }
  } catch (error) {
    logger.error(`Failed to update sitemap: ${error.message}`);
    // Continue despite error - this is not critical
  }
}

/**
 * Copy images from temporary storage to the website assets
 * @param {Array} images - Array of image objects with URLs or paths
 * @returns {Array} Updated image objects with website URLs
 */
async function copyImagesToWebsite(images) {
  if (!images || images.length === 0) {
    return [];
  }
  
  const updatedImages = [];
  
  for (const image of images) {
    try {
      // If the image is a URL (e.g., from OpenAI), download it first
      if (image.url.startsWith('http')) {
        // Implementation for downloading remote images would go here
        // For now, we'll just use the original URL
        updatedImages.push(image);
        continue;
      }
      
      // For local images, copy to website assets
      const filename = path.basename(image.url);
      const destPath = path.join(config.website.uploadsPath, filename);
      
      // Ensure uploads directory exists
      await fs.mkdir(config.website.uploadsPath, { recursive: true });
      
      // Copy the file
      await fs.copyFile(image.url, destPath);
      
      // Update the image URL to the website path
      const websiteUrl = `/assets/images/generated/${filename}`;
      updatedImages.push({
        ...image,
        url: websiteUrl,
        originalUrl: image.url
      });
      
      logger.debug(`Copied image to website assets: ${destPath}`);
    } catch (error) {
      logger.error(`Failed to copy image: ${error.message}`);
      // Add the original image without modifications
      updatedImages.push(image);
    }
  }
  
  return updatedImages;
}

/**
 * Update the homepage with a link to the new tutorial
 * @param {object} metadata - Content metadata
 */
async function updateHomepage(metadata) {
  try {
    const homepagePath = path.join(process.cwd(), 'index.html');
    
    // Read the homepage content
    const homepageContent = await fs.readFile(homepagePath, 'utf8');
    
    // Look for the featured tutorials section
    const featuredTutorialsMarker = '<!-- Featured Tutorials Start -->';
    const featuredTutorialsEndMarker = '<!-- Featured Tutorials End -->';
    
    const startIndex = homepageContent.indexOf(featuredTutorialsMarker);
    const endIndex = homepageContent.indexOf(featuredTutorialsEndMarker);
    
    if (startIndex > 0 && endIndex > startIndex) {
      // Create a tutorial card
      const tutorialCard = `
                <!-- Tutorial Card for ${metadata.title} -->
                <div class="tutorial-card">
                    <div class="tutorial-image">
                        <img src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80" alt="${metadata.title}">
                    </div>
                    <div class="tutorial-content">
                        <h3>${metadata.title}</h3>
                        <div class="tutorial-meta">
                            <span>${metadata.audience}</span>
                            <span><i class="far fa-clock"></i> ${metadata.readingTime} min read</span>
                        </div>
                        <div class="tutorial-excerpt">
                            <p>${metadata.metaDescription}</p>
                        </div>
                        <a href="tutorials/${metadata.slug}.html" class="btn btn-primary">Read Tutorial</a>
                    </div>
                </div>`;
      
      // Insert the new tutorial card after the marker
      const newHomepageContent = 
        homepageContent.substring(0, startIndex + featuredTutorialsMarker.length) + 
        tutorialCard + 
        homepageContent.substring(startIndex + featuredTutorialsMarker.length);
      
      await fs.writeFile(homepagePath, newHomepageContent, 'utf8');
      logger.info(`Updated homepage with new tutorial: ${metadata.title}`);
    } else {
      logger.warn('Could not find featured tutorials markers in homepage');
    }
  } catch (error) {
    logger.error(`Failed to update homepage: ${error.message}`);
    // Continue despite error - this is not critical
  }
}

module.exports = {
  uploadContent,
  updateTutorialIndex,
  updateSitemap,
  copyImagesToWebsite,
  updateHomepage
};
