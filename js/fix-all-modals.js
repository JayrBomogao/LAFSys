/**
 * Universal Modal Fix Script
 * 
 * This script ensures all modals work properly by using multiple approaches:
 * 1. Direct onclick attributes on buttons
 * 2. JavaScript onclick property assignments
 * 3. Standard addEventListener calls
 * 4. Global window functions for easy access
 * 
 * It also handles modal closing via:
 * 1. Close buttons
 * 2. Clicking outside the modal
 * 3. ESC key press
 */

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Modal fix script loaded');
    
    // Find all modals on the page
    const modals = document.querySelectorAll('.modal');
    console.log(`Found ${modals.length} modals`);
    
    // Setup close buttons for all modals
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(function(btn) {
        // Direct property assignment
        btn.onclick = function() {
            const modal = this.closest('.modal');
            if (modal) {
                console.log(`Closing modal: ${modal.id}`);
                modal.style.display = 'none';
            }
        };
        
        // Also add event listener
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Close when clicking outside modal
    window.addEventListener('click', function(event) {
        modals.forEach(function(modal) {
            if (event.target === modal) {
                console.log(`Closing modal by outside click: ${modal.id}`);
                modal.style.display = 'none';
            }
        });
    });
    
    // Close on ESC key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            modals.forEach(function(modal) {
                if (modal.style.display === 'block') {
                    console.log(`Closing modal by ESC key: ${modal.id}`);
                    modal.style.display = 'none';
                }
            });
        }
    });
    
    // Specific handlers for common buttons
    
    // Claim buttons
    const claimButtons = document.querySelectorAll('[id^="claim-btn"]');
    claimButtons.forEach(function(btn) {
        btn.onclick = function() {
            const modal = document.getElementById('claim-modal');
            if (modal) {
                console.log('Opening claim modal');
                modal.style.display = 'block';
            }
        };
    });
    
    // Contact/Chat buttons
    const contactButtons = document.querySelectorAll('[id^="contact-btn"]');
    contactButtons.forEach(function(btn) {
        btn.onclick = function() {
            const modal = document.getElementById('contact-modal');
            if (modal) {
                console.log('Opening contact modal');
                modal.style.display = 'block';
                
                // Focus chat input if exists
                setTimeout(function() {
                    const chatInput = document.getElementById('chat-input');
                    if (chatInput) chatInput.focus();
                }, 300);
            }
        };
    });
    
    // Global modal functions
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log(`Opening modal: ${modalId}`);
            modal.style.display = 'block';
            return true;
        }
        console.error(`Modal not found: ${modalId}`);
        return false;
    };
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log(`Closing modal: ${modalId}`);
            modal.style.display = 'none';
            return true;
        }
        return false;
    };
    
    // Specific functions for common modals
    window.showClaimModal = function() {
        return window.openModal('claim-modal');
    };
    
    window.showContactModal = function() {
        const result = window.openModal('contact-modal');
        if (result) {
            setTimeout(function() {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }, 300);
        }
        return result;
    };
    
    console.log('Modal fix script setup complete');
});
