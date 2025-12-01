// Import Firebase services
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, limit } from "firebase/firestore";

// Constants for collection names
const ITEMS_COLLECTION = 'items';
const CLAIMS_COLLECTION = 'claims';

// Function to create a sample claim
async function addSampleClaim() {
  try {
    console.log('Creating sample claim...');
    
    // First, check if we have any items in the database
    const itemsRef = collection(db, ITEMS_COLLECTION);
    const itemsSnap = await getDocs(query(itemsRef, limit(1)));
    
    let itemId;
    
    if (itemsSnap.empty) {
      // Create a sample item first
      console.log('No items found, creating a sample item first');
      const newItem = {
        title: "Black Leather Wallet",
        description: "Found near the entrance of the park. Contains some ID cards and cash.",
        category: "personal",
        location: "Burnham Park Main Entrance",
        date: serverTimestamp(),
        status: "active",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
        disposalDate: null,
        foundBy: "Park Staff",
        storageLocation: "Admin Office",
        createdAt: serverTimestamp()
      };
      
      const itemDocRef = await addDoc(collection(db, ITEMS_COLLECTION), newItem);
      itemId = itemDocRef.id;
      console.log('Sample item created with ID:', itemId);
      
    } else {
      // Use the first item
      itemId = itemsSnap.docs[0].id;
      console.log('Using existing item with ID:', itemId);
    }
    
    // Now create a claim for this item
    const newClaim = {
      itemId: itemId,
      claimantName: "Juan Dela Cruz",
      claimantEmail: "juan.delacruz@example.com",
      claimantPhone: "+63 912 345 6789",
      description: "The wallet contains my driver's license (License #: ABC123456), two credit cards (BDO and BPI), and approximately ₱2,000 in cash. The driver's license has my photo and the name matches my ID.",
      status: "pending",
      notes: "I can come to claim the wallet anytime this week. Please let me know what documents I need to bring for verification.",
      createdAt: serverTimestamp()
    };
    
    const claimDocRef = await addDoc(collection(db, CLAIMS_COLLECTION), newClaim);
    console.log('Sample claim created with ID:', claimDocRef.id);
    
    return {
      success: true,
      itemId: itemId,
      claimId: claimDocRef.id
    };
    
  } catch (error) {
    console.error("Error creating sample claim:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Add sample claim when button is clicked
document.getElementById('add-sample-claim-btn')?.addEventListener('click', async () => {
  const resultDiv = document.getElementById('sample-claim-result');
  if (resultDiv) resultDiv.textContent = "Creating sample claim...";
  
  try {
    const result = await addSampleClaim();
    
    if (result.success) {
      if (resultDiv) {
        resultDiv.textContent = `Sample claim created successfully! Item ID: ${result.itemId}, Claim ID: ${result.claimId}`;
        resultDiv.style.color = 'green';
      }
    } else {
      if (resultDiv) {
        resultDiv.textContent = `Error creating sample claim: ${result.error}`;
        resultDiv.style.color = 'red';
      }
    }
  } catch (error) {
    console.error('Error:', error);
    if (resultDiv) {
      resultDiv.textContent = `Error: ${error.message}`;
      resultDiv.style.color = 'red';
    }
  }
});
