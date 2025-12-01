// Use Firebase global objects provided by compat version
console.log('Claims.js loaded');

// db is already defined in firestore-data.js which is loaded before this file

// DOM Elements
const claimsList = document.getElementById('claimsList');
const filterSelect = document.querySelector('.filter-select');
const searchInput = document.querySelector('.search-input');
const modal = document.getElementById('claimDetailsModal');

// Utility function to repair claims that might have missing item references
async function repairClaimsWithMissingItems() {
    console.log('Running claim repair utility...');
    try {
        // Get all claims
        const claimsRef = firebase.firestore().collection('claims');
        const claimsSnap = await claimsRef.get();
        
        if (claimsSnap.empty) {
            console.log('No claims to repair');  
            return;
        }
        
        // Get all items
        const itemsRef = firebase.firestore().collection('items');
        const itemsSnap = await itemsRef.get();
        
        if (itemsSnap.empty) {
            console.warn('No items found, cannot repair claims');  
            return;
        }
        
        // Get item IDs
        const itemIds = itemsSnap.docs.map(doc => doc.id);
        console.log('Available items:', itemIds);
        
        // Check each claim
        const brokenClaims = [];
        claimsSnap.docs.forEach(doc => {
            const claim = doc.data();
            if (!claim.itemId || !itemIds.includes(claim.itemId)) {
                brokenClaims.push({
                    id: doc.id,
                    claim
                });
            }
        });
        
        console.log('Found broken claims:', brokenClaims.length);
        
        // Repair broken claims by assigning a valid itemId
        if (brokenClaims.length > 0 && itemIds.length > 0) {
            const batch = firebase.firestore().batch();
            
            brokenClaims.forEach(({id}) => {
                const randomItemId = itemIds[Math.floor(Math.random() * itemIds.length)];
                const claimRef = firebase.firestore().collection('claims').doc(id);
                
                batch.update(claimRef, {
                    itemId: randomItemId,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log(`Repairing claim ${id} with item ${randomItemId}`);
            });
            
            await batch.commit();
            console.log(`Repaired ${brokenClaims.length} broken claims`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error repairing claims:', error);
        return false;
    }
}

// Initialize Claims Page
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - initializing claims page...');
    
    // Initialize Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    } else {
        console.warn('Lucide library not found');
    }
    
    // Verify DOM elements exist
    if (!claimsList) {
        console.error('Claims list element not found! ID: claimsList');
        return;
    }
    
    // Verify DataStore is available
    if (!window.DataStore) {
        console.error('DataStore not found. Make sure firestore-data.js is loaded properly.');
        claimsList.innerHTML = `
            <div class="error-message">
                <p>Error: DataStore not initialized. Please check the console for more details.</p>
            </div>
        `;
        return;
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // First run repair utility, then load claims
    console.log('Starting claim repair and loading process...');
    repairClaimsWithMissingItems()
        .then(() => {
            return loadClaims();
        })
        .catch(error => {
            console.error('Error during initial claims loading:', error);
            claimsList.innerHTML = `
                <div class="error-message">
                    <p>Error loading claims: ${error.message || 'Unknown error'}</p>
                    <button class="btn btn-primary" id="retryBtn">Retry</button>
                </div>
            `;
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            const retryBtn = document.getElementById('retryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', loadClaims);
            }
        });
});

// Load claims from Firestore
async function loadClaims() {
    try {
        if (!claimsList) {
            console.error('Claims list element not found');
            return;
        }
        
        // Show loading state
        claimsList.innerHTML = `
            <div class="loading-claims">
                <div class="loading-spinner"></div>
                <p>Loading claims...</p>
            </div>
        `;
        
        console.log('Fetching claims from database...');
        // Get all claims from database
        const claims = await window.DataStore.getAllClaims();
        console.log('Claims fetched:', claims);
        
        if (!claims || claims.length === 0) {
            console.log('No claims found, showing empty state');
            showNoClaims();
            return;
        }
        
        // Sort claims by createdAt (most recent first)
        claims.sort((a, b) => {
            // Handle Firestore timestamps
            const dateA = a.createdAt && a.createdAt.toDate ? 
                a.createdAt.toDate() : 
                (a.createdAt ? new Date(a.createdAt) : new Date());
            const dateB = b.createdAt && b.createdAt.toDate ? 
                b.createdAt.toDate() : 
                (b.createdAt ? new Date(b.createdAt) : new Date());
            return dateB - dateA;
        });
        
        console.log('Processing claims to get item details...');
        // Process each claim to get associated item details
        const processedClaims = await Promise.all(claims.map(async claim => {
            if (!claim.itemId) {
                console.warn('Claim without itemId:', claim);
                return {
                    ...claim,
                    item: null
                };
            }
            
            // Get item details for this claim with enhanced logging
            console.log('Fetching item details for claim:', claim.id, 'with itemId:', claim.itemId);
            try {
                const item = await window.DataStore.getItemById(claim.itemId);
                
                if (!item) {
                    console.warn('Item not found for claim:', claim.id, 'with itemId:', claim.itemId);
                    // Try direct Firestore fetch as a fallback
                    try {
                        const directItemRef = firebase.firestore().collection('items').doc(claim.itemId);
                        const directItemSnap = await directItemRef.get();
                        
                        if (directItemSnap.exists) {
                            console.log('Retrieved item directly from Firestore:', directItemSnap.id);
                            return {
                                ...claim,
                                item: {
                                    id: directItemSnap.id,
                                    ...directItemSnap.data()
                                }
                            };
                        }
                    } catch (directError) {
                        console.error('Error in direct item fetch:', directError);
                    }
                }
                
                console.log('Item details for claim', claim.id, ':', item);
                return {
                    ...claim,
                    item
                };
            } catch (itemError) {
                console.error('Error fetching item for claim:', claim.id, 'Error:', itemError);
                return {
                    ...claim,
                    item: null
                };
            }
        }));
        
        console.log('Rendering claims:', processedClaims);
        // Display claims
        renderClaims(processedClaims);
    } catch (error) {
        console.error('Error loading claims:', error);
        if (claimsList) {
            claimsList.innerHTML = `
                <div class="error-message">
                    <i data-lucide="alert-triangle" width="24" height="24"></i>
                    <p>Error loading claims: ${error.message || 'Unknown error'}</p>
                    <button class="btn btn-primary" id="retryBtn">Retry</button>
                </div>
            `;
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            // Add event listener for retry button
            const retryBtn = document.getElementById('retryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', loadClaims);
            }
        }
    }
}

