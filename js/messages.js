(function(){
  const w = window;
  const STORAGE_KEY = 'lafsys_messages_v1';
  // Initialize empty messages array without seeding default messages
  let messages = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    messages = raw ? JSON.parse(raw) : [];
  } catch(e) { messages = []; }

  // Initialize empty threads object without seeding default threads
  const THREADS_KEY = 'lafsys_threads_v1';
  let threads = {};
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    threads = raw ? JSON.parse(raw) : {};
  } catch(e) { threads = {}; }

  const MessagesStore = {
    getAll(){ return [...messages]; },
    remove(id){
      messages = messages.filter(m => m.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e){}
      const evt = new CustomEvent('messagesUpdated', { detail: { type: 'delete', id }});
      w.dispatchEvent(evt);
    },
    getThread(email){
      return Array.isArray(threads[email]) ? [...threads[email]] : [];
    },
    send(email, name, body, from='admin@lafsys.gov'){
      if (!threads[email]) threads[email] = [];
      const msg = { id: Date.now(), sender: from, name: from==='admin@lafsys.gov' ? 'Admin' : name, body, date: new Date().toISOString() };
      threads[email].push(msg);
      try { localStorage.setItem(THREADS_KEY, JSON.stringify(threads)); } catch(e){}
      const evt = new CustomEvent('threadUpdated', { detail: { email, message: msg }});
      w.dispatchEvent(evt);
      return msg;
    },
    clearAll(){
      // Clear all messages
      messages = [];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch(e){}
      
      // Clear all threads
      threads = {};
      try { localStorage.setItem(THREADS_KEY, JSON.stringify(threads)); } catch(e){}
      
      // Dispatch event to notify UI of the clear
      const evt = new CustomEvent('messagesUpdated', { detail: { type: 'clear' }});
      w.dispatchEvent(evt);
      console.log('All message data cleared successfully');
    }
  };

  w.MessagesStore = MessagesStore;
})();
