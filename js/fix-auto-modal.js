/**
 * Fix for automatic modal popup
 * This script prevents claim modal from automatically showing when page loads
 */

console.log('Fix for auto-modal popup loaded');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Applying fix for automatic modal popup');
    
    // Function to prevent automatic modal display
    function preventAutoModal() {
        console.log('Preventing automatic modal display');
        
        // Get the claim modal
        const claimModal = document.getElementById('claim-modal');
        if (!claimModal) {
            console.warn('Claim modal not found');
            return;
        }
        
        // Ensure the modal is hidden
        claimModal.style.display = 'none';
        
        // Prevent automatic display by overriding methods that might show it
        const originalForceShowModal = window.forceShowModal;
        if (originalForceShowModal) {
            window.forceShowModal = function(modalId) {
                // Only allow explicit button clicks to show modals
                if (window.lastUserAction === 'buttonClick') {
                    console.log('Allowing modal show from button click');
                    return originalForceShowModal(modalId);
                } else {
                    console.log('Blocking automatic modal display');
                    return false;
                }
            };
        }
        
        // Track user actions to distinguish between automatic and user-initiated events
        window.lastUserAction = '';
        
        // Replace onclick handler for the claim button
        const claimBtn = document.getElementById('claim-btn');
        if (claimBtn) {
            claimBtn.onclick = function(e) {
                e.preventDefault();
                window.lastUserAction = 'buttonClick';
                console.log('Claim button clicked (user action)');
                document.getElementById('claim-modal').style.display = 'block';
                setTimeout(() => { window.lastUserAction = ''; }, 100);
            };
        }
    }
    
    // Run immediately and also after a short delay to override any other scripts
    preventAutoModal();
    setTimeout(preventAutoModal, 500);
});

// Wait for full page load to apply final fix
window.addEventListener('load', function() {
    console.log('Page fully loaded, applying final modal fix');
    
    // Function to hide modals
    function hideModals() {
        const claimModal = document.getElementById('claim-modal');
        if (claimModal) {
            claimModal.style.display = 'none';
        }
    }
    
    // Hide modals on page load
    hideModals();
    
    // Apply fix multiple times to ensure it works
    setTimeout(hideModals, 100);
    setTimeout(hideModals, 500);
    setTimeout(hideModals, 1000);
});
