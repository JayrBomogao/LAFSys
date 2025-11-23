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

  const THREADS_KEY = 'lafsys_threads_v1';
  let threads = {};
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    threads = raw ? JSON.parse(raw) : {};
  } catch(e) { threads = {}; }
  // Seed threads for demo users
  const seedIfMissing = (email, name, subject, body) => {
    if (!threads[email]) {
      threads[email] = [
        { id: 1, sender: email, name, body, date: new Date(Date.now()-7200000).toISOString() },
        { id: 2, sender: 'admin@lafsys.gov', name: 'Admin', body: `Hi ${name.split(' ')[0]}, thanks for reaching out. Could you share more identifying details?`, date: new Date(Date.now()-3600000).toISOString() }
      ];
    }
  };
  const j = messages.find(m => m.email === 'john@example.com');
  if (j) seedIfMissing(j.email, j.from, j.subject, j.body);
  const s = messages.find(m => m.email === 'jane@example.com');
  if (s) seedIfMissing(s.email, s.from, s.subject, s.body);
  try { localStorage.setItem(THREADS_KEY, JSON.stringify(threads)); } catch(e){}

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
    }
  };

  w.MessagesStore = MessagesStore;
})();
