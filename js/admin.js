(function(){
  function formatDate(dateStr){
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
    } catch(e){ return dateStr; }
  }

  function renderInbox(){
    const container = document.getElementById('inboxContainer');
    if (!container) return;
    
    // Show loading state
    container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Loading messages...</div></div>';
    
    // Check if we have Firebase-enabled MessagesStore
    if (window.MessagesStore?.getAllAsync) {
      // Use async version
      window.MessagesStore.getAllAsync().then(msgs => {
        displayInboxMessages(msgs, container);
      }).catch(err => {
        console.error('Error loading messages:', err);
        container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">Error loading messages</div></div>';
      });
    } else {
      // Fall back to old method
      const msgs = (window.MessagesStore?.getAll?.() || []);
      displayInboxMessages(msgs, container);
    }
  }
  
  // Helper to display inbox messages
  function displayInboxMessages(msgs, container) {
    if (!msgs.length) { 
      container.innerHTML = '<div class="table-row"><div style="grid-column: 1/-1; text-align: center;">No messages.</div></div>'; 
      return; 
    }
    
    container.innerHTML = msgs.map(m => {
      const unreadBadge = m.unread ? '<span style="margin-left:8px; background:#3b82f6; color:white; border-radius:9999px; font-size:0.7rem; padding:2px 8px;">New</span>' : '';
      
      return `
      <div class="table-row" style="grid-template-columns: 2fr 3fr 1fr 140px;" data-id="${m.id}">
        <div class="item-info">
          <img src="https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.from)}" alt="${m.from}" class="item-image" style="border-radius:50%; width:36px; height:36px;">
          <div>
            <div class="item-name">${m.from}${unreadBadge}</div>
            <div class="item-category" style="text-transform: none;">${m.email || ''}</div>
          </div>
        </div>
        <div>${m.subject || ''}</div>
        <div>${formatDate(m.date)}</div>
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
      <div class="table-row" data-id="${item.id}">
        <div class="item-info">
          <img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
          <div>
            <div class="item-name">${item.title}</div>
            <div class="item-category">${item.category || ''}</div>
          </div>
        </div>
        <div>${item.location || ''}</div>
        <div>${formatDate(item.date)}</div>
        <div>${statusBadge(item.status)}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="Edit" data-action="edit"><i data-lucide="edit-2" width="16" height="16"></i></button>
          <button class="btn-icon delete" title="Delete" data-action="delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
          <button class="btn-icon" title="View" data-action="view"><i data-lucide="eye" width="16" height="16"></i></button>
        </div>
      </div>
    `).join('');
    
    if (window.lucide?.createIcons) lucide.createIcons();
    
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
        } else if (action === 'edit') {
          window.location.href = 'add-item.html?edit=true&id=' + id;
        } else if (action === 'view') {
          window.location.href = 'item-details.html?id=' + id;
        }
      });
    });
    
    // Make rows clickable to view details
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-icon')) {
          window.location.href = 'item-details.html?id=' + row.dataset.id;
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
      <div class="table-row" data-id="${item.id}">
        <div class="item-info">
          <img src="${item.image}" alt="${item.title}" class="item-image" onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
          <div>
            <div class="item-name">${item.title}</div>
            <div class="item-category">${item.category || ''}</div>
          </div>
        </div>
        <div>${item.location || ''}</div>
        <div>${formatDate(item.date)}</div>
        <div>${statusBadge(item.status)}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="Edit" data-action="edit">
            <i data-lucide="edit-2" width="16" height="16"></i>
          </button>
          <button class="btn-icon delete" title="Delete" data-action="delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
          <button class="btn-icon" title="View" data-action="view">
            <i data-lucide="eye" width="16" height="16"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Re-init icons
    if (window.lucide?.createIcons) lucide.createIcons();

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
        } else if (action === 'edit') {
          window.location.href = 'add-item.html?edit=true&id=' + id;
        } else if (action === 'view') {
          window.location.href = 'item-details.html?id=' + id;
        }
      });
    });
    
    // Make rows clickable to view details
    container.querySelectorAll('.table-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-icon')) {
          window.location.href = 'item-details.html?id=' + row.dataset.id;
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

  function init(){
    if (window.lucide?.createIcons) lucide.createIcons();
    wireSidebar();
    renderStats();
    renderRecentItems();
    
    // Update dashboard when items change
    window.addEventListener('itemsUpdated', () => { 
      renderStats(); 
      renderRecentItems(); 
      renderAllItems(); 
    });
    
    // Legacy message events
    window.addEventListener('messagesUpdated', () => { 
      renderInbox(); 
    });
    
    // Firebase message events
    window.addEventListener('messagesLoaded', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messageAdded', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messageModified', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messageRemoved', () => { 
      renderInbox(); 
    });
    
    window.addEventListener('messagesChanged', () => { 
      renderInbox(); 
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
