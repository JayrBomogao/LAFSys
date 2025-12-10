/**
 * Admin Chat Dashboard Logic
 * Handles all staff/admin messaging functionality with real-time Firebase integration
 */

(function() {
  // Get Firebase services
  const { db, auth, FieldValue, serverTimestamp, getCurrentUser, isAdmin } = window.firebaseChat || {};

  // Ensure Firebase is properly initialized
  if (!db || !auth) {
    console.error('Firebase Chat services not available. Make sure firebase-chat.js is loaded first.');
    return;
  }

  // DOM Elements
  const chatsList = document.getElementById('chatsList');
  const chatThread = document.getElementById('chatThread');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatHeader = document.getElementById('chatHeader');
  const chatName = document.getElementById('chatName');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatStatus = document.getElementById('chatStatus');
  const chatEmail = document.getElementById('chatEmail');
  const searchInput = document.getElementById('searchInput');
  const noChatsMessage = document.getElementById('noChatsMessage');
  const welcomeScreen = document.getElementById('welcomeScreen');

  // State variables
  let currentUser = null;
  let currentChatId = null;
  let currentUserId = null;
  let allChats = [];
  let isTyping = false;
  let typingTimeout = null;
  let lastReadTimestamp = null;
  let chatsListener = null;
  let messagesListener = null;
  let presenceListener = null;
  let typingListener = null;

  // Get URL parameters
  function getParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Initialize the admin chat dashboard
  function init() {
    // Check authentication state
    auth.onAuthStateChanged(async function(user) {
      if (user && await checkIsAdmin(user)) {
        currentUser = user;
        
        // Set admin presence
        updateAdminPresence(true);
        
        // Set up chats list
        setupChatsListener();
        
        // Check if a specific chat is requested via URL
        const chatUserIdParam = getParam('userId');
        if (chatUserIdParam) {
          openChat(chatUserIdParam);
        }
        
        // Set up event listeners
        setupEventListeners();
      } else {
        // Redirect to login or show authentication required message
        showAuthRequiredMessage();
      }
    });
  }
  
  // Check if the user is an admin
  async function checkIsAdmin(user) {
    // This is a placeholder - implement your admin check logic
    // Could be based on custom claims, a specific admin collection, or email domains
    
    if (!user) return false;
    
    try {
      // Option 1: Check admin emails
      const adminEmails = ['admin@lafsys.gov'];
      if (adminEmails.includes(user.email)) {
        return true;
      }
      
      // Option 2: Check admin role in Firestore
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists && userDoc.data().role === 'admin') {
        return true;
      }
      
      // Not an admin
      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
  
  // Show authentication required message
  function showAuthRequiredMessage() {
    const container = document.querySelector('.chat-container');
    if (container) {
      container.innerHTML = `
        <div class="auth-required">
          <div class="auth-icon">
            <i data-lucide="lock"></i>
          </div>
          <h2>Authentication Required</h2>
          <p>You need to be logged in as an admin to access this page.</p>
          <a href="login.html" class="btn btn-primary">Login</a>
        </div>
      `;
    }
  }
  
  // Update admin presence
  function updateAdminPresence(isOnline) {
    if (!currentUser) return;
    
    const userRef = db.collection('presence').doc(currentUser.uid);
    
    userRef.set({
      online: isOnline,
      lastSeen: serverTimestamp(),
      displayName: currentUser.displayName || 'Admin Staff',
      email: currentUser.email || '',
      photoURL: currentUser.photoURL || '',
      role: 'admin'
    }, { merge: true }).catch(error => {
      console.error('Error updating admin presence:', error);
    });
  }
  
  // Set up real-time listener for all chats
  function setupChatsListener() {
    if (chatsListener) {
      chatsListener();
    }
    
    if (!currentUser) return;
    
    // Query all chats where the admin is a participant
    chatsListener = db.collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .orderBy('lastTimestamp', 'desc')
      .onSnapshot(async snapshot => {
        const chats = [];
        
        // Process each chat
        for (const doc of snapshot.docs) {
          const chatData = doc.data();
          
          // Get the other participant (not the admin)
          const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
          
          // Get user info from the chat or from users collection
          let userInfo = chatData.userInfo && chatData.userInfo[otherUserId];
          
          if (!userInfo) {
            try {
              const userDoc = await db.collection('users').doc(otherUserId).get();
              if (userDoc.exists) {
                userInfo = userDoc.data();
              }
            } catch (error) {
              console.error('Error getting user info:', error);
            }
          }
          
          // Get presence info
          let presenceInfo = { online: false };
          try {
            const presenceDoc = await db.collection('presence').doc(otherUserId).get();
            if (presenceDoc.exists) {
              presenceInfo = presenceDoc.data();
            }
          } catch (error) {
            console.error('Error getting presence info:', error);
          }
          
          // Format the chat data for the UI
          chats.push({
            id: doc.id,
            userId: otherUserId,
            name: userInfo?.name || userInfo?.displayName || 'User',
            email: userInfo?.email || '',
            photoURL: userInfo?.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${userInfo?.name || 'User'}`,
            lastMessage: chatData.lastMessage || '',
            lastTimestamp: chatData.lastTimestamp ? chatData.lastTimestamp.toDate() : new Date(),
            unread: isUnread(chatData, currentUser.uid),
            online: presenceInfo.online || false
          });
        }
        
        // Update state
        allChats = chats;
        
        // Render the chats list
        renderChatsList(chats);
      }, error => {
        console.error('Error in chats listener:', error);
      });
  }
  
  // Check if a chat has unread messages
  function isUnread(chatData, userId) {
    if (!chatData.lastRead || !chatData.lastTimestamp) {
      return true;
    }
    
    const lastRead = chatData.lastRead[userId];
    if (!lastRead) {
      return true;
    }
    
    return chatData.lastTimestamp.toDate() > lastRead.toDate();
  }
  
  // Render the list of chats
  function renderChatsList(chats) {
    if (!chatsList) return;
    
    // Show/hide no chats message
    if (noChatsMessage) {
      noChatsMessage.style.display = chats.length === 0 ? 'flex' : 'none';
    }
    
    // Clear existing chats
    chatsList.innerHTML = '';
    
    // Add each chat to the list
    chats.forEach(chat => {
      const chatEl = document.createElement('div');
      chatEl.className = `conversation-item${chat.unread ? ' unread' : ''}${currentChatId === chat.id ? ' active' : ''}`;
      chatEl.dataset.chatId = chat.id;
      chatEl.dataset.userId = chat.userId;
      
      const timeString = formatTime(chat.lastTimestamp);
      
      chatEl.innerHTML = `
        <div class="conversation-avatar">
          <img src="${chat.photoURL}" alt="${chat.name}">
        </div>
        <div class="conversation-details">
          <div class="conversation-header">
            <div class="conversation-name">${chat.name}</div>
            <div class="conversation-time">${timeString}</div>
          </div>
          <div class="conversation-preview">
            ${chat.lastMessage || 'No messages yet'}
          </div>
        </div>
        ${chat.unread ? '<div class="conversation-badge"></div>' : ''}
        ${chat.online ? '<div class="status-indicator online" title="Online"></div>' : ''}
      `;
      
      // Add click event to open the chat
      chatEl.addEventListener('click', () => {
        openChat(chat.userId);
      });
      
      chatsList.appendChild(chatEl);
    });
  }
  
  // Format timestamp for display
  function formatTime(date) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
      // Yesterday
      return 'Yesterday';
    } else if (date.getFullYear() === now.getFullYear()) {
      // This year - show month & day
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      // Different year
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  
  // Open a specific chat
  function openChat(userId) {
    if (!userId || !currentUser) return;
    
    // Generate the chat ID
    const sortedIds = [userId, currentUser.uid].sort();
    currentChatId = `${sortedIds[0]}_${sortedIds[1]}`;
    currentUserId = userId;
    
    // Update UI state
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (chatThread) chatThread.style.display = 'flex';
    if (chatHeader) chatHeader.style.display = 'flex';
    if (chatInput) chatInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    
    // Clear existing chat content
    if (chatThread) chatThread.innerHTML = '';
    
    // Update active chat in the list
    const chatItems = document.querySelectorAll('.conversation-item');
    chatItems.forEach(item => {
      if (item.dataset.chatId === currentChatId) {
        item.classList.add('active');
        item.classList.remove('unread');
      } else {
        item.classList.remove('active');
      }
    });
    
    // Check if chat exists or create a new one
    checkOrCreateChat(userId);
    
    // Set up chat listeners
    setupMessagesListener();
    setupTypingListener();
    setupPresenceListener();
    
    // Update chat header with user info
    updateChatHeader(userId);
    
    // Focus the input field
    if (chatInput) chatInput.focus();
    
    // Update URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.set('userId', userId);
    window.history.replaceState({}, '', url);
  }
  
  // Check if chat exists or create a new one
  async function checkOrCreateChat(userId) {
    try {
      const chatRef = db.collection('chats').doc(currentChatId);
      const chatDoc = await chatRef.get();
      
      if (!chatDoc.exists) {
        // Create a new chat
        await chatRef.set({
          participants: [currentUser.uid, userId],
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastTimestamp: serverTimestamp(),
          userInfo: {
            [currentUser.uid]: {
              name: currentUser.displayName || 'Admin Staff',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              role: 'admin'
            }
          }
        });
        
        console.log('Created new chat:', currentChatId);
      } else {
        console.log('Chat already exists:', currentChatId);
      }
    } catch (error) {
      console.error('Error checking or creating chat:', error);
    }
  }
  
  // Update chat header with user info
  async function updateChatHeader(userId) {
    if (!chatName || !chatStatus || !chatAvatar || !chatEmail) return;
    
    try {
      // Try to get user info from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      
      let name = 'User';
      let email = '';
      let photoURL = `https://api.dicebear.com/9.x/initials/svg?seed=User`;
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        name = userData.displayName || userData.name || 'User';
        email = userData.email || '';
        photoURL = userData.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${name}`;
      } else {
        // Try to get from chat data
        const chatDoc = await db.collection('chats').doc(currentChatId).get();
        if (chatDoc.exists) {
          const chatData = chatDoc.data();
          if (chatData.userInfo && chatData.userInfo[userId]) {
            const userInfo = chatData.userInfo[userId];
            name = userInfo.name || userInfo.displayName || 'User';
            email = userInfo.email || '';
            photoURL = userInfo.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${name}`;
          }
        }
      }
      
      // Update UI
      chatName.textContent = name;
      chatEmail.textContent = email;
      chatAvatar.src = photoURL;
    } catch (error) {
      console.error('Error updating chat header:', error);
    }
  }
  
  // Set up real-time listener for messages
  function setupMessagesListener() {
    if (messagesListener) {
      messagesListener();
    }
    
    if (!currentChatId) return;
    
    messagesListener = db.collection('chats').doc(currentChatId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        // Process new messages
        const changes = snapshot.docChanges();
        let hasNewMessages = false;
        
        changes.forEach(change => {
          if (change.type === 'added') {
            // Add new message to the UI
            const message = change.doc.data();
            appendMessage(message, change.doc.id);
            hasNewMessages = true;
          } else if (change.type === 'modified') {
            // Update message (e.g., seen status)
            const message = change.doc.data();
            updateMessage(change.doc.id, message);
          }
        });
        
        if (hasNewMessages) {
          // Scroll to bottom
          scrollToBottom();
          
          // Mark messages as seen if they are from the user
          markMessagesAsSeen();
        }
      }, error => {
        console.error('Error in messages listener:', error);
      });
  }
  
  // Set up real-time listener for typing indicator
  function setupTypingListener() {
    if (typingListener) {
      typingListener();
    }
    
    if (!currentChatId || !currentUserId) return;
    
    const typingRef = db.collection('chats').doc(currentChatId).collection('typing');
    
    typingListener = typingRef.doc(currentUserId).onSnapshot(doc => {
      const typingIndicator = document.getElementById('typingIndicator');
      
      if (!typingIndicator) return;
      
      if (doc.exists && doc.data().isTyping) {
        // Show typing indicator
        typingIndicator.style.display = 'flex';
        scrollToBottom();
      } else {
        // Hide typing indicator
        typingIndicator.style.display = 'none';
      }
    }, error => {
      console.error('Error in typing listener:', error);
    });
  }
  
  // Set up real-time listener for presence
  function setupPresenceListener() {
    if (presenceListener) {
      presenceListener();
    }
    
    if (!currentChatId || !currentUserId) return;
    
    presenceListener = db.collection('presence').doc(currentUserId).onSnapshot(doc => {
      if (chatStatus) {
        if (doc.exists && doc.data().online) {
          chatStatus.textContent = 'Online';
          chatStatus.className = 'status-indicator online';
        } else {
          const lastSeen = doc.exists && doc.data().lastSeen ? doc.data().lastSeen.toDate() : null;
          chatStatus.textContent = lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : 'Offline';
          chatStatus.className = 'status-indicator offline';
        }
      }
    }, error => {
      console.error('Error in presence listener:', error);
    });
  }
  
  // Format last seen time
  function formatLastSeen(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.round(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.round(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  // Mark messages as seen
  async function markMessagesAsSeen() {
    if (!currentChatId || !currentUser || !currentUserId) return;
    
    try {
      // Get unseen messages from the user
      const unseen = await db.collection('chats').doc(currentChatId)
        .collection('messages')
        .where('senderId', '==', currentUserId)
        .where('seen', '==', false)
        .get();
      
      if (unseen.empty) return;
      
      // Mark each message as seen
      const batch = db.batch();
      unseen.docs.forEach(doc => {
        batch.update(doc.ref, { seen: true });
      });
      
      await batch.commit();
      
      // Update the chat's last read timestamp
      lastReadTimestamp = new Date();
      await db.collection('chats').doc(currentChatId).update({
        [`lastRead.${currentUser.uid}`]: serverTimestamp()
      });
      
      console.log('Marked messages as seen');
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  }
  
  // Append a message to the UI
  function appendMessage(message, messageId) {
    if (!chatThread) return;
    
    // Check if message already exists
    if (document.querySelector(`[data-message-id="${messageId}"]`)) {
      return;
    }
    
    // Get message details
    const { senderId, text, timestamp, imageUrl, seen } = message;
    const isOutgoing = senderId === currentUser.uid;
    const date = timestamp ? timestamp.toDate() : new Date();
    
    // Format date for display
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString();
    
    // Check if we need to add a date separator
    const lastDateSeparator = chatThread.querySelector('.date-separator:last-of-type');
    const lastDateString = lastDateSeparator ? lastDateSeparator.getAttribute('data-date') : '';
    
    if (dateString !== lastDateString) {
      const dateSeparator = document.createElement('div');
      dateSeparator.className = 'date-separator';
      dateSeparator.setAttribute('data-date', dateString);
      
      // Format the date label
      const today = new Date().toLocaleDateString();
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
      
      let dateLabel = dateString;
      if (dateString === today) {
        dateLabel = 'Today';
      } else if (dateString === yesterday) {
        dateLabel = 'Yesterday';
      }
      
      dateSeparator.innerHTML = `<span>${dateLabel}</span>`;
      chatThread.appendChild(dateSeparator);
    }
    
    // Check if message is consecutive
    const messages = chatThread.querySelectorAll('.message');
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const isConsecutive = lastMessage && lastMessage.getAttribute('data-sender-id') === senderId;
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOutgoing ? 'outgoing' : ''} ${isConsecutive ? 'consecutive' : ''}`;
    messageEl.setAttribute('data-message-id', messageId);
    messageEl.setAttribute('data-sender-id', senderId);
    messageEl.setAttribute('data-timestamp', date.getTime());
    
    // Create message avatar (visible for first message in a group)
    const avatarSrc = isOutgoing 
      ? (currentUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${currentUser.displayName || 'Admin'}`) 
      : `https://api.dicebear.com/9.x/initials/svg?seed=User`;
    
    const avatarHtml = `
      <div class="message-avatar">
        <img src="${avatarSrc}" alt="">
      </div>
    `;
    
    // Check if this is an image message (JSON string)
    let imageUrl2 = imageUrl;
    let messageText = text || '';
    
    try {
      // Try to parse as JSON to see if it's an image message
      if (messageText && (messageText.startsWith('{') || messageText.includes('"imageUrl"'))) {
        const parsedMsg = JSON.parse(messageText);
        if (parsedMsg.type === 'image' && parsedMsg.imageUrl) {
          imageUrl2 = parsedMsg.imageUrl;
          messageText = parsedMsg.body || '';
        }
      }
    } catch (e) {
      // If parsing fails, use the message text directly
    }
    
    // Create message content
    let contentHtml = `
      <div class="message-content">
        ${messageText || ''}
        ${imageUrl2 ? `<img src="${imageUrl2}" alt="Attached image" class="message-image" onclick="window.open('${imageUrl2}', '_blank')">` : ''}
        <div class="message-time">${timeString}</div>
      </div>
    `;
    
    // Add seen indicator for outgoing messages
    if (isOutgoing && seen) {
      contentHtml += `
        <div class="message-status">
          <span class="message-seen">
            <img src="${avatarSrc}" alt="Seen">
          </span>
        </div>
      `;
    }
    
    // Set HTML content
    messageEl.innerHTML = isOutgoing ? contentHtml + avatarHtml : avatarHtml + contentHtml;
    
    // Append to chat thread
    chatThread.appendChild(messageEl);
    
    // Auto-scroll if near bottom
    if (chatThread.scrollTop + chatThread.clientHeight >= chatThread.scrollHeight - 300) {
      scrollToBottom();
    }
  }
  
  // Update a message in the UI (e.g., seen status)
  function updateMessage(messageId, message) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    
    // Update seen status
    if (message.seen && messageEl.classList.contains('outgoing')) {
      const existingStatus = messageEl.querySelector('.message-status');
      if (!existingStatus) {
        const avatarSrc = currentUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${currentUser.displayName || 'Admin'}`;
        const statusHtml = `
          <div class="message-status">
            <span class="message-seen">
              <img src="${avatarSrc}" alt="Seen">
            </span>
          </div>
        `;
        messageEl.appendChild(document.createRange().createContextualFragment(statusHtml));
      }
    }
  }
  
  // Send a message
  async function sendMessage() {
    if (!currentChatId || !currentUser || !currentUserId) return;
    
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateTypingStatus(false);
    
    try {
      // Add message to Firestore
      const messageRef = db.collection('chats').doc(currentChatId).collection('messages').doc();
      
      const message = {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        seen: false
      };
      
      await messageRef.set(message);
      
      // Update the chat's last message
      await db.collection('chats').doc(currentChatId).update({
        lastMessage: text,
        lastTimestamp: serverTimestamp(),
        [`lastActivity.${currentUser.uid}`]: serverTimestamp()
      });
      
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message in input if sending failed
      chatInput.value = text;
    }
  }
  
  // Send a message with an image
  async function sendImageMessage(imageUrl, caption = '') {
    if (!currentChatId || !currentUser || !currentUserId || !imageUrl) return;
    
    try {
      // Add message to Firestore
      const messageRef = db.collection('chats').doc(currentChatId).collection('messages').doc();
      
      // Create a JSON message with the image
      const imageMessage = {
        type: 'image',
        body: caption,
        imageUrl: imageUrl
      };
      
      const message = {
        senderId: currentUser.uid,
        text: JSON.stringify(imageMessage),
        timestamp: serverTimestamp(),
        seen: false
      };
      
      await messageRef.set(message);
      
      // Update the chat's last message
      await db.collection('chats').doc(currentChatId).update({
        lastMessage: caption || 'Sent an image',
        lastTimestamp: serverTimestamp(),
        [`lastActivity.${currentUser.uid}`]: serverTimestamp()
      });
      
      console.log('Image message sent successfully');
    } catch (error) {
      console.error('Error sending image message:', error);
    }
  }
  
  // Update typing status
  function updateTypingStatus(isTyping) {
    if (!currentChatId || !currentUser) return;
    
    // Don't update if the status hasn't changed
    if (this.isTyping === isTyping) return;
    this.isTyping = isTyping;
    
    // Update typing status in Firestore
    const typingRef = db.collection('chats').doc(currentChatId).collection('typing').doc(currentUser.uid);
    
    typingRef.set({
      isTyping,
      timestamp: serverTimestamp()
    }).catch(error => {
      console.error('Error updating typing status:', error);
    });
  }
  
  // Scroll chat to bottom
  function scrollToBottom() {
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  }
  
  // Set up event listeners for the UI
  function setupEventListeners() {
    // Send button
    if (sendBtn) {
      sendBtn.addEventListener('click', sendMessage);
    }
    
    // Input field (send on Enter, typing indicator)
    if (chatInput) {
      // Handle Enter key
      chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      
      // Auto-grow input field
      chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        
        // Update typing status
        updateTypingStatus(chatInput.value.trim().length > 0);
        
        // Clear typing timeout and set a new one
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
          updateTypingStatus(false);
        }, 3000);
      });
    }
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        filterChatsList(query);
      });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (currentChatId) {
          // Refresh current chat
          setupMessagesListener();
        }
      });
    }
    
    // Image upload
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const imageUploadInput = document.getElementById('imageUploadInput');
    
    if (imageUploadBtn && imageUploadInput) {
      imageUploadBtn.addEventListener('click', () => {
        imageUploadInput.click();
      });
      
      imageUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Show loading state
        imageUploadBtn.disabled = true;
        
        try {
          // Upload image to Firebase Storage
          const storageRef = firebase.storage().ref();
          const fileRef = storageRef.child(`chat_images/${currentChatId}/${Date.now()}_${file.name}`);
          
          const uploadTask = fileRef.put(file);
          
          uploadTask.on('state_changed', 
            (snapshot) => {
              // Progress handling if needed
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log('Upload is ' + progress + '% done');
            }, 
            (error) => {
              // Error handling
              console.error('Error uploading image:', error);
              imageUploadBtn.disabled = false;
            }, 
            async () => {
              // Upload complete
              const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
              
              // Send message with image
              const caption = chatInput.value.trim();
              await sendImageMessage(downloadURL, caption);
              
              // Clear input
              chatInput.value = '';
              chatInput.style.height = 'auto';
              imageUploadInput.value = null;
              imageUploadBtn.disabled = false;
            }
          );
        } catch (error) {
          console.error('Error handling image upload:', error);
          imageUploadBtn.disabled = false;
        }
      });
    }
  }
  
  // Filter chats list by search query
  function filterChatsList(query) {
    if (!query) {
      renderChatsList(allChats);
      return;
    }
    
    const filtered = allChats.filter(chat => {
      return (
        chat.name.toLowerCase().includes(query) ||
        chat.email.toLowerCase().includes(query) ||
        chat.lastMessage.toLowerCase().includes(query)
      );
    });
    
    renderChatsList(filtered);
  }
  
  // Create a typing indicator element
  function createTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.id = 'typingIndicator';
    typingIndicator.className = 'typing-indicator';
    typingIndicator.style.display = 'none';
    typingIndicator.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    
    if (chatThread) {
      chatThread.appendChild(typingIndicator);
    }
  }
  
  // Initialize everything
  createTypingIndicator();
  init();
  
  // Handle page visibility for presence
  document.addEventListener('visibilitychange', () => {
    if (currentUser) {
      updateAdminPresence(document.visibilityState === 'visible');
    }
  });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (currentUser) {
      updateAdminPresence(false);
    }
    
    // Clean up listeners
    if (chatsListener) chatsListener();
    if (messagesListener) messagesListener();
    if (presenceListener) presenceListener();
    if (typingListener) typingListener();
  });
})();
