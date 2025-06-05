/**
 * Tools Page JavaScript
 * 
 * Handles the interactive functionality of the project prompt generator
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    initPromptGenerator();
    initExamplePrompts();
    initPromptActions();
    
    // Load highlight.js for code syntax highlighting
    if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
    }
});

/**
 * Initialize the prompt generator
 */
function initPromptGenerator() {
    const generateBtn = document.getElementById('generate-prompt');
    if (generateBtn) {
        generateBtn.addEventListener('click', function() {
            generateProjectPrompt();
        });
    }
    
    // Initialize sliders with value indicators
    initSliders();
}

/**
 * Initialize sliders with value indicators
 */
function initSliders() {
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(slider => {
        // Create value indicator
        const valueIndicator = document.createElement('div');
        valueIndicator.className = 'slider-value';
        valueIndicator.textContent = slider.value;
        
        // Insert after slider
        slider.parentNode.insertBefore(valueIndicator, slider.nextSibling);
        
        // Update value on input
        slider.addEventListener('input', function() {
            valueIndicator.textContent = this.value;
        });
    });
}

/**
 * Initialize example prompt buttons
 */
function initExamplePrompts() {
    const exampleBtns = document.querySelectorAll('.load-example');
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const exampleId = this.getAttribute('data-example');
            loadExamplePrompt(exampleId);
        });
    });
    
    const premiumBtns = document.querySelectorAll('.load-premium-example');
    premiumBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const exampleId = this.getAttribute('data-example');
            showPremiumModal(exampleId);
        });
    });
}

/**
 * Initialize prompt action buttons (copy, save, share)
 */
function initPromptActions() {
    // Copy button
    const copyBtn = document.getElementById('copy-prompt');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            copyPromptToClipboard();
        });
    }
    
    // Save button
    const saveBtn = document.getElementById('save-prompt');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            savePromptAsFile();
        });
    }
    
    // Share button
    const shareBtn = document.getElementById('share-prompt');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            sharePrompt();
        });
    }
}

/**
 * Generate a project prompt based on the selected options
 */
function generateProjectPrompt() {
    // Get selected options
    const category = document.querySelector('input[name="category"]:checked').value;
    const complexity = document.querySelector('input[name="complexity"]:checked').value;
    const domain = document.getElementById('domain-select').value;
    
    // Get slider values
    const computePower = parseInt(document.getElementById('compute-power').value);
    const dataAvailability = parseInt(document.getElementById('data-availability').value);
    const timeConstraint = parseInt(document.getElementById('time-constraint').value);
    
    // Get focus areas
    const focusAreas = [];
    document.querySelectorAll('input[name="focus"]:checked').forEach(checkbox => {
        focusAreas.push(checkbox.value);
    });
    
    // Display the generated prompt
    displayPrompt({
        category,
        complexity,
        domain,
        computePower,
        dataAvailability,
        timeConstraint,
        focusAreas
    });
    
    // Show recommended resources
    showRecommendedResources(category, complexity, domain);
    
    // Analytics tracking
    console.log(`Prompt generated: ${category} - ${complexity} - ${domain}`);
}

/**
 * Display the generated prompt in the UI
 */
