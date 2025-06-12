// Module Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize quiz handlers
    initializeQuizzes();
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize progress tracking
    trackProgress();
});

// Quiz Functionality
function initializeQuizzes() {
    const quizForms = document.querySelectorAll('.quiz-question form');
    
    quizForms.forEach((form, index) => {
        const options = form.querySelectorAll('input[type="radio"]');
        
        options.forEach(option => {
            option.addEventListener('change', function() {
                // Get all labels in this form
                const labels = form.querySelectorAll('label');
                
                // Reset all labels
                labels.forEach(label => {
                    label.classList.remove('correct', 'incorrect');
                });
                
                // Get the selected label
                const selectedLabel = this.closest('label');
                
                // Check if answer is correct (correct answer stored in moduleData)
                const conceptIndex = Math.floor(index / 2); // Each concept has 2 questions
                const questionIndex = index % 2;
                const correctAnswer = moduleData.concepts[conceptIndex].quiz.correct;
                
                if (this.value === correctAnswer) {
                    selectedLabel.classList.add('correct');
                    showFeedback('Correct!', true);
                } else {
                    selectedLabel.classList.add('incorrect');
                    showFeedback('Try again', false);
                }
                
                // Update progress
                updateProgress();
            });
        });
    });
}

// Navigation
function initializeNavigation() {
    const prevButton = document.querySelector('.prev-module');
    const nextButton = document.querySelector('.next-module');
    const saveButton = document.querySelector('.save-progress');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            const prevModule = prevButton.getAttribute('data-module');
            navigateToModule(prevModule);
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            const nextModule = nextButton.getAttribute('data-module');
            navigateToModule(nextModule);
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', saveProgress);
    }
}

// Progress Tracking
function trackProgress() {
    // Update progress bar based on completed concepts
    const completedConcepts = document.querySelectorAll('.concept-section.completed').length;
    const totalConcepts = document.querySelectorAll('.concept-section').length;
    const progress = (completedConcepts / totalConcepts) * 100;
    
    updateProgressBar(progress);
}

function updateProgressBar(percentage) {
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

// Navigation Helper
function navigateToModule(moduleId) {
    // Save current progress before navigation
    saveProgress();
    
    // Navigate to new module
    window.location.href = `/learning-paths/${moduleData.path}/modules/${moduleId}`;
}

// Progress Saving
function saveProgress() {
    const progress = {
        moduleId: moduleData.id,
        path: moduleData.path,
        completedConcepts: getCompletedConcepts(),
        quizAnswers: getQuizAnswers(),
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage for now (could be replaced with API call)
    localStorage.setItem(`module_progress_${moduleData.id}`, JSON.stringify(progress));
    
    showFeedback('Progress saved!', true);
}

// Helper Functions
function getCompletedConcepts() {
    return Array.from(document.querySelectorAll('.concept-section'))
        .map((section, index) => ({
            index,
            completed: section.classList.contains('completed')
        }));
}

function getQuizAnswers() {
    return Array.from(document.querySelectorAll('.quiz-question form'))
        .map((form, index) => ({
            questionIndex: index,
            selectedAnswer: form.querySelector('input:checked')?.value || null
        }));
}

function showFeedback(message, isSuccess) {
    const feedback = document.createElement('div');
    feedback.className = `feedback ${isSuccess ? 'success' : 'error'}`;
    feedback.textContent = message;
    
    document.body.appendChild(feedback);
    
    // Animate in
    setTimeout(() => feedback.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        feedback.classList.remove('show');
        setTimeout(() => document.body.removeChild(feedback), 300);
    }, 2000);
}

// Add some CSS for feedback messages
const style = document.createElement('style');
style.textContent = `
    .feedback {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        transform: translateY(100px);
        opacity: 0;
        transition: transform 0.3s, opacity 0.3s;
    }
    
    .feedback.show {
        transform: translateY(0);
        opacity: 1;
    }
    
    .feedback.success {
        background-color: #2ecc71;
    }
    
    .feedback.error {
        background-color: #e74c3c;
    }
    
    .quiz-question label.correct {
        background-color: #d4edda;
        border-color: #c3e6cb;
        color: #155724;
    }
    
    .quiz-question label.incorrect {
        background-color: #f8d7da;
        border-color: #f5c6cb;
        color: #721c24;
    }
`;

document.head.appendChild(style);
