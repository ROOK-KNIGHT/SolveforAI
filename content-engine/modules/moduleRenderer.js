const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

class ModuleRenderer {
    constructor() {
        // Load template
        const templatePath = path.join(__dirname, '../templates/module-template.html');
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        this.template = Handlebars.compile(templateContent);

        // Register helpers
        this.registerHelpers();
    }

    registerHelpers() {
        // Helper for JSON stringification
        Handlebars.registerHelper('json', function(context) {
            return JSON.stringify(context);
        });

        // Helper for code formatting
        Handlebars.registerHelper('code', function(context) {
            return context.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        });

        // Helper for array iteration with index
        Handlebars.registerHelper('each_with_index', function(array, options) {
            let buffer = '';
            for (let i = 0; i < array.length; i++) {
                buffer += options.fn({...array[i], index: i});
            }
            return buffer;
        });
    }

    validateModuleData(moduleData) {
        // Load schema
        const schemaPath = path.join(__dirname, '../templates/module-schema.json');
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

        // TODO: Add schema validation
        // For now, just check required fields
        const required = [
            'module_id',
            'module_title',
            'module_description',
            'learning_path',
            'concepts',
            'key_takeaways'
        ];

        for (const field of required) {
            if (!moduleData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate concepts
        if (!Array.isArray(moduleData.concepts) || moduleData.concepts.length === 0) {
            throw new Error('Module must have at least one concept');
        }

        if (moduleData.concepts.length > 5) {
            throw new Error('Module cannot have more than 5 concepts');
        }
    }

    render(moduleData) {
        try {
            // Validate module data
            this.validateModuleData(moduleData);

            // Add concepts_json for client-side use
            moduleData.concepts_json = JSON.stringify(moduleData.concepts);

            // Render template
            const html = this.template(moduleData);

            return html;
        } catch (error) {
            console.error('Error rendering module:', error);
            throw error;
        }
    }

    renderToFile(moduleData, outputPath) {
        try {
            const html = this.render(moduleData);

            // Ensure directory exists
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(outputPath, html);

            console.log(`Module rendered successfully to: ${outputPath}`);
        } catch (error) {
            console.error('Error rendering module to file:', error);
            throw error;
        }
    }
}

// Example usage:
if (require.main === module) {
    const renderer = new ModuleRenderer();

    // Load example module
    const examplePath = path.join(__dirname, '../templates/example-module.json');
    const moduleData = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));

    // Render to file
    const outputPath = path.join(__dirname, '../output/ml-fundamentals/module-1.html');
    renderer.renderToFile(moduleData, outputPath);
}

module.exports = ModuleRenderer;
