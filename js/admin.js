(function(){
  function formatDate(dateStr){
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
    } catch(e){ return dateStr; }
  }

  function renderAllItems(){
    const container = document.getElementById('allItemsContainer');
    if (!container) return;
    const items = (window.DataStore?.getItemsSync?.() || []);
    if (!items.length) { container.innerHTML = '<div class="table-row"><div>No items found.</div></div>'; return; }
    container.innerHTML = items.map(item => `
      <div class="table-row" data-id="${item.id}">
        <div class="item-info">
          <img src="${item.image}" alt="${item.title}" class="item-image">
          <div>
            <div class="item-name">${item.title}</div>
            <div class="item-category">${item.category || ''}</div>
          </div>
        </div>
        <div>${item.location}</div>
        <div>${formatDate(item.date)}</div>
        <div>${statusBadge(item.status)}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="Edit" data-action="edit"><i data-lucide="edit-2" width="16" height="16"></i></button>
          <button class="btn-icon delete" title="Delete" data-action="delete"><i data-lucide="trash-2" width="16" height="16"></i></button>
        </div>
      </div>
    `).join('');
    if (window.lucide?.createIcons) lucide.createIcons();
    container.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.table-row');
        const action = btn.getAttribute('data-action');
        if (action === 'delete') {
          row.style.opacity = '0.5';
          row.style.pointerEvents = 'none';
          setTimeout(()=>{ row.style.display = 'none'; }, 200);
        }
        if (action === 'edit') window.location.href = 'add-item.html?edit=true&id=' + row.dataset.id;
      });
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
    const items = (window.DataStore?.getItemsSync?.() || []).slice(0, 10);
    container.innerHTML = items.map(item => `
      <div class="table-row" data-id="${item.id}">
        <div class="item-info">
          <img src="${item.image}" alt="${item.title}" class="item-image">
          <div>
            <div class="item-name">${item.title}</div>
            <div class="item-category">${item.category || ''}</div>
          </div>
        </div>
        <div>${item.location}</div>
        <div>${formatDate(item.date)}</div>
        <div>${statusBadge(item.status)}</div>
        <div class="action-buttons">
          <button class="btn-icon" title="Edit" data-action="edit">
            <i data-lucide="edit-2" width="16" height="16"></i>
          </button>
          <button class="btn-icon delete" title="Delete" data-action="delete">
            <i data-lucide="trash-2" width="16" height="16"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Re-init icons
    if (window.lucide?.createIcons) lucide.createIcons();

    // Wire actions (UI only)
    container.querySelectorAll('.btn-icon').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.table-row');
        const action = btn.getAttribute('data-action');
        if (action === 'delete') {
          row.style.opacity = '0.5';
          row.style.pointerEvents = 'none';
          setTimeout(()=>{ row.style.display = 'none'; }, 200);
        }
        if (action === 'edit') {
          window.location.href = 'add-item.html?edit=true&id=' + row.dataset.id;
        }
      });
    });
  }

  function renderStats(){
    const items = window.DataStore?.getItemsSync?.() || [];
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

    const titleMap = { dashboard: 'Dashboard', users: 'Users', items: 'Items', claims: 'Claims', 'add-item': 'Add Item' };
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
    window.addEventListener('itemsUpdated', () => { renderStats(); renderRecentItems(); renderAllItems(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
