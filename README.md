# Solve for AI - AI/ML Tutorials Website

A comprehensive platform for AI and Machine Learning tutorials with an automated content generation engine powered by OpenAI and Anthropic.

## Project Overview

This project consists of:

1. **Static Website**: Frontend with tutorials, learning paths, tools, and resources
2. **Content Engine**: Automated content generation system using AI models
3. **Generated Content**: High-quality AI/ML tutorials with code examples and images

## Features

- Comprehensive AI/ML tutorials with code examples
- Learning paths for different skill levels
- Interactive tools and visualizations
- Automated content generation via AI
- Responsive design with dark mode
- SEO optimized content

## Repository Structure

```
solve-for-ai/
├── assets/               # Static assets (CSS, JS, images)
├── content-engine/       # AI content generation system
├── tutorials/            # Generated tutorial HTML files
├── *.html                # Main website pages
└── README.md             # Project documentation
```

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- OpenAI API key (for GPT-4 and DALL-E)
- Anthropic API key (for Claude models)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/solve-for-ai.git
cd solve-for-ai
```

2. Install dependencies:
```bash
cd content-engine
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. Run the content engine:
```bash
npm run generate
```

5. View the website:
```bash
# Open index.html in your browser
```

## Content Engine

The content engine automatically generates AI/ML tutorials using OpenAI and Anthropic models. See the [content engine README](content-engine/README.md) for detailed usage instructions.

## Deployment

### Deploying to Cloudflare

This project is designed to be deployed to Cloudflare for optimal performance and scaling:

1. **Cloudflare Pages**: Hosts the static website
2. **Cloudflare Workers**: Runs the content generation serverless functions
3. **Cloudflare R2**: Stores generated content and images

#### Deployment Steps

1. Create a Cloudflare account and set up your domain
2. Connect your GitHub repository to Cloudflare Pages
3. Configure the build settings:
   - Build command: `npm install && npm run build`
   - Build output directory: `/`
4. Set up environment variables in Cloudflare dashboard
5. Deploy your Workers for content generation
6. Configure R2 storage for content

See the [deployment documentation](DEPLOYMENT.md) for detailed instructions.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
