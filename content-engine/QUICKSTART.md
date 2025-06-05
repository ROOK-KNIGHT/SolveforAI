# Quick Start Guide

This guide will help you get the AI Content Engine up and running quickly.

## Installation

1. **Install Node.js dependencies**

```bash
cd content-engine
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file to add your API keys:

```
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

## Generate Your First Tutorial

Run the following command to generate a tutorial with a specific topic:

```bash
npm run cli -- generate --topic "Introduction to Reinforcement Learning" --provider openAI
```

This will:
1. Generate an outline for the tutorial
2. Create comprehensive content
3. Generate images if enabled
4. Format the content as HTML
5. Save it to your website

## Use the CLI

The content engine comes with a powerful CLI to help you manage content generation:

```bash
# List all available topics
npm run cli -- list-topics

# Add a new topic to generate later
npm run cli -- add-topic --topic "Transfer Learning in NLP" --audience "intermediate" --category "nlp"

# Start the scheduler to generate content on a schedule
npm run cli -- schedule --schedule "0 3 * * *"
```

## Customization

You can customize the content engine by editing the configuration files:

- `config/config.js`: Main configuration
- `config/openai.js`: OpenAI specific settings
- `config/anthropic.js`: Anthropic specific settings
- `templates/tutorial-template.html`: HTML template for generated tutorials

## Troubleshooting

If you encounter any issues:

1. Check that your API keys are correctly set in the `.env` file
2. Ensure you have Node.js version 18 or higher installed
3. Check the logs in the `logs` directory for detailed error information

## Next Steps

- Try generating tutorials with different topics and AI providers
- Customize the HTML template to match your website's design
- Set up a regular schedule to automatically publish new content
