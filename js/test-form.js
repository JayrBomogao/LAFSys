// Test form functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Test form script loaded');
    
    // Add test button to check form functionality
    const addTestButton = function() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Claim Form';
        testButton.style.position = 'fixed';
        testButton.style.bottom = '20px';
        testButton.style.right = '20px';
        testButton.style.padding = '10px 20px';
        testButton.style.backgroundColor = '#2563eb';
        testButton.style.color = 'white';
        testButton.style.border = 'none';
        testButton.style.borderRadius = '4px';
        testButton.style.cursor = 'pointer';
        testButton.style.zIndex = '9998';
        
        testButton.addEventListener('click', function() {
            // Show the claim modal
            const modal = document.getElementById('claim-modal');
            if (modal) {
                modal.style.display = 'flex';
                console.log('Modal opened for testing');
                
                // Focus on the first input
                setTimeout(() => {
                    const nameInput = document.getElementById('claimant-name');
                    if (nameInput) {
                        nameInput.focus();
                        console.log('Focus set on name input');
                    }
                }, 300);
                
                // Log all form elements
                const formElements = document.querySelectorAll('#claim-form input, #claim-form textarea');
                console.log('Form elements found:', formElements.length);
                formElements.forEach(el => {
                    console.log('- Element:', el.id, 'Type:', el.type, 'Visible:', isVisible(el));
                });
            }
        });
        
        container.appendChild(testButton);
    };
    
    // Function to check if an element is visible
    function isVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               element.offsetWidth > 0 &&
               element.offsetHeight > 0;
    }
    
    // Function to monitor form inputs
    function monitorFormInputs() {
        const inputs = document.querySelectorAll('#claim-form input, #claim-form textarea');
        
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                console.log('Input focused:', this.id);
            });
            
            input.addEventListener('blur', function() {
                console.log('Input blurred:', this.id);
            });
            
            input.addEventListener('input', function() {
                console.log('Input value changed:', this.id, this.value);
            });
        });
        
        // Monitor form submission
        const form = document.getElementById('claim-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const data = {
                    name: document.getElementById('claimant-name')?.value,
                    email: document.getElementById('claimant-email')?.value,
                    phone: document.getElementById('claimant-phone')?.value,
                    description: document.getElementById('claim-description')?.value
                };
                
                console.log('Form submitted with data:', data);
                
                // Submit to Firestore if all fields are filled
                if (data.name && data.email && data.phone && data.description) {
                    submitToFirestore(data);
                } else {
                    alert('Please fill out all fields');
                }
            });
        }
    }
    
    // Function to submit data to Firestore
    async function submitToFirestore(data) {
        try {
            // Get item ID
            const itemId = document.getElementById('claim-btn')?.dataset?.itemId;
            
            if (!itemId) {
                console.error('Item ID not found');
                alert('Error: Could not determine which item you are claiming');
                return;
            }
            
            // Show loading state
            const submitBtn = document.querySelector('#claim-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
            }
            
            // Submit to Firestore
            const db = firebase.firestore();
            const claimRef = await db.collection('claims').add({
                itemId: itemId,
                claimantName: data.name,
                claimantEmail: data.email,
                claimantPhone: data.phone,
                description: data.description,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Claim submitted successfully with ID:', claimRef.id);
            
            // Reset form and close modal
            document.getElementById('claim-form').reset();
            document.getElementById('claim-modal').style.display = 'none';
            
            // Reset button state
            if (submitBtn) {
                submitBtn.textContent = 'Submit Claim';
                submitBtn.disabled = false;
            }
            
            // Show success message
            alert('Your claim has been submitted successfully! We will contact you soon regarding your claim.');
            
        } catch (error) {
            console.error('Error submitting claim:', error);
            alert('There was an error submitting your claim: ' + error.message);
            
            // Reset button state
            const submitBtn = document.querySelector('#claim-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Submit Claim';
                submitBtn.disabled = false;
            }
        }
    }
    
    // Run initialization
    setTimeout(() => {
        addTestButton();
        monitorFormInputs();
    }, 1000);
});
