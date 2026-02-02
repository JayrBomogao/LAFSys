/**
 * Emergency Chat Input Fix
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
         element.offsetHeight > 0;
}

function forceCreateChatInput() {
  console.log('Forcing creation of chat input field inside chat bubble');
  
  // Find the chat widget and message list
  const chatWidget = document.getElementById('chatWidget');
  const messagesList = document.getElementById('messagesList');
  
  if (!chatWidget) {
    console.error('Chat widget not found');
    return;
  }
  
  // Remove any existing form container
  const existingForm = document.getElementById('chatFormContainer');
  if (existingForm) {
    existingForm.remove();
  }
  
  // Create a new input field with styling for bottom of chat bubble
  const chatInputHTML = `
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
      border-radius: 0 0 12px 12px !important;
    ">
      <form id="chatForm" style="
        display: flex !important;
        gap: 8px !important;
        width: 100% !important;
      ">
        <input type="text" id="messageInput" 
          placeholder="Type your message here..." 
          style="
            flex: 1 !important;
            padding: 10px !important;
            border: 2px solid #2563eb !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            height: 36px !important;
            background-color: white !important;
            color: black !important;
            width: 75% !important;
        ">
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
        ">Send</button>
      </form>
    </div>
  `;
  
  // Try to insert inside the chat content area
  if (messagesList && messagesList.parentNode) {
    // Insert after the messages list
    const chatContentContainer = messagesList.parentNode;
    
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chatInputHTML;
    const chatInputContainer = tempDiv.firstElementChild;
    
    // Insert at the bottom of the chat content area
    chatContentContainer.appendChild(chatInputContainer);
    console.log('Chat input added inside chat bubble');
  } else {
    // Fallback to adding it to the chat widget
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chatInputHTML;
    const chatInputContainer = tempDiv.firstElementChild;
    
    chatWidget.appendChild(chatInputContainer);
    console.log('Chat input added to chat widget as fallback');
  }
  
  // Set up event handler for the form
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  
  if (chatForm && messageInput) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const messageText = messageInput.value.trim();
      if (messageText && window.sendMessage) {
        window.sendMessage(messageText);
        messageInput.value = '';
      } else if (messageText) {
        // Try to find the sendMessage function in the window context
        const event = new CustomEvent('chat-message-send', {
          detail: { text: messageText }
        });
        window.dispatchEvent(event);
        messageInput.value = '';
      }
    });
    
    // Focus the input
    setTimeout(function() {
      messageInput.focus();
    }, 100);
  }
}

// Expose function globally
window.forceCreateChatInput = forceCreateChatInput;
