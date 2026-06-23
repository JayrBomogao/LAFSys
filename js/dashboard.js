// dashboard.js - Main script for the dashboard functionality

// DOM Elements
const itemsContainer = document.getElementById('items-container');
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

// Expose key functions to window scope for debugging
window.getItemById = getItemById;
window.openItemDetails = openItemDetails;
window.loadItems = loadItems;

// Load items when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await loadItems();
    setupEventListeners();
    setupRefreshButton();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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
    if (typeof lucide !== 'undefined') {
        lucide.createIcons({
            icons: [
                'map-pin',
                'calendar',
                'clock',
                'search',
                'image'
            ]
        });
    }
    
    // Add event listeners to the new item cards
    document.querySelectorAll('.item-card').forEach(card => {
        card.style.cursor = 'pointer';
        
        // Make sure we handle clicks on the entire card
        card.addEventListener('click', async (e) => {
            // Don't trigger if clicking on the claim button
            if (e.target.closest('.btn-claim')) {
                return;
            }
            
            const itemId = card.dataset.id;
            try {
                // Use the correct method to get item based on ID type
                let item;
                if (isNaN(parseInt(itemId))) {
                    // It's a string ID (likely from Firestore)
                    item = await getItemById(itemId);
                } else {
                    // It's a numeric ID
                    item = await getItemById(parseInt(itemId));
                }
                
                if (item) {
                    openItemDetails(item);
                } else {
                    console.error('Item not found with ID:', itemId);
                }
            } catch (error) {
                console.error('Error loading item details:', error);
            }
        });
        
        // Also handle clicks on the View Details button specifically
        const viewButton = card.querySelector('.view-item');
        if (viewButton) {
            viewButton.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent double handling
                
                const itemId = card.dataset.id;
                try {
                    let item;
                    if (isNaN(parseInt(itemId))) {
                        item = await getItemById(itemId);
                    } else {
                        item = await getItemById(parseInt(itemId));
                    }
                    
                    if (item) {
                        openItemDetails(item);
                    }
                } catch (error) {
                    console.error('Error loading item details from button:', error);
                }
            });
        }
    });
}

