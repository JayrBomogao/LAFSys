/**
 * User Chat Logic
 * Handles all user-side messaging functionality with real-time Firebase integration
 */

(function() {
  // Get the Firebase services
  const { db, auth, FieldValue, serverTimestamp, getCurrentUser } = window.firebaseChat || {};

  // Ensure Firebase is properly initialized
  if (!db || !auth) {
    console.error('Firebase Chat services not available. Make sure firebase-chat.js is loaded first.');
    return;
  }

  // DOM Elements
  const chatThread = document.getElementById('chatThread');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatName = document.getElementById('chatName');
  const chatAvatar = document.getElementById('chatAvatar');
  const chatStatus = document.getElementById('chatStatus');
  const chatEmail = document.getElementById('chatEmail');

  // State variables
  let currentChatId = null;
  let currentUser = null;
  let adminId = 'admin@lafsys.gov'; // Default admin ID to match messages sent from admin
  let isTyping = false;
  let typingTimeout = null;
  let lastReadTimestamp = null;
  let messagesListener = null;
  let presenceListener = null;
  let typingListener = null;

  // Get URL parameters
  function getParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  // Initialize the chat interface
  function init() {
    // Get current user
    auth.onAuthStateChanged(function(user) {
      if (user) {
        currentUser = user;
        
        // Get chat parameters from URL
        const adminParam = getParam('admin') || adminId;
        adminId = adminParam;
        
        // First check for existing chats in Firestore
        checkForExistingChats(user.uid)
          .then(existingChatData => {
            console.log('Checked for existing chats:', existingChatData);
            
            // If an existing chat was found, use that data
            if (existingChatData) {
              // Set up the chat with the found admin ID
              setupChat(user.uid, existingChatData.adminId || adminId);
            } else {
              // Otherwise set up a new chat
              setupChat(user.uid, adminId);
            }
            
            updateUserPresence(user.uid, true);
            
            // Set up event listeners
            setupEventListeners();
          })
          .catch(error => {
            console.error('Error checking for existing chats:', error);
            // Fall back to default setup
            setupChat(user.uid, adminId);
            updateUserPresence(user.uid, true);
            setupEventListeners();
          });
      } else {
        // If no user is signed in, use anonymous authentication
        auth.signInAnonymously().catch(error => {
          console.error('Error signing in anonymously:', error);
        });
      }
    });
  }

  // Set up the chat interface and listeners
  function setupChat(userId, adminId) {
    // Generate a chat ID between the user and admin
    currentChatId = generateChatId(userId, adminId);
    
    // Check if chat exists or create a new one
    checkOrCreateChat(userId, adminId);
    
    // Set up real-time listeners
    setupMessagesListener();
    setupTypingListener();
    setupPresenceListener();
    
    // Update the UI with admin info
    updateAdminInfo();
  }
  
  // Generate a chat ID between two users
  function generateChatId(user1, user2) {
    // Sort the IDs to ensure consistency
    const sortedIds = [user1, user2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }
  
  // Check if user has any existing chats
  async function checkForExistingChats(userId) {
    try {
      console.log(`Checking for existing chats for user: ${userId}`);
      
      // Query for chats where this user is a participant
      const chatsSnapshot = await db.collection('chats')
        .where('participants', 'array-contains', userId)
        .get();
      
      if (chatsSnapshot.empty) {
        console.log('No existing chats found');
        return null;
      }
      
      // Get the most recent chat
      let mostRecentChat = null;
      let mostRecentTimestamp = 0;
      
      chatsSnapshot.forEach(doc => {
        const chatData = doc.data();
        const timestamp = chatData.lastTimestamp ? chatData.lastTimestamp.toDate().getTime() : 0;
        
        // Find the other participant (admin)
        const adminId = chatData.participants.find(id => id !== userId && id.includes('admin'));
        
        if (timestamp > mostRecentTimestamp && adminId) {
          mostRecentChat = {
            id: doc.id,
            adminId: adminId,
            ...chatData
          };
          mostRecentTimestamp = timestamp;
        }
      });
      
      console.log('Most recent chat found:', mostRecentChat ? mostRecentChat.id : 'none');
      return mostRecentChat;
    } catch (error) {
      console.error('Error checking for existing chats:', error);
      return null;
    }
  }
  
  // Check if chat exists or create a new one
  async function checkOrCreateChat(userId, adminId) {
    try {
      const chatRef = db.collection('chats').doc(currentChatId);
      const chatDoc = await chatRef.get();
      
      if (!chatDoc.exists) {
        // Create a new chat
        await chatRef.set({
          participants: [userId, adminId],
          createdAt: serverTimestamp(),
          lastMessage: null,
          lastTimestamp: serverTimestamp(),
          userInfo: {
            [userId]: {
              name: currentUser.displayName || 'User',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              lastSeen: serverTimestamp()
            }
          }
        });
        
        console.log('Created new chat:', currentChatId);
      } else {
        console.log('Chat already exists:', currentChatId);
        
        // Update chat with latest user info in case it changed
        await chatRef.update({
          [`userInfo.${userId}.lastSeen`]: serverTimestamp(),
          [`userInfo.${userId}.name`]: currentUser.displayName || 'User',
          [`userInfo.${userId}.email`]: currentUser.email || ''
        });
      }
    } catch (error) {
      console.error('Error checking or creating chat:', error);
    }
  }
  
  // Update admin info in the UI
  async function updateAdminInfo() {
    try {
      // Get admin details from Firestore
      const adminDoc = await db.collection('users').doc(adminId).get();
      
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        
        if (chatName) chatName.textContent = adminData.displayName || 'Admin Staff';
        if (chatEmail) chatEmail.textContent = adminData.email || '';
        if (chatAvatar) {
          const photoURL = adminData.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=Admin`;
          chatAvatar.src = photoURL;
        }
      } else {
        // Fallback to default admin info
        if (chatName) chatName.textContent = 'Admin Staff';
        if (chatAvatar) chatAvatar.src = `https://api.dicebear.com/9.x/initials/svg?seed=Admin`;
      }
    } catch (error) {
      console.error('Error updating admin info:', error);
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
          
          // Mark messages as seen if they are from admin
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
    
    if (!currentChatId) return;
    
    const typingRef = db.collection('chats').doc(currentChatId).collection('typing');
    
    typingListener = typingRef.doc(adminId).onSnapshot(doc => {
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
    
    if (!currentChatId || !adminId) return;
    
    presenceListener = db.collection('presence').doc(adminId).onSnapshot(doc => {
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
  
  // Update user presence
  function updateUserPresence(userId, isOnline) {
    if (!userId) return;
    
    const userRef = db.collection('presence').doc(userId);
    
    userRef.set({
      online: isOnline,
      lastSeen: serverTimestamp()
    }, { merge: true }).catch(error => {
      console.error('Error updating presence:', error);
    });
    
    // Set up presence cleanup on page unload
    if (isOnline) {
      window.addEventListener('beforeunload', () => {
        // Remove realtime listeners
        if (messagesListener) messagesListener();
        if (presenceListener) presenceListener();
        if (typingListener) typingListener();
        
        // Update presence status (this is best-effort as the page is closing)
        fetch(`${window.location.origin}/api/offline?userId=${userId}`, { 
          method: 'POST',
          keepalive: true
        }).catch(() => {
          // Silent catch as we can't handle errors during page unload
        });
      });
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
      ? (currentUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${currentUser.displayName || 'User'}`) 
      : `https://api.dicebear.com/9.x/initials/svg?seed=Admin`;
    
    const avatarHtml = `
      <div class="message-avatar">
        <img src="${avatarSrc}" alt="">
      </div>
    `;
    
    // Create message content
    let contentHtml = `
      <div class="message-content">
        ${text || ''}
        ${imageUrl ? `<img src="${imageUrl}" alt="Attached image" class="message-image" onclick="window.open('${imageUrl}', '_blank')">` : ''}
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
  }
  
  // Update a message in the UI (e.g., seen status)
  function updateMessage(messageId, message) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;
    
    // Update seen status
    if (message.seen && messageEl.classList.contains('outgoing')) {
      const existingStatus = messageEl.querySelector('.message-status');
      if (!existingStatus) {
        const avatarSrc = currentUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${currentUser.displayName || 'User'}`;
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
  
  // Mark messages as seen
  async function markMessagesAsSeen() {
    if (!currentChatId || !currentUser) return;
    
    try {
      // Get unseen messages from the admin - check both admin IDs to be safe
      // We check both 'admin' and 'admin@lafsys.gov' since either could be used in different parts of the system
      const unseen = await db.collection('chats').doc(currentChatId)
        .collection('messages')
        .where('seen', '==', false)
        .get();
      
      if (unseen.empty) return;
      
      // Mark messages from admin as seen
      const batch = db.batch();
      let hasAdminMessages = false;
      
      unseen.docs.forEach(doc => {
        const message = doc.data();
        // Check if this is an admin message (could be either ID format)
        if (message.senderId === adminId || 
            message.senderId === 'admin' || 
            message.senderId === 'admin@lafsys.gov') {
          batch.update(doc.ref, { seen: true });
          hasAdminMessages = true;
        }
      });
      
      // Only commit if we have admin messages to mark as seen
      if (hasAdminMessages) {
        await batch.commit();
        
        // Update the chat's last read timestamp
        lastReadTimestamp = new Date();
        await db.collection('chats').doc(currentChatId).update({
          [`lastRead.${currentUser.uid}`]: serverTimestamp()
        });
        
        console.log('Marked admin messages as seen');
      }
    } catch (error) {
      console.error('Error marking messages as seen:', error);
    }
  }
  
  // Send a message
  async function sendMessage() {
    if (!currentChatId || !currentUser) return;
    
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
    if (!currentChatId || !currentUser || !imageUrl) return;
    
    try {
      // Add message to Firestore
      const messageRef = db.collection('chats').doc(currentChatId).collection('messages').doc();
      
      const message = {
        senderId: currentUser.uid,
        text: caption,
        imageUrl,
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
    
    // Image upload (if available)
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
    
    // Scroll to bottom on window resize
    window.addEventListener('resize', scrollToBottom);
  }
  
  // Create and append a typing indicator
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
  
  // Initialize everything when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    createTypingIndicator();
    init();
  });
  
  // Handle page visibility for presence
  document.addEventListener('visibilitychange', () => {
    if (currentUser) {
      updateUserPresence(currentUser.uid, document.visibilityState === 'visible');
    }
  });
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (currentUser) {
      updateUserPresence(currentUser.uid, false);
    }
    
    // Clean up listeners
    if (messagesListener) messagesListener();
    if (presenceListener) presenceListener();
    if (typingListener) typingListener();
  });

})();
