const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const contentEngine = require('./index');
const logger = require('./modules/logger');

const app = express();
app.use(bodyParser.json());

// Initialize content engine with minimal setup
const init = async () => {
    try {
        // Create required directories
        const dirs = [
            './content-engine/content',
            './content-engine/logs',
            './assets/images/generated'
        ];
        
        for (const dir of dirs) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        
        logger.info('Content Engine API initialized successfully');
    } catch (error) {
        logger.error(`Initialization failed: ${error.message}`);
        process.exit(1);
    }
};

init();

// Content generation endpoint
app.post('/generate', async (req, res) => {
    try {
        const { generateNow, topic, options } = req.body;

        // Set API keys from request
        if (options?.apiKeys) {
            process.env.OPENAI_API_KEY = options.apiKeys.openai;
            process.env.ANTHROPIC_API_KEY = options.apiKeys.anthropic;
        }

        // Generate content
        const result = await contentEngine.runImmediately(
            topic ? { title: topic } : null,
            options
        );

        res.json(result);
    } catch (error) {
        logger.error(`API error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`Content Engine API server running on port ${PORT}`);
});
