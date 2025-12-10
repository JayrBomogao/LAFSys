// Database fix script - Diagnoses Firestore issues and adds test data if needed
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Database fix tool initializing...');
    
    // Create status indicator
    const statusDiv = document.createElement('div');
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '10px';
    statusDiv.style.right = '10px';
    statusDiv.style.padding = '10px';
    statusDiv.style.background = '#3b82f6';
    statusDiv.style.color = 'white';
    statusDiv.style.borderRadius = '5px';
    statusDiv.style.zIndex = '9999';
    statusDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    statusDiv.textContent = 'Checking database connection...';
    document.body.appendChild(statusDiv);
    
    // Check if Firebase is properly loaded
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        statusDiv.style.background = 'red';
        statusDiv.textContent = 'Error: Firebase or Firestore is not available';
        console.error('Firebase or Firestore is not available');
        return;
    }
    
    const db = firebase.firestore();
    
    try {
        // First check if we can connect to Firestore
        statusDiv.textContent = 'Testing Firestore connection...';
        await db.collection('system_info').doc('test').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            test: 'Connection test'
        });
        
        // Check if there are any items in the 'items' collection
        statusDiv.textContent = 'Checking for existing items...';
        const snapshot = await db.collection('items').get();
        
        if (snapshot.empty) {
            statusDiv.textContent = 'No items found. Adding test item...';
            
            // No items found, add a test item
            const testItem = {
                title: 'Test Item',
                description: 'This is a test item to verify database functionality',
                category: 'Test',
                location: 'Database Testing Area',
                date: firebase.firestore.Timestamp.now(),
                status: 'active',
                image: 'https://via.placeholder.com/300x200?text=Test+Item',
                createdAt: firebase.firestore.Timestamp.now()
            };
            
            await db.collection('items').add(testItem);
            statusDiv.textContent = 'Test item added successfully! Reload page to see it.';
            statusDiv.style.background = 'green';
            
            // Add reload button
            const reloadBtn = document.createElement('button');
            reloadBtn.textContent = 'Reload Page';
            reloadBtn.style.marginLeft = '10px';
            reloadBtn.style.padding = '5px 10px';
            reloadBtn.style.border = 'none';
            reloadBtn.style.borderRadius = '3px';
            reloadBtn.style.background = 'white';
            reloadBtn.style.color = 'black';
            reloadBtn.style.cursor = 'pointer';
            reloadBtn.onclick = () => window.location.reload();
            statusDiv.appendChild(reloadBtn);
            
            console.log('Test item added to the database');
        } else {
            // Items exist, check if they're being retrieved correctly
            const items = [];
            snapshot.forEach(doc => {
                items.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('Found items in database:', items.length);
            console.log('Sample item:', items[0]);
            
            // Directly update the display with these items
            statusDiv.textContent = `Found ${items.length} items in database. Updating display...`;
            
            // Try to force update the items display
            const container = document.getElementById('recentItemsContainer');
            if (container) {
                displayItems(items, container);
                // Success - hide the status indicator after 2 seconds
                statusDiv.textContent = `Successfully connected to database`;
                statusDiv.style.background = 'green';
                setTimeout(() => {
                    statusDiv.style.opacity = '0';
                    statusDiv.style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        statusDiv.remove();
                    }, 500);
                }, 2000);
                
                // Add a function to help display items
                window.forceDisplayItems = () => {
                    displayItems(items, container);
                    console.log('Forced display refresh with', items.length, 'items');
                };
                
                console.log('Items display updated manually');
            } else {
                statusDiv.textContent = `Found ${items.length} items but can't update display. See console.`;
                statusDiv.style.background = 'orange';
                console.error('Could not find recentItemsContainer element');
            }
        }
    } catch (error) {
        statusDiv.style.background = 'red';
        statusDiv.textContent = `Error: ${error.message}`;
        console.error('Database fix tool error:', error);
    }
    
    // Helper function to display items (copied from admin.js)
    function displayItems(items, container) {
        if (!items || !items.length) { 
            container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No items found.</div></div>'; 
            return; 
        }
        
        function formatDate(dateObj) {
            if (!dateObj) return 'Unknown date';
            
            try {
                // Handle Firestore Timestamp
                if (dateObj && typeof dateObj.toDate === 'function') {
                    return dateObj.toDate().toLocaleDateString();
                }
                
                // Handle Date object or date string
                const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
                return d.toLocaleDateString();
            } catch(e) {
                return 'Invalid date';
            }
        }
        
        function statusBadge(status) {
            if (status === 'claimed') return '<span class="status-badge status-completed">Claimed</span>';
            if (status === 'soon') return '<span class="status-badge status-pending">Disposal Soon</span>';
            return '<span class="status-badge status-active">Active</span>';
        }
        
        container.innerHTML = items.map(item => `
          <div class="table-row" data-id="${item.id}">
            <div class="item-info">
              <img src="${item.image || ''}" alt="${item.title || 'Unnamed Item'}" class="item-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
              <div>
                <div class="item-name">${item.title || 'Unnamed Item'}</div>
                <div class="item-category">${item.category || 'Uncategorized'}</div>
              </div>
            </div>
            <div>${item.location || 'Unknown location'}</div>
            <div>${formatDate(item.date)}</div>
            <div>${statusBadge(item.status || 'active')}</div>
            <div class="action-buttons">
              <button class="btn-icon" title="Edit"><i data-lucide="edit-2" width="16" height="16"></i></button>
              <button class="btn-icon delete" title="Delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
              <button class="btn-icon" title="View"><i data-lucide="eye" width="16" height="16"></i></button>
            </div>
          </div>
        `).join('');
        
        // Initialize icons if lucide is available
        if (window.lucide?.createIcons) window.lucide.createIcons();
    }
});
