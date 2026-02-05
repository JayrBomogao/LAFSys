/**
 * Inbox Reset Script
 * This script completely resets the inbox storage and ensures only current version is displayed
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing inbox reset script...');
    
    // Clear old inbox data from localStorage
    clearOldInboxData();
    
    // Track when inbox is loaded
    trackInboxLoading();
});

/**
 * Clear all old inbox data from localStorage
 */
function clearOldInboxData() {
    // Clear message storage keys
    const keysToRemove = [
        'lafsys_messages_v1',
        'lafsys_threads_v1',
        'admin_inbox_data',
        'inbox_cache',
        'lafsys_inbox_last_update'
    ];
    
    keysToRemove.forEach(key => {
        try {
            localStorage.removeItem(key);
            console.log(`Cleared storage key: ${key}`);
        } catch (err) {
            console.log(`Failed to clear ${key}: ${err.message}`);
        }
    });
    
    console.log('Old inbox data cleared from localStorage');
    
    // Set a version stamp
    localStorage.setItem('inbox_version', Date.now().toString());
}

/**
 * Track inbox loading and ensure fresh data
 */
function trackInboxLoading() {
    // Listen for when inbox section is activated
    document.addEventListener('click', function(e) {
        const inboxLink = e.target.closest('.nav-link[data-section="inbox"]');
        if (inboxLink) {
            ensureFreshInboxData();
        }
    });
    
    // Also check on initial page load
    if (localStorage.getItem('adminActiveSection') === 'inbox') {
        ensureFreshInboxData();
    }
    
    // Handle page refreshes in inbox section
    window.addEventListener('load', function() {
        if (localStorage.getItem('adminActiveSection') === 'inbox') {
            ensureFreshInboxData();
        }
    });
}

/**
 * Ensure inbox data is fresh
 */
function ensureFreshInboxData() {
    console.log('Ensuring fresh inbox data...');
    
    // Clear any Firebase cache if available
    if (window.firebase?.firestore) {
        try {
            // Disable persistence to avoid caching
            firebase.firestore().settings({ cacheSizeBytes: 0 });
            console.log('Disabled Firestore cache');
        } catch (err) {
            console.log('Could not modify Firestore settings:', err);
        }
    }
    
    // Also clear in-memory cache if MessagesStore supports it
    if (window.MessagesStore?.clearCache) {
        window.MessagesStore.clearCache();
    }
    
    // Force a refresh of the inbox content
    if (typeof forceRefreshInbox === 'function') {
        // Add slight delay to ensure DOM is ready
        setTimeout(function() {
            forceRefreshInbox();
        }, 100);
    }
}

// Expose reset function globally
window.resetInbox = function() {
    clearOldInboxData();
    
    if (typeof forceRefreshInbox === 'function') {
        forceRefreshInbox();
    } else {
        // Force page reload as fallback
        window.location.reload();
    }
    
    return 'Inbox reset complete';
};
