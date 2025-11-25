// Import Firebase services
import { db, storage } from './firebase.js';
import { 
    collection, getDocs, getDoc, doc, query, where, 
    addDoc, updateDoc, deleteDoc, orderBy, serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Collection references
const ITEMS_COLLECTION = 'items';
const CLAIMS_COLLECTION = 'claims';
const MESSAGES_COLLECTION = 'messages';

// Function to get all items
async function getItems() {
    try {
        const itemsRef = collection(db, ITEMS_COLLECTION);
        const itemsSnapshot = await getDocs(query(itemsRef, orderBy('date', 'desc')));
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
        const docRef = doc(db, ITEMS_COLLECTION, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
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
        const itemsRef = collection(db, ITEMS_COLLECTION);
        let q;
        
        if (status === 'all') {
            q = query(itemsRef, orderBy('date', 'desc'));
        } else {
            q = query(itemsRef, where('status', '==', status), orderBy('date', 'desc'));
        }
        
        const querySnapshot = await getDocs(q);
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
            const storageRef = ref(storage, `items/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            imageUrl = await getDownloadURL(uploadResult.ref);
        }
        
        // Prepare the item data
        const newItem = {
            title: itemData.title,
            description: itemData.description || '',
            category: itemData.category || 'other',
            location: itemData.location || '',
            date: itemData.date ? new Date(itemData.date) : serverTimestamp(),
            status: itemData.status || 'active',
            image: imageUrl || 'https://via.placeholder.com/400x300?text=No+Image',
            disposalDate: itemData.disposalDate ? new Date(itemData.disposalDate) : null,
            foundBy: itemData.foundBy || '',
            storageLocation: itemData.storageLocation || '',
            createdAt: serverTimestamp()
        };
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, ITEMS_COLLECTION), newItem);
        
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
        const itemRef = doc(db, ITEMS_COLLECTION, id);
        
        // Check if item exists
        const docSnap = await getDoc(itemRef);
        if (!docSnap.exists()) {
            throw new Error('Item not found');
        }
        
        let updateData = { ...itemData };
        
        // Handle image upload if new image is provided
        if (imageFile) {
            const storageRef = ref(storage, `items/${Date.now()}_${imageFile.name}`);
            const uploadResult = await uploadBytes(storageRef, imageFile);
            updateData.image = await getDownloadURL(uploadResult.ref);
        }
        
        // Convert date strings to Firestore timestamps
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }
        
        if (updateData.disposalDate) {
            updateData.disposalDate = new Date(updateData.disposalDate);
        }
        
        // Add last updated timestamp
        updateData.updatedAt = serverTimestamp();
        
        // Update the item
        await updateDoc(itemRef, updateData);
        
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
        await deleteDoc(doc(db, ITEMS_COLLECTION, id));
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
            createdAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, CLAIMS_COLLECTION), newClaim);
        
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
        const claimsRef = collection(db, CLAIMS_COLLECTION);
        const q = query(claimsRef, where('itemId', '==', itemId), orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
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
        const claimsRef = collection(db, CLAIMS_COLLECTION);
        const querySnapshot = await getDocs(query(claimsRef, orderBy('createdAt', 'desc')));
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error getting all claims: ", error);
        return [];
    }
}

// Function to update a claim status
async function updateClaimStatus(claimId, status) {
    try {
        const claimRef = doc(db, CLAIMS_COLLECTION, claimId);
        await updateDoc(claimRef, { 
            status,
            updatedAt: serverTimestamp()
        });
        
        // If claim is approved, update the item status
        if (status === 'approved') {
            const claimDoc = await getDoc(claimRef);
            const claimData = claimDoc.data();
            
            if (claimData && claimData.itemId) {
                const itemRef = doc(db, ITEMS_COLLECTION, claimData.itemId);
                await updateDoc(itemRef, { 
                    status: 'claimed',
                    updatedAt: serverTimestamp()
                });
            }
        }
        
        return true;
    } catch (error) {
        console.error("Error updating claim status: ", error);
        return false;
    }
}

// Export all functions for use in other files
export {
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
