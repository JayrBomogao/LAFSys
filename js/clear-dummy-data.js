// Clear-dummy-data.js - One-time script to remove only specific dummy data from Firestore

// List of known dummy item titles that we want to remove
const dummyItemTitles = [
    "Black Wallet",
    "iPhone 13 Pro",
    "Umbrella",
    "Laptop Bag",
    "Keys with Keychain",
    "Water Bottle"
];

// Function to clear only dummy items from the 'items' collection
async function clearDummyItems() {
    try {
        if (!firebase || !firebase.firestore) {
            console.error('Firebase is not initialized properly');
            return false;
        }

        const db = firebase.firestore();
        
        // Get all items
        const querySnapshot = await db.collection('items').get();
        
        if (querySnapshot.empty) {
            console.log('No items to check');
            return true;
        }
        
        // Use batched writes for better performance when deleting multiple documents
        let batch = db.batch();
        let count = 0;
        let totalDeleted = 0;
        
        // Filter for only the dummy items
        querySnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (dummyItemTitles.includes(data.title)) {
                batch.delete(doc.ref);
                count++;
                console.log(`Marked dummy item for deletion: ${data.title}`);
            }
        });
        
        // Commit the batch delete if any dummy items were found
        if (count > 0) {
            await batch.commit();
            totalDeleted = count;
            console.log(`Successfully deleted ${totalDeleted} dummy items`);
        } else {
            console.log('No dummy items found to delete');
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing dummy items:', error);
        return false;
    }
}

// The button has been removed to keep the admin panel clean
// If you need to remove dummy items, you can call clearDummyItems() from the console
console.log('Dummy item cleanup function is available via clearDummyItems() in console');
