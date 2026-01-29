/**
 * NEW ADMIN DASHBOARD - Complete rewrite
 * This is a clean implementation that ensures no action buttons in Dashboard section
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing NEW admin panel...');
  
  // Initialize UI components
  if (window.lucide?.createIcons) lucide.createIcons();
  
  // Set up sidebar navigation
  wireSidebar();
  
  // Initial loading of dashboard elements
  renderStats();
  renderRecentItemsWithoutActions();
  renderInbox();
  
  // Setup event listeners for updates
  setupEventListeners();
});

// Set up event listeners for updates
function setupEventListeners() {
  // Update dashboard when items change
  window.addEventListener('itemsUpdated', () => { 
    renderStats(); 
    renderRecentItemsWithoutActions(); 
    renderAllItems(); 
  });
  
  // Message events
  window.addEventListener('messagesUpdated', () => {
    renderInbox();
  });
  
  window.addEventListener('messagesLoaded', () => {
    renderInbox();
  });
  
  window.addEventListener('messageAdded', (event) => {
    const message = event.detail?.message;
    if (message && message.unread) {
      if (document.querySelector('.nav-link.active')?.getAttribute('data-section') !== 'inbox') {
        showDesktopNotification(message);
      }
    }
    forceRefreshInbox();
  });
  
  // Set up periodic inbox refresh
  const inboxRefreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      forceRefreshInbox();
    }
  }, 30000);
  
  // Clean up interval when page is unloaded
  window.addEventListener('beforeunload', () => {
    clearInterval(inboxRefreshInterval);
  });
}

// Wire up sidebar navigation
function wireSidebar() {
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      const section = link.getAttribute('data-section');
      if (section === 'add-item' || section === 'claims') return; // follow href for real pages
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      switchSection(section);
      if (section === 'dashboard') { renderStats(); renderRecentItemsWithoutActions(); }
      if (section === 'users') { renderUsers(); }
      if (section === 'items') { renderAllItems(); }
      if (section === 'inbox') { renderInbox(); }
    });
  });
}

// Switch section
function switchSection(section) {
  const views = document.querySelectorAll('.section-view');
  views.forEach(v => v.style.display = 'none');
  const target = document.getElementById('section-' + section);
  if (target) target.style.display = '';

  const titleMap = { dashboard: 'Dashboard', users: 'Users', items: 'Items', inbox: 'Inbox', claims: 'Claims', 'add-item': 'Add Item' };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titleMap[section] || 'Dashboard';
}

// Render statistics
function renderStats() {
  // Show loading state
  const byId = id => document.getElementById(id);
  const safe = (id, v) => { const el = byId(id); if (el) el.textContent = String(v); };
  
  safe('statTotalItems', '...');
  safe('statClaimed', '...');
  safe('statSoon', '...');
  
  // Check if we have Firebase-enabled DataStore
  if (window.DataStore?.getItemsAsync) {
    // Use async version
    window.DataStore.getItemsAsync().then(items => {
      updateStats(items);
    }).catch(err => {
      console.error('Error loading items for stats:', err);
      // Fall back to sync method
      const items = window.DataStore?.getItemsSync?.() || [];
      updateStats(items);
    });
  } else {
    // Fall back to old method
    const items = window.DataStore?.getItemsSync?.() || [];
    updateStats(items);
  }
}

// Update statistics
function updateStats(items) {
  const total = items.length;
  const claimed = items.filter(i => i.status === 'claimed').length;
  const soon = items.filter(i => i.status === 'soon').length;
  const pending = items.filter(i => i.status === 'active').length;

  const byId = id => document.getElementById(id);
  const safe = (id, v) => { const el = byId(id); if (el) el.textContent = String(v); };

  safe('statTotalItems', total);
  safe('statActive', pending);
  safe('statClaimed', claimed);
  safe('statSoon', soon);
}

// Format date helper
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  
  let date;
  if (typeof dateStr === 'string') {
    date = new Date(dateStr);
  } else if (dateStr.toDate && typeof dateStr.toDate === 'function') {
    // Handle Firebase Timestamp
    date = dateStr.toDate();
  } else if (dateStr instanceof Date) {
    date = dateStr;
  } else {
    return 'Invalid date';
  }
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  return date.toLocaleDateString();
}

// Status badge helper
function statusBadge(status) {
  if (status === 'claimed') return '<span class="status-badge status-completed">Claimed</span>';
  if (status === 'soon') return '<span class="status-badge status-pending">Disposal Soon</span>';
  return '<span class="status-badge status-active">Active</span>';
}

// Status dropdown for Items section only
function statusDropdown(currentStatus) {
  const statuses = [
    { value: 'active', label: 'Active', class: 'status-active' },
    { value: 'claimed', label: 'Claimed', class: 'status-completed' },
    { value: 'soon', label: 'For Disposal', class: 'status-pending' }
  ];
  
  return `
    <select class="status-select" data-current-status="${currentStatus}">
      ${statuses.map(s => `
        <option value="${s.value}" ${s.value === currentStatus ? 'selected' : ''}>
          ${s.label}
        </option>
      `).join('')}
    </select>
  `;
}

// Render Recent Items WITHOUT ANY ACTIONS (Dashboard section)
function renderRecentItemsWithoutActions() {
  const container = document.getElementById('recentItemsContainer');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Loading recent items...</div></div>';
  
  // Check if we have Firebase-enabled DataStore
  if (window.DataStore?.getItemsAsync) {
    // Use async version
    window.DataStore.getItemsAsync().then(items => {
      // Take the first 10 items
      const recentItems = items.slice(0, 10);
      displayReadOnlyRecentItems(recentItems, container);
    }).catch(err => {
      console.error('Error loading recent items:', err);
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading items</div></div>';
    });
  } else {
    // Fall back to old method
    const items = (window.DataStore?.getItemsSync?.() || []).slice(0, 10);
    displayReadOnlyRecentItems(items, container);
  }
}

// Display Recent Items WITHOUT ANY ACTIONS (Dashboard section)
function displayReadOnlyRecentItems(items, container) {
  if (!items.length) { 
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No items found.</div></div>'; 
    return; 
  }
  
  // Create table header
  const headerHTML = `
    <div class="table-header">
      <div>ITEM</div>
      <div>FOUND LOCATION</div>
      <div>DATE FOUND</div>
      <div>STATUS</div>
      <div>ACTIONS</div>
    </div>
  `;
  
  // Generate READ-ONLY items with NO action buttons
  const rowsHTML = items.map(item => `
    <div class="table-row read-only-row" data-id="${item.id}" data-status="${item.status}">
      <div class="item-info">
        <img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        <div>
          <div class="item-name">${item.title}</div>
          <div class="item-category">${item.category || ''}</div>
        </div>
      </div>
      <div>${item.location || ''}</div>
      <div>${formatDate(item.date)}</div>
      <div class="status-badge-container">
        ${statusBadge(item.status)}
      </div>
      <div class="manage-in-items">
        <span>Manage in Items tab</span>
      </div>
    </div>
  `).join('');
  
  // Set the content
  container.innerHTML = headerHTML + rowsHTML;
  
  // Apply styling to read-only rows
  container.querySelectorAll('.read-only-row').forEach(row => {
    row.style.cursor = 'default';
  });
  
  // Style the manage-in-items text
  container.querySelectorAll('.manage-in-items').forEach(el => {
    el.style.color = '#6b7280';
    el.style.fontStyle = 'italic';
    el.style.fontSize = '0.8rem';
    el.style.textAlign = 'center';
  });
}

// Render All Items WITH ACTIONS (Items section)
function renderAllItems() {
  const container = document.getElementById('allItemsContainer');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Loading all items...</div></div>';
  
  // Get items
  if (window.DataStore?.getItemsAsync) {
    window.DataStore.getItemsAsync().then(items => {
      displayItemsWithActions(items, container);
    }).catch(err => {
      console.error('Error loading all items:', err);
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading items</div></div>';
    });
  } else {
    // Fall back to old method
    const items = window.DataStore?.getItemsSync?.() || [];
    displayItemsWithActions(items, container);
  }
}

// Display Items WITH ACTIONS (Items section)
function displayItemsWithActions(items, container) {
  if (!items.length) { 
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No items found.</div></div>'; 
    return; 
  }
  
  // Create table header
  const headerHTML = `
    <div class="table-header">
      <div>ITEM</div>
      <div>FOUND LOCATION</div>
      <div>DATE FOUND</div>
      <div>STATUS</div>
      <div>ACTIONS</div>
    </div>
  `;
  
  // Generate items WITH action buttons
  const rowsHTML = items.map(item => `
    <div class="table-row interactive-row" data-id="${item.id}" data-status="${item.status}">
      <div class="item-info">
        <img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
        <div>
          <div class="item-name">${item.title}</div>
          <div class="item-category">${item.category || ''}</div>
        </div>
      </div>
      <div>${item.location || ''}</div>
      <div>${formatDate(item.date)}</div>
      <div class="status-dropdown-container">
        ${statusDropdown(item.status)}
      </div>
      <div class="action-buttons">
        <button class="btn-icon edit" title="Edit" data-action="edit"><i data-lucide="edit" width="16" height="16"></i></button>
        <button class="btn-icon delete" title="Delete" data-action="delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
      </div>
    </div>
  `).join('');
  
  // Set the content
  container.innerHTML = headerHTML + rowsHTML;
  
  // Initialize Lucide icons
  if (window.lucide?.createIcons) lucide.createIcons();
  
  // Setup status change handlers
  setupStatusChangeHandlers(container);
  
  // Setup action button handlers
  setupActionButtonHandlers(container);
  
  // Make rows clickable to view details
  setupRowClickHandlers(container);
}

// Setup status change handlers
function setupStatusChangeHandlers(container) {
  container.querySelectorAll('.status-select').forEach(select => {
    // Prevent click propagation
    select.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Handle status change
    select.addEventListener('change', async (e) => {
      e.stopPropagation();
      const newStatus = e.target.value;
      const row = e.target.closest('.table-row');
      const id = row?.dataset?.id;
      const oldStatus = row?.dataset?.status;
      
      console.log('Status change requested:', { id, oldStatus, newStatus });
      
      if (newStatus === oldStatus) {
        console.log('Status unchanged, skipping update');
        return;
      }
      
      // Confirm status change
      const statusLabels = { active: 'Active', claimed: 'Claimed', soon: 'For Disposal' };
      if (!confirm(`Change status to ${statusLabels[newStatus]}?`)) {
        e.target.value = oldStatus;
        return;
      }
      
      // Disable the dropdown during update
      e.target.disabled = true;
      
      // Update status in Firebase
      try {
        console.log('Updating status in Firestore...');
        
        if (window.firebase?.firestore) {
          const db = firebase.firestore();
          await db.collection('items').doc(id).update({ 
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          console.log('✓ Status updated in Firestore:', id, newStatus);
          
          // Verify the update by reading it back
          const doc = await db.collection('items').doc(id).get();
          const verifyStatus = doc.data()?.status;
          console.log('✓ Verified status in Firestore:', verifyStatus);
          
          row.dataset.status = newStatus;
          
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
          successMsg.textContent = `✓ Status changed to ${statusLabels[newStatus]}`;
          document.body.appendChild(successMsg);
          setTimeout(() => successMsg.remove(), 3000);
          
        } else {
          throw new Error('Firebase not available');
        }
      } catch (error) {
        console.error('✗ Error updating status:', error);
        alert('Failed to update status: ' + error.message);
        e.target.value = oldStatus;
      } finally {
        // Re-enable the dropdown
        e.target.disabled = false;
      }
    });
  });
}

// Setup action button handlers
function setupActionButtonHandlers(container) {
  // Handle action button clicks
  container.querySelectorAll('.btn-icon').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const row = btn.closest('.table-row');
      const id = row?.dataset?.id;
      const action = btn.getAttribute('data-action');
      
      if (action === 'edit') {
        // Navigate to edit page
        window.location.href = 'add-item.html?edit=true&id=' + id;
      }
      else if (action === 'delete') {
        if (confirm('Are you sure you want to delete this item?')) {
          row.style.opacity = '0.5';
          row.style.pointerEvents = 'none';
          
          try {
            // Try to delete from Firebase if available
            if (window.firebase?.firestore) {
              await firebase.firestore().collection('items').doc(id).delete();
              console.log('Item deleted from Firebase:', id);
            }
          } catch (error) {
            console.error('Error deleting item:', error);
          }
          
          setTimeout(()=>{ row.style.display = 'none'; }, 200);
        }
      }
    });
  });
}

// Setup row click handlers
function setupRowClickHandlers(container) {
  // Make rows clickable to view details
  container.querySelectorAll('.interactive-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-icon') && !e.target.closest('.status-select')) {
        const id = row.dataset.id;
        if (id) {
          window.location.href = 'item-details.html?id=' + id;
        }
      }
    });
    row.style.cursor = 'pointer';
  });
}

// Render inbox messages
function renderInbox() {
  console.log('Rendering inbox messages...');
  loadInbox();
}

// Force refresh inbox
function forceRefreshInbox() {
  console.log('Forcing inbox refresh...');
  if (window.MessagesStore?.getAllAsync) {
    window.MessagesStore.getAllAsync().then(msgs => {
      console.log('Retrieved', msgs.length, 'messages during forced refresh');
      const container = document.getElementById('inboxContainer');
      if (container) {
        updateInboxNotification(msgs);
        displayInboxMessages(msgs, container);
      }
    }).catch(err => {
      console.error('Error during forced inbox refresh:', err);
    });
  }
}

// Show desktop notification
function showDesktopNotification(message) {
  if (!("Notification" in window)) {
    return;
  }
  
  if (Notification.permission === "granted") {
    const notification = new Notification("New Message", {
      body: message.subject || "You have a new message",
      icon: "/img/notification-icon.png"
    });
    
    notification.onclick = function() {
      window.focus();
      document.querySelector('.nav-link[data-section="inbox"]').click();
    };
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      if (permission === "granted") {
        showDesktopNotification(message);
      }
    });
  }
}
