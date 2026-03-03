/**
 * User Live Chat Implementation
 * Provides the user-facing chat interface with required details collection
 */

// Configuration
const CHAT_COLLECTION = 'liveChats';
const CHAT_MESSAGES_COLLECTION = 'messages';
const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = 'htcONvQFGnnjNMtOf';
const EMAILJS_SERVICE_ID = 'service_rvn1rn4';
const EMAILJS_TEMPLATE_ID = 'template_twn4j4h';

// Email verification state
let verificationCode = null;
let verificationExpiry = null;
let lastCodeSentAt = 0;
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CODE_COOLDOWN_MS = 30 * 1000; // 30 seconds between sends

// Chat state
let userChatId = null;
let userInfo = null;
let idleTimer = null;
let messagesUnsubscribe = null;
let statusUnsubscribe = null;

// DOM Elements - will be initialized when needed
// chatButton has been removed
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
  // chatButton reference removed
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
  // Chat button has been removed to clean up the UI
  // The chat widget will only be accessible through dedicated buttons on item pages
  
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
  // Chat button has been removed
  // Only the dedicated buttons on item pages will open the chat
  
  // Close button for the chat widget
  document.getElementById('closeChat').addEventListener('click', closeChatWidget);
  
  // User details form submission
  userDetailForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Collect user information
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const queryEl = document.getElementById('userQuery');
    const query = queryEl ? queryEl.value.trim() : '';
    
    // Request email verification before starting chat
    requestEmailVerification(name, email, query);
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

    // Force rebuild of input fields when showing the widget
    setTimeout(function() {
      // createChatForm(); // Function does not exist
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
      requestEmailVerification(name, email, '');
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
  // chatButton reference removed
}

// Close chat widget and end chat if in progress
function closeChatWidget() {
  if (userChatId) {
    if (confirm('Are you sure you want to end this chat session?')) {
      endChat();
      chatWidget.style.display = 'none';
      // chatButton reference removed
    }
  } else {
    chatWidget.style.display = 'none';
    // chatButton reference removed
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
  
  // Try to get item info from the current page
  const chatBtn = document.getElementById('chat-with-staff-btn');
  const itemTitleEl = document.getElementById('item-title');
  let itemId = null;
  let itemTitle = '';
  
  if (chatBtn && chatBtn.dataset.itemId) {
    itemId = chatBtn.dataset.itemId;
    itemTitle = itemTitleEl ? itemTitleEl.textContent : '';
  }
  
  // Search for existing chat session
  db.collection(CHAT_COLLECTION)
    .where('userEmail', '==', email)
    .get()
    .then(snapshot => {
      let existingChat = null;
      
      if (!snapshot.empty) {
        // Filter results in memory to find the best match
        // We look for same name and same item ID
        const matches = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          // Check if name matches (case insensitive) and item ID matches
          if (data.userName && data.userName.toLowerCase() === name.toLowerCase()) {
            // If we are looking for a specific item chat
            if (itemId) {
              if (data.itemId === itemId) {
                matches.push({ id: doc.id, ...data });
              }
            } else {
              // General chat (no item ID)
              if (!data.itemId) {
                matches.push({ id: doc.id, ...data });
              }
            }
          }
        });
        
        // If we found matches, pick the most recent one
        if (matches.length > 0) {
          // Sort by startTime desc
          matches.sort((a, b) => {
             const timeA = a.startTime ? (a.startTime.seconds || 0) : 0;
             const timeB = b.startTime ? (b.startTime.seconds || 0) : 0;
             return timeB - timeA;
          });
          existingChat = matches[0];
        }
      }
      
      if (existingChat) {
        // RESUME EXISTING CHAT
        console.log('Restoring existing chat:', existingChat.id);
        userChatId = existingChat.id;
        
        // Update chat status to active
        return db.collection(CHAT_COLLECTION).doc(userChatId).update({
          active: true,
          // Don't overwrite original start time, maybe add lastResumedTime?
          lastResumedTime: firebase.firestore.FieldValue.serverTimestamp(),
          // Reset endedBy flags
          endedBy: firebase.firestore.FieldValue.delete() 
        }).then(() => {
          return 'restored';
        });
      } else {
        // CREATE NEW CHAT
        // Create a unique chat ID with timestamp to ensure uniqueness regardless of email
        const uniqueChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        userChatId = uniqueChatId;
        
        const chatData = {
          userName: name,
          userEmail: email,
          startTime: firebase.firestore.FieldValue.serverTimestamp(),
          active: true,
          unreadCount: 0,
          uniqueSessionId: uniqueChatId,
          isNewSession: true
        };
        
        if (itemId) {
          chatData.itemId = itemId;
          chatData.itemTitle = itemTitle;
          console.log('Chat includes item context:', chatData.itemTitle, 'itemId:', chatData.itemId);
        }
        
        return db.collection(CHAT_COLLECTION).doc(uniqueChatId).set(chatData).then(() => {
          return 'new';
        });
      }
    })
    .then((status) => {
      console.log('Chat session initialized:', status, 'ID:', userChatId);
      
      // Show chat interface
      initChatInterface();
      
      if (status === 'new') {
        // Add initial system message for new chat
        addSystemMessage('Chat started. An administrator will be with you shortly.');
        
        // Send the initial query as the first message
        if (initialQuery) {
          sendMessage(initialQuery);
        }
      } else {
        // Add welcome back message for restored chat
        // Delay slightly to allow Firestore to load existing messages first
        setTimeout(() => {
            addSystemMessage('Chat history restored. You can continue your conversation.');
            scrollToBottom();
        }, 1500);
      }
      
      // Start idle timer
      resetIdleTimer();
    })
    .catch(error => {
      console.error('Error starting chat:', error);
      showError('Failed to start chat session. Please try again.');
      // Revert UI to form
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
        <div id="chatImagePreview" style="
          display: none;
          padding: 4px 8px;
          margin-bottom: 6px;
          position: relative;
          max-width: 100%;
          overflow: hidden;
          box-sizing: border-box;">
        </div>
        <form id="chatForm" style="
          display: flex !important;
          gap: 4px !important;
          width: 100% !important;
          align-items: center !important;">
            <input type="file" id="chatImageInput" accept="image/*" style="display:none !important;">
            <button type="button" id="chatImageBtn" title="Send image" style="
              background: none !important;
              border: 1px solid #d1d5db !important;
              border-radius: 4px !important;
              cursor: pointer !important;
              height: 36px !important;
              width: 36px !important;
              min-width: 36px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              font-size: 18px !important;
              color: #6b7280 !important;
              padding: 0 !important;">📷</button>
            <input type="text" id="messageInput" placeholder="Type your message here..." style="
              flex: 1 !important;
              padding: 10px !important;
              border: 2px solid #2563eb !important;
              border-radius: 4px !important;
              font-size: 14px !important;
              height: 36px !important;
              background-color: white !important;
              color: black !important;
              box-sizing: border-box !important;
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;">
            <button type="submit" style="
              background-color: #2563eb !important;
              color: white !important;
              border: none !important;
              padding: 5px 15px !important;
              border-radius: 4px !important;
              font-weight: bold !important;
              cursor: pointer !important;
              height: 36px !important;
              min-width: 55px !important;
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
  
  // Set up image upload button
  const chatImageBtn = document.getElementById('chatImageBtn');
  const chatImageInput = document.getElementById('chatImageInput');
  const chatImagePreview = document.getElementById('chatImagePreview');
  let pendingImage = null;
  
  if (chatImageBtn && chatImageInput) {
    chatImageBtn.addEventListener('click', () => chatImageInput.click());
    
    chatImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        pendingImage = { file, dataUrl: ev.target.result };
        chatImagePreview.innerHTML = `
          <div style="position:relative; display:inline-block;">
            <img src="${ev.target.result}" style="max-height:60px; max-width:80px; object-fit:cover; border-radius:4px; border:1px solid #d1d5db;">
            <span id="removeImageBtn" style="
              position:absolute; top:-6px; right:-6px;
              background:#ef4444; color:white; border-radius:50%;
              width:18px; height:18px; font-size:12px;
              display:flex; align-items:center; justify-content:center;
              cursor:pointer; line-height:1;">✕</span>
          </div>`;
        chatImagePreview.style.display = 'block';
        
        document.getElementById('removeImageBtn').addEventListener('click', () => {
          pendingImage = null;
          chatImagePreview.innerHTML = '';
          chatImagePreview.style.display = 'none';
          chatImageInput.value = '';
        });
      };
      reader.readAsDataURL(file);
      chatImageInput.value = '';
    });
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
    const hasImage = !!pendingImage;
    
    if ((messageText || hasImage) && userChatId) {
      // Set flag to prevent duplicates
      isSubmitting = true;
      
      if (hasImage) {
        // Upload image to Firebase Storage then send
        const imgToSend = pendingImage;
        pendingImage = null;
        if (chatImagePreview) {
          chatImagePreview.innerHTML = '';
          chatImagePreview.style.display = 'none';
        }
        uploadAndSendImage(imgToSend, messageText).finally(() => {
          isSubmitting = false;
        });
      } else {
        // Send text message
        sendMessage(messageText);
        // Reset flag after a delay
        setTimeout(() => {
          isSubmitting = false;
        }, 1000);
      }
      messageInput.value = '';
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
    padding-bottom: 90px !important; /* Add padding at bottom to avoid messages being hidden by input */
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
    
    // Clear previous listeners if they exist to prevent duplicates
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }
    if (statusUnsubscribe) {
      statusUnsubscribe();
      statusUnsubscribe = null;
    }
    
    messagesUnsubscribe = db.collection(CHAT_COLLECTION).doc(userChatId)
      .collection(CHAT_MESSAGES_COLLECTION)
      .orderBy('timestamp', 'asc')
      .onSnapshot((snapshot) => {
        handleMessagesUpdate(snapshot);
      }, (error) => {
        console.error('Error listening to messages:', error);
        addSystemMessage(`Error: ${error.message}`, true);
      });
      
    // Also listen for chat status changes (e.g., if admin ends it)
    statusUnsubscribe = db.collection(CHAT_COLLECTION).doc(userChatId)
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
    let contentHTML = '';
    if (message.imageUrl) {
      contentHTML += `<img src="${message.imageUrl}" alt="Shared image" style="max-width:100%; max-height:200px; border-radius:8px; margin-bottom:4px; cursor:pointer; display:block;" onclick="window.open(this.src,'_blank')">`;
    }
    if (message.text) {
      contentHTML += `<div class="message-content">${message.text}</div>`;
    }
    messageDiv.innerHTML = `
      ${contentHTML}
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
function sendMessage(messageText, imageUrl) {
  if (!window.firebase?.firestore) {
    showError('Chat service is currently unavailable');
    return;
  }
  
  const db = firebase.firestore();
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
  // Build message data
  const messageData = {
    text: messageText || '',
    sender: 'user',
    timestamp: timestamp
  };
  
  if (imageUrl) {
    messageData.imageUrl = imageUrl;
    messageData.type = 'image';
  }
  
  // Add message to the chat
  db.collection(CHAT_COLLECTION).doc(userChatId)
    .collection(CHAT_MESSAGES_COLLECTION)
    .add(messageData)
    .then(() => {
      // Update the chat document with last message info
      return db.collection(CHAT_COLLECTION).doc(userChatId).update({
        lastMessage: imageUrl ? (messageText || '📷 Image') : messageText,
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

// Resize image to keep data URL small enough for Firestore (max 800px)
function resizeImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 800;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Send image as a resized data URL directly (no Firebase Storage needed)
async function uploadAndSendImage(imageData, messageText) {
  try {
    addSystemMessage('Sending image...');
    
    // Resize image to keep it small
    const resizedUrl = await resizeImage(imageData.dataUrl);
    
    // Remove sending message
    const msgs = messagesList?.querySelectorAll('.system-message');
    if (msgs) {
      msgs.forEach(m => {
        if (m.textContent.includes('Sending image')) m.remove();
      });
    }
    
    // Send directly as data URL in Firestore message
    sendMessage(messageText, resizedUrl);
    console.log('Image sent successfully');
  } catch (error) {
    console.error('Error sending image:', error);
    // Last resort fallback
    sendMessage(messageText, imageData.dataUrl);
  }
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
  
  // Add event listener to restart button - attach directly to the element we just created
  // This is more reliable than getElementById
  const restartBtn = restartDiv.querySelector('button');
  if (restartBtn) {
    console.log('Attaching listener to Restart Chat button');
    restartBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Restart Chat button clicked');
      resetChat();
    });
  } else {
    console.error('Restart button not found in the new div');
  }
  
  // Reset chat ID
  userChatId = null;
}

// Reset chat to initial state
function resetChat() {
  // Clear real-time listeners
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
    messagesUnsubscribe = null;
  }
  if (statusUnsubscribe) {
    statusUnsubscribe();
    statusUnsubscribe = null;
  }
  
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
  
  // Hide the chat form if it exists
  const chatFormContainer = document.getElementById('chatFormContainer');
  if (chatFormContainer) {
    chatFormContainer.style.display = 'none';
  }
  
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
    
    // Request email verification before starting chat
    requestEmailVerification(name, email, '');
  });
}

// Initialize EmailJS
function initEmailJS() {
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('EmailJS initialized');
  } else {
    console.warn('EmailJS SDK not loaded');
  }
}

// Generate a 6-digit verification code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Request email verification - shows verification step
function requestEmailVerification(name, email, query) {
  if (!name || !email) {
    alert('Please provide both your name and email.');
    return;
  }
  
  // Replace the welcome screen with verification UI
  if (!chatContent) return;
  
  chatContent.innerHTML = `
    <div class="welcome-screen" style="padding: 1rem;">
      <h3 style="margin: 0 0 0.25rem 0; font-size: 1.1rem;">Verify Your Email</h3>
      <p style="color: #6b7280; font-size: 0.85rem; margin: 0 0 0.75rem 0;">We'll send a 6-digit code to <strong>${email}</strong></p>
      
      <div id="verifyMsg" style="display:none; padding:8px; border-radius:6px; margin-bottom:8px; font-size:0.85rem;"></div>
      
      <button id="sendCodeBtn" type="button" style="
        display: block; width: 100%; padding: 10px; margin-bottom: 10px;
        background: #2563eb; color: white; border: none; border-radius: 6px;
        font-weight: bold; cursor: pointer; font-size: 0.95rem;">Send Verification Code</button>
      
      <div id="codeInputSection" style="display:none;">
        <label style="display:block; font-weight:600; margin-bottom:4px; font-size:0.9rem;">Enter 6-digit Code</label>
        <input type="text" id="verifyCodeInput" maxlength="6" placeholder="000000" style="
          display: block; width: 100%; padding: 10px; margin-bottom: 10px;
          border: 2px solid #2563eb; border-radius: 6px; font-size: 1.2rem;
          text-align: center; letter-spacing: 8px; font-weight: bold;
          box-sizing: border-box; background: white; color: black;">
        <button id="verifyCodeBtn" type="button" style="
          display: block; width: 100%; padding: 10px;
          background: #16a34a; color: white; border: none; border-radius: 6px;
          font-weight: bold; cursor: pointer; font-size: 0.95rem;">Verify & Start Chat</button>
      </div>
      
      <button id="backToFormBtn" type="button" style="
        display: block; width: 100%; padding: 8px; margin-top: 8px;
        background: none; color: #6b7280; border: 1px solid #d1d5db; border-radius: 6px;
        cursor: pointer; font-size: 0.85rem;">← Back</button>
    </div>
  `;
  
  // Send Code button
  document.getElementById('sendCodeBtn').addEventListener('click', () => {
    sendVerificationCode(name, email);
  });
  
  // Verify Code button
  document.getElementById('verifyCodeBtn').addEventListener('click', () => {
    const inputCode = document.getElementById('verifyCodeInput').value.trim();
    if (verifyCode(inputCode)) {
      // Verification successful - start chat
      startChat(name, email, query);
    }
  });
  
  // Allow Enter key on code input
  document.getElementById('verifyCodeInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('verifyCodeBtn')?.click();
    }
  });
  
  // Back button
  document.getElementById('backToFormBtn').addEventListener('click', () => {
    // Reset verification state
    verificationCode = null;
    verificationExpiry = null;
    // Rebuild the welcome form
    chatContent.innerHTML = getChatWelcomeHTML();
    setupUserDetailForm();
    // Prefill the fields
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    if (nameEl) nameEl.value = name;
    if (emailEl) emailEl.value = email;
  });
}

// Send verification code via EmailJS
function sendVerificationCode(name, email) {
  const msgEl = document.getElementById('verifyMsg');
  const sendBtn = document.getElementById('sendCodeBtn');
  const codeSection = document.getElementById('codeInputSection');
  
  // Check if EmailJS is configured
  if (EMAILJS_PUBLIC_KEY === 'YOUR_EMAILJS_PUBLIC_KEY' || 
      EMAILJS_SERVICE_ID === 'YOUR_EMAILJS_SERVICE_ID' || 
      EMAILJS_TEMPLATE_ID === 'YOUR_EMAILJS_TEMPLATE_ID') {
    showVerifyMsg('System Error: Email service not configured properly.', 'error');
    return;
  }
  
  // Rate limit check
  const now = Date.now();
  if (now - lastCodeSentAt < CODE_COOLDOWN_MS) {
    const waitSec = Math.ceil((CODE_COOLDOWN_MS - (now - lastCodeSentAt)) / 1000);
    showVerifyMsg(`Please wait ${waitSec}s before requesting a new code.`, 'warning');
    return;
  }
  
  // Generate code
  verificationCode = generateCode();
  verificationExpiry = Date.now() + CODE_EXPIRY_MS;
  
  // Disable button and show loading
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  sendBtn.style.opacity = '0.6';
  
  // Initialize EmailJS if not done
  if (typeof emailjs !== 'undefined') {
    try {
      emailjs.init({
        publicKey: EMAILJS_PUBLIC_KEY,
      });
    } catch (e) {
      console.warn('EmailJS init warning:', e);
    }
  }
  
  if (typeof emailjs === 'undefined') {
    showVerifyMsg('Email service not available. Please try again later.', 'error');
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Verification Code';
    sendBtn.style.opacity = '1';
    return;
  }
  
  // Send email via EmailJS
  // We send multiple variants of the email variable to ensure it matches whatever is configured in the EmailJS template
  const templateParams = {
    to_email: email,
    email: email,        // Common fallback
    recipient: email,    // Common fallback
    reply_to: email,     // Common fallback
    to: email,           // Another fallback
    target_email: email, // Another fallback
    to_name: name,
    verification_code: verificationCode,
    from_name: 'Lost & Found - Baguio City'
  };
  
  console.log('Sending EmailJS payload:', templateParams);
  
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, {
    publicKey: EMAILJS_PUBLIC_KEY,
  })
  .then(() => {
    lastCodeSentAt = Date.now();
    showVerifyMsg('Verification code sent! Check your email.', 'success');
    // Show code input
    if (codeSection) codeSection.style.display = 'block';
    // Update button to resend
    sendBtn.textContent = 'Resend Code';
    sendBtn.disabled = false;
    sendBtn.style.opacity = '1';
    // Focus the code input
    document.getElementById('verifyCodeInput')?.focus();
  })
  .catch((error) => {
    console.error('EmailJS FAILED:', error);
    if (error.text) console.error('Error Details:', error.text);
    
    let errorMsg = 'Failed to send code. ';
    
    // Check for common issues
    if (window.location.protocol === 'file:') {
      errorMsg += 'WARNING: EmailJS often fails when running from "file://" protocol. Please use a local server (localhost) or deploy the site. ';
      console.warn('EmailJS Protocol Warning: APIs often block file:// origin. Use a local server.');
    }
    
    if (error.text && error.text.includes('recipients address is empty')) {
      errorMsg = 'Configuration Error: "To Email" field is missing in your EmailJS Template. Please go to EmailJS -> Email Templates -> Settings, and set "To Email" to {{to_email}}. ';
    } else if (error.status === 0 || error.text === 'Network Error') {
      errorMsg += 'Network error. Please check your internet connection or disable Ad Blockers (they often block EmailJS).';
    } else if (error.status === 400) {
      errorMsg += 'Invalid configuration. Please check your EmailJS Public Key and IDs.';
    } else if (error.status === 412) {
      errorMsg += 'Template error. The variables in your code do not match your EmailJS template.';
    } else {
      errorMsg += error.text || 'Unknown error. Check console (F12) for details.';
    }
    
    showVerifyMsg(errorMsg, 'error');
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Verification Code';
    sendBtn.style.opacity = '1';

    // Add Test Mode fallback link
    const msgEl = document.getElementById('verifyMsg');
    if (msgEl) {
        const testLink = document.createElement('div');
        testLink.style.marginTop = '8px';
        testLink.style.fontSize = '0.8rem';
        testLink.innerHTML = `<a href="#" id="testModeLink" style="color: #6b7280; text-decoration: underline;">Test Mode: Click here to see code (Bypass Email)</a>`;
        msgEl.appendChild(testLink);
        
        document.getElementById('testModeLink').addEventListener('click', (e) => {
            e.preventDefault();
            alert(`TEST MODE CODE: ${verificationCode}`);
            console.log(`TEST MODE CODE: ${verificationCode}`);
            if (codeSection) codeSection.style.display = 'block';
            document.getElementById('verifyCodeInput').value = verificationCode;
        });
    }
  });
}

// Verify the entered code
function verifyCode(inputCode) {
  if (!inputCode || inputCode.length !== 6) {
    showVerifyMsg('Please enter the 6-digit code.', 'warning');
    return false;
  }
  
  if (!verificationCode || !verificationExpiry) {
    showVerifyMsg('No code has been sent. Please request a new code.', 'error');
    return false;
  }
  
  if (Date.now() > verificationExpiry) {
    showVerifyMsg('Code has expired. Please request a new code.', 'error');
    verificationCode = null;
    return false;
  }
  
  if (inputCode !== verificationCode) {
    showVerifyMsg('Incorrect code. Please try again.', 'error');
    return false;
  }
  
  // Code is valid - reset state
  verificationCode = null;
  verificationExpiry = null;
  return true;
}

// Show message in the verification UI
function showVerifyMsg(text, type) {
  const el = document.getElementById('verifyMsg');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = text;
  if (type === 'success') {
    el.style.background = '#dcfce7';
    el.style.color = '#166534';
  } else if (type === 'error') {
    el.style.background = '#fef2f2';
    el.style.color = '#991b1b';
  } else {
    el.style.background = '#fef9c3';
    el.style.color = '#854d0e';
  }
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
