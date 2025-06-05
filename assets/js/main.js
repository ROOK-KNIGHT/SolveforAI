// Main JavaScript for AI/ML Tutorials Website

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const navMenu = document.querySelector('nav ul');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('show');
        });
    }
    
    // Dark mode toggle
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // Save preference to localStorage
            if (document.body.classList.contains('dark-mode')) {
                localStorage.setItem('darkMode', 'enabled');
                darkModeToggle.innerHTML = '☀️';
            } else {
                localStorage.setItem('darkMode', 'disabled');
                darkModeToggle.innerHTML = '🌙';
            }
        });
        
        // Check for saved user preference
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '☀️';
        } else {
            darkModeToggle.innerHTML = '🌙';
        }
    }
    
    // Newsletter subscription (placeholder functionality)
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const emailInput = this.querySelector('input[type="email"]');
            
            if (emailInput.value.trim() !== '') {
                // In a real application, you would send this to your server
                alert('Thanks for subscribing! You would receive a confirmation email in a real application.');
                emailInput.value = '';
            } else {
                alert('Please enter a valid email address');
            }
        });
    }
    
    // Ad display functionality (placeholder)
    initAds();
    
    // Code syntax highlighting for tutorials
    highlightCode();
});

// Placeholder for ad initialization
function initAds() {
    // In a real application, this would initialize ad networks like Google AdSense
    const adContainers = document.querySelectorAll('.ad-container');
    
    adContainers.forEach(container => {
        // Simulate ad loading
        const adType = container.classList[1] || 'generic';
        
        // For demonstration only - in real implementation, this would be replaced by actual ad code
        container.innerHTML = `
            <p>Advertisement</p>
            <div class="demo-ad ${adType}">
                <div class="ad-content">
                    <h4>Your Ad Could Be Here</h4>
                    <p>This is where a real ${adType.replace('-ad', '')} advertisement would appear.</p>
                    <button>Learn More</button>
                </div>
            </div>
        `;
    });
    
    // Add click tracking to demo ads
    document.querySelectorAll('.demo-ad button').forEach(button => {
        button.addEventListener('click', function() {
            console.log('Ad click tracked!');
            alert('In a real ad, this click would be tracked and you would be redirected to the advertiser\'s site.');
        });
    });
}

// Placeholder for code syntax highlighting
function highlightCode() {
    // In a real implementation, this would use a library like Prism.js or highlight.js
    document.querySelectorAll('pre code').forEach(block => {
        // Simple syntax highlighting simulation
        if (block.innerHTML.includes('function') || block.innerHTML.includes('def ')) {
            block.innerHTML = block.innerHTML
                .replace(/function\s+(\w+)/g, 'function <span class="function">$1</span>')
                .replace(/def\s+(\w+)/g, 'def <span class="function">$1</span>')
                .replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="string">$&</span>')
                .replace(/\b(if|else|for|while|return|import|from|as|class|try|except|finally)\b/g, '<span class="keyword">$1</span>');
        }
    });
}

// Tutorial rating system
function initRatingSystem() {
    const ratingContainers = document.querySelectorAll('.tutorial-rating');
    
    ratingContainers.forEach(container => {
        const stars = container.querySelectorAll('.star');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                // Update visual state
                for (let i = 0; i < stars.length; i++) {
                    if (i <= index) {
                        stars[i].classList.add('active');
                    } else {
                        stars[i].classList.remove('active');
                    }
                }
                
                // In a real app, send rating to server
                const tutorialId = container.dataset.tutorialId;
                const rating = index + 1;
                console.log(`Tutorial ${tutorialId} rated ${rating} stars`);
                
                // Show thank you message
                container.querySelector('.rating-message').textContent = 'Thanks for your rating!';
            });
        });
    });
}

// Initialize related tutorial carousel if it exists
function initTutorialCarousel() {
    const carousel = document.querySelector('.tutorial-carousel');
    if (!carousel) return;
    
    const prevBtn = carousel.querySelector('.carousel-prev');
    const nextBtn = carousel.querySelector('.carousel-next');
    const track = carousel.querySelector('.carousel-track');
    
    let currentIndex = 0;
    const totalItems = track.children.length;
    const itemsToShow = window.innerWidth < 768 ? 1 : 3;
    
    function updateCarousel() {
        const itemWidth = carousel.offsetWidth / itemsToShow;
        track.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentIndex = Math.max(0, currentIndex - 1);
            updateCarousel();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentIndex = Math.min(totalItems - itemsToShow, currentIndex + 1);
            updateCarousel();
        });
    }
    
    // Initialize carousel position
    updateCarousel();
    
    // Update on window resize
    window.addEventListener('resize', updateCarousel);
}

// Call additional initialization functions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initRatingSystem();
    initTutorialCarousel();
    
    // Track ad impressions (for demo purposes)
    const adContainers = document.querySelectorAll('.ad-container');
    if (adContainers.length > 0) {
        console.log(`Tracked ${adContainers.length} ad impressions`);
    }
});
