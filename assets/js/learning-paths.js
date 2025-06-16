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
    const pathDetailsButtons = document.querySelectorAll('.path-details-btn');
    pathDetailsButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            scrollPosition = window.pageYOffset;
            const pathId = this.getAttribute('data-path');
            showPathDetails(pathId);
        });
    });
    
    // Start Path Buttons
    const startPathButtons = document.querySelectorAll('.start-path-btn');
    startPathButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            scrollPosition = window.pageYOffset;
            const pathId = this.getAttribute('data-path');
            showPathContent(pathId);
        });
    });

    // Scroll to paths section if URL has #popular-paths
    if (window.location.hash === '#popular-paths') {
        const pathsSection = document.querySelector('#popular-paths');
        if (pathsSection) {
            pathsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Browse Learning Paths button
    const browsePaths = document.querySelector('a[href="#popular-paths"]');
    if (browsePaths) {
        browsePaths.addEventListener('click', function(e) {
            e.preventDefault();
            const pathsSection = document.querySelector('#popular-paths');
            if (pathsSection) {
                pathsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Function to show modal and prevent page scroll
    function showModal(modal, overlay) {
        scrollPosition = window.pageYOffset;
        document.body.classList.add('modal-open');
        document.body.style.top = `-${scrollPosition}px`;
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        
        // Append to modal root
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) {
            modalRoot.appendChild(overlay);
            modalRoot.appendChild(modal);
        }
    }

    // Function to close modal and restore scroll position
    function closeModal(modal, overlay) {
        document.body.classList.remove('modal-open');
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPosition);
        
        // Remove from modal root
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) {
            modalRoot.removeChild(modal);
            modalRoot.removeChild(overlay);
        }
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
        });
    }
    
    // Accept recommendation button
    const acceptBtn = document.getElementById('accept-recommendation');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function() {
            // Close the modal
            window.closeModal(modal, overlay);
            
            // Start the recommended path
            showPathContent('ml-fundamentals');
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
                { title: 'Model Evaluation and Validation', duration: '1 hour' }
            ]
        },
        'deep-learning': {
            title: 'Deep Learning Specialist',
            description: 'Master deep neural networks and advanced architectures to solve complex AI problems.',
            modules: [
                { title: 'Neural Networks Fundamentals', duration: '2 hours' },
                { title: 'Backpropagation & Optimization', duration: '1.5 hours' },
                { title: 'Convolutional Neural Networks', duration: '3 hours' },
                { title: 'Image Recognition & Classification', duration: '2 hours' },
                { title: 'Recurrent Neural Networks', duration: '2 hours' }
            ]
        },
        'nlp-expert': {
            title: 'Natural Language Processing Expert',
            description: 'Learn advanced techniques for understanding, generating, and working with human language data.',
            modules: [
                { title: 'NLP Fundamentals', duration: '1.5 hours' },
                { title: 'Text Preprocessing Techniques', duration: '1 hour' },
                { title: 'Language Modeling', duration: '2 hours' },
                { title: 'Word Embeddings', duration: '1.5 hours' },
                { title: 'Recurrent Networks for NLP', duration: '2 hours' }
            ]
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
            showPathContent(pathId);
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
}

/**
 * Show learning path content
 * @param {string} pathId - The path identifier
 */
function showPathContent(pathId) {
    // Map path IDs to their module directories
    const pathDirectories = {
        'ml-fundamentals': 'ml-fundamentals',
        'deep-learning': 'deep-learning-specialist',
        'nlp-expert': 'nlp-expert'
    };

    // Get the correct directory for this path
    const moduleDir = pathDirectories[pathId];
    if (!moduleDir) {
        showNotification('Error: Path not found');
        return;
    }

    // Fetch the module content
    fetch(`/content-engine/output/${moduleDir}/module-1.html`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Module content not found');
            }
            return response.text();
        })
        .then(html => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            
            // Create modal content
            const modal = document.createElement('div');
            modal.className = 'modal path-content-modal';
            
            // Parse the HTML content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the main content
            const mainContent = doc.querySelector('main').innerHTML;
            
            // Add the content to our modal
            modal.innerHTML = `
                <div class="modal-header">
                    <h2>${doc.querySelector('h1').textContent}</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${mainContent}
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

            // Initialize code highlighting
            if (window.hljs) {
                modal.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightBlock(block);
                });
            }
        })
        .catch(error => {
            console.error('Error loading module:', error);
            showNotification('Error loading module content');
        });
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