function displayPrompt(options) {
    // Hide placeholder and show result
    document.getElementById('prompt-placeholder').style.display = 'none';
    document.getElementById('prompt-result').style.display = 'block';
    
    // Generate content based on options
    document.getElementById('project-objective').textContent = generateObjective(options.category, options.complexity, options.domain);
    
    // Dataset recommendations
    const datasetRecs = generateDatasets(options.category, options.domain);
    document.getElementById('dataset-recommendations').textContent = 
        `Based on your ${options.dataAvailability < 3 ? 'limited' : options.dataAvailability > 3 ? 'abundant' : 'moderate'} data availability, consider the following datasets:`;
    
    const datasetList = document.getElementById('dataset-list');
    datasetList.innerHTML = '';
    datasetRecs.forEach(dataset => {
        const li = document.createElement('li');
        li.textContent = dataset;
        datasetList.appendChild(li);
    });
    
    // Model architecture
    document.getElementById('model-architecture').textContent = generateArchitectureDescription(options.category, options.complexity);
    document.getElementById('model-code').textContent = generateSampleCode(options.category, options.complexity);
    
    // Evaluation metrics
    const evalMetrics = document.getElementById('evaluation-metrics');
    evalMetrics.innerHTML = '';
    generateEvaluationMetrics(options.category, options.focusAreas).forEach(metric => {
        const li = document.createElement('li');
        li.textContent = metric;
        evalMetrics.appendChild(li);
    });
    
    // Challenges
    const challenges = document.getElementById('challenges');
    challenges.innerHTML = '';
    generateChallenges(options).forEach(challenge => {
        const li = document.createElement('li');
        li.textContent = challenge;
        challenges.appendChild(li);
    });
    
    // Next steps
    const nextSteps = document.getElementById('next-steps');
    nextSteps.innerHTML = '';
    generateNextSteps(options.complexity, options.timeConstraint).forEach((step, index) => {
        const li = document.createElement('li');
        li.textContent = step;
        nextSteps.appendChild(li);
    });
    
    // Apply syntax highlighting
    if (typeof hljs !== 'undefined') {
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightBlock(block);
        });
    }
}

/**
 * Generate project objective based on category, complexity, and domain
 */
function generateObjective(category, complexity, domain) {
    const objectives = {
        'computer-vision': {
            'beginner': "Build an image classification system that can accurately categorize images into predefined classes.",
            'intermediate': "Develop an object detection system that can identify and locate multiple objects within images.",
            'advanced': "Create a multi-task computer vision system that can perform segmentation, depth estimation, and object recognition simultaneously."
        },
        'nlp': {
            'beginner': "Develop a text classification system to categorize documents or short texts into predefined categories.",
            'intermediate': "Build a named entity recognition system that can identify and classify named entities in text.",
            'advanced': "Create a question-answering system that can extract answers from text based on natural language questions."
        },
        'time-series': {
            'beginner': "Develop a forecasting model that predicts future values based on historical time series data.",
            'intermediate': "Build an anomaly detection system that identifies unusual patterns in time series data.",
            'advanced': "Create a multivariate time series model that captures complex relationships between multiple variables over time."
        },
        'reinforcement': {
            'beginner': "Develop an agent that learns to navigate a simple environment using reinforcement learning.",
            'intermediate': "Build a reinforcement learning system that can play and master a game with complex rules.",
            'advanced': "Create a multi-agent reinforcement learning system that learns cooperative or competitive behaviors."
        },
        'generative': {
            'beginner': "Build a simple generative model that can create new samples similar to a training dataset.",
            'intermediate': "Develop a conditional generative model that can generate content based on specific attributes.",
            'advanced': "Create a sophisticated generative system that can produce high-quality, diverse outputs with controllable attributes."
        }
    };
    
    const domainContext = {
        'general': "The project should be designed for general applications without domain-specific constraints.",
        'healthcare': "The project should focus on healthcare applications, considering patient data privacy and regulatory requirements.",
        'finance': "The project should address financial applications, considering data security and regulatory compliance.",
        'retail': "The project should focus on retail applications, considering customer behavior and inventory management.",
        'manufacturing': "The project should address manufacturing applications, considering production processes and quality control.",
        'entertainment': "The project should focus on entertainment applications, considering user engagement and content recommendation.",
        'education': "The project should address educational applications, considering learning outcomes and student engagement.",
        'environmental': "The project should focus on environmental applications, considering sustainability and resource management."
    };
    
    return objectives[category][complexity] + " " + domainContext[domain];
}

/**
 * Generate dataset recommendations based on category and domain
 */
