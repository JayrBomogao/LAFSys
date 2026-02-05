/**
 * Chat Input Fix
 * This script fixes the chat input field visibility issues by forcing direct DOM manipulation
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Chat input fix loaded');
  
  // Check every 500ms for a chat in progress and fix the input field if needed
  setInterval(checkAndFixChatInput, 500);
});

function checkAndFixChatInput() {
  // Check if we're in a chat
  const messagesList = document.getElementById('messagesList');
  const chatFormContainer = document.getElementById('chatFormContainer');
  
  // If chat is active but no input field is visible, fix it
  if (messagesList && (!chatFormContainer || !isVisible(chatFormContainer))) {
    console.log('Detected chat in progress but no visible input field, fixing...');
    forceCreateChatInput();
  }
}

function isVisible(element) {
  if (!element) return false;
  
  // Check computed style
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 &&
         element.offsetHeight > 0;
}

function forceCreateChatInput() {
  // Create a new input container if it doesn't exist
  let chatFormContainer = document.getElementById('chatFormContainer');
  if (!chatFormContainer) {
    chatFormContainer = document.createElement('div');
    chatFormContainer.id = 'chatFormContainer';
    chatFormContainer.className = 'chat-form-container';
    
    // Add to chat widget
    const chatWidget = document.getElementById('chatWidget');
    if (chatWidget) {
      chatWidget.appendChild(chatFormContainer);
    } else {
      // If no widget container, add directly to body as last resort
      document.body.appendChild(chatFormContainer);
    }
  }
  
  // Force display
  chatFormContainer.style.display = 'flex';
  chatFormContainer.style.visibility = 'visible';
  chatFormContainer.style.opacity = '1';
  
  // Create form if needed
  let chatForm = document.getElementById('chatForm');
  if (!chatForm) {
    chatForm = document.createElement('form');
    chatForm.id = 'chatForm';
    chatForm.className = 'chat-form';
    chatFormContainer.appendChild(chatForm);
    
    // Create input
    const messageInput = document.createElement('textarea');
    messageInput.id = 'messageInput';
    messageInput.name = 'message';
    messageInput.placeholder = 'Type your message...';
    messageInput.rows = '3';
    messageInput.required = true;
    
    // Force input styles to ensure visibility
    messageInput.style.cssText = `
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      min-height: 50px !important;
      padding: 12px !important;
      box-sizing: border-box !important;
      border: 2px solid #e5e7eb !important;
      border-radius: 6px !important;
      background-color: white !important;
      color: black !important;
      font-size: 1rem !important;
      margin-bottom: 8px !important;
      resize: vertical !important;
    `;
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.type = 'submit';
    sendButton.className = 'send-button';
    sendButton.innerHTML = 'Send';
    sendButton.style.cssText = `
      display: block !important;
      padding: 10px 15px !important;
      background-color: #2563eb !important;
      color: white !important;
      border: none !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-weight: 600 !important;
    `;
    
    // Add to form
    chatForm.appendChild(messageInput);
    chatForm.appendChild(sendButton);
    
    // Focus input
    setTimeout(() => messageInput.focus(), 100);
    
    // Attach event listener
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const messageText = messageInput.value.trim();
      if (messageText) {
        // Clear input
        messageInput.value = '';
        
        // Try to call the existing send function if available
        if (typeof window.sendMessage === 'function') {
          window.sendMessage(messageText);
        }
      }
    });
  }
  
  console.log('Chat input has been fixed and is now visible');
}
