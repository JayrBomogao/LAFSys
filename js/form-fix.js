// Form Fix Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('Form fix script loaded');
    
    // Fix form input fields
    function fixFormInputs() {
        console.log('Fixing form inputs');
        
        // Get form elements
        const claimForm = document.getElementById('claim-form');
        const nameInput = document.getElementById('claimant-name');
        const emailInput = document.getElementById('claimant-email');
        const phoneInput = document.getElementById('claimant-phone');
        const descriptionInput = document.getElementById('claim-description');
        
        if (!claimForm || !nameInput || !emailInput || !phoneInput || !descriptionInput) {
            console.error('Form elements not found');
            return;
        }
        
        // Apply additional styles directly to ensure they work
        const inputs = [nameInput, emailInput, phoneInput, descriptionInput];
        
        inputs.forEach(input => {
            input.style.width = '100%';
            input.style.padding = '0.75rem';
            input.style.border = '2px solid #cbd5e1';
            input.style.borderRadius = '0.375rem';
            input.style.fontSize = '1rem';
            input.style.boxSizing = 'border-box';
            input.style.display = 'block';
            input.style.backgroundColor = '#ffffff';
            input.style.marginBottom = '0.5rem';
            input.style.zIndex = '10001';
            input.style.position = 'relative';
            
            // Add event listeners for focus and blur
            input.addEventListener('focus', function() {
                console.log('Input focused:', this.id);
                this.style.borderColor = '#3b82f6';
                this.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.25)';
            });
            
            input.addEventListener('blur', function() {
                console.log('Input blurred:', this.id);
                this.style.borderColor = '#cbd5e1';
                this.style.boxShadow = 'none';
            });
            
            // Test the input by logging changes
            input.addEventListener('input', function() {
                console.log('Input changed:', this.id, this.value);
            });
        });
        
        // Make sure the textarea works properly
        if (descriptionInput.tagName === 'TEXTAREA') {
            descriptionInput.style.minHeight = '100px';
            descriptionInput.style.resize = 'vertical';
        }
        
        // Add submit event listener to the form
        claimForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            console.log('Form submitted with values:');
            console.log('Name:', nameInput.value);
            console.log('Email:', emailInput.value);
            console.log('Phone:', phoneInput.value);
            console.log('Description:', descriptionInput.value);
            
            // Get item ID
            const itemId = document.getElementById('claim-btn')?.dataset?.itemId;
            
            if (!itemId) {
                console.error('Item ID not found');
                alert('Error: Could not determine which item you are claiming');
                return;
            }
            
            // Validate form
            if (!nameInput.value || !emailInput.value || !phoneInput.value || !descriptionInput.value) {
                alert('Please fill out all fields');
                return;
            }
            
            // Submit claim to Firestore
            submitClaimToFirestore(itemId, {
                claimantName: nameInput.value,
                claimantEmail: emailInput.value,
                claimantPhone: phoneInput.value,
                description: descriptionInput.value
            });
        });
    }
    
    // Function to submit claim to Firestore
    async function submitClaimToFirestore(itemId, claimData) {
        try {
            // Make sure Firebase is available
            if (!firebase || !firebase.firestore) {
                throw new Error('Firebase not available');
            }
            
            const db = firebase.firestore();
            
            console.log('Submitting claim to Firestore:', claimData);
            
            // Add claim to Firestore
            const claimRef = await db.collection('claims').add({
                itemId: itemId,
                claimantName: claimData.claimantName,
                claimantEmail: claimData.claimantEmail,
                claimantPhone: claimData.claimantPhone,
                description: claimData.description,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Claim submitted successfully with ID:', claimRef.id);
            
            // Reset form and close modal
            document.getElementById('claim-form').reset();
            document.getElementById('claim-modal').style.display = 'none';
            
            // Show success message
            alert('Your claim has been submitted successfully! We will contact you soon regarding your claim.');
            
        } catch (error) {
            console.error('Error submitting claim:', error);
            alert('There was an error submitting your claim: ' + error.message);
        }
    }
    
    // Run the fix
    setTimeout(fixFormInputs, 1000); // Delay to ensure the DOM is fully loaded
    
    // Add event listener to claim button to re-apply fixes when the modal is opened
    document.getElementById('claim-btn')?.addEventListener('click', function() {
        setTimeout(fixFormInputs, 300); // Short delay after modal is opened
    });
    
    // Apply fixes when the modal is shown via any method
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'claim-modal' && 
                mutation.target.style.display === 'block' || 
                mutation.target.style.display === 'flex') {
                fixFormInputs();
            }
        });
    });
    
    // Start observing modal for display changes
    const modal = document.getElementById('claim-modal');
    if (modal) {
        observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    }
});
