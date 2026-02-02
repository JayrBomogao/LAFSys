/**
 * User Live Chat Implementation
 * Provides the user-facing chat interface with required details collection
 */

// Configuration
const CHAT_COLLECTION = 'liveChats';
const CHAT_MESSAGES_COLLECTION = 'messages';
const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

// Chat state
let userChatId = null;
let userInfo = null;
let idleTimer = null;

// DOM Elements - will be initialized when needed
let chatButton;
let chatWidget;
let chatContent;
let messagesList;
let chatForm;
let messageInput;
let userDetailForm;

// Initialize chat system when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing user chat system');
  
  // Add chat styles
  addChatStyles();
  
  // Create chat widget HTML
  createChatWidget();
  
  // Initialize references to DOM elements
  chatButton = document.getElementById('chatButton');
  chatWidget = document.getElementById('chatWidget');
  chatContent = document.getElementById('chatContent');
  chatForm = document.getElementById('chatForm');
  messageInput = document.getElementById('messageInput');
  userDetailForm = document.getElementById('userDetailForm');
  
  // Set up event listeners
  setupEventListeners();
});

// Create the chat widget HTML
function createChatWidget() {
  // Create chat button
  const button = document.createElement('div');
  button.id = 'chatButton';
  button.className = 'chat-button';
  button.innerHTML = '<i class="chat-icon">💬</i>';
  document.body.appendChild(button);
  
  // Create chat widget
  const widget = document.createElement('div');
  widget.id = 'chatWidget';
  widget.className = 'chat-widget';
  widget.style.display = 'none';
  
  // Create the chat header
  const header = document.createElement('div');
  header.className = 'chat-header';
  
  const title = document.createElement('div');
  title.className = 'chat-title';
  title.textContent = 'Live Support';
  
  const controls = document.createElement('div');
  controls.className = 'chat-controls';
  
  // Removed minimize button - only keeping close button
  const closeButton = document.createElement('button');
  closeButton.id = 'closeChat';
  closeButton.className = 'chat-control-btn close-btn';
  closeButton.textContent = '×';
  
  // Only append the close button
  controls.appendChild(closeButton);
  header.appendChild(title);
  header.appendChild(controls);
  widget.appendChild(header);
  
  // Create chat content
  const chatContent = document.createElement('div');
  chatContent.id = 'chatContent';
  chatContent.className = 'chat-content';
  
  // Welcome screen
  const welcomeScreen = document.createElement('div');
  welcomeScreen.className = 'welcome-screen';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Welcome to Lost & Found Support';
  
  const subtext = document.createElement('p');
  subtext.textContent = 'Please provide your details to start chatting with our team';
  
  // Create the form
  const form = document.createElement('form');
  form.id = 'userDetailForm';
  form.className = 'user-detail-form';
  
  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  
  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', 'userName');
  nameLabel.textContent = 'Your Name';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'userName';
  nameInput.name = 'userName';
  nameInput.placeholder = 'Full Name';
  nameInput.required = true;
  nameInput.style.cssText = `
    display: block !important;
    visibility: visible !important;
    width: 100% !important;
    padding: 0.75rem !important;
    margin: 0.5rem 0 !important;
    border: 3px solid #2563eb !important;
    border-radius: 6px !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-size: 1rem !important;
    min-height: 45px !important;
    box-sizing: border-box !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10000 !important;
  `;
  
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  
  // Email field
  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-group';
  
  const emailLabel = document.createElement('label');
  emailLabel.setAttribute('for', 'userEmail');
  emailLabel.textContent = 'Email Address';
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'userEmail';
  emailInput.name = 'userEmail';
  emailInput.placeholder = 'Email Address';
  emailInput.required = true;
  emailInput.style.cssText = `
    display: block !important;
    visibility: visible !important;
    width: 100% !important;
    padding: 0.75rem !important;
    margin: 0.5rem 0 !important;
    border: 3px solid #2563eb !important;
    border-radius: 6px !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-size: 1rem !important;
    min-height: 45px !important;
    box-sizing: border-box !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10000 !important;
  `;
  
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'start-chat-btn';
  submitButton.textContent = 'Start Chat';
  
  // Add form elements
  form.appendChild(nameGroup);
  form.appendChild(emailGroup);
  form.appendChild(submitButton);
  
  // Add elements to welcome screen
  welcomeScreen.appendChild(heading);
  welcomeScreen.appendChild(subtext);
  welcomeScreen.appendChild(form);
  
  // Add welcome screen to content
  chatContent.appendChild(welcomeScreen);
  widget.appendChild(chatContent);
  
  // Create chat form container
  const chatFormContainer = document.createElement('div');
  chatFormContainer.id = 'chatFormContainer';
  chatFormContainer.className = 'chat-form-container';
  chatFormContainer.style.display = 'none';
  
  // Create chat form
  const chatForm = document.createElement('form');
  chatForm.id = 'chatForm';
  chatForm.className = 'chat-form';
  
  const messageInput = document.createElement('textarea');
  messageInput.id = 'messageInput';
  messageInput.placeholder = 'Type your message here...';
  messageInput.rows = 2;
  messageInput.required = true;
  
  const sendButton = document.createElement('button');
  sendButton.type = 'submit';
  sendButton.className = 'chat-send-button';
  sendButton.textContent = 'Send';
  
  chatForm.appendChild(messageInput);
  chatForm.appendChild(sendButton);
  chatFormContainer.appendChild(chatForm);
  
  widget.appendChild(chatFormContainer);
  document.body.appendChild(widget);
  
  console.log('Chat widget created with form elements:', {
    nameInput: document.getElementById('userName'),
    emailInput: document.getElementById('userEmail'),
    form: document.getElementById('userDetailForm')
  });
}