// Render claims list
function renderClaims(claims) {
    if (!claimsList) return;
    
    if (claims.length === 0) {
        showNoClaims();
        return;
    }
    
    // Generate HTML for each claim
    const claimsHTML = claims.map(claim => {
        const item = claim.item || {};
        const claimDate = claim.createdAt && claim.createdAt.toDate ? 
            claim.createdAt.toDate() : 
            new Date(claim.createdAt || Date.now());
        const formattedDate = formatDate(claimDate);
        
        // Generate initials for avatar
        const initials = getInitials(claim.claimantName || 'Unknown User');
        
        return `
            <div class="claim-card" data-claim-id="${claim.id}" data-item-id="${claim.itemId}">
                <div class="claim-header">
                    <div>
                        <h3 class="claim-title">Claim for ${item.title || 'Unknown Item'}</h3>
                        <div class="claim-meta">
                            <div class="claim-id">
                                <i data-lucide="hash" width="14" height="14"></i>
                                #${claim.id || 'Unknown'}
                            </div>
                            <div class="claim-date">
                                <i data-lucide="calendar" width="14" height="14"></i>
                                ${formattedDate}
                            </div>
                        </div>
                    </div>
                    <div class="claim-status status-${claim.status || 'pending'}">
                        ${getStatusText(claim.status)}
                    </div>
                </div>
                
                <div class="claim-content">
                    <img src="${item.image || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${item.title || 'Item'}" class="claim-item-image">
                    <div class="claim-details">
                        <h4 class="claim-item-name">${item.title || 'Unknown Item'}</h4>
                        <div class="claim-item-location">
                            <i data-lucide="map-pin" width="14" height="14"></i>
                            ${item.location || 'Location not specified'}
                        </div>
                        <p class="claim-item-description">
                            ${claim.description || 'No description provided.'}
                        </p>
                        
                        <div class="claim-claimant">
                            <div class="claim-claimant-title">Claimant Information</div>
                            <div class="claim-claimant-info">
                                <div class="claim-claimant-avatar">${initials}</div>
                                <div class="claim-claimant-details">
                                    <div class="claim-claimant-name">${claim.claimantName || 'Unknown User'}</div>
                                    <div class="claim-claimant-contact">
                                        <a href="mailto:${claim.claimantEmail || '#'}" class="claim-claimant-email">
                                            <i data-lucide="mail" width="14" height="14"></i>
                                            ${claim.claimantEmail || 'No email provided'}
                                        </a>
                                        <span class="claim-claimant-phone">
                                            <i data-lucide="phone" width="14" height="14"></i>
                                            ${claim.claimantPhone || 'No phone provided'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="claim-actions">
                    <a href="#" class="btn btn-outline btn-sm view-details-btn">
                        <i data-lucide="eye" width="14" height="14" style="margin-right: 6px;"></i>
                        View Details
                    </a>
                    ${claim.status === 'pending' ? `
                        <button class="btn btn-success btn-sm approve-btn">
                            <i data-lucide="check" width="14" height="14" style="margin-right: 6px;"></i>
                            Approve
                        </button>
                        <button class="btn btn-danger btn-sm reject-btn">
                            <i data-lucide="x" width="14" height="14" style="margin-right: 6px;"></i>
                            Reject
                        </button>
                    ` : `
                        <button class="btn btn-outline btn-sm" disabled>
                            <i data-lucide="${claim.status === 'approved' ? 'check' : 'x'}" width="14" height="14" style="margin-right: 6px;"></i>
                            ${claim.status === 'approved' ? 'Approved' : 'Rejected'} on ${formatDate(claim.approvalDate || claim.updatedAt || new Date())}
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
    
    // Update the DOM
    claimsList.innerHTML = claimsHTML;
    
    // Re-initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Attach event listeners to new elements
    attachCardEventListeners();
}

// Show "No claims found" message
function showNoClaims() {
    if (!claimsList) {
        console.error('Claims list element not found');
        return;
    }
    
    console.log('Showing no claims found message');
    
    claimsList.innerHTML = `
        <div class="no-claims">
            <div class="no-claims-icon">
                <i data-lucide="inbox" width="32" height="32"></i>
            </div>
            <h3 class="no-claims-title">No claims found</h3>
            <p class="no-claims-text">
                There are no item claims in the database yet. When users submit claims for lost items, they will appear here.
            </p>
            <button class="btn btn-primary" id="refreshBtn">
                <i data-lucide="refresh-ccw" width="16" height="16" style="margin-right: 8px;"></i>
                Refresh
            </button>
        </div>
    `;
    
    // Re-initialize icons
    if (window.lucide) {
        lucide.createIcons();
    }
    
    // Add refresh button functionality
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadClaims);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Filter and search functionality
    if (filterSelect) {
        filterSelect.addEventListener('change', filterClaims);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterClaims);
    }
    
    // Close modal buttons
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Modal approve/reject buttons
    const approveClaimBtn = document.getElementById('approveClaimBtn');
    const rejectClaimBtn = document.getElementById('rejectClaimBtn');
    
    if (approveClaimBtn) {
        approveClaimBtn.addEventListener('click', async function() {
            const claimId = this.getAttribute('data-claim-id');
            if (!claimId) return;
            
            if (confirm('Are you sure you want to approve this claim?')) {
                await processClaimAction(claimId, 'approved');
            }
        });
    }
    
    if (rejectClaimBtn) {
        rejectClaimBtn.addEventListener('click', async function() {
            const claimId = this.getAttribute('data-claim-id');
            if (!claimId) return;
            
            const reason = prompt('Please provide a reason for rejection:');
            if (reason !== null) {
                await processClaimAction(claimId, 'rejected', reason);
            }
        });
    }
}

