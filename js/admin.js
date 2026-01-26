(function(){
  function formatDate(dateStr){
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
    } catch(e){ return dateStr; }
  }

  // Function to update inbox notification badge
  function updateInboxNotification(messages) {
    const badge = document.getElementById('inboxNotificationBadge');
    if (!badge) return;
    
    // Count unread messages
    const unreadCount = messages.filter(m => m.unread).length;
    
    if (unreadCount > 0) {
      // Show badge with count
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
      
      // Also add an indicator to the title if not already present
      if (!document.title.includes('(')) {
        document.title = `(${unreadCount}) ${document.title}`;
      }
    } else {
      // Hide badge if no unread messages
      badge.style.display = 'none';
      
      // Reset document title if it was modified
      if (document.title.includes('(')) {
        document.title = document.title.replace(/\(\d+\+?\) /, '');
      }
    }
  }
  
  // Load inbox messages with real-time updates
  function loadInbox() {
    const container = document.getElementById('inboxContainer');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Loading messages...</div></div>';
    
    // Check if we have Firebase-enabled MessagesStore
    if (window.MessagesStore?.getAllAsync) {
      // Use async version initially
      window.MessagesStore.getAllAsync().then(msgs => {
        // Update the notification badge
        updateInboxNotification(msgs);
        // Display the messages
        displayInboxMessages(msgs, container);
        
        // Set up real-time listener for inbox updates
        setupInboxListener(container);
      }).catch(err => {
        console.error('Error loading messages:', err);
        container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading messages</div></div>';
      });
    } else {
      // Fall back to old method
      const msgs = (window.MessagesStore?.getAll?.() || []);
      updateInboxNotification(msgs);
      displayInboxMessages(msgs, container);
    }
  }
  
  // Set up real-time listener for inbox updates
  function setupInboxListener(container) {
    // Set up event listeners for real-time updates
    window.addEventListener('messageAdded', function(event) {
      console.log('New message received:', event.detail);
      // Refresh inbox when new message arrives
      window.MessagesStore.getAllAsync().then(msgs => {
        updateInboxNotification(msgs);
        displayInboxMessages(msgs, container);
      });
    });
    
    window.addEventListener('messageModified', function(event) {
      // Refresh inbox when message status changes
      window.MessagesStore.getAllAsync().then(msgs => {
        updateInboxNotification(msgs);
        displayInboxMessages(msgs, container);
      });
    });
    
    window.addEventListener('messageRemoved', function(event) {
      // Refresh inbox when message is deleted
      window.MessagesStore.getAllAsync().then(msgs => {
        updateInboxNotification(msgs);
        displayInboxMessages(msgs, container);
      });
    });
    
    // Set admin as online
    if (window.MessagesStore?.setOnlineStatusAsync) {
      window.MessagesStore.setOnlineStatusAsync('admin', true, 'Admin Staff').catch(console.error);
      
      // Set as offline when leaving
      window.addEventListener('beforeunload', function() {
        window.MessagesStore.setOnlineStatusAsync('admin', false).catch(console.error);
      });
    }
  }
  
  // Helper to display inbox messages
  function displayInboxMessages(msgs, container) {
    if (!msgs || !msgs.length) { 
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No messages.</div></div>'; 
      return; 
    }
    
    // Log what we're about to display
    console.log('Displaying messages:', msgs);
    
    container.innerHTML = msgs.map(m => {
      // Handle potentially missing fields
      const messageId = m.id || `missing_id_${Date.now()}`;
      const fromName = m.from || 'Unknown Sender';
      const userEmail = m.email || 'no-email';
      const subject = m.subject || 'No Subject';
      const messageDate = m.date || new Date().toISOString();
      const unreadBadge = m.unread ? '<span style="margin-left:8px; background:#3b82f6; color:white; border-radius:9999px; font-size:0.7rem; padding:2px 8px;">New</span>' : '';
      
      // For debugging
      console.log('Message data:', { id: messageId, from: fromName, subject, bodyLength: m.body ? m.body.length : 0 });
      
      return `
      <div class="table-row" style="grid-template-columns: 2fr 3fr 1fr 140px;" data-id="${messageId}">
        <div class="item-info">
          <img src="https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(fromName)}" alt="${fromName}" class="item-image" style="border-radius:50%; width:36px; height:36px;">
          <div>
            <div class="item-name">${fromName}${unreadBadge}</div>
            <div class="item-category" style="text-transform: none;">${userEmail}</div>
          </div>
        </div>
        <div>${subject}</div>
        <div>${formatDate(messageDate)}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="Open" data-action="open"><i data-lucide="mail-open" width="16" height="16"></i></button>
          <button class="btn-icon delete" title="Delete" data-action="delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
        </div>
      </div>
    `}).join('');
    
    if (window.lucide?.createIcons) lucide.createIcons();
    
    // Row click navigates to chat
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', async ()=>{
        const id = row?.dataset?.id;
        
        // Try to mark as read if Firebase-enabled
        if (window.MessagesStore?.markAsReadAsync) {
          try {
            await window.MessagesStore.markAsReadAsync(id);
          } catch (err) {
            console.error('Error marking message as read:', err);
          }
        }
        
        // Find the message in current list
        let msg;
        if (window.MessagesStore?.getAllAsync) {
          // Get fresh data from Firebase
          const msgs = await window.MessagesStore.getAllAsync();
          msg = msgs.find(m => m.id === id);
        } else {
          // Use local data
          msg = (window.MessagesStore?.getAll?.() || []).find(m => m.id === id);
        }
        
        if (msg) {
          window.location.href = `chat.html?email=${encodeURIComponent(msg.email||'')}&name=${encodeURIComponent(msg.from||'')}`;
        }
      });
    });
    
    container.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const row = btn.closest('.table-row');
        const id = row?.dataset?.id;
        const action = btn.getAttribute('data-action');
        
        if (action === 'open'){
          let msg;
          if (window.MessagesStore?.getAllAsync) {
            // Get fresh data from Firebase
            const msgs = await window.MessagesStore.getAllAsync();
            msg = msgs.find(m => m.id === id);
          } else {
            // Use local data
            msg = (window.MessagesStore?.getAll?.() || []).find(m => m.id === id);
          }
          
          if (msg) {
            if (window.MessagesStore?.markAsReadAsync) {
              await window.MessagesStore.markAsReadAsync(id);
            }
            window.location.href = `chat.html?email=${encodeURIComponent(msg.email||'')}&name=${encodeURIComponent(msg.from||'')}`;
          }
        }
        
        if (action === 'delete'){
          if (confirm('Are you sure you want to delete this message?')) {
            window.MessagesStore?.remove?.(id);
          }
        }
      });
    });
  }

  function renderAllItems(){
    const container = document.getElementById('allItemsContainer');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Loading items...</div></div>';
    
    // Check if we have Firebase-enabled DataStore
    if (window.DataStore?.getItemsAsync) {
      // Use async version
      window.DataStore.getItemsAsync().then(items => {
        displayItems(items, container);
      }).catch(err => {
        console.error('Error loading items:', err);
        container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading items</div></div>';
      });
    } else {
      // Fall back to old method
      const items = (window.DataStore?.getItemsSync?.() || []);
      displayItems(items, container);
    }
  }
  
  // Helper to display items
  function displayItems(items, container) {
    if (!items.length) { 
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No items found.</div></div>'; 
      return; 
    }
    
    container.innerHTML = items.map(item => `
      <div class="table-row" data-id="${item.id}" data-status="${item.status}">
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
          <button class="btn-icon delete" title="Delete" data-action="delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
        </div>
      </div>
    `).join('');
    
    if (window.lucide?.createIcons) lucide.createIcons();
    
    // Add status change listeners
    container.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
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
          console.log('Attempting to update status in Firestore...');
          
          if (window.firebase?.firestore) {
            const db = firebase.firestore();
            await db.collection('items').doc(id).update({ 
              status: newStatus,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✓ Status successfully updated in Firestore:', id, newStatus);
            
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
            
            // Don't refresh immediately - let the real-time update handle it
            console.log('Status update complete');
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
    
    container.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('.table-row');
        const id = row?.dataset?.id;
        const action = btn.getAttribute('data-action');
        
        if (action === 'delete') {
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
    
    // Make rows clickable to edit items
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-icon') && !e.target.closest('.status-select')) {
          window.location.href = 'add-item.html?edit=true&id=' + row.dataset.id;
        }
      });
      row.style.cursor = 'pointer';
    });
  }

  function statusBadge(status){
    if (status === 'claimed') return '<span class="status-badge status-completed">Claimed</span>';
    if (status === 'soon') return '<span class="status-badge status-pending">Disposal Soon</span>';
    return '<span class="status-badge status-active">Active</span>';
  }
  
  function statusDropdown(currentStatus){
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

  function renderRecentItems(){
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
        displayRecentItems(recentItems, container);
      }).catch(err => {
        console.error('Error loading recent items:', err);
        container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading items</div></div>';
      });
    } else {
      // Fall back to old method
      const items = (window.DataStore?.getItemsSync?.() || []).slice(0, 10);
      displayRecentItems(items, container);
    }
  }
  
  // Helper to display recent items
  function displayRecentItems(items, container) {
    if (!items.length) { 
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No items found.</div></div>'; 
      return; 
    }
    
    container.innerHTML = items.map(item => `
      <div class="table-row" data-id="${item.id}" data-status="${item.status}">
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
          <button class="btn-icon delete" title="Delete" data-action="delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Re-init icons
    if (window.lucide?.createIcons) lucide.createIcons();

    // Add status change listeners for recent items
    container.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('click', (e) => {
        e.stopPropagation();
      });
      
      select.addEventListener('change', async (e) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        const row = e.target.closest('.table-row');
        const id = row?.dataset?.id;
        const oldStatus = row?.dataset?.status;
        
        console.log('Status change requested (recent items):', { id, oldStatus, newStatus });
        
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
          console.log('Attempting to update status in Firestore...');
          
          if (window.firebase?.firestore) {
            const db = firebase.firestore();
            await db.collection('items').doc(id).update({ 
              status: newStatus,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✓ Status successfully updated in Firestore:', id, newStatus);
            
            // Verify the update
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
            
            console.log('Status update complete');
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

    // Wire actions
    container.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const row = btn.closest('.table-row');
        const id = row?.dataset?.id;
        const action = btn.getAttribute('data-action');
        
        if (action === 'delete') {
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
    
    // Make rows clickable to edit items
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-icon') && !e.target.closest('.status-select')) {
          window.location.href = 'add-item.html?edit=true&id=' + row.dataset.id;
        }
      });
      row.style.cursor = 'pointer';
    });
  }

  function renderStats(){
    // Show loading state
    const byId = id => document.getElementById(id);
    const safe = (id, v) => { const el = byId(id); if (el) el.textContent = String(v); };
    
    safe('statTotalItems', '...');
    safe('statClaimed', '...');
    safe('statSoon', '...');
    safe('statPending', '...');
    
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
  
  // Helper to update stats
  function updateStats(items) {
    const total = items.length;
    const claimed = items.filter(i => i.status === 'claimed').length;
    const soon = items.filter(i => i.status === 'soon').length;
    const pending = items.filter(i => i.status === 'active').length;

    const byId = id => document.getElementById(id);
    const safe = (id, v) => { const el = byId(id); if (el) el.textContent = String(v); };

    safe('statTotalItems', total);
    safe('statClaimed', claimed);
    safe('statSoon', soon);
    safe('statPending', pending);
    
    // Also update the trend indicators with more accurate text
    updateTrendIndicator('statTotalTrend', '');
    updateTrendIndicator('statClaimedTrend', '');
    updateTrendIndicator('statSoonTrend', '');
    updateTrendIndicator('statPendingTrend', 'Needs attention');
  }
  
  // Helper to update trend indicator text
  function updateTrendIndicator(id, text) {
    const trendElement = document.getElementById(id);
    if (trendElement) trendElement.textContent = text;
  }

  function switchSection(section){
    const views = document.querySelectorAll('.section-view');
    views.forEach(v => v.style.display = 'none');
    const target = document.getElementById('section-' + section);
    if (target) target.style.display = '';

    const titleMap = { dashboard: 'Dashboard', users: 'Users', items: 'Items', inbox: 'Inbox', claims: 'Claims', 'add-item': 'Add Item' };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titleMap[section] || 'Dashboard';
  }

  function wireSidebar(){
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        const section = link.getAttribute('data-section');
        if (section === 'add-item' || section === 'claims') return; // follow href for real pages
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        switchSection(section);
        if (section === 'dashboard') { renderStats(); renderRecentItems(); }
        if (section === 'users') { renderUsers(); }
        if (section === 'items') { renderAllItems(); }
        if (section === 'inbox') { renderInbox(); }
      });
    });
  }

  function renderUsers(){
    const body = document.getElementById('usersTableBody');
    if (!body || !window.UsersStore) return;
    const rows = window.UsersStore.getAll().map(u => `
      <div class="table-row" style="grid-template-columns: 2fr 1fr 2fr 1fr 140px;">
        <div class="item-info">
          <img src="https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(u.name)}" alt="${u.name}" class="item-image" style="border-radius:50%; width:36px; height:36px;">
          <div>
            <div class="item-name">${u.name}</div>
            <div class="item-category" style="text-transform: none;">${u.email}</div>
          </div>
        </div>
        <div><span class="status-badge ${u.role === 'Admin' ? 'status-completed' : 'status-active'}">${u.role}</span></div>
        <div>${u.email}</div>
        <div><span class="status-badge status-active">${u.status}</span></div>
        <div class="action-buttons">
          <button class="btn-icon" title="Edit"><i data-lucide="edit-2" width="16" height="16"></i></button>
          <button class="btn-icon" title="Disable"><i data-lucide="user-x" width="16" height="16"></i></button>
        </div>
      </div>
    `).join('');
    body.innerHTML = rows;
    if (window.lucide?.createIcons) lucide.createIcons();
  }
  
  // Function to render inbox messages
  function renderInbox() {
    console.log('Rendering inbox messages...');
    // Call loadInbox to retrieve and display messages
    loadInbox();
  }
  
  // Function to force refresh inbox data
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

  function init(){
    console.log('Initializing admin panel...');
    if (window.lucide?.createIcons) lucide.createIcons();
    wireSidebar();
    
    // Initial loading of dashboard elements
    renderStats();
    renderRecentItems();
    renderInbox(); // Load inbox messages at startup
    
    // Update dashboard when items change
    window.addEventListener('itemsUpdated', () => { 
      renderStats(); 
      renderRecentItems(); 
      renderAllItems(); 
    });
    
    // Initialize Firebase message system if needed
    if (window.firebase && !window.MessagesStore?.getAllAsync) {
      console.log('Firebase available but MessagesStore not initialized. Initializing...');
      // Force initialization
      if (typeof initFirebaseMessages === 'function') {
        initFirebaseMessages();
      }
    }
    
    // Legacy message events
    window.addEventListener('messagesUpdated', () => { 
      console.log('messagesUpdated event received');
      renderInbox(); 
    });
    
    // Firebase message events
    window.addEventListener('messagesLoaded', () => { 
      console.log('messagesLoaded event received');
      renderInbox(); 
    });
    
    // Set up periodic refresh of inbox messages every 30 seconds
    // This ensures we catch any messages that might have been missed by real-time listeners
    const inboxRefreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing inbox...');
        forceRefreshInbox();
      }
    }, 30000); // 30 seconds
    
    // Clean up interval when page is unloaded
    window.addEventListener('beforeunload', () => {
      clearInterval(inboxRefreshInterval);
    });
    
    // Show desktop notification and update badge when new message arrives
    window.addEventListener('messageAdded', (event) => {
      console.log('messageAdded event received:', event.detail);
      
      // Check if the message is unread
      const message = event.detail?.message;
      if (message && message.unread) {
        // Show a desktop notification if permitted and we're not in inbox
        const currentSection = document.querySelector('.nav-link.active')?.getAttribute('data-section');
        if (currentSection !== 'inbox') {
          showDesktopNotification(message);
        }
        
        // Play notification sound
        if (typeof playNotificationSound === 'function') {
          playNotificationSound();
        } else if (window.MessagesStore?.playNotificationSound) {
          window.MessagesStore.playNotificationSound();
        }
      }
      
      // Force an immediate refresh of the inbox
      forceRefreshInbox();
    });
    
    window.addEventListener('messageModified', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messageRemoved', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messagesChanged', (event) => {
      // Check if there are any new unread messages
      const changes = event.detail?.changes || [];
      const hasNewUnread = changes.some(change => 
        change.type === 'added' && change.data && change.data.unread
      );
      
      // We keep track of new unread messages, but don't play sound
      // Visual notification badge will still show
      
      renderInbox();
    });
    
    // Initial check for unread messages when page loads
    checkUnreadMessages();
  }
  
  // Sound alert removed as requested
  
  // Function to show desktop notification
  function showDesktopNotification(message) {
    // Check if browser supports notifications and permission is granted
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("New Message", {
        body: `From: ${message.from}\n${message.subject || 'No subject'}`
      });
      
      // Close notification after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
      // When notification is clicked, go to inbox
      notification.onclick = function() {
        window.focus();
        switchSection('inbox');
        this.close();
      };
    }
    // If permission not yet requested
    else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
  
  // Local function to play notification sound
  function playNotificationSound() {
    try {
      // Create a new Audio instance each time to ensure it plays
      const notificationSound = new Audio('sounds/notification.mp3');
      notificationSound.volume = 0.5;
      notificationSound.play().catch(err => console.log('Could not play notification sound:', err));
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }
  
  // Function to check for unread messages on page load
  function checkUnreadMessages() {
    if (window.MessagesStore?.getAllAsync) {
      window.MessagesStore.getAllAsync().then(msgs => {
        updateInboxNotification(msgs);
      }).catch(err => {
        console.error('Error checking unread messages:', err);
      });
    } else {
      const msgs = (window.MessagesStore?.getAll?.() || []);
      updateInboxNotification(msgs);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