// Setup event listeners
function setupEventListeners() {
  // Chat button click - open widget
  chatButton.addEventListener('click', toggleChatWidget);
  
  // Close button - removed minimize button listener
  document.getElementById('closeChat').addEventListener('click', closeChatWidget);
  
  // User details form submission
  userDetailForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Collect user information
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const query = document.getElementById('userQuery').value.trim();
    
    // Start the chat with user info
    startChat(name, email, query);
  });
  
  // Chat message form submission
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const messageText = messageInput.value.trim();
    if (messageText && userChatId) {
      sendMessage(messageText);
      messageInput.value = '';
    }
  });
  
  // Track user activity for idle timeout
  ['click', 'keypress', 'mousemove', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, resetIdleTimer);
  });
}

// Toggle chat widget visibility
function toggleChatWidget() {
  if (chatWidget.style.display === 'none') {
    chatWidget.style.display = 'flex';
    chatButton.classList.add('active');
    
    // Force rebuild of input fields when showing the widget
    setTimeout(function() {
      // Only rebuild the form if we're not in an active chat
      if (!userChatId) {
        console.log('Forcing input field rebuild on widget show');
        resetChat();
      }
      
      // Extra hack - manually insert inputs if they're still missing
      const nameInput = document.getElementById('userName');
      const emailInput = document.getElementById('userEmail');
      
      if (!nameInput || !emailInput || nameInput.offsetHeight === 0) {
        console.log('Input fields not rendering properly, forcing direct injection');
        forceInjectInputFields();
      }
    }, 100);
    
    // If chat is already in progress, scroll to bottom
    if (userChatId && messagesList) {
      scrollToBottom();
    }
  } else {
    minimizeChatWidget();
  }
}

