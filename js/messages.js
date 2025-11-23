(function(){
  const w = window;
  const STORAGE_KEY = 'lafsys_messages_v1';
  let messages = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    messages = raw ? JSON.parse(raw) : [];
  } catch(e) { messages = []; }
  if (!messages.length) {
    messages = [
      { id: 1, from: 'John Doe', email: 'john@example.com', subject: 'Inquiry about black wallet', body: 'Hi, I might have lost a black leather wallet near Burnham Park last Sunday. Does it match any item you found?', date: new Date().toISOString() },
      { id: 2, from: 'Jane Smith', email: 'jane@example.com', subject: 'Lost phone claim', body: 'I think the iPhone listed on your site is mine. It has a cracked back and a blue case.', date: new Date(Date.now()-86400000).toISOString() }
    ];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e){}
  }

  const MessagesStore = {
    getAll(){ return [...messages]; },
    remove(id){
      messages = messages.filter(m => m.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e){}
      const evt = new CustomEvent('messagesUpdated', { detail: { type: 'delete', id }});
      w.dispatchEvent(evt);
    }
  };

  w.MessagesStore = MessagesStore;
})();
