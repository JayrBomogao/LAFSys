/**
 * Force Modal Display
 * This script adds a direct method to show modals that bypasses any potential issues
 */

console.log('Force modal display script loaded');

// Add a direct method to show modals
window.forceShowModal = function(modalId) {
    console.log('Force showing modal:', modalId);
    
    // Get the modal element
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('Modal not found:', modalId);
        return false;
    }
    
    // Force display block with !important styling
    modal.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 9999 !important;');
    
    // Also force the content to be visible
    const content = modal.querySelector('.modal-content');
    if (content) {
        content.setAttribute('style', 'visibility: visible !important; opacity: 1 !important; z-index: 10000 !important;');
    }
    
    console.log('Modal display forced for', modalId);
    return true;
};

// Add direct button handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Setting up direct modal button handlers');
    
    // Find claim button and add direct handler
    const claimBtn = document.getElementById('claim-btn');
    if (claimBtn) {
        claimBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Direct claim button click');
            window.forceShowModal('claim-modal');
        });
        console.log('Added direct handler to claim button');
    }
    
    // Find contact button and add direct handler
    const contactBtn = document.getElementById('contact-btn');
    if (contactBtn) {
        contactBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Direct contact button click');
            window.forceShowModal('contact-modal');
        });
        console.log('Added direct handler to contact button');
    }
});

// Also run this when the page is fully loaded as a backup
window.addEventListener('load', function() {
    // Direct button overrides
    document.querySelectorAll('button, a').forEach(function(btn) {
        const id = btn.id;
        if (id === 'claim-btn') {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.forceShowModal('claim-modal');
                return false;
            };
        } else if (id === 'contact-btn') {
            btn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.forceShowModal('contact-modal');
                return false;
            };
        }
    });
    
    console.log('Force modal button handlers ready');
});
