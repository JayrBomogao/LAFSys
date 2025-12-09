/**
 * Emergency fix for Chat Authentication Modal
 * This script ensures the chat authentication modal works correctly
 */

// Run immediately and on window load
(function() {
    // Define fix function
    function fixChatAuthModal() {
        console.log('Applying emergency fix for chat authentication modal');
        
        // Fix existing modal if it already exists
        const existingModal = document.getElementById('chat-auth-modal');
        if (existingModal) {
            console.log('Existing chat auth modal found, fixing it');
            applyFixesToModal(existingModal);
        } else {
            // Create our own instance of the modal
            createFixedAuthModal();
        }
        
        // Add global function to show modal
        window.showChatAuthModal = function() {
            const modal = document.getElementById('chat-auth-modal');
            if (modal) {
                console.log('Showing chat auth modal via emergency function');
                modal.style.display = 'block';
                
                // Focus the first input field
                setTimeout(() => {
                    const nameInput = document.getElementById('auth-name');
                    if (nameInput) nameInput.focus();
                }, 100);
            } else {
                console.error('Chat auth modal not found');
                alert('Error: Could not open chat form. Please try again.');
            }
        };
    }
    
    // Apply fixes to an existing modal
    function applyFixesToModal(modal) {
        // Ensure modal has proper styles
        Object.assign(modal.style, {
            position: 'fixed',
            zIndex: '100000',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
        });
        
        // Find inputs inside the modal
        const nameInput = modal.querySelector('#auth-name');
        const emailInput = modal.querySelector('#auth-email');
        
        if (nameInput && emailInput) {
            console.log('Found form inputs, applying styles');
            
            // Apply styles to name input
            Object.assign(nameInput.style, {
                display: 'block',
                width: '100%',
                padding: '10px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white',
                color: 'black'
            });
            
            // Apply styles to email input
            Object.assign(emailInput.style, {
                display: 'block',
                width: '100%',
                padding: '10px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                backgroundColor: 'white',
                color: 'black'
            });
        } else {
            console.error('Could not find form inputs in existing modal');
        }
    }
    
    // Create fixed auth modal from scratch
    function createFixedAuthModal() {
        console.log('Creating fixed chat auth modal');
        
        // Create the modal element
        const modal = document.createElement('div');
        modal.id = 'chat-auth-modal';
        modal.className = 'modal';
        
        // Apply all styles inline to avoid conflicts
        Object.assign(modal.style, {
            display: 'none',
            position: 'fixed',
            zIndex: '100000',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
        });
        
        // Create modal content
        modal.innerHTML = `
            <div style="background-color: #ffffff; max-width: 400px; width: 90%; margin: 10% auto; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); position: relative;">
                <span style="position: absolute; right: 15px; top: 10px; font-size: 24px; font-weight: bold; cursor: pointer; color: #9ca3af;" onclick="document.getElementById('chat-auth-modal').style.display='none'">&times;</span>
                <h2 style="margin-top: 0; color: #111827; font-weight: 600; font-size: 1.25rem; margin-bottom: 0.75rem;">Chat with Staff</h2>
                <p style="color: #4b5563; font-size: 0.95rem; margin-bottom: 1.25rem;">Please provide your information to start chatting with our staff.</p>
                <form id="chat-auth-form" style="display: block; margin: 0; padding: 0;">
                    <div style="margin-bottom: 1rem; display: block;">
                        <label for="auth-name" style="display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; font-weight: 500;">Your Name</label>
                        <input type="text" id="auth-name" required style="display: block; width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 1rem; display: block;">
                        <label for="auth-email" style="display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; font-weight: 500;">Email Address</label>
                        <input type="email" id="auth-email" required style="display: block; width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; box-sizing: border-box;">
                    </div>
                    <p style="font-size: 0.8rem; color: #6b7280;">Your information will be used to restore your chat history when you return.</p>
                    <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="submit" style="padding: 10px 20px; font-size: 1rem; font-weight: 500; border-radius: 6px; cursor: pointer; background-color: #3b82f6; color: white; border: none;">Start Chatting</button>
                    </div>
                </form>
            </div>
        `;
        
        // Add the modal to the document
        document.body.appendChild(modal);
        
        // Set up form submission handler
        const form = document.getElementById('chat-auth-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const nameInput = document.getElementById('auth-name');
                const emailInput = document.getElementById('auth-email');
                
                if (!nameInput || !emailInput) {
                    console.error('Form inputs not found');
                    return;
                }
                
                const name = nameInput.value.trim();
                const email = emailInput.value.trim();
                
                if (!name || !email) {
                    alert('Please provide both name and email address');
                    return;
                }
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Please provide a valid email address');
                    return;
                }
                
                // Save user identity using ChatAuth
                if (window.ChatAuth && window.ChatAuth.saveUserIdentity) {
                    window.ChatAuth.saveUserIdentity(name, email);
                } else {
                    // Fallback to localStorage
                    try {
                        localStorage.setItem('chatUserIdentity', JSON.stringify({ name, email }));
                        sessionStorage.setItem('userName', name);
                        sessionStorage.setItem('userEmail', email);
                    } catch (e) {
                        console.error('Could not save user identity:', e);
                    }
                }
                
                // Close auth modal
                modal.style.display = 'none';
                
                // Open contact modal
                const contactModal = document.getElementById('contact-modal');
                if (contactModal) {
                    contactModal.style.display = 'block';
                    
                    // Restore chat history
                    if (window.ChatAuth && window.ChatAuth.restoreChatHistory) {
                        window.ChatAuth.restoreChatHistory({ name, email });
                    }
                    
                    // Focus the chat input
                    setTimeout(() => {
                        const chatInput = document.getElementById('chat-input');
                        if (chatInput) chatInput.focus();
                    }, 300);
                }
            });
        }
    }
    
    // Apply fixes now
    fixChatAuthModal();
    
    // Also apply fixes on window load
    window.addEventListener('load', fixChatAuthModal);
})();
