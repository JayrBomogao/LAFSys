/**
 * Admin Live Chat Implementation
 * Provides real-time chat functionality for the admin dashboard
 */

// Firebase chat configuration
const CHAT_COLLECTION = 'liveChats';
const CHAT_MESSAGES_COLLECTION = 'messages';
const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

// Chat state management
let currentChats = [];
let activeChatId = null;
let idleTimers = {};
let currentChatUser = null;

// DOM elements - will be initialized on load
let chatContainer;
let activeChatsList;
let chatWindow;
let messagesList;
let chatForm;
let endChatButton;

// Initialize live chat system
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing Admin Live Chat system');
  
  // Add chat styles
  addChatStyles();
  
  // Initialize UI components when switching to inbox section
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    if (link.getAttribute('data-section') === 'inbox') {
      link.addEventListener('click', initializeChatInterface);
    }
  });
});

// MutationObserver for monitoring messages list changes
let messagesObserver = null;

// Initialize chat interface
function initializeChatInterface() {
  console.log('Setting up chat interface');
  
  // Get the inbox container
  const inboxSection = document.getElementById('section-inbox');
  if (!inboxSection) {
    console.error('Inbox section not found');
    return;
  }
  
  // Create the container directly with HTML
  inboxSection.innerHTML = `
    <h2>Live Chat Support</h2>
    <div class="live-chat-container">
      <div class="active-chats-sidebar">
        <h3>Active Chats</h3>
        <ul id="activeChatsList" class="active-chats-list">
          <li class="no-chats-message">No active chats</li>
        </ul>
      </div>
      <div class="chat-main-area">
        <div id="chatWindow" class="chat-window">
          <div class="chat-welcome-message">
            <h3>Welcome to Admin Chat Support</h3>
            <p>Select an active chat from the sidebar or wait for new chat requests.</p>
          </div>
        </div>
        <div id="chatControls" class="chat-controls" style="display: none;">
          <form id="chatForm" class="chat-form">
            <textarea id="messageInput" placeholder="Type your message here..." rows="3"></textarea>
            <button type="submit" class="chat-send-button">Send</button>
          </form>
          <button id="endChatButton" class="end-chat-button">End Chat</button>
        </div>
      </div>
    </div>
  `;
  
  // Add a very simple, focused scroll helper directly to the page
  const scrollScript = document.createElement('script');
  scrollScript.textContent = `
    // Utility function to force scroll to bottom
    function forceAdminChatScroll() {
      const messagesList = document.getElementById('messagesList');
      if (!messagesList) return;
      
      // Set timeout for DOM to stabilize
      setTimeout(() => {
        // Simple but effective approach
        messagesList.scrollTop = 999999;
        
        // Try direct scrollIntoView on last message if available
        const messages = messagesList.querySelectorAll('.chat-message');
        if (messages && messages.length > 0) {
          try {
            const lastMessage = messages[messages.length - 1];
            lastMessage.scrollIntoView();
          } catch (e) {
            console.log('ScrollIntoView failed, using fallback');
            messagesList.scrollTop = messagesList.scrollHeight;
          }
        }
      }, 50);
    }
    
    // Watch for new messages and scroll when they appear
    const adminChatObserver = new MutationObserver(() => {
      forceAdminChatScroll();
    });
    
    // Setup automatic scrolling when active chat exists
    function setupAdminChatAutoScroll() {
      const messagesList = document.getElementById('messagesList');
      if (!messagesList) return;
      
      // Disconnect any existing observer
      adminChatObserver.disconnect();
      
      // Observe the messages list for changes
      adminChatObserver.observe(messagesList, {
        childList: true,
        subtree: true,
        characterData: true
      });
      
      // Initial scroll
      forceAdminChatScroll();
    }
    
    // Check for messages list periodically
    const adminChatScrollInterval = setInterval(() => {
      const messagesList = document.getElementById('messagesList');
      if (messagesList) {
        setupAdminChatAutoScroll();
      }
    }, 500);
  `;
  document.head.appendChild(scrollScript);
  
  // Get references to key elements
  chatContainer = document.querySelector('.live-chat-container');
  activeChatsList = document.getElementById('activeChatsList');
  chatWindow = document.getElementById('chatWindow');
  chatForm = document.getElementById('chatForm');
  messageInput = document.getElementById('messageInput');
  endChatButton = document.getElementById('endChatButton');
  chatControls = document.getElementById('chatControls');
  
  // Set up event listeners
  setupEventListeners();
  
  // Load active chats from Firebase
  loadActiveChats();
}

