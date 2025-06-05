document.addEventListener('DOMContentLoaded', function() {
    // Toggle interactive elements
    const toggleButtons = document.querySelectorAll('.btn-toggle-interactive');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement.style.display === 'none' || !targetElement.style.display) {
                targetElement.style.display = 'block';
                this.innerHTML = '<i class="fas fa-times-circle"></i> Close Interactive';
            } else {
                targetElement.style.display = 'none';
                this.innerHTML = '<i class="fas fa-play-circle"></i> Interactive Visualization';
            }
        });
    });
    
    // Concept search functionality
    const conceptSearch = document.getElementById('concept-search');
    const categorySelect = document.getElementById('category-select');
    const searchButton = document.getElementById('search-concepts');
    
    if (searchButton) {
        searchButton.addEventListener('click', function() {
            const searchTerm = conceptSearch.value.toLowerCase();
            const selectedCategory = categorySelect.value;
            
            // In a real implementation, this would filter and highlight matching concepts
            // For now, we'll just scroll to the selected category section if no search term
            if (!searchTerm && selectedCategory !== 'all') {
                const sectionId = `${selectedCategory}-section`;
                const section = document.getElementById(sectionId);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            } else if (searchTerm) {
                // Simple search implementation
                const metaphorCards = document.querySelectorAll('.metaphor-card');
                let found = false;
                
                metaphorCards.forEach(card => {
                    const cardText = card.textContent.toLowerCase();
                    const cardCategory = card.closest('.metaphor-section').id;
                    
                    const categoryMatch = selectedCategory === 'all' || cardCategory.includes(selectedCategory);
                    
                    if (cardText.includes(searchTerm) && categoryMatch) {
                        card.style.border = '2px solid var(--primary-color)';
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        found = true;
                    } else {
                        card.style.border = '';
                    }
                });
                
                if (!found) {
                    alert('No matching concepts found. Try a different search term or category.');
                }
            }
        });
    }
    
    // Category navigation
    const categoryLinks = document.querySelectorAll('.category-link');
    categoryLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Modal functionality for metaphor submission
    const submitButton = document.getElementById('submit-metaphor');
    const metaphorModal = document.getElementById('metaphor-modal');
    const closeModal = document.querySelector('.close-modal');
    
    if (submitButton && metaphorModal) {
        submitButton.addEventListener('click', function() {
            metaphorModal.style.display = 'block';
        });
        
        closeModal.addEventListener('click', function() {
            metaphorModal.style.display = 'none';
        });
        
        window.addEventListener('click', function(e) {
            if (e.target === metaphorModal) {
                metaphorModal.style.display = 'none';
            }
        });
    }
    
    // Handle form submission
    const metaphorForm = document.getElementById('metaphor-form');
    if (metaphorForm) {
        metaphorForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real implementation, this would send the form data to a server
            alert('Thank you for your submission! Our team will review your metaphor.');
            metaphorModal.style.display = 'none';
            metaphorForm.reset();
        });
    }
    
    // Interactive neuron demonstration
    setupNeuronDemo();
    
    // CNN filter visualization
    setupCNNDemo();
});

function setupNeuronDemo() {
    const input1 = document.getElementById('input1');
    const weight1 = document.getElementById('weight1');
    const outputValue = document.querySelector('.output-value');
    
    // Update output when sliders change
    function updateNeuronOutput() {
        if (!input1 || !weight1 || !outputValue) return;
        
        const inputVal = parseFloat(input1.value);
        const weightVal = parseFloat(weight1.value);
        
        // Simple sigmoid activation function
        const output = 1 / (1 + Math.exp(-(inputVal * weightVal)));
        outputValue.textContent = output.toFixed(2);
    }
    
    // Update slider value displays
    function updateSliderValue(slider) {
        if (!slider) return;
        const valueDisplay = slider.nextElementSibling;
        if (valueDisplay) {
            valueDisplay.textContent = slider.value;
        }
    }
    
    // Add event listeners to sliders
    if (input1) {
        input1.addEventListener('input', function() {
            updateSliderValue(this);
            updateNeuronOutput();
        });
    }
    
    if (weight1) {
        weight1.addEventListener('input', function() {
            updateSliderValue(this);
            updateNeuronOutput();
        });
    }
    
    // Initialize
    updateNeuronOutput();
}

function setupCNNDemo() {
    const filterSelect = document.getElementById('filter-select');
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            // In a real implementation, this would update the filtered image
            console.log('Filter changed to:', this.value);
            // The image would update based on the selected filter
        });
    }
}

// Premium content handling
document.querySelectorAll('.btn-premium').forEach(button => {
    button.addEventListener('click', function() {
        alert('Premium Content: To access this content, please sign up for our premium membership.');
    });
});