// Force inject input fields directly into the DOM
function forceInjectInputFields() {
  const welcomeScreen = document.querySelector('.welcome-screen');
  if (!welcomeScreen) return;
  
  // Clear existing content
  welcomeScreen.innerHTML = '';
  
  // Create new content
  const heading = document.createElement('h3');
  heading.textContent = 'Welcome to Lost & Found Support';
  
  const subtext = document.createElement('p');
  subtext.textContent = 'Please provide your details to start chatting with our team';
  
  // Create direct form fields
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'Your Name';
  nameLabel.style.cssText = 'display: block; font-weight: bold; margin-top: 10px;';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'userName';
  nameInput.name = 'userName';
  nameInput.placeholder = 'Full Name';
  nameInput.style.cssText = `
    display: block !important;
    width: 100% !important;
    padding: 10px !important;
    margin: 5px 0 15px 0 !important;
    border: 3px solid red !important;
    border-radius: 5px !important;
    box-sizing: border-box !important;
    font-size: 16px !important;
    background: white !important;
  `;
  
  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'Email Address';
  emailLabel.style.cssText = 'display: block; font-weight: bold; margin-top: 10px;';
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'userEmail';
  emailInput.name = 'userEmail';
  emailInput.placeholder = 'Email Address';
  emailInput.style.cssText = `
    display: block !important;
    width: 100% !important;
    padding: 10px !important;
    margin: 5px 0 15px 0 !important;
    border: 3px solid red !important;
    border-radius: 5px !important;
    box-sizing: border-box !important;
    font-size: 16px !important;
    background: white !important;
  `;
  
  const startButton = document.createElement('button');
  startButton.textContent = 'Start Chat';
  startButton.style.cssText = `
    display: block !important;
    width: 100% !important;
    padding: 10px !important;
    margin-top: 20px !important;
    background: #2563eb !important;
    color: white !important;
    border: none !important;
    border-radius: 5px !important;
    font-weight: bold !important;
    cursor: pointer !important;
  `;
  
  // Add all elements
  welcomeScreen.appendChild(heading);
  welcomeScreen.appendChild(subtext);
  welcomeScreen.appendChild(nameLabel);
  welcomeScreen.appendChild(nameInput);
  welcomeScreen.appendChild(emailLabel);
  welcomeScreen.appendChild(emailInput);
  welcomeScreen.appendChild(startButton);
  
  // Add click handler
  startButton.addEventListener('click', function() {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    
    if (name && email) {
      startChat(name, email, '');
    } else {
      alert('Please provide both your name and email');
    }
  });
  
  console.log('Directly injected input fields:', { nameInput, emailInput });
}

// Expose the toggleChatWidget function globally
window.toggleChatWidget = toggleChatWidget;

// Minimize chat widget
function minimizeChatWidget() {
  chatWidget.style.display = 'none';
  chatButton.classList.remove('active');
}

// Close chat widget and end chat if in progress
function closeChatWidget() {
  if (userChatId) {
    if (confirm('Are you sure you want to end this chat session?')) {
      endChat();
      chatWidget.style.display = 'none';
      chatButton.classList.remove('active');
    }
  } else {
    chatWidget.style.display = 'none';
    chatButton.classList.remove('active');
  }
}

// Start a new chat session
function startChat(name, email, initialQuery) {
  if (!window.firebase?.firestore) {
    showError('Chat service is currently unavailable');
    return;
  }
  
  // Save user info
  userInfo = { name, email };
  
  // Show loading state
  chatContent.innerHTML = '<div class="chat-loading">Starting chat...</div>';
  
  const db = firebase.firestore();
  
  // Create a unique chat ID with timestamp to ensure uniqueness regardless of email
  const uniqueChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Create a new chat document with custom ID
  db.collection(CHAT_COLLECTION).doc(uniqueChatId).set({
    userName: name,
    userEmail: email,
    startTime: firebase.firestore.FieldValue.serverTimestamp(),
    active: true,
    unreadCount: 0,
    uniqueSessionId: uniqueChatId, // Store the unique ID in the document as well
    // Add a new field to ensure this is a fresh chat session
    isNewSession: true
  })
  .then(() => {
    // Set the chat ID to our generated unique ID
    userChatId = uniqueChatId;
    console.log('New chat created with ID:', userChatId);
    
    // Show chat interface
    initChatInterface();
    
    // Add initial system message
    addSystemMessage('Chat started. An administrator will be with you shortly.');
    
    // Send the initial query as the first message
    if (initialQuery) {
      sendMessage(initialQuery);
    }
    
    // Start idle timer
    resetIdleTimer();
  })
  .catch(error => {
    console.error('Error creating chat:', error);
    showError('Failed to start chat. Please try again.');
    // Reset to show user details form again
    chatContent.innerHTML = getChatWelcomeHTML();
    setupUserDetailForm();
  });
}

