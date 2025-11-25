/**
 * Firebase Item Details Integration
 * This script handles the integration between Firebase data and item detail buttons
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Firebase Item Details script loaded');
    
    // Get the item ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    
    if (!itemId) {
        console.warn('No item ID found in URL');
        return;
    }
    
    // Verify Firebase is initialized
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('Firebase is not initialized');
        return;
    }
    
    // Get Firestore reference
    const db = firebase.firestore();
    
    // Function to initialize buttons with Firebase data
    async function initializeButtons() {
        console.log('Initializing buttons with Firebase item data', itemId);
        
        try {
            // Get item data
            const itemDoc = await db.collection('items').doc(itemId).get();
            
            if (!itemDoc.exists) {
                console.error('Item document does not exist');
                return;
            }
            
            const itemData = itemDoc.data();
            console.log('Item data loaded:', itemData);
            
            // Set up the claim button
            const claimBtn = document.getElementById('claim-btn');
            if (claimBtn) {
                console.log('Setting up claim button');
                
                // Check if item is already claimed
                if (itemData.status === 'claimed') {
                    claimBtn.disabled = true;
                    claimBtn.classList.add('btn-disabled');
                    claimBtn.innerHTML = '<i data-lucide="check-circle"></i> Already Claimed';
                }
                
                claimBtn.onclick = function() {
                    console.log('Claim button clicked for item:', itemId);
                    document.getElementById('claim-modal').style.display = 'block';
                    
                    // Store item ID in form for submission
                    const claimForm = document.getElementById('claim-form');
                    if (claimForm) {
                        claimForm.dataset.itemId = itemId;
                    }
                };
            }
            
            // Set up the contact button
            const contactBtn = document.getElementById('contact-btn');
            if (contactBtn) {
                console.log('Setting up contact button');
                
                contactBtn.dataset.itemId = itemId;
                contactBtn.dataset.itemTitle = itemData.title || 'Unknown item';
                
                contactBtn.onclick = function() {
                    console.log('Chat button clicked for item:', itemId);
                    const modal = document.getElementById('contact-modal');
                    if (modal) {
                        modal.style.display = 'block';
                        
                        // Focus input if it exists
                        setTimeout(function() {
                            const chatInput = document.getElementById('chat-input');
                            if (chatInput) {
                                chatInput.focus();
                                
                                // Store item ID in session for messaging
                                sessionStorage.setItem('currentItemId', itemId);
                                sessionStorage.setItem('currentItemTitle', itemData.title || 'Unknown item');
                            }
                        }, 300);
                    }
                };
            }
            
            // Initialize icons if needed
            if (window.lucide?.createIcons) {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('Error initializing buttons with Firebase data:', error);
        }
    }
    
    // Initialize buttons when Firebase is ready
    if (firebase.apps.length) {
        initializeButtons();
    } else {
        // If Firebase is still initializing, wait for it
        const checkInterval = setInterval(function() {
            if (firebase.apps.length) {
                clearInterval(checkInterval);
                initializeButtons();
            }
        }, 100);
        
        // Safety timeout after 5 seconds
        setTimeout(function() {
            clearInterval(checkInterval);
            console.warn('Firebase initialization timeout');
        }, 5000);
    }
});

// Additional event listeners for modal interaction
document.addEventListener('DOMContentLoaded', function() {
    // Ensure close buttons work
    document.querySelectorAll('.modal .close').forEach(function(closeBtn) {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                console.log('Closing modal:', modal.id);
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
});
