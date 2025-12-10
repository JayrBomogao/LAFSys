// Script to clean up any diagnostic UI elements
document.addEventListener('DOMContentLoaded', () => {
    console.log('UI cleanup running...');
    
    // Function to remove diagnostic elements
    const cleanupDiagnosticElements = () => {
        // Remove any status indicators (fixed position divs)
        const statusIndicators = document.querySelectorAll('div[style*="position: fixed"][style*="background"]');
        statusIndicators.forEach(element => {
            console.log('Removing diagnostic UI element:', element);
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                element.remove();
            }, 500);
        });
        
        // Remove any specific status message with "Manually displayed"
        const textNodes = [];
        const walk = document.createTreeWalker(
            document.body, 
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while(node = walk.nextNode()) {
            if (node.nodeValue.includes('Manually displayed') || 
                node.nodeValue.includes('Found items in database')) {
                textNodes.push(node);
            }
        }
        
        textNodes.forEach(node => {
            if (node.parentElement) {
                console.log('Removing diagnostic text node:', node.nodeValue);
                node.parentElement.style.opacity = '0';
                node.parentElement.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (node.parentElement) {
                        node.parentElement.remove();
                    }
                }, 500);
            }
        });
    };
    
    // Run cleanup after 3 seconds
    setTimeout(cleanupDiagnosticElements, 3000);
});
