/**
 * Learning Paths JavaScript
 * 
 * Handles interactivity for the learning paths page
 */

document.addEventListener('DOMContentLoaded', function() {
    // Store initial scroll position
    let scrollPosition = 0;
    
    // Start Assessment Button
    const startAssessmentBtn = document.getElementById('start-assessment');
    if (startAssessmentBtn) {
        startAssessmentBtn.addEventListener('click', function() {
            scrollPosition = window.pageYOffset;
            showAssessmentModal();
        });
    }
    
    // Path Details Buttons
    const pathDetailsButtons = document.querySelectorAll('.path-details-btn, .start-path-btn');
    pathDetailsButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            scrollPosition = window.pageYOffset;
            const pathId = this.getAttribute('data-path');
            if (this.classList.contains('path-details-btn')) {
                showPathDetails(pathId);
            } else {
                startPath(pathId);
            }
        });
    });
    
    // Start Path Buttons
    const startPathButtons = document.querySelectorAll('.start-path-btn');
    startPathButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            scrollPosition = window.pageYOffset;
            const pathId = this.getAttribute('data-path');
            startPath(pathId);
        });
    });
    
    // Account Buttons
    const createAccountBtn = document.getElementById('create-account');
    const signInBtn = document.getElementById('sign-in');
    
    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', function() {
            scrollPosition = window.pageYOffset;
            showAccountModal('signup');
        });
    }
    
    if (signInBtn) {
        signInBtn.addEventListener('click', function() {
            scrollPosition = window.pageYOffset;
            showAccountModal('signin');
        });
    }

    // Function to show modal and prevent page scroll
    function showModal(modal, overlay) {
        scrollPosition = window.pageYOffset;
        document.body.classList.add('modal-open');
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        
        // Append to main content instead of body
        const mainContent = document.querySelector('.site-content');
        if (mainContent) {
            mainContent.appendChild(overlay);
            mainContent.appendChild(modal);
        } else {
            document.body.appendChild(overlay);
            document.body.appendChild(modal);
        }
    }

    // Function to close modal and restore scroll position
    function closeModal(modal, overlay) {
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
        
        // Remove from parent element
        modal.parentElement.removeChild(modal);
        overlay.parentElement.removeChild(overlay);
    }

    window.showModal = showModal;
    window.closeModal = closeModal;
});

/**
 * Show the skill assessment modal
 */
function showAssessmentModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal assessment-modal';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>AI Learning Path Assessment</h2>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="assessment-intro active" id="assessment-intro">
                <p>This quick assessment will help us recommend the best learning path for your skills and goals.</p>
                <p>You'll answer a few questions about your:</p>
                <ul>
                    <li>Current AI/ML knowledge</li>
                    <li>Programming experience</li>
                    <li>Learning goals</li>
                    <li>Available time commitment</li>
                </ul>
                <p>It takes about 2 minutes to complete.</p>
                <button class="btn btn-primary" id="start-questions">Begin Assessment</button>
            </div>
            
            <div class="assessment-question" id="question-1">
                <h3>Question 1 of 5</h3>
                <div class="progress-bar">
                    <div class="progress" style="width: 20%"></div>
                </div>
                <p class="question-text">What's your level of experience with AI and Machine Learning?</p>
                <div class="question-options">
                    <label class="option">
                        <input type="radio" name="experience" value="beginner">
                        <span>Complete beginner - I'm just starting to learn</span>
                    </label>
                    <label class="option">
                        <input type="radio" name="experience" value="some-concepts">
                        <span>Familiar with concepts - I understand the basics but haven't built much</span>
                    </label>
                    <label class="option">
                        <input type="radio" name="experience" value="some-projects">
                        <span>Some projects - I've built a few basic ML models</span>
                    </label>
                    <label class="option">
                        <input type="radio" name="experience" value="experienced">
                        <span>Experienced - I've worked on multiple AI/ML projects</span>
                    </label>
                </div>
                <div class="question-actions">
                    <button class="btn btn-secondary prev-question" disabled>Previous</button>
                    <button class="btn btn-primary next-question" data-next="2">Next</button>
                </div>
            </div>
            
            <!-- Additional questions would be added here in a real implementation -->
            
            <div class="assessment-result" id="assessment-result">
                <h3>Your Recommended Path</h3>
                <div class="recommendation-card">
                    <div class="path-icon"><i class="fas fa-brain"></i></div>
                    <div class="recommendation-content">
                        <h4>Machine Learning Fundamentals</h4>
                        <p>Based on your responses, we recommend starting with our Machine Learning Fundamentals path to build a solid foundation.</p>
                        <p>This path will teach you:</p>
                        <ul>
                            <li>Core ML algorithms and when to use them</li>
                            <li>Data preprocessing techniques</li>
                            <li>Model evaluation and validation</li>
                            <li>Practical implementation in Python</li>
                        </ul>
                        <div class="recommendation-actions">
                            <button class="btn btn-primary" id="accept-recommendation">Start This Path</button>
                            <button class="btn btn-secondary" id="view-all-paths">View All Paths</button>
                        </div>
                    </div>
                </div>
                
                <!-- Ad slot integrated naturally as a "supplementary resource" -->
                <div class="supplementary-resource sponsored">
                    <span class="sponsored-tag">Sponsored</span>
                    <h4>Recommended Resource</h4>
                    <p>Get the "Machine Learning Fundamentals" eBook to complement your learning path</p>
                    <a href="#" class="resource-link">Learn More <i class="fas fa-external-link-alt"></i></a>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page using showModal helper
    window.showModal(modal, overlay);
    
    // Handle modal interactions
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    // Clicking outside the modal closes it
    overlay.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    // Prevent clicks inside modal from closing it
    modal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Handle assessment flow
    const startQuestionsBtn = document.getElementById('start-questions');
    const introSection = document.getElementById('assessment-intro');
    const question1 = document.getElementById('question-1');
    const resultSection = document.getElementById('assessment-result');
    
    if (startQuestionsBtn) {
        startQuestionsBtn.addEventListener('click', function() {
            introSection.classList.remove('active');
            question1.classList.add('active');
        });
    }
    
    // Next question button
    const nextBtn = modal.querySelector('.next-question');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            // In a real implementation, we would navigate through questions
            // For this demo, we'll just show the result
            question1.classList.remove('active');
            resultSection.classList.add('active');
            
            // This is where we would track an ad impression
            logAdImpression('assessment-result-ad');
        });
    }
    
    // Accept recommendation button
    const acceptBtn = document.getElementById('accept-recommendation');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            // Close the modal
            window.closeModal(modal, overlay);
            
            // Start the recommended path
            startPath('ml-fundamentals');
        });
    }
    
    // View all paths button
    const viewAllBtn = document.getElementById('view-all-paths');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function() {
            window.closeModal(modal, overlay);
            
            // Scroll to paths section
            const pathsSection = document.querySelector('.learning-paths-list');
            if (pathsSection) {
                pathsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
}

/**
 * Show detailed information about a learning path
 * @param {string} pathId - The path identifier
 */
function showPathDetails(pathId) {
    // Path data would typically come from an API or database
    const pathData = {
        'ml-fundamentals': {
            title: 'Machine Learning Fundamentals',
            description: 'A comprehensive introduction to machine learning concepts, algorithms, and practical applications.',
            modules: [
                { title: 'Introduction to Machine Learning', duration: '45 min' },
                { title: 'Data Preprocessing', duration: '1 hour' },
                { title: 'Supervised Learning: Regression', duration: '1.5 hours' },
                { title: 'Supervised Learning: Classification', duration: '2 hours' },
                { title: 'Model Evaluation and Validation', duration: '1 hour' },
                { title: 'Feature Engineering', duration: '1.5 hours' },
                { title: 'Unsupervised Learning', duration: '1.5 hours' },
                { title: 'Ensemble Methods', duration: '1 hour' },
                { title: 'Introduction to Neural Networks', duration: '2 hours' },
                { title: 'ML Project: Predictive Analytics', duration: '3 hours' },
                { title: 'Deploying ML Models', duration: '1 hour' },
                { title: 'Career Paths in Machine Learning', duration: '30 min' }
            ],
            prerequisites: ['Basic Python programming', 'Fundamental statistics knowledge', 'Linear algebra basics'],
            outcomes: ['Build and evaluate ML models', 'Select appropriate algorithms for different problems', 'Preprocess and transform data effectively', 'Deploy models for practical applications']
        },
        'deep-learning': {
            title: 'Deep Learning Specialist',
            description: 'Master deep neural networks and advanced architectures to solve complex AI problems.',
            modules: [
                { title: 'Neural Networks Fundamentals', duration: '2 hours' },
                { title: 'Backpropagation & Optimization', duration: '1.5 hours' },
                { title: 'Convolutional Neural Networks', duration: '3 hours' },
                { title: 'Image Recognition & Classification', duration: '2 hours' },
                { title: 'Recurrent Neural Networks', duration: '2 hours' },
                { title: 'Sequence Modeling', duration: '1.5 hours' },
                { title: 'Attention Mechanisms', duration: '1 hour' },
                { title: 'Transformer Architectures', duration: '2.5 hours' },
                { title: 'Generative Adversarial Networks', duration: '2 hours' },
                { title: 'Variational Autoencoders', duration: '1.5 hours' },
                { title: 'Deep Reinforcement Learning', duration: '2 hours' },
                { title: 'Model Optimization & Deployment', duration: '1.5 hours' },
                { title: 'Project: Image Generation', duration: '3 hours' },
                { title: 'Project: Natural Language Processing', duration: '3 hours' },
                { title: 'Advanced Topics & Research Frontiers', duration: '1 hour' }
            ],
            prerequisites: ['Machine Learning Fundamentals', 'Intermediate Python programming', 'Experience with TensorFlow or PyTorch'],
            outcomes: ['Design and implement complex neural networks', 'Apply CNNs for computer vision tasks', 'Build sequence models with RNNs and Transformers', 'Create generative models for content creation']
        },
        'nlp-expert': {
            title: 'Natural Language Processing Expert',
            description: 'Learn advanced techniques for understanding, generating, and working with human language data.',
            modules: [
                { title: 'NLP Fundamentals', duration: '1.5 hours' },
                { title: 'Text Preprocessing Techniques', duration: '1 hour' },
                { title: 'Language Modeling', duration: '2 hours' },
                { title: 'Word Embeddings', duration: '1.5 hours' },
                { title: 'Recurrent Networks for NLP', duration: '2 hours' },
                { title: 'Transformer Architecture', duration: '2.5 hours' },
                { title: 'BERT & Contextual Embeddings', duration: '2 hours' },
                { title: 'Transfer Learning in NLP', duration: '1.5 hours' },
                { title: 'Named Entity Recognition', duration: '1 hour' },
                { title: 'Sentiment Analysis', duration: '1.5 hours' },
                { title: 'Text Generation', duration: '2 hours' },
                { title: 'Question Answering Systems', duration: '2 hours' },
                { title: 'Machine Translation', duration: '2 hours' },
                { title: 'Chatbot Development', duration: '3 hours' },
                { title: 'Model Deployment for NLP', duration: '1.5 hours' },
                { title: 'Project: Multilingual Sentiment Analyzer', duration: '3 hours' },
                { title: 'Project: Advanced Conversation Agent', duration: '3 hours' },
                { title: 'NLP Ethics & Bias Mitigation', duration: '1 hour' }
            ],
            prerequisites: ['Deep Learning Specialist path or equivalent', 'Advanced Python programming', 'Experience with NLP libraries'],
            outcomes: ['Build state-of-the-art NLP systems', 'Implement transformer-based language models', 'Create chatbots and conversational agents', 'Deploy production-ready NLP applications']
        }
    };
    
    const path = pathData[pathId];
    if (!path) return;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal path-details-modal';
    
    // Generate module list HTML
    let modulesHtml = '<ul class="modules-list">';
    path.modules.forEach((module, index) => {
        modulesHtml += `
            <li class="module-item">
                <span class="module-number">${index + 1}</span>
                <div class="module-info">
                    <h4>${module.title}</h4>
                    <span class="module-duration"><i class="far fa-clock"></i> ${module.duration}</span>
                </div>
            </li>
        `;
    });
    modulesHtml += '</ul>';
    
    // Generate prerequisites HTML
    let prerequisitesHtml = '<ul class="prerequisites-list">';
    path.prerequisites.forEach(prerequisite => {
        prerequisitesHtml += `<li>${prerequisite}</li>`;
    });
    prerequisitesHtml += '</ul>';
    
    // Generate outcomes HTML
    let outcomesHtml = '<ul class="outcomes-list">';
    path.outcomes.forEach(outcome => {
        outcomesHtml += `<li>${outcome}</li>`;
    });
    outcomesHtml += '</ul>';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${path.title}</h2>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="path-details-content">
                <p class="path-description">${path.description}</p>
                
                <div class="path-details-section">
                    <h3>What You'll Learn</h3>
                    <div class="module-count"><span>${path.modules.length}</span> Modules</div>
                    ${modulesHtml}
                </div>
                
                <div class="path-details-section">
                    <h3>Prerequisites</h3>
                    ${prerequisitesHtml}
                </div>
                
                <div class="path-details-section">
                    <h3>Learning Outcomes</h3>
                    ${outcomesHtml}
                </div>
                
                <!-- Strategically placed ad as "Learning Resources" -->
                <div class="path-details-section sponsored-section">
                    <h3>Recommended Resources <span class="sponsored-tag">Sponsored</span></h3>
                    <div class="resources-for-path">
                        <div class="resource-item">
                            <div class="resource-icon"><i class="fas fa-book"></i></div>
                            <div class="resource-info">
                                <h4>Premium ${path.title} Course Bundle</h4>
                                <p>Get additional exercises, projects, and certification preparation.</p>
                                <a href="#" class="resource-link">View Offer <i class="fas fa-external-link-alt"></i></a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-primary start-path-btn" data-path="${pathId}">Start This Path</button>
                <button class="btn btn-secondary close-modal-btn">Maybe Later</button>
            </div>
        </div>
    `;
    
    // Add modal to page using showModal helper
    window.showModal(modal, overlay);
    
    // Handle modal interactions
    const closeBtn = modal.querySelector('.modal-close');
    const closeBtnSecondary = modal.querySelector('.close-modal-btn');
    const startBtn = modal.querySelector('.start-path-btn');
    
    closeBtn.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    if (closeBtnSecondary) {
        closeBtnSecondary.addEventListener('click', function() {
            window.closeModal(modal, overlay);
        });
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            window.closeModal(modal, overlay);
            startPath(pathId);
        });
    }
    
    // Clicking outside the modal closes it
    overlay.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    // Prevent clicks inside modal from closing it
    modal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Track ad impression
    logAdImpression('path-details-resource-ad');
}

/**
 * Start a learning path
 * @param {string} pathId - The path identifier
 */
function startPath(pathId) {
    // In a real implementation, this would create a user session or redirect to the first module
    // For this demo, we'll show an account prompt if no user is logged in
    
    // Check if user is logged in (demo: always false)
    const isLoggedIn = false;
    
    if (!isLoggedIn) {
        showAccountModal('signup', { redirectPath: pathId });
        return;
    }
    
    // If logged in, would redirect to first module
    console.log(`Starting path: ${pathId}`);
}

/**
 * Show account modal for sign up or sign in
 * @param {string} type - 'signup' or 'signin'
 * @param {object} options - Additional options
 */
function showAccountModal(type = 'signup', options = {}) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal account-modal';
    
    const title = type === 'signup' ? 'Create Your Account' : 'Sign In';
    const buttonText = type === 'signup' ? 'Create Account' : 'Sign In';
    const alternateText = type === 'signup' ? 'Already have an account?' : 'Need an account?';
    const alternateAction = type === 'signup' ? 'signin' : 'signup';
    const alternateLink = type === 'signup' ? 'Sign In' : 'Sign Up';
    
    modal.innerHTML = `
        <div class="modal-header">
            <h2>${title}</h2>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="account-form">
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" placeholder="Your email address">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" placeholder="Your password">
                </div>
                ${type === 'signup' ? `
                <div class="form-group">
                    <label for="confirm-password">Confirm Password</label>
                    <input type="password" id="confirm-password" placeholder="Confirm your password">
                </div>
                ` : ''}
                <div class="form-actions">
                    <button class="btn btn-primary account-submit-btn">${buttonText}</button>
                </div>
                <div class="account-alternate">
                    <p>${alternateText} <a href="#" class="account-switch-link" data-type="${alternateAction}">${alternateLink}</a></p>
                </div>
            </div>
            
            <!-- Social sign-in options -->
            <div class="social-sign-in">
                <p>Or continue with</p>
                <div class="social-buttons">
                    <button class="social-btn google-btn"><i class="fab fa-google"></i> Google</button>
                    <button class="social-btn github-btn"><i class="fab fa-github"></i> GitHub</button>
                </div>
            </div>
            
            <!-- Ad placement as 'premium account benefits' -->
            <div class="account-benefits sponsored">
                <h3>Premium Account Benefits <span class="sponsored-tag">Sponsored</span></h3>
                <ul class="benefits-list">
                    <li><i class="fas fa-check"></i> Access to exclusive AI workshops</li>
                    <li><i class="fas fa-check"></i> Project code reviews by industry experts</li>
                    <li><i class="fas fa-check"></i> Premium certificate of completion</li>
                </ul>
                <a href="#" class="learn-more-link">Learn More <i class="fas fa-external-link-alt"></i></a>
            </div>
        </div>
    `;
    
    // Add modal to page using showModal helper
    window.showModal(modal, overlay);
    
    // Handle modal interactions
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    // Account submit button
    const submitBtn = modal.querySelector('.account-submit-btn');
    submitBtn.addEventListener('click', function() {
        // Simulate successful account creation/login
        window.closeModal(modal, overlay);
        
        // If we had a path to redirect to
        if (options.redirectPath) {
            simulatePathStart(options.redirectPath);
        }
        
        // Show success message
        showNotification(`Successfully ${type === 'signup' ? 'created account' : 'signed in'}!`);
    });
    
    // Switch between signup/signin
    const switchLink = modal.querySelector('.account-switch-link');
    if (switchLink) {
        switchLink.addEventListener('click', function(e) {
            e.preventDefault();
            const newType = this.getAttribute('data-type');
            window.closeModal(modal, overlay);
            showAccountModal(newType, options);
        });
    }
    
    // Clicking outside the modal closes it
    overlay.addEventListener('click', function() {
        window.closeModal(modal, overlay);
    });
    
    // Prevent clicks inside modal from closing it
    modal.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Track ad impression
    logAdImpression('account-benefits-ad');
}

/**
 * Simulate starting a learning path
 * @param {string} pathId - The path identifier
 */
function simulatePathStart(pathId) {
    // Find the path card
    const pathCard = document.querySelector(`.path-card .path-details-btn[data-path="${pathId}"]`).closest('.path-card');
    
    if (pathCard) {
        // Update progress
        const progressBar = pathCard.querySelector('.progress');
        const progressText = pathCard.querySelector('.progress-text');
        
        if (progressBar && progressText) {
            // Animate progress to 5%
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 5) {
                    clearInterval(interval);
                } else {
                    width++;
                    progressBar.style.width = width + '%';
                }
            }, 20);
            
            progressText.textContent = 'Just started';
        }
        
        // Update button text
        const startBtn = pathCard.querySelector('.start-path-btn');
        if (startBtn) {
            startBtn.textContent = 'Continue Path';
        }
    }
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/**
 * Log ad impression for analytics
 * @param {string} adId - Identifier for the ad placement
 */
function logAdImpression(adId) {
    // In a real implementation, this would send data to an analytics service
    console.log(`Ad impression logged: ${adId} at ${new Date().toISOString()}`);
    
    // Additional ad-related analytics could be implemented here
}