// Flag to prevent duplicate message submissions
let isSubmitting = false;

// Add event listeners
function setupEventListeners() {
  // Remove any existing event listeners first to prevent duplicates
  chatForm.removeEventListener('submit', handleFormSubmit);
  messageInput.removeEventListener('keydown', handleKeyDown);
  endChatButton.removeEventListener('click', handleEndChat);
  
  // Add the event listeners with named functions
  chatForm.addEventListener('submit', handleFormSubmit);
  messageInput.addEventListener('keydown', handleKeyDown);
  endChatButton.addEventListener('click', handleEndChat);
  
  console.log('Event listeners initialized');
}

// Handle form submission
function handleFormSubmit(e) {
  e.preventDefault();
  sendMessageIfValid();
}

// Handle keydown event
function handleKeyDown(e) {
  // Only handle Enter without Shift
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault(); // Prevent new line
    sendMessageIfValid();
  }
}

// Handle end chat button click
function handleEndChat() {
  if (activeChatId) {
    endChat(activeChatId);
  }
}

// Common function to send message if valid
function sendMessageIfValid() {
  // Prevent duplicate submissions
  if (isSubmitting) {
    console.log('Preventing duplicate message');
    return;
  }
  
  const messageText = messageInput.value.trim();
  if (messageText && activeChatId) {
    // Set flag to prevent duplicates
    isSubmitting = true;
    
    // Send the message
    sendMessage(activeChatId, messageText, 'admin');
    messageInput.value = '';
    
    // Force immediate scroll using all available methods
    if (typeof window.forceAdminChatScroll === 'function') {
      console.log('Using direct DOM scrolling');
      window.forceAdminChatScroll();
    }
    
    // Force scroll to bottom after sending message
    scrollToBottom();
    
    // Schedule multiple aggressive scrolls after sending
    for (let delay of [50, 100, 200, 500, 1000]) {
      setTimeout(() => {
        if (typeof window.forceAdminChatScroll === 'function') {
          window.forceAdminChatScroll();
        }
        scrollToBottom();
      }, delay);
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isSubmitting = false;
    }, 300);
  }
}

// Load active chats from Firebase
function loadActiveChats() {
  if (!window.firebase?.firestore) {
    showError('Firebase not available');
    return;
  }
  
  const db = firebase.firestore();
  
  // Listen for active chats - only show truly new sessions
  db.collection(CHAT_COLLECTION)
    .where('active', '==', true)
    .where('isNewSession', '==', true) // Only show chats that are marked as new sessions
    .onSnapshot((snapshot) => {
      handleActiveChatsUpdate(snapshot);
    }, (error) => {
      console.error('Error loading active chats:', error);
      showError('Failed to load active chats');
    });
}

// Handle updates to active chats
function handleActiveChatsUpdate(snapshot) {
  currentChats = [];
  let hasChats = false;
  
  snapshot.forEach((doc) => {
    const chat = {
      id: doc.id,
      ...doc.data()
    };
    currentChats.push(chat);
    hasChats = true;
  });
  
  // Update UI
  updateActiveChatsUI(hasChats);
  
  // Set up idle timers for each chat
  currentChats.forEach(chat => {
    setupIdleTimer(chat.id);
  });
}

// Update the active chats sidebar
function updateActiveChatsUI(hasChats) {
  if (!hasChats) {
    activeChatsList.innerHTML = `<li class="no-chats-message">No active chats</li>`;
    return;
  }
  
  // Clear current list
  activeChatsList.innerHTML = '';
  
  // Add each chat to the list
  currentChats.forEach(chat => {
    const li = document.createElement('li');
    li.className = `chat-item ${activeChatId === chat.id ? 'active' : ''}`;
    li.dataset.chatId = chat.id;
    
    const lastMessage = chat.lastMessage || 'New chat';
    const timestamp = chat.lastTimestamp ? formatTimestamp(chat.lastTimestamp) : '';
    
    li.innerHTML = `
      <div class="chat-item-user">${chat.userName || 'Unknown User'}</div>
      <div class="chat-item-preview">${lastMessage}</div>
      <div class="chat-item-time">${timestamp}</div>
      ${chat.unreadCount ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
    `;
    
    // Add click handler to select this chat
    li.addEventListener('click', () => selectChat(chat.id));
    
    activeChatsList.appendChild(li);
  });
}

