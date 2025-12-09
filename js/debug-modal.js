/**
 * Debug script to create absolute emergency buttons
 */
console.log('Creating emergency modal buttons');

// Create emergency buttons after the page has loaded
window.addEventListener('load', function() {
    setTimeout(function() {
        // Create a container
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.right = '10px';
        container.style.zIndex = '999999';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        // Add a title
        const title = document.createElement('div');
        title.textContent = 'Emergency Modal Controls';
        title.style.marginBottom = '5px';
        title.style.fontWeight = 'bold';
        container.appendChild(title);
        
        // Create claim button
        const claimBtn = document.createElement('button');
        claimBtn.textContent = 'Show Claim Modal';
        claimBtn.style.display = 'block';
        claimBtn.style.marginBottom = '5px';
        claimBtn.style.padding = '5px';
        claimBtn.style.backgroundColor = '#ef4444';
        claimBtn.style.color = 'white';
        claimBtn.style.border = 'none';
        claimBtn.style.borderRadius = '3px';
        claimBtn.style.cursor = 'pointer';
        claimBtn.onclick = function() {
            const modal = document.getElementById('claim-modal');
            if (modal) {
                modal.style.display = 'block';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
                console.log('Emergency: Showing claim modal');
            }
        };
        container.appendChild(claimBtn);
        
        // Create contact button
        const contactBtn = document.createElement('button');
        contactBtn.textContent = 'Show Chat Modal';
        contactBtn.style.display = 'block';
        contactBtn.style.padding = '5px';
        contactBtn.style.backgroundColor = '#3b82f6';
        contactBtn.style.color = 'white';
        contactBtn.style.border = 'none';
        contactBtn.style.borderRadius = '3px';
        contactBtn.style.cursor = 'pointer';
        contactBtn.onclick = function() {
            // Use the ChatAuth system if available
            if (window.ChatAuth) {
                console.log('Emergency: Using ChatAuth for chat modal');
                const userIdentity = window.ChatAuth.getUserIdentity();
                
                if (userIdentity && userIdentity.name && userIdentity.email) {
                    console.log('User already authenticated:', userIdentity);
                    const modal = document.getElementById('contact-modal');
                    if (modal) {
                        modal.style.display = 'block';
                        window.ChatAuth.restoreChatHistory(userIdentity);
                    }
                } else {
                    console.log('User needs to authenticate first');
                    window.ChatAuth.showAuthModal();
                }
            } else {
                // Fallback to direct modal display
                const modal = document.getElementById('contact-modal');
                if (modal) {
                    modal.style.display = 'block';
                    modal.style.visibility = 'visible';
                    modal.style.opacity = '1';
                    console.log('Emergency: Showing contact modal (fallback)');
                }
            }
        };
        container.appendChild(contactBtn);
        
        // Add to body
        document.body.appendChild(container);
        console.log('Emergency modal buttons created');
    }, 2000); // Wait 2 seconds after load to ensure everything else has initialized
});
