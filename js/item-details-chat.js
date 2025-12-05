/**
 * Item Details Real-Time Chat Functionality
 * 
 * This script enhances the chat modal in item-details.html with real-time
 * capabilities, online status indicators, and message notifications.
 */

(function() {
    // Initialize when the DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initRealTimeChat();
    });
    
    // Initialize real-time chat functionality
    function initRealTimeChat() {
        // Get chat elements
        const chatModal = document.getElementById('contact-modal');
        let chatMessages = document.getElementById('chat-messages');
        let chatInput = document.getElementById('chat-input');
        let sendBtn = document.getElementById('send-message-btn');
        
        if (!chatModal || !chatMessages || !chatInput || !sendBtn) {
            console.error('Chat elements not found');
            return;
        }
        
        console.log('Initializing real-time chat functionality...');
        
        // Generate default user info if none exists
        const timestamp = Date.now();
        const defaultUserName = `Visitor_${timestamp.toString().substr(-4)}`;
        const defaultUserEmail = `visitor_${timestamp}@example.com`;
        
        // Get user information
        let userName = sessionStorage.getItem('userName');
        let userEmail = sessionStorage.getItem('userEmail');
        const itemId = sessionStorage.getItem('currentItemId');
        const itemTitle = sessionStorage.getItem('currentItemTitle') || 'Unknown item';
        
        // If user information is missing, store default values
        if (!userName) {
            userName = defaultUserName;
            sessionStorage.setItem('userName', userName);
        }
        
        if (!userEmail) {
            userEmail = defaultUserEmail;
            sessionStorage.setItem('userEmail', userEmail);
        }
        
        console.log('User information loaded:', { userName, userEmail, itemId, itemTitle });
        
        // Setup chat functionality directly (removed user account button)
        chatInput = document.getElementById('chat-input');
        const sendMessageBtn = document.getElementById('send-message-btn');
        chatMessages = document.getElementById('chat-messages');
        
        if (chatInput && sendMessageBtn && chatMessages) {
            console.log('Chat elements found, setting up handlers');
            
            // Set up auto-growing textarea
            setupAutoGrowingTextarea(chatInput);
            
            // Set up message sending functionality
            setupMessageSending(chatInput, sendMessageBtn, chatMessages, userName, userEmail, itemId, itemTitle);
            
            // Set up real-time thread listener
            setupThreadListener(userEmail, chatMessages);
            
            // Update online status
            if (window.MessagesStore?.setOnlineStatusAsync) {
                window.MessagesStore.setOnlineStatusAsync(userEmail, true, userName).catch(console.error);
            }
        } else {
            console.error('Chat elements not found');
        }
        
        // Add admin status indicator
        addAdminStatusIndicator(chatMessages);
        
        // Function to make textarea grow with content
        function setupAutoGrowingTextarea(textarea) {
            if (!textarea) return;
            
            // Set initial height
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
            
            // Update height on input
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
                
                // Cap the height
                const maxHeight = 120; // in pixels
                if (this.scrollHeight > maxHeight) {
                    this.style.height = maxHeight + 'px';
                    this.style.overflowY = 'auto';
                } else {
                    this.style.overflowY = 'hidden';
                }
            });
        }
        
        // Set up message sending
        setupMessageSending(chatInput, sendBtn, chatMessages, userName, userEmail, itemId, itemTitle);
        
        // Set up real-time thread listener
        setupThreadListener(userEmail, chatMessages);
        
        // Set up online status tracking
        setupOnlineStatusTracking(userEmail, userName);
        
        // Set up message notification sound
        setupNotificationSound();
        
        // Clean up when the modal is closed
        chatModal.addEventListener('hidden.bs.modal', function() {
            if (window.threadUnsubscribe) window.threadUnsubscribe();
        });
    }
    
    // User account functions have been removed as requested
    
    // Add admin online status indicator
    function addAdminStatusIndicator(container) {
        // Create status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'admin-status';
        statusIndicator.className = 'status-indicator offline';
        statusIndicator.innerHTML = 'Admin offline';
        statusIndicator.style.fontSize = '0.8rem';
        statusIndicator.style.padding = '5px 10px';
        statusIndicator.style.marginBottom = '10px';
        statusIndicator.style.display = 'flex';
        statusIndicator.style.alignItems = 'center';
        
        // Add before chat messages container
        if (container.parentNode) {
            container.parentNode.insertBefore(statusIndicator, container);
        }
        
        // Set up subscription to admin online status
        if (window.MessagesStore?.subscribeToOnlineStatus) {
            window.adminStatusUnsubscribe = window.MessagesStore.subscribeToOnlineStatus('admin', function(status) {
                if (status.online) {
                    statusIndicator.textContent = 'Admin online';
                    statusIndicator.className = 'status-indicator online';
                } else {
                    const lastSeen = status.lastSeen ? new Date(status.lastSeen.toDate()) : null;
                    statusIndicator.textContent = lastSeen ? 
                        `Admin last seen ${formatLastSeen(lastSeen)}` : 
                        'Admin offline';
                    statusIndicator.className = 'status-indicator offline';
                }
            });
        }
    }
    
    // Format last seen time in a human-readable way
    function formatLastSeen(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
    
    // Set up message sending functionality
    function setupMessageSending(input, button, container, userName, userEmail, itemId, itemTitle) {
        // Keep track of attached images
        let attachedImages = [];
        
        // Set up image upload button
        const uploadBtn = document.getElementById('upload-image-btn');
        const fileInput = document.getElementById('image-upload');
        const attachmentsContainer = document.getElementById('chat-attachments');
        
        if (uploadBtn && fileInput) {
            // Open file dialog when button is clicked
            uploadBtn.addEventListener('click', function() {
                fileInput.click();
            });
            
            // Handle file selection
            fileInput.addEventListener('change', function(event) {
                const files = event.target.files;
                if (!files || !files.length) return;
                
                // Process each selected file
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (!file.type.startsWith('image/')) continue;
                    
                    // Create preview
                    createImagePreview(file);
                }
                
                // Reset file input for future selections
                fileInput.value = '';
            });
        }
        
        // Create image preview in attachments area
        function createImagePreview(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Create preview container
                const preview = document.createElement('div');
                preview.className = 'attachment-preview';
                
                // Create image element
                const img = document.createElement('img');
                img.src = e.target.result;
                
                // Store image data for sending
                const imageData = {
                    file: file,
                    dataUrl: e.target.result,
                    id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                };
                attachedImages.push(imageData);
                
                // Create remove button
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-attachment';
                removeBtn.innerHTML = '&times;';
                removeBtn.addEventListener('click', function() {
                    // Remove from attachedImages array
                    const index = attachedImages.findIndex(img => img.id === imageData.id);
                    if (index !== -1) attachedImages.splice(index, 1);
                    
                    // Remove preview
                    preview.remove();
                    
                    // Hide attachments container if empty
                    if (attachedImages.length === 0) {
                        attachmentsContainer.style.display = 'none';
                    }
                });
                
                // Append elements
                preview.appendChild(img);
                preview.appendChild(removeBtn);
                attachmentsContainer.appendChild(preview);
                
                // Show attachments container
                attachmentsContainer.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
        
        // Function to add message to chat
        const addMessageToChat = function(text, isUser = true, imageUrl = null) {
            // Debug the message content being added
            console.log('Adding message to chat:', {
                text: text,
                textLength: text ? text.length : 0,
                isUser: isUser,
                timestamp: new Date().toISOString()
            });
            
            // Create message elements
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${isUser ? 'user-message' : 'staff-message'}`;
            messageDiv.style.opacity = '1'; // Ensure visible
            
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble';
            messageBubble.style.display = 'block'; // Ensure visible
            
            // Add text content if available
            if (text) {
                const messagePara = document.createElement('p');
                messagePara.textContent = text;
                messagePara.style.minHeight = '1em'; // Ensure minimum height
                messagePara.style.wordBreak = 'break-word'; // Handle long words
                messageBubble.appendChild(messagePara);
            } else if (!imageUrl) {
                // Add placeholder text if no content and no image
                const messagePara = document.createElement('p');
                messagePara.textContent = '(No message content)';
                messagePara.style.fontStyle = 'italic';
                messagePara.style.color = '#6b7280';
                messageBubble.appendChild(messagePara);
            }
            
            // Add image if available
            if (imageUrl) {
                const messageImage = document.createElement('img');
                messageImage.src = imageUrl;
                messageImage.className = 'message-image';
                messageImage.alt = 'Attached image';
                messageImage.loading = 'lazy';
                messageImage.onclick = function() {
                    window.open(imageUrl, '_blank');
                };
                messageBubble.appendChild(messageImage);
            }
            
            const messageInfo = document.createElement('div');
            messageInfo.className = 'message-info';
            messageInfo.textContent = isUser ? 'You • Just now' : 'Staff • Just now';
            
            messageDiv.appendChild(messageBubble);
            messageDiv.appendChild(messageInfo);
            
            // Add data attributes for debugging
            messageDiv.setAttribute('data-timestamp', Date.now());
            messageDiv.setAttribute('data-type', isUser ? 'user' : 'staff');
            messageDiv.setAttribute('data-has-content', text ? 'yes' : 'no');
            
            // Append to container and scroll
            container.appendChild(messageDiv);
            container.scrollTop = container.scrollHeight; // Auto-scroll to bottom
            
            // Return the created element for further manipulation if needed
            return messageDiv;
        };
        
        // Function to send message
        const sendMessage = async function() {
            const messageText = input.value.trim();
            const hasImages = attachedImages.length > 0;
            
            // Check if there's content to send
            if (!messageText && !hasImages) return;
            
            // Double check user information
            const currentUserName = sessionStorage.getItem('userName') || userName || 'Visitor';
            const currentUserEmail = sessionStorage.getItem('userEmail') || userEmail || `visitor_${Date.now()}@example.com`;
            
            // Log what we're about to send
            console.log('Sending message with user info:', { 
                name: currentUserName, 
                email: currentUserEmail,
                itemId: itemId,
                itemTitle: itemTitle,
                hasText: !!messageText,
                imageCount: attachedImages.length
            });
            
            // Send via Firebase MessagesStore
            if (window.MessagesStore?.sendAsync) {
                try {
                    // Construct message body with item details
                    let messageBody = messageText || '';
                    if (itemId && itemTitle) {
                        messageBody = messageBody ? `[About: ${itemTitle} (ID: ${itemId})]\n${messageBody}` : `[About: ${itemTitle} (ID: ${itemId})]`;
                    }
                    
                    // If we have images, handle them
                    if (hasImages) {
                        // For each image, add it to the message and UI
                        for (const imageData of attachedImages) {
                            // Add to local UI first (with image)
                            addMessageToChat(messageText, true, imageData.dataUrl);
                            
                            // For Firebase, we'll send it as a special message type
                            // with the data URL of the image
                            const imageMessage = {
                                body: messageBody,
                                imageUrl: imageData.dataUrl,
                                type: 'image'
                            };
                            
                            // Send image message
                            await window.MessagesStore.sendAsync(
                                currentUserEmail, 
                                currentUserName, 
                                JSON.stringify(imageMessage), // Serialize as JSON
                                currentUserEmail
                            );
                            
                            console.log('Image message sent successfully');
                        }
                        
                        // Clear attached images
                        attachedImages = [];
                        attachmentsContainer.innerHTML = '';
                        attachmentsContainer.style.display = 'none';
                    } else {
                        // Text-only message
                        // Add to local UI
                        addMessageToChat(messageText, true);
                        
                        // Send message
                        await window.MessagesStore.sendAsync(
                            currentUserEmail, 
                            currentUserName, 
                            messageBody, 
                            currentUserEmail
                        );
                        
                        console.log('Text message sent successfully');
                    }
                    
                    // Clear input field
                    input.value = '';
                    input.style.height = 'auto';
                    
                } catch (error) {
                    console.error('Error sending message:', error);
                    alert('Failed to send message. Please try again.');
                }
            } else {
                console.warn('MessagesStore not available or missing sendAsync method');
                
                // Add to local UI (with image if applicable)
                if (hasImages) {
                    attachedImages.forEach(imageData => {
                        addMessageToChat(messageText, true, imageData.dataUrl);
                    });
                    
                    // Clear attached images
                    attachedImages = [];
                    attachmentsContainer.innerHTML = '';
                    attachmentsContainer.style.display = 'none';
                } else {
                    addMessageToChat(messageText, true);
                }
                
                // Clear input field
                input.value = '';
                
                // Simulate staff response
                setTimeout(() => {
                    addMessageToChat('Thanks for your message. A staff member will get back to you shortly.', false);
                }, 1000);
            }
        };
        
        // Set up event listeners
        button.addEventListener('click', sendMessage);
        
        // Enter key to send
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Set up real-time thread listener
    function setupThreadListener(email, container) {
        if (!email || !container) return;
        
        // Check if we have the Firebase MessagesStore with subscription capability
        if (window.MessagesStore?.subscribeToThread) {
            // Subscribe to real-time updates for this thread
            window.threadUnsubscribe = window.MessagesStore.subscribeToThread(email, function(messages) {
                // Only redraw if there are messages
                if (!messages || !messages.length) return;
                
                // Clear the container
                container.innerHTML = '';
                
                // Add each message
                messages.forEach(function(msg) {
                    // Skip system messages
                    if (msg.sender === 'system') return;
                    
                    // Determine if this is from the user or admin
                    const isUser = msg.sender !== 'admin@lafsys.gov';
                    
                    // Debug message content
                    console.log('Rendering message:', {
                        sender: msg.sender,
                        name: msg.name,
                        bodyLength: msg.body ? msg.body.length : 0,
                        body: msg.body ? msg.body.substring(0, 100) : 'EMPTY',
                        date: msg.date
                    });
                    
                    // Check if this is an image message (JSON string)
                    let imageUrl = null;
                    let bodyText = '';
                    
                    try {
                        // Try to parse as JSON to see if it's an image message
                        if (msg.body && (msg.body.startsWith('{') || msg.body.includes('"imageUrl"'))) {
                            const parsedMsg = JSON.parse(msg.body);
                            if (parsedMsg.type === 'image' && parsedMsg.imageUrl) {
                                imageUrl = parsedMsg.imageUrl;
                                bodyText = parsedMsg.body || '';
                            } else {
                                bodyText = msg.body;
                            }
                        } else {
                            bodyText = msg.body || '';
                        }
                    } catch (e) {
                        // If parsing fails, use the message body directly
                        bodyText = msg.body || '';
                    }
                    
                    // Create message element
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${isUser ? 'user-message' : 'staff-message'}`;
                    
                    const messageBubble = document.createElement('div');
                    messageBubble.className = 'message-bubble';
                    
                    // Add text content if available
                    if (bodyText) {
                        const messagePara = document.createElement('p');
                        messagePara.textContent = bodyText;
                        messagePara.style.minHeight = '1em';
                        messagePara.style.wordBreak = 'break-word';
                        messageBubble.appendChild(messagePara);
                    } else if (!imageUrl) {
                        // Add placeholder if no content
                        const messagePara = document.createElement('p');
                        messagePara.textContent = '(No message content)';
                        messagePara.style.fontStyle = 'italic';
                        messagePara.style.color = '#6b7280';
                        messageBubble.appendChild(messagePara);
                    }
                    
                    // Add image if available
                    if (imageUrl) {
                        const messageImage = document.createElement('img');
                        messageImage.src = imageUrl;
                        messageImage.className = 'message-image';
                        messageImage.alt = 'Attached image';
                        messageImage.loading = 'lazy';
                        messageImage.onclick = function() {
                            window.open(imageUrl, '_blank');
                        };
                        messageBubble.appendChild(messageImage);
                    }
                    
                    // Format the date
                    const msgDate = new Date(msg.date);
                    const timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                    
                    const messageInfo = document.createElement('div');
                    messageInfo.className = 'message-info';
                    messageInfo.textContent = `${isUser ? 'You' : 'Staff'} \u2022 ${timeStr}`;
                    
                    messageDiv.appendChild(messageBubble);
                    messageDiv.appendChild(messageInfo);
                    
                    // Add debug attributes to help troubleshoot
                    messageDiv.setAttribute('data-sender', msg.sender || 'unknown');
                    messageDiv.setAttribute('data-has-body', bodyText ? 'yes' : 'no');
                    messageDiv.setAttribute('data-has-image', imageUrl ? 'yes' : 'no');
                    messageDiv.setAttribute('data-timestamp', msgDate.getTime());
                    
                    container.appendChild(messageDiv);
                });
                
                // Scroll to bottom
                container.scrollTop = container.scrollHeight;
                
                // Play notification sound for new messages from admin
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && lastMsg.sender === 'admin@lafsys.gov') {
                    playNotificationSound();
                }
            });
        }
    }
    
    // Set up online status tracking
    function setupOnlineStatusTracking(email, name) {
        if (!email) return;
        
        // Check if we have the Firebase MessagesStore
        if (window.MessagesStore?.setOnlineStatusAsync) {
            // Set user as online when they open the chat
            window.MessagesStore.setOnlineStatusAsync(email, true, name).catch(console.error);
            
            // Set user as offline when they close the tab/window
            window.addEventListener('beforeunload', function() {
                window.MessagesStore.setOnlineStatusAsync(email, false).catch(console.error);
            });
            
            // Also update status when visibility changes
            document.addEventListener('visibilitychange', function() {
                const isVisible = document.visibilityState === 'visible';
                window.MessagesStore.setOnlineStatusAsync(email, isVisible).catch(console.error);
            });
        }
    }
    
    // Set up notification sound
    function setupNotificationSound() {
        // Preload notification sound
        window.notificationSound = new Audio('/sounds/notification.mp3');
        window.notificationSound.load();
    }
    
    // Play notification sound
    function playNotificationSound() {
        try {
            if (window.notificationSound) {
                window.notificationSound.currentTime = 0;
                window.notificationSound.volume = 0.5;
                window.notificationSound.play().catch(err => 
                    console.log('Could not play notification sound:', err));
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }
})();