// Create a new chat input form when needed - using direct HTML injection for maximum compatibility
function createChatInput() {
  console.log('Creating new chat input form inside chat bubble');
  
  // Create the container directly with HTML to match the emergency fix styling
  const containerHTML = `
    <div id="chatFormContainer" style="
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      padding: 10px !important;
      background: white !important;
      border-top: 1px solid #e5e7eb !important;
      z-index: 1000 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      border-radius: 0 0 12px 12px !important;">
        <form id="chatForm" style="
          display: flex !important;
          gap: 8px !important;
          width: 100% !important;">
            <input type="text" id="messageInput" placeholder="Type your message here..." style="
              flex: 1 !important;
              padding: 10px !important;
              border: 2px solid #2563eb !important;
              border-radius: 4px !important;
              font-size: 14px !important;
              height: 36px !important;
              background-color: white !important;
              color: black !important;
              width: 75% !important;
              box-sizing: border-box !important;
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;"
              required>
            <button type="submit" style="
              background-color: #2563eb !important;
              color: white !important;
              border: none !important;
              padding: 5px 15px !important;
              border-radius: 4px !important;
              font-weight: bold !important;
              cursor: pointer !important;
              height: 36px !important;
              width: 25% !important;
              text-align: center !important;">Send</button>
        </form>
    </div>
  `;
  
  // Remove any existing chat form
  const existingForm = document.getElementById('chatFormContainer');
  if (existingForm) {
    existingForm.remove();
  }
  
  // Try to append to messagesList's parent container instead of chat widget
  const messagesList = document.getElementById('messagesList');
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = containerHTML;
  const chatFormContainer = tempDiv.firstElementChild;
  
  if (messagesList && messagesList.parentNode) {
    // Insert the form right after the messages list in the chat content
    console.log('Adding chat form inside chat content area');
    messagesList.parentNode.appendChild(chatFormContainer);
  } else {
    // Fallback to adding to chat widget
    console.log('Adding chat form to widget (fallback)');
    chatWidget.appendChild(chatFormContainer);
  }
  
  // Get references to the created elements
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  
  // Ensure the elements exist
  if (!chatForm || !messageInput) {
    console.error('Failed to create chat input elements');
    return { chatFormContainer: null, chatForm: null, messageInput: null };
  }
  
  // Create a named handler function so we can remove it if needed
  function handleFormSubmit(e) {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log('Preventing duplicate message submission');
      return;
    }
    
    const messageText = messageInput.value.trim();
    if (messageText && userChatId) {
      // Set flag to prevent duplicates
      isSubmitting = true;
      
      // Send message
      sendMessage(messageText);
      messageInput.value = '';
      
      // Reset flag after a delay
      setTimeout(() => {
        isSubmitting = false;
      }, 1000); // Longer delay to prevent multiple submissions
    }
  }
  
  // Handle keydown for Enter key
  function handleKeyDown(e) {
    // Check if Enter key was pressed without Shift key (for line breaks)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (new line)
      
      // Don't process if already submitting
      if (isSubmitting) {
        console.log('Key press ignored - message already being sent');
        return;
      }
      
      // Trigger the form submission
      handleFormSubmit(new Event('submit'));
    }
  }
  
  // Remove any existing event handlers first
  chatForm.removeEventListener('submit', handleFormSubmit);
  messageInput.removeEventListener('keydown', handleKeyDown);
  
  // Add the event handlers
  chatForm.addEventListener('submit', handleFormSubmit);
  messageInput.addEventListener('keydown', handleKeyDown);
  
  // Force focus on the input
  setTimeout(() => {
    if (messageInput) {
      messageInput.focus();
    }
  }, 100);
  
  return { chatFormContainer, chatForm, messageInput };
}

// Global flags to prevent duplicate submissions
let isSubmitting = false;
let hasKeydownHandler = false;

