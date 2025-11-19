// DOM Elements
const itemDetail = document.getElementById('itemDetail');
const loadingElement = document.getElementById('loading');
const notFoundElement = document.getElementById('notFound');
const claimModal = document.getElementById('claimModal');
const closeModal = document.querySelector('.close');
const claimForm = document.getElementById('claimForm');

// Get item ID from URL
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');

// Load item details when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    if (!itemId) {
        showNotFound();
        return;
    }
    
    try {
        const item = await getItemById(parseInt(itemId));
        
        if (item) {
            displayItemDetails(item);
        } else {
            showNotFound();
        }
    } catch (error) {
        console.error('Error loading item details:', error);
        showError('Error loading item details. Please try again later.');
    }
    
    setupEventListeners();
});

// Display item details
function displayItemDetails(item) {
    // Format dates
    const foundDate = new Date(item.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const disposalDate = new Date(item.disposalDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Calculate days until disposal
    const today = new Date();
    const disposal = new Date(item.disposalDate);
    const timeDiff = disposal - today;
    const daysUntilDisposal = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Determine status class and text
    let statusClass = '';
    let statusText = '';
    
    if (item.status === 'active') {
        statusClass = 'status-active';
        statusText = 'Available';
    } else if (item.status === 'claimed') {
        statusClass = 'status-claimed';
        statusText = 'Claimed';
    } else if (item.status === 'soon') {
        statusClass = 'status-soon';
        statusText = 'Disposal Soon';
    }
    
    // Create the HTML for the item details
    const itemHTML = `
        <img src="${item.image}" alt="${item.title}" class="item-image-large">
        <div class="item-content">
            <div class="status-badge ${statusClass}">
                ${statusText}
            </div>
            <h1 class="item-title">${item.title}</h1>
            
            <div class="item-meta">
                <div class="meta-item">
                    <i data-lucide="map-pin" width="20" height="20"></i>
                    <div>
                        <div class="meta-label">Found Location</div>
                        <div class="meta-value">${item.location}</div>
                    </div>
                </div>
                <div class="meta-item">
                    <i data-lucide="calendar" width="20" height="20"></i>
                    <div>
                        <div class="meta-label">Date Found</div>
                        <div class="meta-value">${foundDate}</div>
                    </div>
                </div>
                <div class="meta-item">
                    <i data-lucide="clock" width="20" height="20"></i>
                    <div>
                        <div class="meta-label">Disposal Date</div>
                        <div class="meta-value">${disposalDate} (${daysUntilDisposal > 0 ? `in ${daysUntilDisposal} days` : 'today'})</div>
                    </div>
                </div>
            </div>
            
            <div class="item-section">
                <h3>Item Description</h3>
                <p class="item-description">${item.description}</p>
            </div>
            
            <div class="actions">
                <button id="claimBtn" class="btn" ${item.status === 'claimed' ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                    ${item.status === 'claimed' ? 'Already Claimed' : 'Claim This Item'}
                </button>
                <a href="index.html" class="btn btn-secondary">Back to All Items</a>
            </div>
        </div>
    `;
    
    itemDetail.innerHTML = itemHTML;
    itemDetail.style.display = 'block';
    loadingElement.style.display = 'none';
    
    // Initialize Lucide icons
    lucide.createIcons({
        icons: ['map-pin', 'calendar', 'clock', 'arrow-left', 'search']
    });
    
    // Add event listener to the claim button
    const claimBtn = document.getElementById('claimBtn');
    if (claimBtn && item.status !== 'claimed') {
        claimBtn.addEventListener('click', () => {
            openClaimModal(item.id);
        });
    }
}

// Show not found message
function showNotFound() {
    loadingElement.style.display = 'none';
    notFoundElement.style.display = 'block';
}

// Show error message
function showError(message) {
    loadingElement.textContent = message;
    loadingElement.style.color = 'var(--danger)';
}

// Set up event listeners
function setupEventListeners() {
    // Modal functionality
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            claimModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === claimModal) {
            claimModal.style.display = 'none';
        }
    });
    
    // Form submission
    if (claimForm) {
        claimForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Claim submitted successfully! We will contact you shortly.');
            claimModal.style.display = 'none';
            claimForm.reset();
            
            // In a real app, you would send this data to a server
            // and update the UI accordingly
            const claimBtn = document.getElementById('claimBtn');
            if (claimBtn) {
                claimBtn.textContent = 'Claim Submitted';
                claimBtn.disabled = true;
                claimBtn.style.opacity = '0.6';
                claimBtn.style.cursor = 'not-allowed';
            }
        });
    }
}