// Create HTML for an item card
function createItemCard(item) {
    // Make sure we always have valid dates by handling Firestore timestamps or string dates
    const getFormattedDate = (dateValue) => {
        if (!dateValue) return 'Unknown date';
        
        try {
            // Handle Firestore Timestamp
            if (dateValue && typeof dateValue.toDate === 'function') {
                dateValue = dateValue.toDate();
            }
            
            // Convert to Date object if it's a string
            const dateObj = dateValue instanceof Date ? dateValue : new Date(dateValue);
            
            return dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            });
        } catch (e) {
            console.error('Date formatting error:', e);
            return 'Invalid date';
        }
    };

    // Format the date consistently
    const formattedDate = getFormattedDate(item.date);
    
    const statusClass = `status-${item.status}`;
    let statusText = '';
    
    switch(item.status) {
        case 'active':
            statusText = 'Available';
            break;
        case 'claimed':
            statusText = 'Claimed';
            break;
        case 'returned':
            statusText = 'Returned';
            break;
        case 'disposed':
            statusText = 'Disposed';
            break;
        default:
            statusText = 'Active';
    }
    
    return `
        <div class="item-card" data-id="${item.id}">
            <div class="item-image">
                <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                <div class="status-badge ${statusClass}">${statusText}</div>
            </div>
            <div class="item-content">
                <h3 class="item-title">${item.title}</h3>
                <div class="item-category">${item.category || 'Uncategorized'}</div>
                <div class="item-details">
                    <div class="location-detail"><i data-lucide="map-pin"></i> ${item.location || 'Unknown location'}</div>
                    <div class="date-detail"><i data-lucide="calendar"></i> ${formattedDate}</div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-primary view-item">
                        <i data-lucide="eye"></i> View Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Open item details modal
function openItemDetails(item) {
    document.getElementById('modalItemTitle').textContent = item.title || 'Untitled Item';
    document.getElementById('modalItemDescription').textContent = item.description || 'No description available';
    document.getElementById('modalItemCategory').textContent = item.category || 'Uncategorized';
    document.getElementById('modalItemLocation').textContent = item.location || 'Unknown';
    document.getElementById('modalItemStorageLocation').textContent = item.storageLocation || 'Not specified';
    document.getElementById('modalItemFoundBy').textContent = item.foundBy || 'Unknown';

    // Format date
    try {
        document.getElementById('modalItemDate').textContent = item.date
            ? new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Unknown';
    } catch (_) {
        document.getElementById('modalItemDate').textContent = item.date || 'Unknown';
    }

    // Set status badge
    const statusBadge = document.getElementById('modalItemStatus');
    const s = (item.status || 'active').toLowerCase();
    statusBadge.className = 'idm-status-badge ' + (
        s === 'claimed'  ? 'idm-status-claimed'  :
        s === 'returned' ? 'idm-status-returned' :
                           'idm-status-active'
    );
    statusBadge.textContent = s.charAt(0).toUpperCase() + s.slice(1);

    // Set image
    document.getElementById('modalItemImage').src = item.image || 'https://via.placeholder.com/400x300?text=No+Image';

    // Show the modal (clear any stale inline style so .modal.active CSS takes effect)
    const itemModal = document.getElementById('itemDetailsModal');
    itemModal.style.display = '';
    itemModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Set up refresh button functionality
function setupRefreshButton() {
    const refreshButton = document.getElementById('refresh-items');
    if (refreshButton) {
        refreshButton.addEventListener('click', async () => {
            refreshButton.classList.add('rotating');
            await loadItems(statusFilter ? statusFilter.value : 'all');
            setTimeout(() => {
                refreshButton.classList.remove('rotating');
            }, 1000);
        });
    }
}

// Set up event listeners
function setupEventListeners() {
    // Status filter change
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadItems(statusFilter.value);
        });
    }
    
    // Search button click
    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) {
                searchItems(query);
            }
        });
        
        // Search input enter key
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query) {
                    searchItems(query);
                }
            }
        });

        // When search input is cleared, go back to all items
        searchInput.addEventListener('input', () => {
            if (searchInput.value.trim() === '') {
                loadItems(statusFilter ? statusFilter.value : 'all');
            }
        });
    }
    
    // Image search button
    const imageSearchBtn = document.getElementById('imageSearchBtn');
    if (imageSearchBtn) {
        imageSearchBtn.addEventListener('click', () => {
            document.getElementById('imageSearchModal').style.display = 'block';
        });
    }
    
    // Claim button in modal
    const claimItemBtn = document.getElementById('claimItemBtn');
    // "Chat with Staff" button in item details modal — close modal then open live chat
    if (claimItemBtn) {
        claimItemBtn.addEventListener('click', () => {
            if (window.itemDetailsModal) {
                window.itemDetailsModal.close();
            } else {
                document.getElementById('itemDetailsModal').classList.remove('active');
                document.body.style.overflow = '';
            }
            if (typeof window.toggleChatWidget === 'function') {
                window.toggleChatWidget();
            }
        });
    }

    // "Close" button in item details modal
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (window.itemDetailsModal) {
                window.itemDetailsModal.close();
            } else {
                document.getElementById('itemDetailsModal').classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    // Close buttons for modals (the × button)
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const m = this.closest('.modal');
            m.style.display = '';
            m.classList.remove('active');
            document.body.style.overflow = '';
        });
    });
    
    // Inquiry button toggle
    if (inquiryButton && inquiryPanel) {
        inquiryButton.addEventListener('click', () => {
            inquiryPanel.classList.toggle('open');
        });
    }
    
    // Close inquiry panel
    if (closeInquiryBtn && inquiryPanel) {
        closeInquiryBtn.addEventListener('click', () => {
            inquiryPanel.classList.remove('open');
        });
    }
    
    // Inquiry form submission
    if (inquiryForm && inquirySuccess) {
        inquiryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('inquiryName').value;
            const email = document.getElementById('inquiryEmail').value;
            const message = document.getElementById('inquiryMessage').value;
            
            try {
                await submitInquiry(name, email, message);
                inquiryForm.style.display = 'none';
                inquirySuccess.style.display = 'block';
                inquiryForm.reset();
                
                // Reset after 5 seconds
                setTimeout(() => {
                    inquirySuccess.style.display = 'none';
                    inquiryForm.style.display = 'block';
                    inquiryPanel.classList.remove('open');
                }, 5000);
                
            } catch (error) {
                console.error('Error submitting inquiry:', error);
                alert('There was an error sending your message. Please try again later.');
            }
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Image upload
    const uploadBtn = document.getElementById('uploadBtn');
    const imageUpload = document.getElementById('imageUpload');
    const findMatchesBtn = document.getElementById('findMatchesBtn');
    
    if (uploadBtn && imageUpload) {
        uploadBtn.addEventListener('click', () => {
            imageUpload.click();
        });
        
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const imagePreview = document.getElementById('imagePreview');
                    imagePreview.innerHTML = `<img src="${event.target.result}" alt="Selected Image">`;
                    findMatchesBtn.disabled = false;
                };
                reader.readAsDataURL(file);
            }
        });
        
        if (findMatchesBtn) {
            findMatchesBtn.addEventListener('click', async () => {
                const file = imageUpload.files[0];
                if (!file) return;
                
                try {
                    const searchResults = document.getElementById('searchResults');
                    searchResults.innerHTML = '<p>Searching for similar items...</p>';
                    
                    // Call the image search function (implemented elsewhere)
                    const results = await searchByImage(file);
                    
                    // Display results
                    if (results && results.length > 0) {
                        searchResults.innerHTML = `
                            <h3>Found ${results.length} similar items:</h3>
                            <div class="results-grid">
                                ${results.map(item => `
                                    <div class="result-card" data-id="${item.id}">
                                        <img src="${item.image}" alt="${item.title}">
                                        <h4>${item.title}</h4>
                                        <p>${item.category || 'Uncategorized'}</p>
                                        <button class="btn btn-sm" onclick="viewItemDetails(${item.id})">View Item</button>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        searchResults.innerHTML = '<p>No similar items found.</p>';
                    }
                } catch (error) {
                    console.error('Error searching by image:', error);
                    document.getElementById('searchResults').innerHTML = '<p class="error">Error searching by image. Please try again later.</p>';
                }
            });
        }
    }
}
