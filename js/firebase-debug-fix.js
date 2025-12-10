// Script to help fix Firestore data retrieval issues
document.addEventListener('DOMContentLoaded', () => {
    console.log('Firebase debug fix loading...');
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('Firebase or Firestore is not available');
        return;
    }
    
    // Add logging for DataStore methods
    if (window.DataStore) {
        const originalGetItems = window.DataStore.getItems;
        window.DataStore.getItems = async function() {
            console.log('DataStore.getItems called');
            try {
                const result = await originalGetItems.apply(this, arguments);
                console.log('DataStore.getItems result:', result);
                return result;
            } catch (error) {
                console.error('Error in DataStore.getItems:', error);
                return [];
            }
        };
        
        if (window.DataStore.getItemsAsync) {
            const originalGetItemsAsync = window.DataStore.getItemsAsync;
            window.DataStore.getItemsAsync = async function() {
                console.log('DataStore.getItemsAsync called');
                try {
                    const result = await originalGetItemsAsync.apply(this, arguments);
                    console.log('DataStore.getItemsAsync result:', result);
                    return result;
                } catch (error) {
                    console.error('Error in DataStore.getItemsAsync:', error);
                    return [];
                }
            };
        }
        
        console.log('DataStore methods enhanced with logging');
    } else {
        console.error('DataStore is not available');
    }
    
    // Ensure we have proper error handling for Firestore operations
    const db = firebase.firestore();
    
    // Create a test object to verify Firestore connection
    db.collection('system_info').doc('debug_info').set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        message: 'Database connection verified'
    })
    .then(() => {
        console.log('Database connection verified successfully');
    })
    .catch((error) => {
        console.error('Error verifying database connection:', error);
    });
});