function generateDatasets(category, domain) {
    const datasets = {
        'computer-vision': [
            "ImageNet - A large-scale hierarchical image database",
            "COCO - Common Objects in Context",
            "CIFAR-10/100 - A collection of images for object recognition"
        ],
        'nlp': [
            "GLUE Benchmark - Collection of NLP understanding tasks",
            "SQuAD - Stanford Question Answering Dataset",
            "WikiText - Wikipedia-based language modeling dataset"
        ],
        'time-series': [
            "UCR Time Series Archive - Collection of time series datasets",
            "Federal Reserve Economic Data (FRED) - Economic indicators",
            "UCI Electricity Load Diagrams - Electricity consumption data"
        ],
        'reinforcement': [
            "OpenAI Gym - Collection of RL environments",
            "DeepMind Lab - 3D learning environment",
            "MuJoCo - Physics simulation environment"
        ],
        'generative': [
            "CelebA - Large-scale face attributes dataset",
            "LSUN - Large-scale scene understanding dataset",
            "MNIST/Fashion-MNIST - Handwritten digits and fashion products"
        ]
    };
    
    // Return domain-specific datasets if available, otherwise general ones
    return datasets[category];
}

/**
 * Generate architecture description based on category and complexity
 */
function generateArchitectureDescription(category, complexity) {
    const descriptions = {
        'computer-vision': {
            'beginner': "A simple Convolutional Neural Network (CNN) with multiple convolutional layers followed by pooling layers and fully connected layers for classification.",
            'intermediate': "A transfer learning approach using a pre-trained model like ResNet or EfficientNet as a feature extractor, with custom classification layers added on top.",
            'advanced': "A sophisticated architecture like Feature Pyramid Network (FPN) or EfficientDet with advanced techniques such as feature fusion and attention mechanisms."
        },
        'nlp': {
            'beginner': "A Recurrent Neural Network (RNN) or LSTM architecture with word embeddings for processing sequential text data.",
            'intermediate': "A transformer-based model like BERT with fine-tuning for the specific task, leveraging pre-trained language understanding.",
            'advanced': "A state-of-the-art architecture like T5, GPT-3, or BART with advanced techniques such as prompt engineering and few-shot learning."
        },
        'time-series': {
            'beginner': "A simple LSTM network that can capture temporal dependencies in the sequence data.",
            'intermediate': "A Seq2Seq model with attention mechanisms for better handling of long-term dependencies.",
            'advanced': "A Temporal Fusion Transformer or Neural ODE architecture with advanced time series processing capabilities."
        },
        'reinforcement': {
            'beginner': "A simple Q-Learning or Deep Q-Network (DQN) for discrete action spaces.",
            'intermediate': "A Policy Gradient method like PPO or Actor-Critic architecture for more complex environments.",
            'advanced': "A multi-agent reinforcement learning system with advanced techniques like meta-learning or hierarchical RL."
        },
        'generative': {
            'beginner': "A simple Variational Autoencoder (VAE) or basic GAN architecture.",
            'intermediate': "A conditional GAN or StyleGAN architecture with improved training stability.",
            'advanced': "A diffusion model or advanced GAN architecture with techniques like adaptive normalization and multi-scale generation."
        }
    };
    
    return descriptions[category][complexity];
}

/**
 * Generate sample code based on category and complexity
 */
function generateSampleCode(category, complexity) {
    // Simplified version that returns basic code templates
    const basicCode = {
        'computer-vision': `
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout

model = Sequential([
    # Convolutional layers
    Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
    MaxPooling2D((2, 2)),
    Conv2D(64, (3, 3), activation='relu'),
    MaxPooling2D((2, 2)),
    
    # Fully connected layers
    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.5),
    Dense(10, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])`,

        'nlp': `
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout

model = Sequential([
    # Embedding layer
    Embedding(10000, 128, input_length=100),
    
    # LSTM layer
    LSTM(128, dropout=0.2, recurrent_dropout=0.2),
    
    # Output layer
    Dense(2, activation='softmax')
])

model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])`,

        'time-series': `
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

model = Sequential([
    # LSTM layer
    LSTM(50, activation='relu', input_shape=(50, 1)),
    
    # Dropout for regularization
    Dropout(0.2),
    
    # Output layer
    Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])`,

        'reinforcement': `
import tensorflow as tf
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Flatten
from tensorflow.keras.optimizers import Adam

def create_dqn(state_shape, action_size):
    model = Sequential([
        Flatten(input_shape=state_shape),
        Dense(24, activation='relu'),
        Dense(24, activation='relu'),
        Dense(action_size, activation='linear')
    ])
    model.compile(loss='mse', optimizer=Adam(lr=0.001))
    return model`,

        'generative': `
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, Reshape, Flatten, Conv2D, Conv2DTranspose, LeakyReLU, BatchNormalization

# Generator
def build_generator(latent_dim):
    input_layer = Input(shape=(latent_dim,))
    
    x = Dense(7*7*256)(input_layer)
    x = BatchNormalization()(x)
    x = LeakyReLU()(x)
    x = Reshape((7, 7, 256))(x)
    
    x = Conv2DTranspose(128, (5, 5), strides=(1, 1), padding='same')(x)
    x = BatchNormalization()(x)
    x = LeakyReLU()(x)
    
    x = Conv2DTranspose(64, (5, 5), strides=(2, 2), padding='same')(x)
    x = BatchNormalization()(x)
    x = LeakyReLU()(x)
    
    output_layer = Conv2DTranspose(1, (5, 5), strides=(2, 2), padding='same', activation='tanh')(x)
    
    return Model(input_layer, output_layer)`
    };
    
    return basicCode[category];
}

