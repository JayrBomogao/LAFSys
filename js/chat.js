(function(){
  function qs(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }
  function renderHeader(name, email){
    const nameEl = document.getElementById('chatName');
    const emailEl = document.getElementById('chatEmail');
    const avatar = document.getElementById('chatAvatar');
    if (nameEl) nameEl.textContent = name || email || 'Conversation';
    if (emailEl) emailEl.textContent = email || '';
    if (avatar) avatar.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || email || 'User')}`;
    if (window.lucide?.createIcons) lucide.createIcons();
  }
  function renderThread(email){
    const box = document.getElementById('chatThread');
    if (!box) return;
    const thread = window.MessagesStore?.getThread?.(email) || [];
    box.innerHTML = thread.map(m => {
      const me = m.sender === 'admin@lafsys.gov';
      const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.name || (me?'Admin':'User'))}`;
      const dt = new Date(m.date).toLocaleString();
      return `
        <div class="msg ${me ? 'me' : ''}">
          <img class="avatar" alt="" src="${avatar}">
          <div class="bubble">
            <div style="font-weight:600; font-size:.9rem; margin-bottom:.15rem;">${m.name || (me?'Admin':'User')}</div>
            <div style="white-space:pre-wrap;">${m.body}</div>
            <div style="font-size:.75rem; color:#64748b; margin-top:.25rem;">${dt}</div>
          </div>
        </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }
  function wireSend(email, name){
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendBtn');
    const send = () => {
      const text = (input.value || '').trim();
      if (!text) return;
      window.MessagesStore?.send?.(email, name, text, 'admin@lafsys.gov');
      input.value = '';
    };
    if (btn) btn.addEventListener('click', send);
    if (input) input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
    });
  }
  function init(){
    const email = qs('email');
    const name = qs('name');
    renderHeader(name, email);
    renderThread(email);
    wireSend(email, name);
    window.addEventListener('threadUpdated', (e)=>{
      if (e?.detail?.email === email) renderThread(email);
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
