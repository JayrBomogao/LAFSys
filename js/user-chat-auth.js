/**
 * User Chat Authentication System
 * 
 * This script handles user authentication for chat functionality.
 * It provides a modal for users to enter their name and email,
 * stores this information, and restores chat history based on this identity.
 */

(function() {
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initChatAuth);
    
    // Also initialize on window load as a backup
    window.addEventListener('load', function() {
        console.log('Window loaded, ensuring chat auth is initialized');
        if (!authModalCreated) {
            initChatAuth();
        }
    });

    // Flag to track if auth modal has been created
    let authModalCreated = false;

    // Reference to the current contact modal
    let contactModal = null;

    // Initialize chat authentication
    function initChatAuth() {
        console.log('Initializing chat authentication system');
        
        // Check if we already have the Firebase MessagesStore
        if (typeof firebase === 'undefined' || !window.MessagesStore) {
            console.error('Firebase or MessagesStore not initialized');
            return;
        }
        
        // Load CSS file for auth modal
        loadChatAuthCSS();

        // Find all buttons that trigger chat modals
        setupChatButtonListeners();
        
        // Try to load user identity from localStorage
        loadUserIdentity();
    }
    
    // Load CSS file for the chat authentication modal
    function loadChatAuthCSS() {
        if (document.getElementById('chat-auth-css')) {
            return; // CSS already loaded
        }
        
        // Load the main CSS
        const cssLink = document.createElement('link');
        cssLink.id = 'chat-auth-css';
        cssLink.rel = 'stylesheet';
        cssLink.href = 'css/chat-auth.css';
        document.head.appendChild(cssLink);
        
        // Also load the fix CSS with higher priority
        const fixCssLink = document.createElement('link');
        fixCssLink.id = 'chat-auth-fix-css';
        fixCssLink.rel = 'stylesheet';
        fixCssLink.href = 'css/chat-auth-fix.css';
        document.head.appendChild(fixCssLink);
        
        console.log('Chat authentication CSS loaded with fixes');
    }

    // Set up listeners for chat buttons
    function setupChatButtonListeners() {
        // Find all chat buttons by their IDs, classes, or onclick attributes
        const chatButtons = [
            ...document.querySelectorAll('#contact-btn, [onclick*="showChatModal"], .chat-button'),
            ...document.querySelectorAll('[data-tab="chat"]')
        ];
        
        chatButtons.forEach(button => {
            // Remove any existing click listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add our custom click listener
            newButton.addEventListener('click', handleChatButtonClick);
            console.log('Added chat auth handler to button:', newButton.id || newButton.className);
        });
    }

    // Handle chat button click
    function handleChatButtonClick(e) {
        // Prevent default only if this is a link
        if (e && e.preventDefault && this.tagName === 'A') {
            e.preventDefault();
        }
        
        console.log('Chat button clicked, checking user authentication');
        
        // Get the user identity
        const userIdentity = getUserIdentity();
        
        // If we have a stored identity, proceed to chat
        if (userIdentity && userIdentity.name && userIdentity.email) {
            console.log('User already authenticated:', userIdentity);
            
            // Find and open the contact modal
            openContactModal();
            
            // Restore chat based on user identity
            restoreChatHistory(userIdentity);
        } else {
            // Show authentication modal
            showAuthModal();
        }
    }

    // Create and show the authentication modal
    function showAuthModal() {
        console.log('Showing authentication modal');
        
        if (!authModalCreated) {
            createAuthModal();
            authModalCreated = true;
        }
        
        // Get the modal element
        const authModal = document.getElementById('chat-auth-modal');
        if (!authModal) {
            console.error('Authentication modal not found');
            return;
        }
        
        // Display the modal
        authModal.style.display = 'block';
        
        // Focus the first input field
        setTimeout(() => {
            const nameInput = document.getElementById('auth-name');
            if (nameInput) nameInput.focus();
        }, 100);
    }

    // Create the authentication modal
    function createAuthModal() {
        console.log('Creating authentication modal');
        
        // Create the modal element
        const modal = document.createElement('div');
        modal.id = 'chat-auth-modal';
        modal.className = 'modal';
        modal.style.zIndex = '99999'; // Much higher than regular modals
        modal.style.position = 'fixed';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        // Create the modal content with inline styles to prevent CSS conflicts
        modal.innerHTML = `
            <div class="modal-content" style="background-color: #ffffff; max-width: 400px; width: 90%; margin: 10% auto; padding: 20px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); position: relative;">
                <span class="close" style="color: #9ca3af; float: right; font-size: 1.5rem; font-weight: bold; cursor: pointer;" onclick="document.getElementById('chat-auth-modal').style.display='none';">&times;</span>
                <h2 style="margin-top: 0; color: #111827; font-weight: 600; font-size: 1.25rem; margin-bottom: 0.75rem;">Chat with Staff</h2>
                <p style="color: #4b5563; font-size: 0.95rem; margin-bottom: 1.25rem;">Please provide your information to start chatting with our staff.</p>
                <form id="chat-auth-form" style="display: block;">
                    <div class="form-group" style="margin-bottom: 1rem; display: block;">
                        <label for="auth-name" style="display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; font-weight: 500;">Your Name</label>
                        <input type="text" id="auth-name" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.375rem; font-size: 1rem; display: block; background-color: white; color: black;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem; display: block;">
                        <label for="auth-email" style="display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; font-weight: 500;">Email Address</label>
                        <input type="email" id="auth-email" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 0.375rem; font-size: 1rem; display: block; background-color: white; color: black;">
                    </div>
                    <p class="small text-muted" style="font-size: 0.8rem; color: #6b7280;">Your information will be used to restore your chat history when you return.</p>
                    <div class="form-actions" style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="padding: 0.625rem 1.25rem; font-size: 0.95rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; background-color: #3b82f6; color: white; border: none;">Start Chatting</button>
                    </div>
                </form>
            </div>
        `;
        
        // Add the modal to the document
        document.body.appendChild(modal);
        
        // Set up form submission handler
        const form = document.getElementById('chat-auth-form');
        if (form) {
            form.addEventListener('submit', handleAuthFormSubmit);
            console.log('Auth form submission handler attached');
        } else {
            console.error('Auth form not found after creation');
        }
        
        // Verify inputs are accessible
        const nameInput = document.getElementById('auth-name');
        const emailInput = document.getElementById('auth-email');
        
        if (nameInput && emailInput) {
            console.log('Auth form inputs are accessible');
            
            // Add focus event listeners to enhance inputs
            nameInput.addEventListener('focus', function() {
                this.style.borderColor = '#3b82f6';
                this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
            });
            
            nameInput.addEventListener('blur', function() {
                this.style.borderColor = '#e5e7eb';
                this.style.boxShadow = 'none';
            });
            
            emailInput.addEventListener('focus', function() {
                this.style.borderColor = '#3b82f6';
                this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
            });
            
            emailInput.addEventListener('blur', function() {
                this.style.borderColor = '#e5e7eb';
                this.style.boxShadow = 'none';
            });
        } else {
            console.error('Auth form inputs not found:', { nameInput, emailInput });
        }
    }

    // Handle authentication form submission
    function handleAuthFormSubmit(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('auth-name');
        const emailInput = document.getElementById('auth-email');
        
        if (!nameInput || !emailInput) {
            console.error('Auth form inputs not found');
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
        
        // Save user identity
        saveUserIdentity(name, email);
        
        // Close auth modal
        const authModal = document.getElementById('chat-auth-modal');
        if (authModal) {
            authModal.style.display = 'none';
        }
        
        // Open contact modal and restore chat
        openContactModal();
        restoreChatHistory({ name, email });
    }

    // Open the contact modal
    function openContactModal() {
        contactModal = document.getElementById('contact-modal');
        if (contactModal) {
            contactModal.style.display = 'block';
            
            // Focus the chat input
            setTimeout(() => {
                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.focus();
            }, 300);
        } else {
            console.error('Contact modal not found');
        }
    }

    // Get user identity from localStorage
    function getUserIdentity() {
        try {
            const storedIdentity = localStorage.getItem('chatUserIdentity');
            if (storedIdentity) {
                return JSON.parse(storedIdentity);
            }
        } catch (e) {
            console.error('Error getting user identity:', e);
        }
        
        return null;
    }

    // Save user identity to localStorage
    function saveUserIdentity(name, email) {
        try {
            const identity = { name, email };
            localStorage.setItem('chatUserIdentity', JSON.stringify(identity));
            
            // Also store in sessionStorage for immediate use
            sessionStorage.setItem('userName', name);
            sessionStorage.setItem('userEmail', email);
            
            console.log('User identity saved:', identity);
        } catch (e) {
            console.error('Error saving user identity:', e);
        }
    }

    // Load user identity from localStorage to sessionStorage
    function loadUserIdentity() {
        const identity = getUserIdentity();
        if (identity && identity.name && identity.email) {
            sessionStorage.setItem('userName', identity.name);
            sessionStorage.setItem('userEmail', identity.email);
            console.log('User identity loaded:', identity);
        }
    }

    // Restore chat history based on user identity
    function restoreChatHistory(identity) {
        if (!identity || !identity.email) {
            console.error('Cannot restore chat history: No email provided');
            return;
        }
        
        // Update user info in session storage
        sessionStorage.setItem('userName', identity.name);
        sessionStorage.setItem('userEmail', identity.email);
        
        console.log('Attempting to restore chat history for:', identity.email);
        
        // Get item ID if available
        const itemId = sessionStorage.getItem('currentItemId');
        const itemTitle = sessionStorage.getItem('currentItemTitle');
        if (itemId) {
            console.log('Current item:', { id: itemId, title: itemTitle });
        }
        
        // Use Firebase MessagesStore to restore chat history
        if (window.MessagesStore && window.MessagesStore.subscribeToThread) {
            // Check if we have any existing chat thread in Firebase
            if (window.MessagesStore.getThreadAsync) {
                window.MessagesStore.getThreadAsync(identity.email)
                    .then(messages => {
                        console.log(`Retrieved ${messages.length} messages from Firebase for ${identity.email}`);
                        
                        // If we have a chat container, populate it with messages
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) {
                            // Clear any system messages
                            chatMessages.innerHTML = '';
                            
                            // If we have a setupThreadListener function, call it
                            if (typeof window.setupThreadListener === 'function') {
                                window.setupThreadListener(identity.email, chatMessages);
                                console.log('Set up thread listener for:', identity.email);
                            } else if (messages.length > 0) {
                                // Fallback if setupThreadListener is not available but we have messages
                                displayMessages(chatMessages, messages, identity.email);
                            } else {
                                // No messages yet, add a welcome message
                                addWelcomeMessage(chatMessages);
                            }
                            
                            // Set up online status tracking if available
                            if (typeof window.setupOnlineStatusTracking === 'function') {
                                window.setupOnlineStatusTracking(identity.email, identity.name);
                            }
                        } else {
                            console.error('Chat messages container not found');
                        }
                    })
                    .catch(err => {
                        console.error('Error getting chat thread:', err);
                        // Show error in chat if container exists
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) {
                            addErrorMessage(chatMessages, 'Failed to load chat history. Please try again later.');
                        }
                    });
            }
        }
    }
    
    // Display messages in the chat container
    function displayMessages(container, messages, email) {
        if (!container || !messages || !messages.length) return;
        
        // Clear the container
        container.innerHTML = '';
        
        // Add each message
        messages.forEach(function(msg) {
            // Determine if this is from the user or admin
            const isUser = msg.sender !== 'admin@lafsys.gov';
            
            // Create message element
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user-message' : 'staff-message'}`;
            
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble';
            
            const messagePara = document.createElement('p');
            messagePara.textContent = msg.body || '';
            messageBubble.appendChild(messagePara);
            
            // Format the date
            const msgDate = new Date(msg.date);
            const timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
            
            const messageInfo = document.createElement('div');
            messageInfo.className = 'message-info';
            messageInfo.textContent = `${isUser ? 'You' : 'Staff'} \u2022 ${timeStr}`;
            
            messageDiv.appendChild(messageBubble);
            messageDiv.appendChild(messageInfo);
            
            container.appendChild(messageDiv);
        });
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    // Add a welcome message to the chat
    function addWelcomeMessage(container) {
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message staff-message';
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble';
        
        const messagePara = document.createElement('p');
        messagePara.textContent = 'Hello! How can I help you today?';
        messageBubble.appendChild(messagePara);
        
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = 'Staff \u2022 Just now';
        
        messageDiv.appendChild(messageBubble);
        messageDiv.appendChild(messageInfo);
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // Add an error message to the chat
    function addErrorMessage(container, errorText) {
        if (!container) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system-message';
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble error';
        
        const messagePara = document.createElement('p');
        messagePara.textContent = errorText || 'An error occurred. Please try again.';
        messageBubble.appendChild(messagePara);
        
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = 'System \u2022 Just now';
        
        messageDiv.appendChild(messageBubble);
        messageDiv.appendChild(messageInfo);
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    // Expose public functions
    window.ChatAuth = {
        showAuthModal,
        getUserIdentity,
        saveUserIdentity,
        restoreChatHistory
    };

})();