// Select a chat to display
function selectChat(chatId) {
  // Update active chat ID
  activeChatId = chatId;
  currentChatUser = currentChats.find(c => c.id === chatId);
  
  // Update sidebar selection
  document.querySelectorAll('.chat-item').forEach(item => {
    item.classList.toggle('active', item.dataset.chatId === chatId);
  });
  
  // Show chat controls
  chatControls.style.display = '';
  
  // Load chat messages
  loadChatMessages(chatId);
  
  // Reset idle timer
  resetIdleTimer(chatId);
  
  // Force window resizing to trigger proper layout recalculation
  const triggerResize = () => {
    window.dispatchEvent(new Event('resize'));
    
    // Focus on message input to ensure keyboard is ready
    if (messageInput) {
      setTimeout(() => {
        messageInput.focus();
        // Force scrolling after focusing
        if (typeof window.forceAdminChatScroll === 'function') {
          window.forceAdminChatScroll();
        }
      }, 200);
    }
  };
  
  // Execute resize triggering multiple times with delays
  triggerResize();
  setTimeout(triggerResize, 300);
  setTimeout(triggerResize, 1000);
  
  // Disconnect any existing message observer
  if (messagesObserver) {
    messagesObserver.disconnect();
  }
  
  // Mark as read in Firebase
  if (window.firebase?.firestore) {
    firebase.firestore().collection(CHAT_COLLECTION).doc(chatId).update({
      unreadCount: 0
    }).catch(error => {
      console.error('Error updating unread count:', error);
    });
  }
}

// Load messages for a specific chat
function loadChatMessages(chatId) {
  if (!window.firebase?.firestore) {
    showError('Firebase not available');
    return;
  }
  
  // Clear current messages
  chatWindow.innerHTML = '<div class="chat-loading">Loading messages...</div>';
  
  const db = firebase.firestore();
  
  // Get user info for this chat
  db.collection(CHAT_COLLECTION).doc(chatId).get()
    .then(doc => {
      if (doc.exists) {
        const chatData = doc.data();
        
        // Display user info
        chatWindow.innerHTML = `
          <div class="chat-user-info">
            <div class="chat-user-name">${chatData.userName || 'Unknown User'}</div>
            <div class="chat-user-email">${chatData.userEmail || 'No email provided'}</div>
            <div class="chat-start-time">Started: ${formatTimestamp(chatData.startTime)}</div>
          </div>
          <div id="messagesList" class="messages-list"></div>
        `;
        
        messagesList = document.getElementById('messagesList');
        
        // Set up MutationObserver to detect when messages are added and force scroll
        if (messagesList) {
          // Disconnect any existing observer
          if (messagesObserver) {
            messagesObserver.disconnect();
          }
          
          // Create a new observer
          messagesObserver = new MutationObserver((mutations) => {
            console.log('Messages list mutation detected - scrolling down');
            // Force multiple scrolls to ensure it reaches the bottom
            scrollToBottom();
          });
          
          // Start observing
          messagesObserver.observe(messagesList, {
            childList: true,      // Watch for changes to child elements
            subtree: true,        // Watch the entire subtree
            characterData: false  // Don't need to watch for character data changes
          });
          console.log('MutationObserver attached to messages list');
        }
        
        // Set up real-time listener for messages
        db.collection(CHAT_COLLECTION).doc(chatId)
          .collection(CHAT_MESSAGES_COLLECTION)
          .orderBy('timestamp', 'asc')
          .onSnapshot((snapshot) => {
            handleMessagesUpdate(snapshot);
          }, (error) => {
            console.error('Error listening to messages:', error);
            messagesList.innerHTML += `<div class="system-message error">Error loading messages: ${error.message}</div>`;
          });
      } else {
        chatWindow.innerHTML = '<div class="chat-error">Chat not found</div>';
      }
    })
    .catch(error => {
      console.error('Error getting chat details:', error);
      chatWindow.innerHTML = `<div class="chat-error">Error: ${error.message}</div>`;
    });
}

