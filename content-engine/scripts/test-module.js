const ModuleRenderer = require('../modules/moduleRenderer');
const path = require('path');
const fs = require('fs');
const open = require('open');

async function testModuleRendering() {
    try {
        // Initialize renderer
        const renderer = new ModuleRenderer();

        // Load example module
        const examplePath = path.join(__dirname, '../templates/example-module.json');
        const moduleData = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));

        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '../output/ml-fundamentals');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Copy required assets
        const assetsDir = path.join(__dirname, '../../assets');
        const outputAssetsDir = path.join(outputDir, 'assets');

        // Copy CSS files
        const cssFiles = ['style.css', 'module.css'];
        for (const file of cssFiles) {
            const src = path.join(assetsDir, 'css', file);
            const dest = path.join(outputAssetsDir, 'css', file);
            
            if (!fs.existsSync(path.dirname(dest))) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
            }
            
            fs.copyFileSync(src, dest);
        }

        // Copy JS files
        const jsFiles = ['module.js'];
        for (const file of jsFiles) {
            const src = path.join(assetsDir, 'js', file);
            const dest = path.join(outputAssetsDir, 'js', file);
            
            if (!fs.existsSync(path.dirname(dest))) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
            }
            
            fs.copyFileSync(src, dest);
        }

        // Render module
        const outputPath = path.join(outputDir, 'module-1.html');
        renderer.renderToFile(moduleData, outputPath);

        console.log('\nModule rendered successfully!');
        console.log('Opening in browser...\n');

        // Open in browser
        await open(outputPath);

        console.log('Testing completed successfully!');
        console.log(`Output directory: ${outputDir}`);
        
    } catch (error) {
        console.error('Error testing module rendering:', error);
        process.exit(1);
    }
}

// Run test
testModuleRendering();
