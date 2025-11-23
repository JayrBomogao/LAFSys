// DOM Elements
const itemsContainer = document.getElementById('itemsContainer');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const statusFilter = document.getElementById('statusFilter');
const claimModal = document.getElementById('claimModal');
const closeModal = document.querySelector('.close');
const claimForm = document.getElementById('claimForm');

// Inquiry elements
const inquiryButton = document.getElementById('inquiryButton');
const inquiryPanel = document.getElementById('inquiryPanel');
const closeInquiryBtn = document.querySelector('.close-inquiry');
const inquiryForm = document.getElementById('inquiryForm');
const inquirySuccess = document.getElementById('inquirySuccess');

// Load items when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadItems();
    setupEventListeners();
});

// Load and display items
async function loadItems(filter = 'all') {
    try {
        let items;
        
        if (filter === 'all') {
            items = await getItems();
        } else {
            items = await getItemsByStatus(filter);
        }
        
        displayItems(items);
    } catch (error) {
        console.error('Error loading items:', error);
        itemsContainer.innerHTML = '<p class="error">Error loading items. Please try again later.</p>';
    }
}

// Display items in the grid
function displayItems(items) {
    if (!items || items.length === 0) {
        itemsContainer.innerHTML = '<p class="no-items">No items found matching your criteria.</p>';
        return;
    }
    
    itemsContainer.innerHTML = items.map(item => createItemCard(item)).join('');
    
    // Initialize Lucide icons for the new elements
    lucide.createIcons({
        icons: [
            'map-pin',
            'calendar',
            'clock',
            'search',
            'image'
        ]
    });
    
    // Add event listeners to the new item cards
    document.querySelectorAll('.item-card').forEach(card => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', async (e) => {
            // Don't trigger if clicking on the claim button
            if (e.target.closest('.btn-claim')) {
                return;
            }
            
            const itemId = card.dataset.id;
            try {
                const item = await getItemById(parseInt(itemId));
                if (item) {
                    openItemDetails(item);
                }
            } catch (error) {
                console.error('Error loading item details:', error);
            }
        });
    });
}

// Create HTML for an item card
function createItemCard(item) {
    const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const statusClass = `status-${item.status}`;
    let statusText = '';
    
    switch(item.status) {
        case 'active':
            statusText = 'Available';
            break;
        case 'claimed':
            statusText = 'Claimed';
            break;
        case 'soon':
            statusText = 'Disposal Soon';
            break;
    }
    
    // Calculate days until disposal
    const disposalDate = new Date(item.disposalDate);
    const today = new Date();
    const timeDiff = disposalDate - today;
    const daysUntilDisposal = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let countdownText = '';
    if (daysUntilDisposal > 0) {
        countdownText = `Disposal in ${daysUntilDisposal} day${daysUntilDisposal !== 1 ? 's' : ''}`;
    } else if (daysUntilDisposal === 0) {
        countdownText = 'Disposal today';
    } else {
        countdownText = 'Disposal overdue';
    }
    
    return `
        <div class="item-card" data-id="${item.id}">
            <img src="${item.image}" alt="${item.title}" class="item-image">
            <div class="item-content">
                <h3 class="item-title">${item.title}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-meta">
                    <div class="item-location">
                        <i data-lucide="map-pin" width="16" height="16"></i>
                        <span>${item.location}</span>
                    </div>
                    <div class="item-date">
                        <i data-lucide="calendar" width="16" height="16"></i>
                        <span>Found on ${formattedDate}</span>
                    </div>
                </div>
                <div class="item-status ${statusClass}">
                    ${statusText}
                </div>
                ${item.status !== 'claimed' ? `<div class="countdown">
                    <i data-lucide="clock" width="14" height="14"></i>
                    <span>${countdownText}</span>
                </div>` : ''}
            </div>
        </div>
    `;
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Filter functionality
    statusFilter.addEventListener('change', (e) => {
        loadItems(e.target.value);
    });
    
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
        });
    }
    
    // Inquiry button click
    if (inquiryButton) {
        inquiryButton.addEventListener('click', toggleInquiryPanel);
    }
    
    // Close inquiry panel
    if (closeInquiryBtn) {
        closeInquiryBtn.addEventListener('click', () => {
            inquiryPanel.classList.remove('active');
        });
    }
    
    // Close inquiry panel when clicking outside
    document.addEventListener('click', (e) => {
        if (inquiryPanel && inquiryPanel.classList.contains('active') && 
            !inquiryPanel.contains(e.target) && 
            e.target !== inquiryButton) {
            inquiryPanel.classList.remove('active');
        }
    });
    
    // Inquiry form submission
    if (inquiryForm) {
        inquiryForm.addEventListener('submit', handleInquirySubmission);
    }
}

// Toggle inquiry panel
function toggleInquiryPanel() {
    inquiryPanel.classList.toggle('active');
}

// Handle inquiry form submission
function handleInquirySubmission(e) {
    e.preventDefault();
    
    const name = document.getElementById('inquiryName').value.trim();
    const email = document.getElementById('inquiryEmail').value.trim();
    const message = document.getElementById('inquiryMessage').value.trim();
    
    if (!name || !email || !message) return;
    
    // Create message object
    const inquiry = {
        id: Date.now(),
        from: name,
        email: email,
        subject: 'Inquiry about missing item',
        body: message,
        date: new Date().toISOString()
    };
    
    // Send the message - if MessagesStore exists use it, otherwise simulate success
    if (window.MessagesStore) {
        try {
            // Add to inbox
            const messages = window.MessagesStore.getAll();
            messages.unshift(inquiry);
            localStorage.setItem('lafsys_messages_v1', JSON.stringify(messages));
            
            // Create a thread
            window.MessagesStore.send(email, name, message, email);
            
            // Show success and reset form
            showInquirySuccess();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('There was an error sending your message. Please try again.');
        }
    } else {
        console.log('Message would be sent:', inquiry);
        showInquirySuccess();
    }
}

// Show inquiry success message and reset form
function showInquirySuccess() {
    inquiryForm.reset();
    inquiryForm.style.display = 'none';
    inquirySuccess.style.display = 'flex';
    
    // Reset after 3 seconds
    setTimeout(() => {
        inquiryForm.style.display = 'block';
        inquirySuccess.style.display = 'none';
        inquiryPanel.classList.remove('active');
    }, 3000);
}

// Handle search functionality
async function handleSearch() {
    const query = searchInput.value.trim();
    
    try {
        const items = await searchItems(query);
        displayItems(items);
    } catch (error) {
        console.error('Error searching items:', error);
        itemsContainer.innerHTML = '<p class="error">Error performing search. Please try again.</p>';
    }
}

// Function to open the claim modal (can be called from other pages)
function openClaimModal(itemId) {
    if (claimModal) {
        // In a real app, we would pre-fill the form with item details
        claimModal.style.display = 'flex';
    }
}

// Make this function available globally for use in other scripts
window.openClaimModal = openClaimModal;
