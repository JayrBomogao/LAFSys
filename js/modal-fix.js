// Modal functionality fix

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Modal fix script loaded');
    
    // Get modals
    const claimModal = document.getElementById('claim-modal');
    const contactModal = document.getElementById('contact-modal');
    
    if (!claimModal || !contactModal) {
        console.error('Modals not found in the DOM');
        return;
    }
    
    // Get buttons
    const claimBtn = document.getElementById('claim-btn');
    const contactBtn = document.getElementById('contact-btn');
    
    if (claimBtn) {
        console.log('Found claim button, setting up click handler');
        claimBtn.addEventListener('click', function() {
            console.log('Claim button clicked');
            claimModal.style.display = 'block';
        });
    } else {
        console.error('Claim button not found');
    }
    
    if (contactBtn) {
        console.log('Found contact button, setting up click handler');
        contactBtn.addEventListener('click', function() {
            console.log('Contact button clicked');
            contactModal.style.display = 'block';
        });
    } else {
        console.error('Contact button not found');
    }
    
    // Get close buttons
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === claimModal) {
            claimModal.style.display = 'none';
        }
        if (event.target === contactModal) {
            contactModal.style.display = 'none';
        }
    });
    
    // Extra debugging helper
    window.showClaimModal = function() {
        claimModal.style.display = 'block';
    };
    
    window.showContactModal = function() {
        contactModal.style.display = 'block';
    };
});
