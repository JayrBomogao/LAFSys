/**
 * Ultra-reliable modal fix 
 * This script uses the most basic approach possible to ensure modals work
 * No complex event handlers, just direct DOM manipulation
 */
console.log('Direct modal fix loading...');

// Run immediately
(function() {
    // Global access functions - these will definitely work
    window.showClaimModal = function() {
        console.log('DIRECT: Opening claim modal');
        document.getElementById('claim-modal').style.display = 'block';
    };
    
    window.showChatModal = function() {
        console.log('DIRECT: Opening chat modal');
        document.getElementById('contact-modal').style.display = 'block';
        
        // Focus input field if it exists
        setTimeout(function() {
            var input = document.getElementById('chat-input');
            if (input) input.focus();
        }, 300);
    };
    
    window.closeModal = function(modalId) {
        console.log('DIRECT: Closing modal', modalId);
        document.getElementById(modalId).style.display = 'none';
    };
    
    // When DOM loads
    window.addEventListener('DOMContentLoaded', function() {
        console.log('Direct modal fix: DOM loaded');
        
        // Replace claim button functionality
        var directReplaceClaim = function() {
            console.log('Attempting to replace claim button functionality');
            var claimBtn = document.getElementById('claim-btn');
            if (claimBtn) {
                console.log('Found claim button, adding direct onclick');
                // Remove existing click events
                claimBtn.outerHTML = claimBtn.outerHTML;
                // Get fresh reference after outerHTML replacement
                claimBtn = document.getElementById('claim-btn');
                // Add direct onclick
                claimBtn.setAttribute('onclick', 'showClaimModal()');
                console.log('Claim button replaced with direct onclick');
            }
            
            // Replace chat button functionality
            var contactBtn = document.getElementById('contact-btn');
            if (contactBtn) {
                console.log('Found contact button, adding direct onclick');
                // Remove existing click events
                contactBtn.outerHTML = contactBtn.outerHTML;
                // Get fresh reference after outerHTML replacement
                contactBtn = document.getElementById('contact-btn');
                // Add direct onclick
                contactBtn.setAttribute('onclick', 'showChatModal()');
                console.log('Contact button replaced with direct onclick');
            }
            
            // Add close button functionality to all close buttons
            var closeButtons = document.querySelectorAll('.close');
            closeButtons.forEach(function(btn) {
                // Get the modal parent
                var modal = btn.closest('.modal');
                if (modal) {
                    // Remove existing click events
                    btn.outerHTML = btn.outerHTML;
                    // Get fresh reference
                    var newBtn = modal.querySelector('.close');
                    if (newBtn) {
                        // Add direct onclick
                        newBtn.setAttribute('onclick', "this.closest('.modal').style.display='none'");
                    }
                }
            });
        };
        
        // Run immediately
        directReplaceClaim();
        
        // Also run after a short delay to ensure DOM is fully ready
        setTimeout(directReplaceClaim, 1000);
        
        // Also run when tab becomes visible (if user was in a different tab)
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                setTimeout(directReplaceClaim, 500);
            }
        });
    });
    
    // Also create global CSS rule to ensure modals can be seen
    var style = document.createElement('style');
    style.textContent = `
        .modal {
            z-index: 9999 !important;
        }
        .modal-content {
            position: relative;
            z-index: 10000 !important;
        }
    `;
    document.head.appendChild(style);
    
    console.log('Direct modal fix loaded and ready');
})();

// Additional failsafe - run again after page fully loaded
window.addEventListener('load', function() {
    console.log('Window load event - running modal fix again');
    if (typeof showClaimModal === 'function') {
        // Create direct button alternatives
        var fixDiv = document.createElement('div');
        fixDiv.style.position = 'fixed';
        fixDiv.style.bottom = '20px';
        fixDiv.style.left = '20px';
        fixDiv.style.zIndex = '99999';
        fixDiv.style.display = 'flex';
        fixDiv.style.gap = '10px';
        
        var claimButton = document.createElement('button');
        claimButton.textContent = 'Open Claim Modal';
        claimButton.style.padding = '10px';
        claimButton.style.backgroundColor = '#3b82f6';
        claimButton.style.color = 'white';
        claimButton.style.border = 'none';
        claimButton.style.borderRadius = '5px';
        claimButton.style.cursor = 'pointer';
        claimButton.onclick = window.showClaimModal;
        
        var chatButton = document.createElement('button');
        chatButton.textContent = 'Open Chat Modal';
        chatButton.style.padding = '10px';
        chatButton.style.backgroundColor = '#10b981';
        chatButton.style.color = 'white';
        chatButton.style.border = 'none';
        chatButton.style.borderRadius = '5px';
        chatButton.style.cursor = 'pointer';
        chatButton.onclick = window.showChatModal;
        
        fixDiv.appendChild(claimButton);
        fixDiv.appendChild(chatButton);
        document.body.appendChild(fixDiv);
    }
});