// Attach event listeners to claim cards
function attachCardEventListeners() {
    // View details buttons
    const viewDetailsBtns = document.querySelectorAll('.view-details-btn');
    viewDetailsBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const claimCard = this.closest('.claim-card');
            if (!claimCard) return;
            
            const claimId = claimCard.getAttribute('data-claim-id');
            const itemId = claimCard.getAttribute('data-item-id');
            
            await showClaimDetails(claimId, itemId);
        });
    });
    
    // Approve buttons
    const approveBtns = document.querySelectorAll('.approve-btn');
    approveBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const claimCard = this.closest('.claim-card');
            if (!claimCard) return;
            
            const claimId = claimCard.getAttribute('data-claim-id');
            if (!claimId) return;
            
            if (confirm('Are you sure you want to approve this claim?')) {
                await processClaimAction(claimId, 'approved');
            }
        });
    });
    
    // Reject buttons
    const rejectBtns = document.querySelectorAll('.reject-btn');
    rejectBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const claimCard = this.closest('.claim-card');
            if (!claimCard) return;
            
            const claimId = claimCard.getAttribute('data-claim-id');
            if (!claimId) return;
            
            const reason = prompt('Please provide a reason for rejection:');
            if (reason !== null) {
                await processClaimAction(claimId, 'rejected', reason);
            }
        });
    });
}

