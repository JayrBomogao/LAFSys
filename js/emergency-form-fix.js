// Emergency Form Fix
// This script will forcibly replace the form with a completely new one that works

document.addEventListener('DOMContentLoaded', function() {
    console.log('Emergency form fix loaded');
    
    // Function to fix the claim form
    function fixClaimForm() {
        console.log('Applying emergency form fix');
        
        // Get the claim modal
        const claimModal = document.getElementById('claim-modal');
        if (!claimModal) {
            console.error('Claim modal not found');
            return;
        }
        
        // Get the item ID for claim submission
        const itemId = document.getElementById('claim-btn')?.dataset?.itemId || '';
        console.log('Item ID for claim:', itemId);
        
        // Create completely new modal content
        const newModalContent = `
            <div class="modal-content" style="background-color: #ffffff; padding: 24px; border-radius: 8px; width: 90%; max-width: 500px; position: relative;">
                <span class="close" onclick="document.getElementById('claim-modal').style.display='none'" style="position: absolute; top: 12px; right: 16px; font-size: 24px; font-weight: bold; cursor: pointer;">&times;</span>
                <h2 style="margin-top: 0; margin-bottom: 20px; color: #111827;">Submit Claim</h2>
                <form id="new-claim-form" style="display: block;">
                    <div style="margin-bottom: 16px;">
                        <label for="new-claimant-name" style="display: block; margin-bottom: 8px; font-weight: 500; color: #111827;">Your Name</label>
                        <input type="text" id="new-claimant-name" name="claimantName" placeholder="Enter your full name" 
                               style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; box-sizing: border-box;" required>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label for="new-claimant-email" style="display: block; margin-bottom: 8px; font-weight: 500; color: #111827;">Email</label>
                        <input type="email" id="new-claimant-email" name="claimantEmail" placeholder="Enter your email address" 
                               style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; box-sizing: border-box;" required>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label for="new-claimant-phone" style="display: block; margin-bottom: 8px; font-weight: 500; color: #111827;">Phone Number</label>
                        <input type="tel" id="new-claimant-phone" name="claimantPhone" placeholder="Enter your phone number" 
                               style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; box-sizing: border-box;" required>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label for="new-claim-description" style="display: block; margin-bottom: 8px; font-weight: 500; color: #111827;">Proof of Ownership (Describe identifying details)</label>
                        <textarea id="new-claim-description" name="description" rows="4" placeholder="Describe specific details about the item that prove your ownership" 
                                  style="width: 100%; padding: 10px; border: 2px solid #d1d5db; border-radius: 6px; font-size: 16px; background-color: white; color: black; min-height: 120px; resize: vertical; box-sizing: border-box;" required></textarea>
                    </div>
                    <button type="submit" id="new-submit-btn" 
                            style="width: 100%; background-color: #2563eb; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;">
                        Submit Claim
                    </button>
                </form>
            </div>
        `;
        
        // Empty the modal and insert new content
        claimModal.innerHTML = newModalContent;
        
        // Set up the form submission handler
        const form = document.getElementById('new-claim-form');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // Get form values
                const claimantName = document.getElementById('new-claimant-name').value;
                const claimantEmail = document.getElementById('new-claimant-email').value;
                const claimantPhone = document.getElementById('new-claimant-phone').value;
                const description = document.getElementById('new-claim-description').value;
                
                // Validate form
                if (!claimantName || !claimantEmail || !claimantPhone || !description) {
                    alert('Please fill out all fields');
                    return;
                }
                
                try {
                    // Disable submit button
                    const submitBtn = document.getElementById('new-submit-btn');
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Submitting...';
                    
                    // Make sure Firebase is initialized
                    if (!window.firebase) {
                        throw new Error('Firebase is not available');
                    }
                    
                    const db = firebase.firestore();
                    
                    // Submit to Firestore
                    console.log('Submitting claim data:', {
                        itemId,
                        claimantName,
                        claimantEmail,
                        claimantPhone,
                        description
                    });
                    
                    const claimRef = await db.collection('claims').add({
                        itemId: itemId,
                        claimantName: claimantName,
                        claimantEmail: claimantEmail,
                        claimantPhone: claimantPhone,
                        description: description,
                        status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Claim submitted successfully with ID:', claimRef.id);
                    
                    // Reset form
                    form.reset();
                    
                    // Close modal
                    claimModal.style.display = 'none';
                    
                    // Show success message
                    alert('Your claim has been submitted successfully! We will contact you soon.');
                    
                } catch (error) {
                    console.error('Error submitting claim:', error);
                    alert('Error submitting claim: ' + error.message);
                    
                    // Re-enable submit button
                    const submitBtn = document.getElementById('new-submit-btn');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit Claim';
                    }
                }
            });
        }
        
        // Fix the close button
        const closeButton = claimModal.querySelector('.close');
        if (closeButton) {
            closeButton.addEventListener('click', function() {
                claimModal.style.display = 'none';
            });
        }
        
        // Also fix modal click outside to close
        window.addEventListener('click', function(event) {
            if (event.target === claimModal) {
                claimModal.style.display = 'none';
            }
        });
    }
    
    // Function to enhance the claim button
    function enhanceClaimButton() {
        const claimBtn = document.getElementById('claim-btn');
        if (!claimBtn) {
            console.error('Claim button not found');
            return;
        }
        
        // Replace the existing click handler
        claimBtn.onclick = function(e) {
            e.preventDefault();
            const claimModal = document.getElementById('claim-modal');
            if (claimModal) {
                // Ensure our fixed form is in place
                fixClaimForm();
                
                // Show the modal
                claimModal.style.display = 'flex';
                
                // Focus the first input
                setTimeout(function() {
                    const nameInput = document.getElementById('new-claimant-name');
                    if (nameInput) {
                        nameInput.focus();
                    }
                }, 100);
            }
        };
        
        console.log('Claim button enhanced');
    }
    
    // Run our fixes
    setTimeout(function() {
        fixClaimForm();
        enhanceClaimButton();
        console.log('Emergency form fixes applied');
    }, 1000);
});
