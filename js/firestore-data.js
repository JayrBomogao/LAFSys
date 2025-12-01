// Use Firebase global objects provided by compat version
console.log('Firestore-data.js loaded');

// Get references to the functions we need from the global firebase object
const db = firebase.firestore();
const storage = firebase.storage();

// Collection references
const ITEMS_COLLECTION = 'items';
const CLAIMS_COLLECTION = 'claims';
const MESSAGES_COLLECTION = 'messages';

// Function to get all items
async function getItems() {
    try {
        const itemsRef = db.collection(ITEMS_COLLECTION);
        const itemsSnapshot = await itemsRef.orderBy('date', 'desc').get();
        return itemsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting items: ", error);
        return [];
    }
}

// Function to get item by ID
async function getItemById(id) {
    try {
        const docRef = db.collection(ITEMS_COLLECTION).doc(id);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting item: ", error);
        return null;
    }
}

// Function to filter items by status
async function getItemsByStatus(status) {
    try {
        const itemsRef = db.collection(ITEMS_COLLECTION);
        let query;
        
        if (status === 'all') {
            query = itemsRef.orderBy('date', 'desc');
        } else {
            query = itemsRef.where('status', '==', status).orderBy('date', 'desc');
        }
        
        const querySnapshot = await query.get();
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error filtering items: ", error);
        return [];
    }
}

// Function to search items
async function searchItems(searchTerm) {
    try {
        // Firestore doesn't support full-text search natively
        // Here's a simplified approach - we'll get all items and filter in memory
        // For a production app, consider using Algolia or similar for better search
        const items = await getItems();
        
        if (!searchTerm || !searchTerm.trim()) {
            return items;
        }
        
        const term = searchTerm.toLowerCase();
        return items.filter(item => 
            (item.title && item.title.toLowerCase().includes(term)) ||
            (item.description && item.description.toLowerCase().includes(term)) ||
            (item.location && item.location.toLowerCase().includes(term))
        );
    } catch (error) {
        console.error("Error searching items: ", error);
        return [];
    }
}

// Function to add a new item with image upload
async function addItem(itemData, imageFile) {
    try {
        let imageUrl = '';
        
        // Upload image if provided
        if (imageFile) {
            const storageRef = storage.ref(`items/${Date.now()}_${imageFile.name}`);
            const uploadTask = await storageRef.put(imageFile);
            imageUrl = await uploadTask.ref.getDownloadURL();
        }
        
        // Prepare the item data
        const newItem = {
            title: itemData.title,
            description: itemData.description || '',
            category: itemData.category || 'other',
            location: itemData.location || '',
            date: itemData.date ? new Date(itemData.date) : firebase.firestore.FieldValue.serverTimestamp(),
            status: itemData.status || 'active',
            image: imageUrl || 'https://via.placeholder.com/400x300?text=No+Image',
            disposalDate: itemData.disposalDate ? new Date(itemData.disposalDate) : null,
            foundBy: itemData.foundBy || '',
            storageLocation: itemData.storageLocation || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add to Firestore
        const docRef = await db.collection(ITEMS_COLLECTION).add(newItem);
        
        return {
            id: docRef.id,
            ...newItem
        };
    } catch (error) {
        console.error("Error adding item: ", error);
        throw error;
    }
}

// Function to update an item
async function updateItem(id, itemData, imageFile) {
    try {
        const itemRef = db.collection(ITEMS_COLLECTION).doc(id);
        
        // Check if item exists
        const docSnap = await itemRef.get();
        if (!docSnap.exists) {
            throw new Error('Item not found');
        }
        
        let updateData = { ...itemData };
        
        // Handle image upload if new image is provided
        if (imageFile) {
            const storageRef = storage.ref(`items/${Date.now()}_${imageFile.name}`);
            const uploadTask = await storageRef.put(imageFile);
            updateData.image = await uploadTask.ref.getDownloadURL();
        }
        
        // Convert date strings to Firestore timestamps
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }
        
        if (updateData.disposalDate) {
            updateData.disposalDate = new Date(updateData.disposalDate);
        }
        
        // Add last updated timestamp
        updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Update the item
        await itemRef.update(updateData);
        
        return {
            id,
            ...docSnap.data(),
            ...updateData
        };
    } catch (error) {
        console.error("Error updating item: ", error);
        throw error;
    }
}

