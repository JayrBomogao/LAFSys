/**
 * Admin Chat Scroll Fix
 * This script ensures messages are always scrolled to bottom in admin chat
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Admin chat scroll fix loaded');

  // Run the fix setup periodically
  setInterval(setupAdminScrollFix, 1000);
});

// Main setup function
function setupAdminScrollFix() {
  // Only run on admin inbox section
  const inboxSection = document.getElementById('section-inbox');
  if (!inboxSection || !inboxSection.classList.contains('active-section')) return;

  // Find messages list
  const messagesList = document.getElementById('messagesList');
  if (!messagesList) return;

  // Force immediate scroll
  forceScrollToBottom(messagesList);
  
  // Set up observers if not already done
  if (!window._adminScrollFixActive) {
    setupScrollObservers(messagesList);
    window._adminScrollFixActive = true;
    console.log('Admin scroll fix activated');
  }
}

// Force scrolling to bottom
function forceScrollToBottom(element) {
  if (!element) return;

  // Try multiple approaches for best compatibility
  element.scrollTop = element.scrollHeight + 10000;
  
  // Try to scroll last message into view if any exist
  const allMessages = element.querySelectorAll('.chat-message');
  if (allMessages.length > 0) {
    const lastMessage = allMessages[allMessages.length - 1];
    try {
      lastMessage.scrollIntoView({block: 'end', behavior: 'auto'});
    } catch(e) {
      console.error('ScrollIntoView failed:', e);
    }
  }
}

// Set up mutation observers for reliable scrolling
function setupScrollObservers(element) {
  if (!element) return;
  
  // Create observer for changes to messages list
  const observer = new MutationObserver(function(mutations) {
    // Force scroll on any mutation
    forceScrollToBottom(element);
    
    // Schedule additional scrolls with delays
    setTimeout(() => forceScrollToBottom(element), 50);
    setTimeout(() => forceScrollToBottom(element), 200);
    setTimeout(() => forceScrollToBottom(element), 500);
  });
  
  // Start observing
  observer.observe(element, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Also handle DOM events that might affect layout
  document.addEventListener('DOMContentLoaded', () => forceScrollToBottom(element));
  window.addEventListener('load', () => forceScrollToBottom(element));
  window.addEventListener('resize', () => forceScrollToBottom(element));
}