/**
 * Generate evaluation metrics based on category and focus areas
 */
function generateEvaluationMetrics(category, focusAreas) {
    const metrics = {
        'computer-vision': [
            "Accuracy - Proportion of correctly classified images",
            "Precision & Recall - Measure of exactness and completeness",
            "F1 Score - Harmonic mean of precision and recall",
            "IoU (Intersection over Union) - For object detection tasks",
            "mAP (mean Average Precision) - For object detection tasks"
        ],
        'nlp': [
            "Accuracy - Proportion of correctly classified texts",
            "BLEU Score - For text generation and translation tasks",
            "ROUGE Score - For summarization tasks",
            "Perplexity - For language modeling tasks",
            "F1 Score - For named entity recognition and other tasks"
        ],
        'time-series': [
            "MAE (Mean Absolute Error) - Average magnitude of errors",
            "MSE (Mean Squared Error) - Average squared differences",
            "RMSE (Root Mean Squared Error) - Square root of MSE",
            "MAPE (Mean Absolute Percentage Error) - Percentage error",
            "R² Score - Proportion of variance explained by the model"
        ],
        'reinforcement': [
            "Average Reward - Mean reward over episodes",
            "Cumulative Reward - Total reward accumulated",
            "Success Rate - Proportion of successful episodes",
            "Learning Curve - Reward improvement over time",
            "Sample Efficiency - Learning performance relative to experience"
        ],
        'generative': [
            "FID (Fréchet Inception Distance) - Quality and diversity of generated images",
            "Inception Score - Quality and diversity of generated images",
            "SSIM (Structural Similarity Index) - Similarity between images",
            "LPIPS (Learned Perceptual Image Patch Similarity) - Perceptual similarity",
            "Human Evaluation - Subjective assessment of quality"
        ]
    };
    
    // Return base metrics for the category
    return metrics[category].slice(0, 3 + (focusAreas.includes('accuracy') ? 1 : 0));
}

/**
 * Generate challenges based on project parameters
 */
function generateChallenges(options) {
    const baseChallenges = {
        'computer-vision': [
            "Data collection and annotation for training",
            "Model overfitting on limited training data",
            "Handling variations in lighting, angle, and scale"
        ],
        'nlp': [
            "Handling ambiguity in natural language",
            "Processing long-form text with context dependencies",
            "Adapting to domain-specific terminology"
        ],
        'time-series': [
            "Handling missing or irregular data points",
            "Capturing long-term dependencies",
            "Dealing with concept drift and seasonality"
        ],
        'reinforcement': [
            "Defining appropriate reward functions",
            "Balancing exploration and exploitation",
            "Handling high-dimensional state spaces"
        ],
        'generative': [
            "Training instability and mode collapse",
            "Evaluating the quality of generated outputs",
            "Controlling specific attributes of the generated content"
        ]
    };
    
    // Add resource-specific challenges
    const resourceChallenges = [];
    if (options.computePower <= 2) {
        resourceChallenges.push("Limited computational resources for training complex models");
    }
    if (options.dataAvailability <= 2) {
        resourceChallenges.push("Limited training data availability");
    }
    if (options.timeConstraint <= 2) {
        resourceChallenges.push("Tight time constraints for development and optimization");
    }
    
    // Combine base challenges with resource challenges
    return baseChallenges[options.category].concat(resourceChallenges).slice(0, 5);
}