// Handle updates to messages
function handleMessagesUpdate(snapshot) {
  let addedMessages = false;
  
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added') {
      const message = change.doc.data();
      addMessageToUI(message);
      addedMessages = true;
    }
  });
  
  // Always scroll to bottom when messages are added - use multiple approaches
  if (addedMessages) {
    // Direct immediate scroll
    if (messagesList) {
      messagesList.scrollTop = messagesList.scrollHeight + 5000;
    }
    
    // Use multiple delayed scrolls to ensure it works
    setTimeout(() => {
      if (messagesList) {
        messagesList.scrollTop = messagesList.scrollHeight + 5000;
        console.log('First delayed scroll triggered');
      }
    }, 10);
    
    setTimeout(() => {
      if (messagesList) {
        messagesList.scrollTop = messagesList.scrollHeight + 5000;
        console.log('Second delayed scroll triggered');
      }
    }, 100);
    
    // Reset idle timer
    resetIdleTimer(activeChatId);
  }
}

// Add a message to the UI
function addMessageToUI(message) {
  if (!messagesList) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${message.sender === 'admin' ? 'admin-message' : 'user-message'}`;
  
  const timestamp = formatTimestamp(message.timestamp);
  
  messageDiv.innerHTML = `
    <div class="message-content">${message.text}</div>
    <div class="message-time">${timestamp}</div>
  `;
  
  messagesList.appendChild(messageDiv);
  
  // Force scroll using multiple methods
  // 1. Direct scroll
  messagesList.scrollTop = messagesList.scrollHeight + 5000;
  
  // 2. Use the global helper if available
  if (typeof window.forceAdminChatScroll === 'function') {
    window.forceAdminChatScroll();
  }
  
  // 3. Use our internal scroll function
  scrollToBottom();
  
  // 4. Schedule another scroll after a short delay
  setTimeout(() => {
    if (typeof window.forceAdminChatScroll === 'function') {
      window.forceAdminChatScroll();
    }
  }, 100);
}

// Send a message
function sendMessage(chatId, messageText, sender) {
  if (!window.firebase?.firestore) {
    showError('Firebase not available');
    return;
  }
  
  const db = firebase.firestore();
  const timestamp = firebase.firestore.FieldValue.serverTimestamp();
  
  // Add message to the chat
  db.collection(CHAT_COLLECTION).doc(chatId)
    .collection(CHAT_MESSAGES_COLLECTION)
    .add({
      text: messageText,
      sender: sender,
      timestamp: timestamp
    })
    .then(() => {
      // Update the chat document with last message info
      return db.collection(CHAT_COLLECTION).doc(chatId).update({
        lastMessage: messageText,
        lastTimestamp: timestamp,
        lastSender: sender,
        unreadCount: firebase.firestore.FieldValue.increment(sender === 'admin' ? 0 : 1)
      });
    })
    .catch(error => {
      console.error('Error sending message:', error);
      showError('Failed to send message');
    });
}

// End a chat session
function endChat(chatId) {
  if (!window.firebase?.firestore) {
    showError('Firebase not available');
    return;
  }
  
  if (confirm('Are you sure you want to end this chat?')) {
    const db = firebase.firestore();
    
    // Add system message that the chat has ended
    db.collection(CHAT_COLLECTION).doc(chatId)
      .collection(CHAT_MESSAGES_COLLECTION)
      .add({
        text: 'Chat ended by administrator',
        sender: 'system',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    
    // Mark chat as inactive
    db.collection(CHAT_COLLECTION).doc(chatId)
      .update({
        active: false,
        endTime: firebase.firestore.FieldValue.serverTimestamp(),
        endedBy: 'admin'
      })
      .then(() => {
        // Clear idle timer
        clearTimeout(idleTimers[chatId]);
        delete idleTimers[chatId];
        
        // Reset UI
        activeChatId = null;
        chatWindow.innerHTML = `
          <div class="chat-welcome-message">
            <h3>Chat Ended</h3>
            <p>The chat session has been closed.</p>
          </div>
        `;
        chatControls.style.display = 'none';
      })
      .catch(error => {
        console.error('Error ending chat:', error);
        showError('Failed to end chat');
      });
  }
}

// Set up idle timer for a chat
function setupIdleTimer(chatId) {
  // Clear any existing timer
  if (idleTimers[chatId]) {
    clearTimeout(idleTimers[chatId]);
  }
  
  // Start a new idle timer
  resetIdleTimer(chatId);
}

// Reset the idle timer for a chat
function resetIdleTimer(chatId) {
  // Clear existing timer
  clearTimeout(idleTimers[chatId]);
  
  // Set new timer
  idleTimers[chatId] = setTimeout(() => {
    handleIdleTimeout(chatId);
  }, IDLE_TIMEOUT);
}

// Handle idle timeout
function handleIdleTimeout(chatId) {
  console.log(`Chat ${chatId} has been idle for too long`);
  
  // Only end the chat if it's still active
  if (currentChats.some(c => c.id === chatId)) {
    // Add system message
    if (window.firebase?.firestore) {
      const db = firebase.firestore();
      
      // Add system message that the chat has timed out
      db.collection(CHAT_COLLECTION).doc(chatId)
        .collection(CHAT_MESSAGES_COLLECTION)
        .add({
          text: 'Chat automatically ended due to inactivity',
          sender: 'system',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      // Mark chat as inactive
      db.collection(CHAT_COLLECTION).doc(chatId)
        .update({
          active: false,
          endTime: firebase.firestore.FieldValue.serverTimestamp(),
          endedBy: 'timeout'
        })
        .catch(error => {
          console.error('Error ending idle chat:', error);
        });
    }
    
    // Reset UI if this was the active chat
    if (activeChatId === chatId) {
      activeChatId = null;
      chatWindow.innerHTML = `
        <div class="chat-welcome-message">
          <h3>Chat Ended</h3>
          <p>The chat session has been closed due to inactivity.</p>
        </div>
      `;
      chatControls.style.display = 'none';
    }
  }
  
  // Clean up the timer
  delete idleTimers[chatId];
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
    
    // Format the date
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
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
  
  chatWindow.appendChild(errorDiv);
  
  // Remove after 5 seconds
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

// Scroll chat window to bottom using the global helper function
function scrollToBottom() {
  if (!messagesList) return;
  
  console.log('Scrolling to bottom using global helper');
  
  // Use the global helper if available
  if (typeof window.forceAdminChatScroll === 'function') {
    window.forceAdminChatScroll();
  } else {
    // Fallback if helper not available yet
    messagesList.scrollTop = messagesList.scrollHeight + 5000;
  }
}

// Add chat styles to the document
function addChatStyles() {
  if (document.getElementById('admin-chat-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'admin-chat-styles';
  style.textContent = `
    .live-chat-container {
      display: flex;
      height: calc(100vh - 220px);
      min-height: 500px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background-color: #fff;
      overflow: hidden;
    }
    
    .active-chats-sidebar {
      width: 300px;
      border-right: 1px solid #e5e7eb;
      background-color: #f9fafb;
      overflow-y: auto;
    }
    
    .active-chats-sidebar h3 {
      padding: 1rem;
      margin: 0;
      border-bottom: 1px solid #e5e7eb;
      font-size: 1rem;
      color: #374151;
    }
    
    .active-chats-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .chat-item {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    .chat-item:hover {
      background-color: #f3f4f6;
      transform: translateX(5px);
      box-shadow: -3px 0 0 #3b82f6;
    }
    
    .chat-item.active {
      background-color: #dbeafe;
      border-left: 4px solid #2563eb;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
    }
    
    .chat-item-user {
      font-weight: 700;
      color: #1e40af;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      font-size: 1rem;
    }
    
    .chat-item-user:before {
      content: '👤';
      margin-right: 0.5rem;
      font-size: 1.1rem;
    }
    
    .chat-item-preview {
      font-size: 0.875rem;
      color: #4b5563;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
      position: relative;
      font-style: italic;
    }
    
    .chat-item-preview:before {
      content: '💬';
      position: absolute;
      left: 0;
      font-size: 0.875rem;
      opacity: 0.7;
    }
    
    .chat-item-time {
      font-size: 0.75rem;
      color: #6b7280;
      text-align: right;
      margin-left: auto;
      background-color: #f1f5f9;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: 500;
    }
    
    .chat-item.active .chat-item-user,
    .chat-item.active .chat-item-preview {
      color: #1e3a8a;
    }
    
    .no-chats-message {
      padding: 1.5rem;
      color: #6b7280;
      text-align: center;
      font-style: italic;
    }
    
    .chat-main-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #fff;
    }
    
    .chat-window {
      flex: 1;
      padding: 1rem;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      background-color: #f9fafb;
      display: flex !important;
      flex-direction: column !important;
      max-height: calc(100vh - 300px) !important;
      height: 100% !important;
    }
    
    .messages-list {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.75rem !important;
      flex: 1 !important;
      overflow-y: scroll !important; /* Force scroll always */
      height: calc(100% - 80px) !important;
      min-height: 300px !important;
      max-height: 500px !important;
      padding-bottom: 60px !important; /* Extra padding at bottom */
      scroll-behavior: smooth !important;
      position: relative !important;
      z-index: 100 !important;
      margin-bottom: 20px !important;
    }
    
    /* Force chat messages to display properly */
    .chat-message {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 200 !important;
      min-height: 30px !important;
    }
    
    .chat-welcome-message {
      text-align: center;
      padding: 3rem 1rem;
      color: #6b7280;
    }
    
    .chat-welcome-message h3 {
      margin-top: 0;
      margin-bottom: 1rem;
      color: #1f2937;
    }
    
    .chat-user-info {
      background-color: #dbeafe;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    
    .chat-user-name {
      font-weight: 700;
      font-size: 1.25rem;
      color: #1e40af;
      margin-bottom: 0.5rem;
    }
    
    .chat-user-email {
      color: #3b82f6;
      margin-bottom: 0.75rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
    }
    
    .chat-user-email:before {
      content: '✉️';
      margin-right: 0.5rem;
    }
    
    .chat-start-time {
      font-size: 0.85rem;
      color: #4b5563;
      display: flex;
      align-items: center;
      border-top: 1px solid rgba(37, 99, 235, 0.2);
      padding-top: 0.75rem;
      margin-top: 0.75rem;
    }
    
    .chat-start-time:before {
      content: '🕒';
      margin-right: 0.5rem;
    }
    
    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .chat-message {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      position: relative;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin-bottom: 0.25rem;
    }
    
    .user-message {
      align-self: flex-start;
      background-color: #f3f4f6;
      border-bottom-left-radius: 2px;
      border-left: 3px solid #9ca3af;
    }
    
    .user-message::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: -8px;
      width: 16px;
      height: 16px;
      background-color: #f3f4f6;
      border-bottom-right-radius: 16px;
    }
    
    .admin-message {
      align-self: flex-end;
      background-color: #dbeafe;
      border-bottom-right-radius: 2px;
      border-right: 3px solid #3b82f6;
      color: #1e3a8a;
    }
    
    .admin-message::before {
      content: '';
      position: absolute;
      bottom: 0;
      right: -8px;
      width: 16px;
      height: 16px;
      background-color: #dbeafe;
      border-bottom-left-radius: 16px;
    }
    
    .system-message {
      align-self: center;
      background-color: #f8fafc;
      color: #64748b;
      font-style: italic;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 16px;
      border: 1px dashed #cbd5e1;
    }
    
    .system-message.error {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .message-content {
      word-wrap: break-word;
    }
    
    .message-time {
      font-size: 0.8rem;
      color: #4b5563;
      text-align: right;
      margin-top: 0.5rem;
      font-weight: 500;
      display: block !important;
      background-color: rgba(241, 245, 249, 0.6);
      padding: 2px 6px;
      border-radius: 10px;
      width: fit-content;
      margin-left: auto;
    }
    
    .chat-controls {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      background-color: #fff;
    }
    
    .chat-form {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .chat-form textarea {
      flex: 1;
      resize: none;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: inherit;
      font-size: 0.875rem;
    }
    
    .chat-send-button {
      align-self: flex-end;
      background-color: #2563eb;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .chat-send-button:hover {
      background-color: #1d4ed8;
    }
    
    .end-chat-button {
      width: 100%;
      background-color: #ef4444;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .end-chat-button:hover {
      background-color: #dc2626;
    }
    
    .unread-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background-color: #ef4444;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
      min-width: 1.5rem;
      height: 1.5rem;
      border-radius: 50%;
      padding: 0 0.25rem;
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
  `;
  
  document.head.appendChild(style);
}
