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
  
  // Load the last active section from localStorage or default to dashboard
  const lastActiveSection = localStorage.getItem('adminActiveSection') || 'dashboard';
  console.log('Restoring section:', lastActiveSection);
  
  // Activate the correct section
  activateSection(lastActiveSection);
  
  // Initial loading of all required elements
  renderStats();
  renderRecentItemsWithoutActions();
  renderInbox();
  
  // If not on dashboard, load the appropriate section data
  if (lastActiveSection === 'users') renderUsers();
  if (lastActiveSection === 'items') renderAllItems();
  
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
      
      // Save the current section to localStorage
      localStorage.setItem('adminActiveSection', section);
      console.log('Saved section to localStorage:', section);
      
      // Update UI and load section content
      activateSection(section);
    });
  });
}

// Activate a specific section
function activateSection(section) {
  console.log('Activating section:', section);
  
  // Update active state in sidebar
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  // Switch the visible section
  switchSection(section);
  
  // Load section-specific data
  if (section === 'dashboard') { 
    renderStats(); 
    renderRecentItemsWithoutActions(); 
  }
  else if (section === 'users') { 
    renderUsers(); 
  }
  else if (section === 'items') { 
    renderAllItems(); 
  }
  else if (section === 'inbox') { 
    // Force a fresh reload of inbox data with no caching
    forceRefreshInbox(); 
  }
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
  
  // Generate READ-ONLY items with NO action buttons - NO HEADER
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
  
  // Set the content WITHOUT adding a header
  container.innerHTML = rowsHTML;
  
  // Apply styling and click handlers to read-only rows
  container.querySelectorAll('.read-only-row').forEach(row => {
    // Make cursor a pointer to indicate it's clickable
    row.style.cursor = 'pointer';
    
    // Add hover effect handlers
    row.addEventListener('mouseenter', function() {
      this.classList.add('table-row-hover');
    });
    
    row.addEventListener('mouseleave', function() {
      this.classList.remove('table-row-hover');
    });
    
    // Add click event to show item details in modal
    row.addEventListener('click', function(e) {
      // Prevent default behavior
      e.preventDefault();
      
      // Get item ID from row data attribute
      const itemId = this.dataset.id;
      if (itemId && typeof showItemDetailsModal === 'function') {
        // Call the modal function from admin-modal.js
        showItemDetailsModal(itemId);
      } else {
        console.log('View item details:', itemId);
      }
    });
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
  
  // Generate items WITH action buttons - NO HEADER
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
  
  // Set the content WITHOUT adding a header
  container.innerHTML = rowsHTML;
  
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
        if (id && typeof showItemDetailsModal === 'function') {
          // Show modal instead of navigating
          e.preventDefault();
          e.stopPropagation();
          showItemDetailsModal(id);
        } else if (id) {
          console.log('Modal function not available, falling back to navigation');
          window.location.href = 'item-details.html?id=' + id;
        }
      }
    });

    // Add hover effect handlers
    row.addEventListener('mouseenter', function() {
      this.classList.add('table-row-hover');
    });
    
    row.addEventListener('mouseleave', function() {
      this.classList.remove('table-row-hover');
    });
    
    row.style.cursor = 'pointer';
  });
}

// Render inbox messages - just calls forceRefreshInbox
function renderInbox() {
  console.log('Rendering inbox messages...');
  // forceRefreshInbox already handles showing a loading message
  forceRefreshInbox();
}