/**
 * Generate next steps based on complexity and time constraint
 */
function generateNextSteps(complexity, timeConstraint) {
    const baseSteps = [
        "Define the project requirements and success criteria",
        "Collect and preprocess the relevant dataset",
        "Implement the model architecture",
        "Train and tune the model",
        "Evaluate the model's performance",
        "Deploy the model for inference"
    ];
    
    // Add complexity-specific steps
    if (complexity === 'intermediate' || complexity === 'advanced') {
        baseSteps.push("Implement monitoring and logging for production");
    }
    
    if (complexity === 'advanced') {
        baseSteps.push("Set up A/B testing for continuous improvement");
    }
    
    // Adjust for time constraint
    return timeConstraint <= 2 ? baseSteps.slice(0, 5) : baseSteps;
}

/**
 * Show recommended resources based on project parameters
 */
function showRecommendedResources(category, complexity, domain) {
    const resourcesContainer = document.getElementById('recommended-resources');
    resourcesContainer.innerHTML = '';
    
    // Define some sample resources
    const resources = [
        {
            title: "TensorFlow GPU Training Credits",
            description: "Accelerate your model training with GPU credits for TensorFlow workloads.",
            icon: "fas fa-bolt",
            link: "#"
        },
        {
            title: "Premium Dataset Access",
            description: "Get access to curated, high-quality datasets specific to your domain.",
            icon: "fas fa-database",
            link: "#"
        },
        {
            title: "Model Architecture Templates",
            description: "Ready-to-use code templates for advanced model architectures.",
            icon: "fas fa-code",
            link: "#"
        }
    ];
    
    // Create resource elements
    resources.slice(0, 2).forEach(resource => {
        const resourceElem = document.createElement('div');
        resourceElem.className = 'recommended-resource';
        
        resourceElem.innerHTML = `
            <div class="resource-icon"><i class="${resource.icon}"></i></div>
            <div class="resource-content">
                <h3>${resource.title}</h3>
                <p>${resource.description}</p>
                <a href="${resource.link}" class="resource-link">Learn More <i class="fas fa-external-link-alt"></i></a>
            </div>
        `;
        
        resourcesContainer.appendChild(resourceElem);
    });
}

/**
 * Load an example prompt
 */
function loadExamplePrompt(exampleId) {
    console.log(`Loading example: ${exampleId}`);
    
    // Set form fields based on example
    switch (exampleId) {
        case 'image-classification':
            document.querySelector('input[name="category"][value="computer-vision"]').checked = true;
            document.querySelector('input[name="complexity"][value="beginner"]').checked = true;
            document.getElementById('domain-select').value = 'general';
            break;
            
        case 'sentiment-analysis':
            document.querySelector('input[name="category"][value="nlp"]').checked = true;
            document.querySelector('input[name="complexity"][value="intermediate"]').checked = true;
            document.getElementById('domain-select').value = 'general';
            break;
            
        case 'rl-game-ai':
            document.querySelector('input[name="category"][value="reinforcement"]').checked = true;
            document.querySelector('input[name="complexity"][value="advanced"]').checked = true;
            document.getElementById('domain-select').value = 'entertainment';
            break;
    }
    
    // Generate the prompt
    generateProjectPrompt();
    
    // Scroll to the result
    document.querySelector('.generated-prompt').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show premium content modal
 */
function showPremiumModal(exampleId) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal premium-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>Premium Content</h2>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="premium-content">
                <i class="fas fa-crown premium-icon"></i>
                <h3>Unlock Premium Project Prompts</h3>
                <p>Gain access to our collection of advanced project prompts with detailed implementation guidance, optimization techniques, and expert tips.</p>
                <ul class="premium-features">
                    <li>Detailed architecture explanations</li>
                    <li>Performance optimization techniques</li>
                    <li>Production deployment guidance</li>
                    <li>Expert code reviews</li>
                </ul>
                <div class="premium-actions">
                    <button class="btn btn-premium upgrade-btn">Upgrade to Premium</button>
                    <button class="btn btn-secondary trial-btn">Start 7-Day Trial</button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Handle modal interactions
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
        document.body.removeChild(modal);
    });
    
    // Clicking outside the modal closes it
    overlay.addEventListener('click', function() {
        document.body.removeChild(overlay);
        document.body.removeChild(modal);
    });
    
    // Prevent clicks inside modal from closing it
    modal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Premium button actions
    const upgradeBtn = modal.querySelector('.upgrade-btn');
    const trialBtn = modal.querySelector('.trial-btn');
    
    upgradeBtn.addEventListener('click', function() {
        alert('Redirecting to premium subscription page...');
        document.body.removeChild(overlay);
        document.body.removeChild(modal);
    });
    
    trialBtn.addEventListener('click', function() {
        alert('Starting your 7-day free trial...');
        document.body.removeChild(overlay);
        document.body.removeChild(modal);
    });
}

