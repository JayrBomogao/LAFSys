(function(){
  const w = window;
  const STORAGE_KEY = 'lafsys_messages_v1';
  const THREADS_KEY = 'lafsys_threads_v1';
  
  // CLEAR ALL OLD INBOX DATA - This removes previous versions completely
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(THREADS_KEY);
    console.log('Cleared all previous inbox data from localStorage');
  } catch(e) {
    console.log('Could not clear localStorage:', e);
  }
  
  // Always start with empty arrays - no loading from cache
  let messages = [];
  let threads = {};

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
