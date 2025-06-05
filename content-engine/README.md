# AI Content Engine

An automated content generation system that uses OpenAI and Anthropic's AI models to create high-quality AI/ML tutorials and post them directly to your website.

## Overview

The AI Content Engine automatically generates comprehensive AI and machine learning tutorials using advanced language models. It handles the entire content creation pipeline:

1. Topic generation and selection
2. Content outline creation
3. Comprehensive tutorial content generation
4. Image generation for visual aids
5. HTML formatting with SEO optimization
6. Direct website integration

This system allows you to maintain a steady stream of fresh, high-quality content with minimal human intervention.

## Features

- Automated topic generation based on AI/ML trends
- Flexible content generation using either OpenAI or Anthropic models
- Customizable content formatting and templates
- Automated image generation using DALL-E
- Direct website integration for content publishing
- Scheduled content generation via cron jobs
- Detailed logging and error handling
- SEO optimization including metadata and schema markup

## Installation

### Prerequisites

- Node.js (v18 or higher)
- OpenAI API key (for GPT-4 and DALL-E)
- Anthropic API key (for Claude models)

### Setup

1. Clone the repository
2. Navigate to the content-engine directory
3. Install dependencies:

```bash
npm install
```

4. Copy the environment variables template:

```bash
cp .env.example .env
```

5. Edit the `.env` file and add your API keys and configuration

## Usage

### Generate a Single Tutorial

To generate a single tutorial:

```bash
npm run generate
```

This will:
- Select or generate a new topic
- Create comprehensive tutorial content
- Format the content to HTML
- Save the content locally
- Upload it to your website

### Schedule Regular Content Generation

To schedule automatic content generation:

```bash
npm run schedule
```

This will start the scheduler, which will generate new content based on the schedule defined in your configuration.

### Command Line Options

You can specify a topic directly:

```bash
npm run generate -- --topic "Implementing Transformer Models from Scratch"
```

Or specify the AI provider to use:

```bash
npm run generate -- --provider openAI
npm run generate -- --provider anthropic
```

## Configuration

The main configuration files are located in the `config` directory:

- `config.js`: Main configuration
- `openai.js`: OpenAI specific settings
- `anthropic.js`: Anthropic specific settings

You can also use environment variables for configuration (see `.env.example`).

### Key Configuration Options

- `publishInterval`: Cron pattern for scheduled content (default: daily at midnight)
- `contentOutputDir`: Directory for local content storage
- `website.domain`: Your website domain
- `website.tutorialsPath`: Path to your tutorials directory
- `content.includeImages`: Whether to generate images
- `content.includeCodeExamples`: Whether to include code examples

## Project Structure

```
content-engine/
├── config/                # Configuration files
├── content/               # Generated content storage
│   ├── html/              # Formatted HTML content
│   ├── images/            # Generated images
│   └── raw/               # Raw generated content
├── logs/                  # Log files
├── modules/               # Core functionality modules
│   ├── aiManager.js       # AI provider integrations
│   ├── contentFormatter.js # HTML formatting
│   ├── contentGenerator.js # Content generation
│   ├── imageGenerator.js  # Image generation
│   ├── logger.js          # Logging system
│   ├── scheduler.js       # Scheduling system
│   ├── topicGenerator.js  # Topic generation
│   └── websiteIntegration.js # Website publishing
├── templates/             # HTML templates
├── .env                   # Environment variables
├── index.js               # Main entry point
└── package.json           # Project dependencies
```

## Customization

### Modifying the HTML Template

Edit the `templates/tutorial-template.html` file to change the HTML structure of generated tutorials.

### Adding New AI Providers

To add a new AI provider:

1. Create a new configuration file in the `config` directory
2. Add the provider to `aiManager.js`
3. Update the main configuration in `config.js`

## Troubleshooting

### Common Issues

**Rate Limiting**: If you encounter rate limiting issues with the AI providers, adjust the `rateLimits` settings in the respective configuration files.

**Memory Issues**: For large tutorials, you might need to increase the Node.js memory limit:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run generate
```

**API Key Issues**: Ensure your API keys are correctly set in the `.env` file.

## License

MIT