/**
 * Copy prompt to clipboard
 */
function copyPromptToClipboard() {
    const promptContent = document.querySelector('.prompt-content').textContent;
    
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = promptContent;
    document.body.appendChild(textarea);
    
    // Select and copy the text
    textarea.select();
    document.execCommand('copy');
    
    // Remove the textarea
    document.body.removeChild(textarea);
    
    // Show confirmation
    alert('Prompt copied to clipboard!');
}

/**
 * Save prompt as a file
 */
function savePromptAsFile() {
    const promptContent = document.querySelector('.prompt-content').textContent;
    const category = document.querySelector('input[name="category"]:checked').value;
    
    // Create a blob with the content
    const blob = new Blob([promptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-project-prompt.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Share the prompt
 */
function sharePrompt() {
    // Create a modal for sharing options
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'modal share-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>Share Project Prompt</h2>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="share-options">
                <button class="share-option" data-platform="twitter">
                    <i class="fab fa-twitter"></i> Twitter
                </button>
                <button class="share-option" data-platform="linkedin">
                    <i class="fab fa-linkedin"></i> LinkedIn
                </button>
                <button class="share-option" data-platform="email">
                    <i class="fas fa-envelope"></i> Email
                </button>
                <button class="share-option" data-platform="link">
                    <i class="fas fa-link"></i> Copy Link
                </button>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Handle modal interactions
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        document.body.removeChild(overlay);
        document.body.removeChild(modal);
    });
    
    // Handle share options
    const shareOptions = modal.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
        option.addEventListener('click', function() {
            const platform = this.getAttribute('data-platform');
            handleShare(platform);
            document.body.removeChild(overlay);
            document.body.removeChild(modal);
        });
    });
}

/**
 * Handle sharing to different platforms
 */
function handleShare(platform) {
    const category = document.querySelector('input[name="category"]:checked').value;
    const complexity = document.querySelector('input[name="complexity"]:checked').value;
    const pageUrl = window.location.href;
    const shareText = `Check out this ${complexity} ${category} project prompt I created with Solve for AI!`;
    
    switch (platform) {
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`, '_blank');
            break;
        case 'linkedin':
            window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`, '_blank');
            break;
        case 'email':
            window.location.href = `mailto:?subject=${encodeURIComponent('AI Project Prompt')}&body=${encodeURIComponent(shareText + '\n\n' + pageUrl)}`;
            break;
        case 'link':
            // Create a temporary input element
            const input = document.createElement('input');
            input.value = pageUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('Link copied to clipboard!');
            break;
    }
}

// Track analytics events
function trackPromptGeneration(category, complexity, domain) {
    console.log(`Analytics: Prompt generated - Category: ${category}, Complexity: ${complexity}, Domain: ${domain}`);
    
    // In a real implementation, this would send data to an analytics service
    // For example:
    // analyticsService.trackEvent('prompt_generation', { category, complexity, domain });
}