// Initialize the chat interface after starting a chat
function initChatInterface() {
  console.log('Initializing chat interface');

  // Create messages container with specific height - leave room for input field
  chatContent.innerHTML = '<div id="messagesList" class="messages-list"></div>';
  messagesList = document.getElementById('messagesList');
  messagesList.style.cssText = `
    flex: 1 !important;
    overflow-y: auto !important;
    padding: 1rem !important;
    padding-bottom: 60px !important; /* Add padding at bottom to avoid messages being hidden by input */
    max-height: 350px !important;
    scroll-behavior: smooth !important;
  `;
  
  // Always remove any existing chat form container
  const existingForm = document.getElementById('chatFormContainer');
  if (existingForm) {
    existingForm.remove();
  }
  
  // Try both approaches to ensure the input field is visible
  
  // 1. Create input with our internal method
  const { chatFormContainer, chatForm, messageInput } = createChatInput();
  
  // 2. Also force create with the emergency fix if available
  setTimeout(() => {
    if (window.forceCreateChatInput) {
      console.log('Using emergency fix to create chat input');
      window.forceCreateChatInput();
    } else {
      console.log('Emergency fix not available, using standard approach');
      
      // Ensure our standard input is visible
      if (chatFormContainer) {
        chatFormContainer.style.cssText += `
          display: block !important; 
          visibility: visible !important; 
          opacity: 1 !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          width: 90% !important;
          z-index: 99999 !important;
        `;
      }
    }
    
    // Try to focus the input field again after a delay
    setTimeout(() => {
      const input = document.getElementById('messageInput');
      if (input) {
        input.focus();
        console.log('Focus set on message input after delay');
      }
    }, 500);
  }, 300);
  
  // Make sendMessage available globally for the emergency fix
  window.sendMessage = sendMessage;
  
  // Set up real-time listener for messages
  if (window.firebase?.firestore) {
    const db = firebase.firestore();
    
    db.collection(CHAT_COLLECTION).doc(userChatId)
      .collection(CHAT_MESSAGES_COLLECTION)
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        handleMessagesUpdate(snapshot);
      }, (error) => {
        console.error('Error listening to messages:', error);
        addSystemMessage(`Error: ${error.message}`, true);
      });
      
    // Also listen for chat status changes (e.g., if admin ends it)
    db.collection(CHAT_COLLECTION).doc(userChatId)
      .onSnapshot((doc) => {
        const data = doc.data();
        if (data && data.active === false) {
          handleChatEnded(data.endedBy);
        }
      }, (error) => {
        console.error('Error listening to chat status:', error);
      });
  }
}

// Handle updates to messages
function handleMessagesUpdate(snapshot) {
  let newMessages = false;
  
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const message = change.doc.data();
      addMessageToUI(message);
      newMessages = true;
    }
  });
  
  if (newMessages) {
    scrollToBottom();
    resetIdleTimer();
  }
}

// Add a message to the UI
function addMessageToUI(message) {
  if (!messagesList) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${message.sender === 'user' ? 'user-message' : message.sender === 'admin' ? 'admin-message' : 'system-message'}`;
  
  const timestamp = formatTimestamp(message.timestamp);
  
  if (message.sender === 'system') {
    messageDiv.innerHTML = `<div class="message-content">${message.text}</div>`;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">${message.text}</div>
      <div class="message-time">${timestamp}</div>
    `;
  }
  
  messagesList.appendChild(messageDiv);
}