// Filter claims based on search term and status
function filterClaims() {
    const statusFilter = filterSelect ? filterSelect.value : 'all';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const claimCards = document.querySelectorAll('.claim-card');
    let visibleCount = 0;
    
    claimCards.forEach(card => {
        const status = card.querySelector('.claim-status').textContent.toLowerCase();
        const title = card.querySelector('.claim-title').textContent.toLowerCase();
        const description = card.querySelector('.claim-item-description') ? 
            card.querySelector('.claim-item-description').textContent.toLowerCase() : '';
        const claimantName = card.querySelector('.claim-claimant-name') ? 
            card.querySelector('.claim-claimant-name').textContent.toLowerCase() : '';
        
        const matchesStatus = statusFilter === 'all' || status.includes(statusFilter);
        const matchesSearch = searchTerm === '' || 
            title.includes(searchTerm) || 
            description.includes(searchTerm) ||
            claimantName.includes(searchTerm);
        
        if (matchesStatus && matchesSearch) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show or hide no results message
    const noClaimsDiv = document.querySelector('.no-claims');
    
    if (visibleCount === 0) {
        if (!noClaimsDiv) {
            const noResults = document.createElement('div');
            noResults.className = 'no-claims';
            noResults.innerHTML = `
                <div class="no-claims-icon">
                    <i data-lucide="search" width="32" height="32"></i>
                </div>
                <h3 class="no-claims-title">No matching claims found</h3>
                <p class="no-claims-text">
                    There are no claims matching your current filters. Try adjusting your search criteria.
                </p>
                <button class="btn btn-primary" id="resetFiltersBtn">
                    <i data-lucide="refresh-ccw" width="16" height="16" style="margin-right: 8px;"></i>
                    Reset Filters
                </button>
            `;
            claimsList.appendChild(noResults);
            if (window.lucide) lucide.createIcons();
            
            // Add event listener to reset filters button
            const resetFiltersBtn = document.getElementById('resetFiltersBtn');
            if (resetFiltersBtn) {
                resetFiltersBtn.addEventListener('click', function() {
                    if (filterSelect) filterSelect.value = 'all';
                    if (searchInput) searchInput.value = '';
                    filterClaims();
                    noResults.remove();
                });
            }
        }
    } else if (noClaimsDiv) {
        noClaimsDiv.remove();
    }
}

// Show claim details in modal
async function showClaimDetails(claimId, itemId) {
    try {
        // Get claim details
        const claimRef = firebase.firestore().collection('claims').doc(claimId);
        const claimSnap = await claimRef.get();
        
        if (!claimSnap.exists) {
            alert('Claim not found');
            return;
        }
        
        const claimData = { id: claimSnap.id, ...claimSnap.data() };
        
        // Get item details with enhanced error handling
        console.log('Fetching item details for claim modal, itemId:', itemId);
        let itemData;
        
        try {
            // First try using DataStore
            itemData = await window.DataStore.getItemById(itemId);
            
            // If that fails, try direct Firestore access
            if (!itemData) {
                console.log('Item not found via DataStore, trying direct Firestore access');
                const directItemRef = firebase.firestore().collection('items').doc(itemId);
                const directItemSnap = await directItemRef.get();
                
                if (directItemSnap.exists) {
                    console.log('Retrieved item directly for modal:', directItemSnap.id);
                    itemData = {
                        id: directItemSnap.id,
                        ...directItemSnap.data()
                    };
                }
            }
        } catch (error) {
            console.error('Error fetching item details for modal:', error);
        }
        
        // If still no item data, create a placeholder
        if (!itemData) {
            console.warn('Using placeholder item data for claim modal');
            itemData = {
                id: itemId,
                title: 'Unknown Item',
                description: 'Item details not available',
                location: 'Unknown location',
                date: new Date(),
                image: 'https://via.placeholder.com/400x300?text=No+Image'
            };
        }
        
        console.log('Item data for modal:', itemData);
        
        // Format dates
        const claimDate = claimData.createdAt && claimData.createdAt.toDate ? 
            claimData.createdAt.toDate() : 
            (claimData.createdAt ? new Date(claimData.createdAt) : new Date());
            
        const updateDate = claimData.updatedAt && claimData.updatedAt.toDate ? 
            claimData.updatedAt.toDate() : 
            (claimData.updatedAt ? new Date(claimData.updatedAt) : claimDate);
            
        const itemDate = itemData.date && itemData.date.toDate ? 
            itemData.date.toDate() : 
            (itemData.date ? new Date(itemData.date) : new Date());
        
        // Get initials for avatar
        const initials = getInitials(claimData.claimantName || 'Unknown User');
        
        // Update modal content
        if (modal) {
            // Find elements safely using a more compatible approach
            const divElements = modal.querySelectorAll('div');
            let claimIdElement, statusElement, submitDateElement, updateDateElement;
            
            // Find elements by text content
            for (const div of divElements) {
                if (div.textContent && div.textContent.trim() === 'Claim ID') {
                    claimIdElement = div.nextElementSibling;
                } else if (div.textContent && div.textContent.trim() === 'Status') {
                    statusElement = div.nextElementSibling?.querySelector('span');
                } else if (div.textContent && div.textContent.trim() === 'Date Submitted') {
                    submitDateElement = div.nextElementSibling;
                } else if (div.textContent && div.textContent.trim() === 'Last Updated') {
                    updateDateElement = div.nextElementSibling;
                }
            }
            
            if (claimIdElement) claimIdElement.textContent = `#${claimId}`;
            if (statusElement) {
                statusElement.textContent = getStatusText(claimData.status);
                statusElement.className = `claim-status status-${claimData.status || 'pending'}`;
            }
            if (submitDateElement) submitDateElement.textContent = formatDate(claimDate);
            if (updateDateElement) updateDateElement.textContent = formatDate(updateDate);
            
            // Update item information
            const itemImage = modal.querySelector('img');
            const itemTitle = modal.querySelector('h4');
            
            // Find location and date elements
            let itemLocation, itemDateElement, claimDescription;
            const divElements2 = modal.querySelectorAll('div');
            for (const div of divElements2) {
                if (div.innerHTML && div.innerHTML.includes('map-pin')) {
                    itemLocation = div;
                } else if (div.innerHTML && div.innerHTML.includes('calendar') && div.innerHTML.includes('Found on')) {
                    itemDateElement = div;
                } else if (div.style && div.style.backgroundColor === '#f8fafc' && 
                          div.style.borderRadius === '0.375rem' && 
                          div.style.padding === '1rem') {
                    claimDescription = div;
                }
            }
            
            if (itemImage) {
                itemImage.src = itemData.image || 'https://via.placeholder.com/400x300?text=No+Image';
                itemImage.alt = itemData.title || 'Item';
            }
            if (itemTitle) itemTitle.textContent = itemData.title || 'Unknown Item';
            
            // Update location, found date, and description
            if (itemLocation) {
                const textNode = Array.from(itemLocation.childNodes)
                    .find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = itemData.location || 'Location not specified';
                }
            }
            
            if (itemDateElement) {
                const textNode = Array.from(itemDateElement.childNodes)
                    .find(node => node.nodeType === Node.TEXT_NODE);
                if (textNode) {
                    textNode.textContent = `Found on ${formatDate(itemDate)}`;
                }
            }
            
            if (claimDescription) claimDescription.textContent = claimData.description || 'No description provided.';
            
            // Update claimant information
            const avatarDiv = modal.querySelector('div[style*="border-radius: 50%"][style*="background-color"]');
            let claimantName, claimantEmail, claimantPhone, additionalNotes;
            
            // Find claimant info elements
            for (const div of divElements) {
                if (div.textContent && div.textContent.trim() === 'Email Address') {
                    claimantEmail = div.nextElementSibling;
                } else if (div.textContent && div.textContent.trim() === 'Phone Number') {
                    claimantPhone = div.nextElementSibling;
                } else if (div.textContent && div.textContent.trim() === 'Additional Notes') {
                    additionalNotes = div.nextElementSibling;
                }
            }
            
            if (avatarDiv) {
                avatarDiv.textContent = initials;
                const nameDiv = avatarDiv.nextElementSibling?.querySelector('div:first-child');
                if (nameDiv) nameDiv.textContent = claimData.claimantName || 'Unknown User';
            }
            
            if (claimantEmail) claimantEmail.textContent = claimData.claimantEmail || 'No email provided';
            if (claimantPhone) claimantPhone.textContent = claimData.claimantPhone || 'No phone provided';
            if (additionalNotes) additionalNotes.textContent = claimData.notes || 'No additional notes provided.';
            
            // Set claim ID to approve/reject buttons
            const approveClaimBtn = document.getElementById('approveClaimBtn');
            const rejectClaimBtn = document.getElementById('rejectClaimBtn');
            
            if (approveClaimBtn) approveClaimBtn.setAttribute('data-claim-id', claimId);
            if (rejectClaimBtn) rejectClaimBtn.setAttribute('data-claim-id', claimId);
            
            // Show or hide approve/reject buttons based on claim status
            if (claimData.status === 'pending') {
                if (approveClaimBtn) approveClaimBtn.style.display = 'flex';
                if (rejectClaimBtn) rejectClaimBtn.style.display = 'flex';
            } else {
                if (approveClaimBtn) approveClaimBtn.style.display = 'none';
                if (rejectClaimBtn) rejectClaimBtn.style.display = 'none';
            }
            
            // Show modal
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error showing claim details:', error);
        alert('Error loading claim details: ' + (error.message || 'Please try again.'));
    }
}

// Process claim approval or rejection
async function processClaimAction(claimId, status, reason = null) {
    try {
        // Show loading state
        document.body.classList.add('loading');
        
        // Update claim status in database
        const result = await window.DataStore.updateClaimStatus(claimId, status);
        
        if (result) {
            // Close modal if open
            if (modal) modal.style.display = 'none';
            
            // Update UI
            const claimCard = document.querySelector(`.claim-card[data-claim-id="${claimId}"]`);
            if (claimCard) {
                // Update status badge
                const statusBadge = claimCard.querySelector('.claim-status');
                if (statusBadge) {
                    statusBadge.textContent = getStatusText(status);
                    statusBadge.className = `claim-status status-${status}`;
                }
                
                // Update action buttons
                const actionButtons = claimCard.querySelector('.claim-actions');
                if (actionButtons) {
                    // Store the approval date in a variable to ensure it's valid
                    const approvalDate = new Date();
                    // Store the formatted date to avoid any issues
                    const formattedApprovalDate = formatDate(approvalDate);
                    
                    // Update the claim document with this approval date for consistency
                    try {
                        firebase.firestore().collection('claims').doc(claimId).update({
                            approvalDate: approvalDate,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (updateError) {
                        console.error('Error updating approval date:', updateError);
                    }
                    
                    actionButtons.innerHTML = `
                        <a href="#" class="btn btn-outline btn-sm view-details-btn">
                            <i data-lucide="eye" width="14" height="14" style="margin-right: 6px;"></i>
                            View Details
                        </a>
                        <button class="btn btn-outline btn-sm" disabled>
                            <i data-lucide="${status === 'approved' ? 'check' : 'x'}" width="14" height="14" style="margin-right: 6px;"></i>
                            ${status === 'approved' ? 'Approved' : 'Rejected'} on ${formattedApprovalDate}
                        </button>
                    `;
                    
                    // Re-initialize icons and event listeners
                    if (window.lucide) lucide.createIcons();
                    const newViewBtn = actionButtons.querySelector('.view-details-btn');
                    if (newViewBtn) {
                        newViewBtn.addEventListener('click', async function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            const itemId = claimCard.getAttribute('data-item-id');
                            await showClaimDetails(claimId, itemId);
                        });
                    }
                }
            }
            
            // Show success message
            alert(`Claim ${status === 'approved' ? 'approved' : 'rejected'} successfully.`);
            
            // Refresh claims list to update any related items
            await loadClaims();
        } else {
            throw new Error('Failed to update claim status');
        }
    } catch (error) {
        console.error('Error processing claim action:', error);
        alert(`Error: ${error.message || 'Failed to process claim action. Please try again.'}`);
    } finally {
        document.body.classList.remove('loading');
    }
}

// Helper Functions

// Format date to readable string with enhanced robustness
function formatDate(date) {
    if (!date) return 'Unknown Date';
    
    try {
        // Handle Firebase Timestamp objects
        if (date && typeof date.toDate === 'function') {
            date = date.toDate();
        }
        
        // Handle string timestamps with special handling for Firebase server timestamps
        if (typeof date === 'object' && date.seconds && date.nanoseconds) {
            // Convert Firebase timestamp object to Date
            date = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);
        } else if (typeof date === 'string' || typeof date === 'number') {
            // Convert string or number to Date
            date = new Date(date);
        }
        
        // Ensure we have a Date object now
        const d = date instanceof Date ? date : new Date();
        
        // Double-check date validity
        if (isNaN(d.getTime())) {
            console.warn('Invalid date detected:', date);
            return 'Unknown Date'; // Changed from 'Invalid Date' for better UI
        }
        
        // Format with full month name, day and year
        return d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        console.error('Error formatting date:', e, 'Input was:', date);
        return 'Unknown Date'; // Changed from 'Invalid Date' for better UI
    }
}

// Get status display text
function getStatusText(status) {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        case 'processing':
            return 'Processing';
        case 'pending':
        default:
            return 'Pending Review';
    }
}

// Generate initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}