// Force refresh inbox with fresh data
function forceRefreshInbox() {
  console.log('Forcing inbox refresh with fresh data...');
  
  // Clear any cache that might exist in MessagesStore
  if (window.MessagesStore?.clearCache) {
    window.MessagesStore.clearCache();
  }
  
  // Show loading indicator
  const container = document.getElementById('inboxContainer');
  if (container) {
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center; padding: 1rem;">Loading messages...</div></div>';
  }
  
  // Always force a fresh fetch from the server
  if (window.MessagesStore?.getAllAsync) {
    // Add a cache-busting parameter to ensure we get fresh data
    const options = { forceFresh: true, timestamp: Date.now() };
    
    window.MessagesStore.getAllAsync(options)
      .then(msgs => {
        console.log('Retrieved', msgs.length, 'fresh messages');
        
        if (container) {
          updateInboxNotification(msgs);
          displayInboxMessages(msgs, container);
        }
      })
      .catch(err => {
        console.error('Error during forced inbox refresh:', err);
        
        if (container) {
          container.innerHTML = `<div class="table-row"><div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: #ef4444;">
            Error loading messages: ${err.message || 'Unknown error'}
            <br><button id="retryInboxBtn" class="btn-primary" style="margin-top: 1rem;">Retry</button>
          </div></div>`;
          
          // Add retry button functionality
          const retryBtn = document.getElementById('retryInboxBtn');
          if (retryBtn) {
            retryBtn.addEventListener('click', forceRefreshInbox);
          }
        }
      });
  } else {
    console.error('MessagesStore.getAllAsync not available');
    if (container) {
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: #ef4444;">Message loading not available</div></div>';
    }
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

// Display inbox messages in the UI
function displayInboxMessages(messages, container) {
  if (!container) return;
  
  // Handle empty inbox
  if (!messages || !messages.length) {
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center; padding: 2rem;">No messages in your inbox.</div></div>';
    return;
  }
  
  // Sort messages by date (newest first)
  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA; // Newest first
  });
  
  // Generate HTML for each message
  const messagesHtml = sortedMessages.map(msg => {
    const isUnread = msg.unread === true;
    const msgClass = isUnread ? 'unread-message' : '';
    const fromName = msg.name || msg.from || 'Unknown';
    const formattedDate = msg.date ? new Date(msg.date).toLocaleString() : 'Unknown date';
    
    return `
      <div class="table-row ${msgClass}" data-id="${msg.id || ''}" data-email="${msg.from || msg.email || ''}">
        <div class="message-sender">
          ${isUnread ? '<span class="unread-dot"></span>' : ''}
          ${fromName}
        </div>
        <div class="message-subject">${msg.subject || 'No subject'}</div>
        <div class="message-date">${formattedDate}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="View" data-action="view">
            <i data-lucide="eye" width="16" height="16"></i>
          </button>
          <button class="btn-icon delete" title="Delete" data-action="delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Update the container
  container.innerHTML = messagesHtml;
  
  // Initialize icons
  if (window.lucide?.createIcons) lucide.createIcons();
  
  // Add event listeners to messages
  setupMessageActionHandlers(container);
}

// Update inbox notification badge
function updateInboxNotification(messages) {
  // Find unread messages
  const unreadCount = messages.filter(msg => msg.unread === true).length;
  
  // Update badge
  const badge = document.getElementById('inboxNotificationBadge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Set up message action handlers
function setupMessageActionHandlers(container) {
  // Handle clicks on message rows and action buttons
  container.querySelectorAll('.table-row').forEach(row => {
    row.addEventListener('click', function(e) {
      // Don't handle if clicking on action buttons
      if (e.target.closest('.btn-icon')) return;
      
      const messageId = this.dataset.id;
      viewMessage(messageId, this);
    });
    
    // Action button handlers
    row.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.getAttribute('data-action');
        const messageId = row.dataset.id;
        
        if (action === 'view') {
          viewMessage(messageId, row);
        } else if (action === 'delete') {
          if (confirm('Delete this message?')) {
            deleteMessage(messageId, row);
          }
        }
      });
    });
  });
}

// View a message
function viewMessage(messageId, row) {
  if (!messageId) return;
  
  console.log('Viewing message:', messageId);
  
  // Mark as read in the UI
  if (row) {
    row.classList.remove('unread-message');
    row.querySelector('.unread-dot')?.remove();
  }
  
  // TODO: Implement actual message viewing
  alert('Message viewing not implemented yet');
  
  // Mark as read in data store
  if (window.MessagesStore?.markAsReadAsync) {
    window.MessagesStore.markAsReadAsync(messageId).catch(err => {
      console.error('Error marking message as read:', err);
    });
  }
}

// Delete a message
function deleteMessage(messageId, row) {
  if (!messageId) return;
  
  console.log('Deleting message:', messageId);
  
  // Remove from UI
  if (row) {
    row.style.opacity = '0.5';
    setTimeout(() => row.style.display = 'none', 300);
  }
  
  // Remove from data store
  if (window.MessagesStore?.deleteAsync) {
    window.MessagesStore.deleteAsync(messageId).catch(err => {
      console.error('Error deleting message:', err);
    });
  }
}
