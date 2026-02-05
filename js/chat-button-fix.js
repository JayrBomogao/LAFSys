/**
 * Enhanced Chat Button Fix Script
 * This script ensures chat buttons work by using multiple methods to fix any issues
 */

// Make sure toggleChatWidget is always available
if (!window.toggleChatWidget) {
    window.toggleChatWidget = function() {
        console.log('Using fallback toggleChatWidget function');
        // Find chat widget elements
        var chatWidget = document.getElementById('chatWidget');
        var chatButton = document.getElementById('chatButton');
        
        if (chatWidget) {
            console.log('Found chat widget, showing it');
            chatWidget.style.display = 'flex';
            if (chatButton) chatButton.classList.add('active');
            return true;
        } else {
            console.error('Chat widget not found!');
            // Create a fallback message
            setTimeout(function() {
                alert('Please use the chat button at the bottom right of the screen');
            }, 100);
            return false;
        }
    };
    console.log('Created fallback toggleChatWidget function');
}

// Global openChat function with fallbacks
window.openChat = function() {
    console.log('Global openChat function called');
    
    // Try each method in sequence
    // 1. First try the standard function
    if (typeof window.toggleChatWidget === 'function') {
        try {
            window.toggleChatWidget();
            return true;
        } catch (e) {
            console.error('Error in toggleChatWidget:', e);
            // Continue to fallbacks
        }
    }
    
    // 2. Try direct DOM manipulation
    var chatWidget = document.getElementById('chatWidget');
    var chatButton = document.getElementById('chatButton');
    
    if (chatWidget) {
        try {
            chatWidget.style.display = 'flex';
            if (chatButton) chatButton.classList.add('active');
            return true;
        } catch (e) {
            console.error('Error showing chat widget:', e);
            // Continue to next fallback
        }
    }
    
    // 3. Try to find any chat-related elements
    var chatElements = document.querySelectorAll('[id*="chat"]');
    console.log('Found chat elements:', chatElements.length);
    
    if (chatElements.length > 0) {
        try {
            // Click the first button-like element
            chatElements.forEach(function(el) {
                if (el.tagName === 'BUTTON' || el.tagName === 'A' || 
                    el.className.indexOf('button') !== -1 || 
                    el.className.indexOf('btn') !== -1) {
                    el.click();
                    return true;
                }
            });
        } catch (e) {
            console.error('Error interacting with chat elements:', e);
        }
    }
    
    // Final fallback - create a simple chat interface
    console.log('Using emergency chat fallback');
    alert('Chat feature is currently experiencing issues. Please refresh the page or try again later.');
    return false;
};

// Execute when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Enhanced chat button fix script loaded');
    
    // Fix all chat buttons on page
    setTimeout(function() {
        // First, try to fix the specific item-details page button
        var chatBtn = document.getElementById('chat-with-staff-btn');
        if (chatBtn) {
            console.log('Found chat button by ID, fixing it');
            // Replace with a new button to remove any conflicting handlers
            var newBtn = chatBtn.cloneNode(true);
            chatBtn.parentNode.replaceChild(newBtn, chatBtn);
            
            // Add extremely simple onclick handler
            newBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.openChat();
                return false;
            };
        }
        
        // Next, find any other chat buttons
        var allButtons = document.querySelectorAll('a.btn, button.btn');
        allButtons.forEach(function(btn) {
            var text = btn.textContent.toLowerCase();
            if (text.indexOf('chat') !== -1 || text.indexOf('message') !== -1) {
                console.log('Found chat-related button:', btn.outerHTML);
                btn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.openChat();
                    return false;
                };
            }
        });
        
        console.log('All chat buttons fixed');
    }, 500); // Small delay to ensure DOM is fully loaded
    
    // Set up a final global fallback that will run later
    setTimeout(function() {
        // Check if we need to fix the button again
        var mainBtn = document.getElementById('chat-with-staff-btn');
        if (mainBtn) {
            mainBtn.setAttribute('href', 'javascript:void(0);');
            mainBtn.setAttribute('onclick', 'window.openChat(); return false;');
            console.log('Applied final button fix');
        }
    }, 2000);
});

// Also attach to window load event to catch any late loading issues
window.addEventListener('load', function() {
    // Double check buttons are working
    var chatBtns = document.querySelectorAll('[id*="chat"]');
    chatBtns.forEach(function(btn) {
        if (btn.tagName === 'A' || btn.tagName === 'BUTTON') {
            btn.setAttribute('onclick', 'window.openChat(); return false;');
        }
    });
    console.log('Applied window.load fixes');
});