// Add a system message to the chat
function addSystemMessage(text, isError = false) {
  if (!messagesList) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message system-message ${isError ? 'error' : ''}`;
  messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
  
  messagesList.appendChild(messageDiv);
  scrollToBottom();
}

// Send a chat message
function sendMessage(messageText) {
  if (!window.firebase?.firestore) {
    showError('Chat service is currently unavailable');
    return;
  }
  
  const db = firebase.firestore();
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
  // Add message to the chat
  db.collection(CHAT_COLLECTION).doc(userChatId)
    .collection(CHAT_MESSAGES_COLLECTION)
    .add({
      text: messageText,
      sender: 'user',
      timestamp: timestamp
    })
    .then(() => {
      // Update the chat document with last message info
      return db.collection(CHAT_COLLECTION).doc(userChatId).update({
        lastMessage: messageText,
        lastTimestamp: timestamp,
        lastSender: 'user',
        unreadCount: firebase.firestore.FieldValue.increment(1)
      });
    })
    .catch(error => {
      console.error('Error sending message:', error);
      showError('Failed to send message. Please try again.');
    });
}

// End the chat session
function endChat() {
  if (!window.firebase?.firestore || !userChatId) {
    return;
  }
  
  const db = firebase.firestore();
  
  // Mark chat as inactive
  db.collection(CHAT_COLLECTION).doc(userChatId)
    .update({
      active: false,
      endTime: firebase.firestore.FieldValue.serverTimestamp(),
      endedBy: 'user'
    })
    .then(() => {
      handleChatEnded('user');
    })
    .catch(error => {
      console.error('Error ending chat:', error);
    });
}

// Handle when a chat is ended (by user, admin, or timeout)
function handleChatEnded(endedBy) {
  // Clear idle timer
  clearTimeout(idleTimer);
  
  // Make sure the message list exists
  if (!messagesList) {
    console.error('messagesList not found in handleChatEnded');
    return;
  }
  
  // Add system message about chat ending
  let message = '';
  switch(endedBy) {
    case 'user':
      message = 'You have ended the chat.';
      break;
    case 'admin':
      message = 'The administrator has ended the chat.';
      break;
    case 'timeout':
      message = 'Chat automatically ended due to inactivity.';
      break;
    default:
      message = 'This chat session has ended.';
  }
  
  addSystemMessage(message);
  
  // Create end chat notification with restart button
  const restartDiv = document.createElement('div');
  restartDiv.className = 'chat-restart';
  restartDiv.style.cssText = `
    text-align: center;
    padding: 1rem;
    margin: 1rem 0;
    background-color: #f3f4f6;
    border-radius: 8px;
  `;
  
  restartDiv.innerHTML = `
    <p style="margin-bottom: 0.5rem;">Chat session ended. Would you like to start a new chat?</p>
    <button id="restartChat" style="background-color: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer;">Start New Chat</button>
  `;
  
  // Add restart div to messages list
  messagesList.appendChild(restartDiv);
  
  // Force scroll to show restart button
  scrollToBottom();
  
  // Show chat input field but disable it
  const chatFormContainer = document.getElementById('chatFormContainer');
  const messageInput = document.getElementById('messageInput');
  
  if (chatFormContainer && messageInput) {
    // Keep the chat form visible but disable the input
    messageInput.disabled = true;
    messageInput.placeholder = 'Chat ended. Click "Start New Chat" to begin a new conversation.';
    messageInput.style.backgroundColor = '#f3f4f6';
    messageInput.style.color = '#9ca3af';
  } else {
    console.error('Chat input elements not found when ending chat');
  }
  
  // Add event listener to restart button
  const restartButton = document.getElementById('restartChat');
  if (restartButton) {
    restartButton.addEventListener('click', function() {
      resetChat();
    });
  }
  
  // Reset chat ID
  userChatId = null;
}

// Reset chat to initial state
function resetChat() {
  // Clear current chat state
  userChatId = null;
  
  // Clear user info to ensure a completely fresh start
  // This ensures no persistence between sessions
  userInfo = null;
  
  // Reset UI to show user details form
  chatContent.innerHTML = ''; // Clear content first
  
  // Welcome screen
  const welcomeScreen = document.createElement('div');
  welcomeScreen.className = 'welcome-screen';
  
  const heading = document.createElement('h3');
  heading.textContent = 'Welcome to Lost & Found Support';
  
  const subtext = document.createElement('p');
  subtext.textContent = 'Please provide your details to start chatting with our team';
  
  // Create the form
  const form = document.createElement('form');
  form.id = 'userDetailForm';
  form.className = 'user-detail-form';
  
  // Name field
  const nameGroup = document.createElement('div');
  nameGroup.className = 'form-group';
  
  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', 'userName');
  nameLabel.textContent = 'Your Name';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.id = 'userName';
  nameInput.name = 'userName';
  nameInput.placeholder = 'Full Name';
  nameInput.required = true;
  nameInput.style.cssText = `
    display: block !important;
    visibility: visible !important;
    width: 100% !important;
    padding: 0.75rem !important;
    margin: 0.5rem 0 !important;
    border: 3px solid #2563eb !important;
    border-radius: 6px !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-size: 1rem !important;
    min-height: 45px !important;
    box-sizing: border-box !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10000 !important;
  `;
  
  nameGroup.appendChild(nameLabel);
  nameGroup.appendChild(nameInput);
  
  // Email field
  const emailGroup = document.createElement('div');
  emailGroup.className = 'form-group';
  
  const emailLabel = document.createElement('label');
  emailLabel.setAttribute('for', 'userEmail');
  emailLabel.textContent = 'Email Address';
  
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'userEmail';
  emailInput.name = 'userEmail';
  emailInput.placeholder = 'Email Address';
  emailInput.required = true;
  emailInput.style.cssText = `
    display: block !important;
    visibility: visible !important;
    width: 100% !important;
    padding: 0.75rem !important;
    margin: 0.5rem 0 !important;
    border: 3px solid #2563eb !important;
    border-radius: 6px !important;
    background-color: #ffffff !important;
    color: #000000 !important;
    font-size: 1rem !important;
    min-height: 45px !important;
    box-sizing: border-box !important;
    opacity: 1 !important;
    position: relative !important;
    z-index: 10000 !important;
  `;
  
  emailGroup.appendChild(emailLabel);
  emailGroup.appendChild(emailInput);
  
  // Submit button
  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'start-chat-btn';
  submitButton.textContent = 'Start Chat';
  
  // Add form elements
  form.appendChild(nameGroup);
  form.appendChild(emailGroup);
  form.appendChild(submitButton);
  
  // Add elements to welcome screen
  welcomeScreen.appendChild(heading);
  welcomeScreen.appendChild(subtext);
  welcomeScreen.appendChild(form);
  
  // Add welcome screen to content
  chatContent.appendChild(welcomeScreen);
  
  // Set up the form event listeners
  setupUserDetailForm();
  
  // Hide the chat form
  document.getElementById('chatFormContainer').style.display = 'none';
  
  // Clear idle timer
  clearTimeout(idleTimer);
  
  console.log('Chat reset complete. Form elements:', {
    nameInput: document.getElementById('userName'),
    emailInput: document.getElementById('userEmail'),
    form: document.getElementById('userDetailForm')
  });
}

// Set up user detail form after resetting chat
function setupUserDetailForm() {
  // Get new reference to the form
  userDetailForm = document.getElementById('userDetailForm');
  
  // Debug form visibility
  console.log('Setting up user detail form', userDetailForm);
  
  if (!userDetailForm) {
    console.error('User detail form not found!');
    return;
  }
  
  // Always start with completely empty form
  // No prefilling from previous chats to ensure a fresh start
  const nameInput = document.getElementById('userName');
  const emailInput = document.getElementById('userEmail');
  
  console.log('Form elements:', { nameInput, emailInput });
  
  // Clear all fields explicitly
  if (nameInput) nameInput.value = '';
  if (emailInput) emailInput.value = '';
  
  // Set up event listener
  userDetailForm.addEventListener('submit', function(e) {
    e.preventDefault();
    console.log('Form submitted');
    
    const name = document.getElementById('userName')?.value.trim() || '';
    const email = document.getElementById('userEmail')?.value.trim() || '';
    
    console.log('Form data:', { name, email });
    
    // Start chat with an empty query since we removed that field
    startChat(name, email, '');
  });
}

// Get HTML for the welcome screen with user details form
function getChatWelcomeHTML() {
  return `
    <div class="welcome-screen">
      <h3>Welcome to Lost & Found Support</h3>
      <p>Please provide your details to start chatting with our team</p>
      
      <form id="userDetailForm" class="user-detail-form">
        <div class="form-group">
          <label for="userName">Your Name</label>
          <input type="text" id="userName" name="userName" placeholder="Full Name" required>
        </div>
        <div class="form-group">
          <label for="userEmail">Email Address</label>
          <input type="email" id="userEmail" name="userEmail" placeholder="Email Address" required>
        </div>
        <!-- Removed the item inquiry field -->
        <button type="submit" class="start-chat-btn">Start Chat</button>
      </form>
    </div>
  `;
}

// Reset the idle timer
function resetIdleTimer() {
  if (!userChatId) return;
  
  // Clear existing timer
  clearTimeout(idleTimer);
  
  // Set new timer
  idleTimer = setTimeout(() => {
    handleIdleTimeout();
  }, IDLE_TIMEOUT);
}

// Handle idle timeout
function handleIdleTimeout() {
  if (!userChatId) return;
  
  // Only show warning if chat is active
  addSystemMessage('Your chat will end soon due to inactivity. Please respond to keep the chat active.');
  
  // Give an additional minute grace period
  idleTimer = setTimeout(() => {
    endChatDueToIdle();
  }, 60000);
}

// End chat due to idle timeout
function endChatDueToIdle() {
  if (!window.firebase?.firestore || !userChatId) {
    return;
  }
  
  const db = firebase.firestore();
  
  // Add system message that the chat has timed out
  db.collection(CHAT_COLLECTION).doc(userChatId)
    .collection(CHAT_MESSAGES_COLLECTION)
    .add({
      text: 'Chat automatically ended due to inactivity',
      sender: 'system',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  
  // Mark chat as inactive
  db.collection(CHAT_COLLECTION).doc(userChatId)
    .update({
      active: false,
      endTime: firebase.firestore.FieldValue.serverTimestamp(),
      endedBy: 'timeout'
    })
    .catch(error => {
      console.error('Error ending idle chat:', error);
    });
    
  // Local UI updates will happen via the chat document listener
}

// Format a timestamp for display
function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  try {
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      // Firebase Timestamp
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      // Firebase Timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular Date or string
      date = new Date(timestamp);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format the time
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (e) {
    console.error('Error formatting timestamp:', e);
    return '';
  }
}

// Show an error message
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chat-error';
  errorDiv.textContent = message;
  
  if (messagesList) {
    messagesList.appendChild(errorDiv);
  } else {
    chatContent.appendChild(errorDiv);
  }
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Scroll chat window to bottom
function scrollToBottom() {
  if (messagesList) {
    // Force scroll to absolute bottom with a slight delay to ensure rendering is complete
    setTimeout(() => {
      messagesList.scrollTop = messagesList.scrollHeight + 1000;
      console.log('Scrolled to bottom, height:', messagesList.scrollHeight);
    }, 50);
  }
}

// Add chat styles to the document
function addChatStyles() {
  if (document.getElementById('user-chat-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'user-chat-styles';
  style.textContent = `
    .chat-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #2563eb;
      border-radius: 50%;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9998;
      transition: transform 0.2s, background-color 0.2s;
    }
    
    .chat-button:hover {
      transform: scale(1.05);
      background-color: #1d4ed8;
    }
    
    .chat-button.active {
      background-color: #1e40af;
    }
    
    .chat-icon {
      font-size: 24px;
      line-height: 1;
    }
    
    .chat-widget {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 550px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      overflow: hidden;
    }
    
    .chat-header {
      background-color: #2563eb;
      color: white;
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chat-title {
      font-weight: 600;
      font-size: 1rem;
    }
    
    .chat-controls {
      display: flex;
      gap: 0.5rem;
    }
    
    .chat-control-btn {
      background: none;
      border: none;
      color: white;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }
    
    .chat-control-btn:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .chat-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      background-color: #f9fafb;
    }
    
    .welcome-screen {
      padding: 1rem;
    }
    
    .welcome-screen h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: #1f2937;
      font-size: 1.25rem;
    }
    
    .welcome-screen p {
      margin-bottom: 1rem;
      color: #6b7280;
    }
    
    .user-detail-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
    
    .form-group input,
    .form-group textarea {
      padding: 0.75rem;
      border: 2px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 1rem;
      width: 100%;
      background-color: #ffffff;
      color: #333333;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      outline: none;
    }
    
    .form-group input:focus,
    .form-group textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    
    .start-chat-btn {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 0.625rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    
    .start-chat-btn:hover {
      background-color: #1d4ed8;
    }
    
    .chat-form-container {
      padding: 0.75rem;
      border-top: 1px solid #e5e7eb;
      background-color: white;
    }
    
    .chat-form {
      display: flex;
      gap: 0.5rem;
    }
    
    .chat-form textarea {
      flex: 1;
      resize: none;
      padding: 0.625rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.875rem;
    }
    
    .chat-send-button {
      align-self: flex-end;
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .chat-send-button:hover {
      background-color: #1d4ed8;
    }
    
    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .chat-message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      position: relative;
      word-wrap: break-word;
    }
    
    .user-message {
      align-self: flex-end;
      background-color: #dbeafe;
      border-bottom-right-radius: 0;
    }
    
    .admin-message {
      align-self: flex-start;
      background-color: #f3f4f6;
      border-bottom-left-radius: 0;
    }
    
    .system-message {
      align-self: center;
      background-color: #f3f4f6;
      color: #6b7280;
      font-style: italic;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 16px;
      max-width: 90%;
      text-align: center;
    }
    
    .system-message.error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .message-time {
      font-size: 0.7rem;
      color: #6b7280;
      text-align: right;
      margin-top: 0.25rem;
    }
    
    .chat-loading {
      text-align: center;
      padding: 1rem;
      color: #6b7280;
    }
    
    .chat-error {
      background-color: #fee2e2;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      margin: 0.5rem 0;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    
    .chat-restart {
      text-align: center;
      padding: 1rem;
      margin-top: 1rem;
      background-color: #f3f4f6;
      border-radius: 8px;
    }
    
    .restart-chat-btn {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 0.5rem;
    }
    
    .restart-chat-btn:hover {
      background-color: #1d4ed8;
    }
    
    @media (max-width: 480px) {
      .chat-widget {
        width: calc(100% - 40px);
        height: calc(100% - 160px);
        right: 20px;
        bottom: 90px;
      }
    }
  `;
  
  document.head.appendChild(style);
}
