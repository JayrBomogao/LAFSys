/**
 * Clear Messages Script
 * This script clears all existing messages and threads from localStorage
 * Run this once to clean up old message data
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Running messages cleanup script...');
  
  // Check if MessagesStore exists and has clearAll function
  if (window.MessagesStore && typeof window.MessagesStore.clearAll === 'function') {
    // Clear all messages and threads
    window.MessagesStore.clearAll();
    console.log('✓ Messages and threads cleared successfully');
  } else {
    console.error('MessagesStore not available or clearAll function not found');
  }
});