// Function to delete an item
async function deleteItem(id) {
    try {
        await db.collection(ITEMS_COLLECTION).doc(id).delete();
        return true;
    } catch (error) {
        console.error("Error deleting item: ", error);
        return false;
    }
}

// Function to submit a claim
async function submitClaim(itemId, claimData) {
    try {
        const newClaim = {
            itemId,
            claimantName: claimData.name,
            claimantEmail: claimData.email,
            description: claimData.description,
            status: 'pending', // pending, approved, rejected
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const docRef = await db.collection(CLAIMS_COLLECTION).add(newClaim);
        
        return {
            id: docRef.id,
            ...newClaim
        };
    } catch (error) {
        console.error("Error submitting claim: ", error);
        throw error;
    }
}

// Function to get claims for an item
async function getItemClaims(itemId) {
    try {
        const claimsRef = db.collection(CLAIMS_COLLECTION);
        const querySnapshot = await claimsRef.where('itemId', '==', itemId).orderBy('createdAt', 'desc').get();
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting claims: ", error);
        return [];
    }
}

// Function to get all claims (for admin)
async function getAllClaims() {
    try {
        console.log('Getting all claims from Firestore...');
        const claimsRef = db.collection(CLAIMS_COLLECTION);
        const querySnapshot = await claimsRef.orderBy('createdAt', 'desc').get();
        
        const claims = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('Claims retrieved:', claims.length, claims);
        return claims;
    } catch (error) {
        console.error("Error getting all claims: ", error);
        return [];
    }
}

// Function to update a claim status
async function updateClaimStatus(claimId, status) {
    try {
        console.log(`Updating claim ${claimId} to status: ${status}`);
        const claimRef = db.collection(CLAIMS_COLLECTION).doc(claimId);
        
        // Get the current time as a JavaScript Date object for consistent display
        const currentDate = new Date();
        
        // Update with both server timestamp and JavaScript date
        const updateData = {
            status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add approval-specific data if approving
        if (status === 'approved') {
            updateData.approvalDate = currentDate;
        } else if (status === 'rejected') {
            updateData.rejectionDate = currentDate;
        }
        
        // Update the claim
        await claimRef.update(updateData);
        console.log(`Claim ${claimId} updated to ${status}`);
        
        // If claim is approved, update the item status
        if (status === 'approved') {
            const claimDoc = await claimRef.get();
            const claimData = claimDoc.data();
            
            if (claimData && claimData.itemId) {
                console.log(`Updating item ${claimData.itemId} to claimed status`);
                const itemRef = db.collection(ITEMS_COLLECTION).doc(claimData.itemId);
                
                // Get the item to verify it exists
                const itemDoc = await itemRef.get();
                
                if (itemDoc.exists) {
                    // Update the item with claimed status and reference to the claim
                    await itemRef.update({ 
                        status: 'claimed',
                        claimId: claimId,
                        claimedAt: currentDate,
                        claimedBy: claimData.claimantName || 'Unknown',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Item ${claimData.itemId} updated to claimed status`);
                } else {
                    console.error(`Item ${claimData.itemId} not found when approving claim`);
                }
            } else {
                console.error(`Claim ${claimId} has no itemId`);
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error updating claim status: ", error);
        return false;
    }
}

// Make functions available to the global scope
window.DataStore = {
    getItems,
    getItemById,
    getItemsByStatus,
    searchItems,
    addItem,
    updateItem,
    deleteItem,
    submitClaim,
    getItemClaims,
    getAllClaims,
    updateClaimStatus
};
