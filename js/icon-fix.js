/**
 * Fix for Lucide icons when icons are not found in the provided icons object
 * This script attempts to substitute missing icons with alternative icons or generic placeholders
 */
document.addEventListener('DOMContentLoaded', function() {
  // First try to initialize Lucide icons normally
  try {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
      console.log('Lucide icons initialized successfully');
    }
  } catch (err) {
    console.warn('Error initializing Lucide icons:', err);
  }
  
  // Find all elements with data-lucide attribute that failed to render
  setTimeout(() => {
    const iconElements = document.querySelectorAll('[data-lucide]');
    
    iconElements.forEach(el => {
      // Check if the element was properly initialized
      if (el.childNodes.length === 0 || el.innerHTML.trim() === '') {
        const iconName = el.getAttribute('data-lucide');
        console.log(`Fixing missing icon: ${iconName}`);
        
        // Map of fallback icons for common icons that might be missing
        const fallbackMap = {
          'search': '🔍',
          'image': '🖼️',
          'map-pin': '📍',
          'calendar': '📅',
          'clock': '⏰',
          'upload': '⬆️',
          'upload-cloud': '☁️',
          'trash-2': '🗑️',
          'circle': '⭕',
          'check-circle': '✓',
          'message-circle': '💬',
          'arrow-left': '←'
        };
        
        // Add fallback content
        if (fallbackMap[iconName]) {
          el.textContent = fallbackMap[iconName];
          el.style.fontFamily = 'sans-serif';
        } else {
          // Generic fallback
          el.textContent = '•';
        }
      }
    });
  }, 500); // Wait a bit to ensure Lucide had a chance to run
});
