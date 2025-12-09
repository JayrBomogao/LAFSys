(function(){
  // Get URL parameters
  function qs(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }
  
  // Render the chat header with user info
  function renderHeader(name, email){
    const nameEl = document.getElementById('chatName');
    const emailEl = document.getElementById('chatEmail');
    const avatar = document.getElementById('chatAvatar');
    const statusEl = document.getElementById('chatStatus');
    
    if (nameEl) nameEl.textContent = name || email || 'Conversation';
    if (emailEl) emailEl.textContent = email || '';
    if (avatar) avatar.src = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name || email || 'User')}`;
    
    // Set up online status indicator if present
    if (statusEl && email && window.MessagesStore?.subscribeToOnlineStatus) {
      const unsubscribe = window.MessagesStore.subscribeToOnlineStatus(email, (status) => {
        if (status.online) {
          statusEl.textContent = 'Online';
          statusEl.classList.add('online');
          statusEl.classList.remove('offline');
        } else {
          const lastSeen = status.lastSeen ? new Date(status.lastSeen.toDate()) : null;
          statusEl.textContent = lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline';
          statusEl.classList.add('offline');
          statusEl.classList.remove('online');
        }
      });
      
      // Store unsubscribe function for cleanup
      window.chatStatusUnsubscribe = unsubscribe;
    }
    
    // Initialize icons if needed
    if (window.lucide?.createIcons) lucide.createIcons();
  }
  
  // Format last seen time in a human-readable way
  function formatLastSeen(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }
  
  // Render the message thread
  function renderThread(email){
    const box = document.getElementById('chatThread');
    if (!box) return;
    
    // Use getThreadAsync instead of getThread if available
    if (window.MessagesStore?.getThreadAsync) {
      console.log(`Getting thread messages for ${email} using async method...`);
      window.MessagesStore.getThreadAsync(email)
        .then(messages => {
          if (!messages || messages.length === 0) {
            box.innerHTML = '<div class="empty-thread">No messages yet. Start a conversation!</div>';
            return;
          }
          
          console.log(`Retrieved ${messages.length} messages for ${email}`);
          if (messages.length > 0) {
            console.log('First message sample:', {
              sender: messages[0].sender,
              name: messages[0].name,
              body: messages[0].body ? messages[0].body.substring(0, 50) + '...' : 'EMPTY',
              date: messages[0].date
            });
          }
          
          // We don't need to render here as the subscription will do it
        })
        .catch(error => {
          console.error(`Error getting thread for ${email}:`, error);
          box.innerHTML = '<div class="empty-thread">Error loading conversation. Please try again.</div>';
        });
    } else {
      // Legacy synchronous approach
      const thread = window.MessagesStore?.getThread?.(email) || [];
      
      console.log(`Rendering thread for ${email} using sync method:`, thread.length, 'messages');
      if (thread.length > 0) {
        console.log('First message sample:', {
          sender: thread[0].sender,
          name: thread[0].name,
          body: thread[0].body ? thread[0].body.substring(0, 50) + '...' : 'EMPTY',
          date: thread[0].date
        });
      }
      
      // Handle empty thread
      if (thread.length === 0) {
        box.innerHTML = '<div class="empty-thread">No messages yet. Start a conversation!</div>';
        return;
      }
    }
    
    // Group messages by date for better readability
    let lastDate = '';
    
    box.innerHTML = thread.map((m, index) => {
      // Debug individual message
      console.log(`Message ${index}:`, {
        id: m.id || 'no-id',
        sender: m.sender || 'unknown',
        bodyLength: m.body ? m.body.length : 0,
        body: m.body ? m.body.substring(0, 20) + '...' : 'EMPTY'
      });
      
      const me = m.sender === 'admin@lafsys.gov';
      const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.name || (me?'Admin':'User'))}`;
      
      // Check if this is an image message (JSON string)
      let imageUrl = null;
      let messageText = '';
      
      try {
        // Try to parse as JSON to see if it's an image message
        if (m.body && (m.body.startsWith('{') || m.body.includes('"imageUrl"'))) {
          const parsedMsg = JSON.parse(m.body);
          if (parsedMsg.type === 'image' && parsedMsg.imageUrl) {
            imageUrl = parsedMsg.imageUrl;
            messageText = parsedMsg.body || '';
          } else {
            messageText = m.body;
          }
        } else {
          messageText = m.body || '';
        }
      } catch (e) {
        // If parsing fails, use the message body directly
        messageText = m.body || '';
      }
      
      // Format the message date
      const msgDate = new Date(m.date);
      const dt = msgDate.toLocaleString();
      const datePart = msgDate.toLocaleDateString();
      
      // Add date separator if this is a new day
      let dateSeparator = '';
      if (datePart !== lastDate) {
        lastDate = datePart;
        const today = new Date().toLocaleDateString();
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
        
        let dateDisplay = datePart;
        if (datePart === today) dateDisplay = 'Today';
        else if (datePart === yesterday) dateDisplay = 'Yesterday';
        
        dateSeparator = `<div class="date-separator"><span>${dateDisplay}</span></div>`;
      }
      
      // Check if the next message is from the same sender (for grouping)
      const nextMsg = thread[index + 1];
      const isLastInGroup = !nextMsg || nextMsg.sender !== m.sender;
      
      // Prepare message content
      let messageContent = '';
      
      // Add text if available
      if (messageText) {
        messageContent += `<div class="msg-body">${messageText}</div>`;
      } else if (!imageUrl) {
        messageContent += `<div class="msg-body"><em style="color:#6b7280">(No message content)</em></div>`;
      }
      
      // Add image if available
      if (imageUrl) {
        messageContent += `<img src="${imageUrl}" class="message-image" alt="Attached image" 
          onclick="window.open('${imageUrl}', '_blank')" loading="lazy">`;
      }
      
      return `${dateSeparator}
        <div class="msg ${me ? 'me' : ''} ${isLastInGroup ? 'last-in-group' : ''}" data-msg-id="${m.id || ''}">
          <img class="avatar" alt="" src="${avatar}">
          <div class="bubble">
            <div class="msg-header">
              <div class="sender-name">${m.name || (me?'Admin':'User')}</div>
              <div class="msg-time">${msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            ${messageContent}
          </div>
        </div>`;
    }).join('');
    
    // Scroll to bottom of chat
    box.scrollTop = box.scrollHeight;
    
    // Mark messages as read if needed
    if (email && window.MessagesStore?.markThreadAsReadAsync) {
      window.MessagesStore.markThreadAsReadAsync(email).catch(console.error);
    }
  }
  
  // Set up message sending functionality
  function wireSend(email, name){
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendBtn');
    const thread = document.getElementById('chatThread');
    
    // Setup auto-growing textarea
    setupAutoGrowingTextarea(input);
    
    // Function to send a message
    const send = () => {
      const text = (input.value || '').trim();
      if (!text) return;
      
      // Show sending indicator
      const sendingId = `sending_${Date.now()}`;
      const me = true; // Admin side
      const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent('Admin')}`;
      
      // Append temporary message
      const sendingMsg = document.createElement('div');
      sendingMsg.id = sendingId;
      sendingMsg.className = 'msg me last-in-group';
      sendingMsg.innerHTML = `
        <img class="avatar" alt="" src="${avatar}">
        <div class="bubble">
          <div class="msg-header">
            <div class="sender-name">Admin</div>
            <div class="msg-time">Sending...</div>
          </div>
          <div class="msg-body">${text}</div>
        </div>`;
      
      if (thread) thread.appendChild(sendingMsg);
      if (thread) thread.scrollTop = thread.scrollHeight;
      
      // Send the message
      window.MessagesStore?.sendAsync?.(email, name, text, 'admin@lafsys.gov')
        .then(() => {
          // Remove temporary message (it will be replaced by the real one from the listener)
          const tempMsg = document.getElementById(sendingId);
          if (tempMsg) tempMsg.remove();
        })
        .catch(error => {
          console.error('Error sending message:', error);
          // Update temporary message to show error
          const tempMsg = document.getElementById(sendingId);
          if (tempMsg) {
            const timeEl = tempMsg.querySelector('.msg-time');
            if (timeEl) timeEl.textContent = 'Error sending';
            tempMsg.classList.add('error');
          }
        });
      
      // Clear input field
      input.value = '';
    };
    
    // Wire up send button
    if (btn) btn.addEventListener('click', send);
    
    // Wire up enter key
    if (input) input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' && !e.shiftKey){ 
        e.preventDefault();
        send();
      }
    });
    
    // Focus input field
    if (input) input.focus();
  }
  
  // Function to make textarea grow with content
  function setupAutoGrowingTextarea(textarea) {
    if (!textarea) return;
    
    // Set initial height
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
    
    // Update height on input
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
      
      // Cap the height
      const maxHeight = 120; // in pixels
      if (this.scrollHeight > maxHeight) {
        this.style.height = maxHeight + 'px';
        this.style.overflowY = 'auto';
      } else {
        this.style.overflowY = 'hidden';
      }
    });
  }
  
  // Setup typing indicator
  function setupTypingIndicator(email) {
    const input = document.getElementById('chatInput');
    const thread = document.getElementById('chatThread');
    
    if (!input || !thread || !email || !window.MessagesStore?.updateTypingStatus) return;
    
    let typingTimeout;
    let isTyping = false;
    
    // Create typing indicator element
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    typingIndicator.style.display = 'none';
    thread.appendChild(typingIndicator);
    
    // Update typing status when user types
    input.addEventListener('input', () => {
      if (!isTyping) {
        isTyping = true;
        window.MessagesStore.updateTypingStatus(email, true);
      }
      
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        isTyping = false;
        window.MessagesStore.updateTypingStatus(email, false);
      }, 2000);
    });
    
    // Listen for typing status updates
    if (window.MessagesStore?.subscribeToTypingStatus) {
      const unsubscribe = window.MessagesStore.subscribeToTypingStatus(email, (status) => {
        if (status && status.isTyping) {
          typingIndicator.style.display = 'flex';
          thread.scrollTop = thread.scrollHeight;
        } else {
          typingIndicator.style.display = 'none';
        }
      });
      
      // Store unsubscribe function for cleanup
      window.typingStatusUnsubscribe = unsubscribe;
    }
  }
  
  // Initialize the chat interface
  function init(){
    const email = qs('email');
    const name = qs('name');
    
    // Store the active thread details
    if (email) sessionStorage.setItem('activeThreadEmail', email);
    if (name) sessionStorage.setItem('activeThreadName', name);
    
    // Render the initial UI
    renderHeader(name, email);
    
    // Use real-time subscription if available
    if (email && window.MessagesStore?.subscribeToThread) {
      console.log(`Setting up thread subscription for ${email}...`);
      
      window.threadUnsubscribe = window.MessagesStore.subscribeToThread(email, (messages) => {
        console.log('Thread updated with new messages:', messages.length);
        const box = document.getElementById('chatThread');
        if (!box) return;
        
        // Keep track of scroll position
        const wasAtBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 50;
        
        // Group messages by date for better readability
        let lastDate = '';
        
        // Clear the thread container
        box.innerHTML = '';
        
        // Process messages
        messages.forEach((m, index) => {
          // Determine if this is from admin or user
          const isAdmin = m.sender === 'admin@lafsys.gov';
          
          // Get avatar
          const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(m.name || (isAdmin ? 'Admin' : 'User'))}`;
          
          // Parse message content
          let imageUrl = null;
          let messageText = '';
          
          try {
            // Try to parse as JSON to see if it's an image message
            if (m.body && (m.body.startsWith('{') || m.body.includes('"imageUrl"'))) {
              const parsedMsg = JSON.parse(m.body);
              if (parsedMsg.type === 'image' && parsedMsg.imageUrl) {
                imageUrl = parsedMsg.imageUrl;
                messageText = parsedMsg.body || '';
              } else {
                messageText = m.body;
              }
            } else {
              messageText = m.body || '';
            }
          } catch (e) {
            // If parsing fails, use the message body directly
            messageText = m.body || '';
          }
          
          // Format the message date
          const msgDate = new Date(m.date);
          const datePart = msgDate.toLocaleDateString();
          
          // Add date separator if this is a new day
          if (datePart !== lastDate) {
            lastDate = datePart;
            const today = new Date().toLocaleDateString();
            const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
            
            let dateDisplay = datePart;
            if (datePart === today) dateDisplay = 'Today';
            else if (datePart === yesterday) dateDisplay = 'Yesterday';
            
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            dateSeparator.innerHTML = `<span>${dateDisplay}</span>`;
            box.appendChild(dateSeparator);
          }
          
          // Check if the next message is from the same sender (for grouping)
          const nextMsg = messages[index + 1];
          const isLastInGroup = !nextMsg || nextMsg.sender !== m.sender;
          
          // Create message element
          const msgDiv = document.createElement('div');
          msgDiv.className = `msg ${isAdmin ? 'me' : ''} ${isLastInGroup ? 'last-in-group' : ''}`;
          msgDiv.dataset.msgId = m.id || '';
          
          // Add avatar
          const avatarImg = document.createElement('img');
          avatarImg.className = 'avatar';
          avatarImg.src = avatar;
          avatarImg.alt = '';
          msgDiv.appendChild(avatarImg);
          
          // Add message bubble
          const bubble = document.createElement('div');
          bubble.className = 'bubble';
          
          // Add message header
          const header = document.createElement('div');
          header.className = 'msg-header';
          
          const senderName = document.createElement('div');
          senderName.className = 'sender-name';
          senderName.textContent = m.name || (isAdmin ? 'Admin' : 'User');
          header.appendChild(senderName);
          
          const msgTime = document.createElement('div');
          msgTime.className = 'msg-time';
          msgTime.textContent = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          header.appendChild(msgTime);
          
          bubble.appendChild(header);
          
          // Add message content
          if (messageText) {
            const body = document.createElement('div');
            body.className = 'msg-body';
            body.textContent = messageText;
            bubble.appendChild(body);
          } else if (!imageUrl) {
            const body = document.createElement('div');
            body.className = 'msg-body';
            body.innerHTML = '<em style="color:#6b7280">(No message content)</em>';
            bubble.appendChild(body);
          }
          
          // Add image if available
          if (imageUrl) {
            const img = document.createElement('img');
            img.className = 'message-image';
            img.src = imageUrl;
            img.alt = 'Attached image';
            img.loading = 'lazy';
            img.onclick = () => window.open(imageUrl, '_blank');
            bubble.appendChild(img);
          }
          
          msgDiv.appendChild(bubble);
          box.appendChild(msgDiv);
        });
        
        // Scroll to bottom if we were already at bottom
        if (wasAtBottom) {
          box.scrollTop = box.scrollHeight;
        }
        
        // Mark thread as read
        if (window.MessagesStore?.markThreadAsReadAsync) {
          window.MessagesStore.markThreadAsReadAsync(email).catch(console.error);
        }
      });
    } else {
      // Fall back to event-based updates
      renderThread(email);
      
      // Listen for thread updates
      window.addEventListener('threadUpdated', (e)=>{
        if (e?.detail?.email === email) {
          console.log('Thread updated event received');
          renderThread(email);
        }
      });
    }
    
    // Set up message sending
    wireSend(email, name);
    
    // Set up typing indicators
    setupTypingIndicator(email);
    
    // Set up cleanup function
    window.addEventListener('beforeunload', cleanup);
  }
  
  // Cleanup function for unsubscribing from real-time listeners
  function cleanup() {
    if (window.threadUnsubscribe) window.threadUnsubscribe();
    if (window.chatStatusUnsubscribe) window.chatStatusUnsubscribe();
    if (window.typingStatusUnsubscribe) window.typingStatusUnsubscribe();
    if (window.cleanupOnlineStatus) window.cleanupOnlineStatus();
  }
  
  // Initialize when the DOM is loaded
  document.addEventListener('DOMContentLoaded', init);
})();
