/**
 * Firebase Messages and Chat System
 * 
 * This script replaces the localStorage-based messaging system with Firebase Firestore.
 * It provides the same API as the original messages.js but uses Firestore for storage.
 */

(function() {
    // Ensure Firebase is loaded
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not found. Make sure it is loaded before this script.');
        return;
    }

    const w = window;
    
    // Initialize Firebase if needed
    try {
        if (!firebase.apps.length) {
            const firebaseConfig = {
                apiKey: "AIzaSyBGH1-fruNM0GPOLpOjfOIxHpLgqzt8fe0",
                authDomain: "lafsys.firebaseapp.com",
                projectId: "lafsys",
                storageBucket: "lafsys.appspot.com",
                messagingSenderId: "103945210522",
                appId: "1:103945210522:web:f5a51c84653a0cab10ed23",
                measurementId: "G-EJ2X0PTDNH"
            };
            firebase.initializeApp(firebaseConfig);
        }
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        return;
    }

    // Get Firestore database
    const db = firebase.firestore();
    
    // DELETE ALL DEMO DATA - Remove old inbox messages completely
    async function deleteAllDemoData() {
        try {
            console.log('Deleting all demo/old inbox data...');
            
            // Delete demo messages
            const demoIds = ['demo1', 'demo2'];
            for (const id of demoIds) {
                try {
                    await db.collection('messages').doc(id).delete();
                    console.log(`Deleted message: ${id}`);
                } catch (e) {
                    console.log(`Could not delete ${id}:`, e);
                }
            }
            
            // Delete demo threads
            const demoEmails = ['john@example.com', 'jane@example.com'];
            for (const email of demoEmails) {
                try {
                    await db.collection('threads').doc(email).delete();
                    console.log(`Deleted thread: ${email}`);
                } catch (e) {
                    console.log(`Could not delete thread ${email}:`, e);
                }
            }
            
            console.log('All demo data deleted successfully');
        } catch (error) {
            console.error('Error deleting demo data:', error);
        }
    }
    
    // No longer creating demo data - function kept for compatibility but does nothing
    async function checkAndCreateDemoData() {
        // DELETE demo data instead of creating it
        await deleteAllDemoData();
    }
    
    // MessagesStore API - maintains compatibility with original code
    const FirebaseMessagesStore = {
        /**
         * Get all messages from Firestore
         * @returns {Promise<Array>} Array of messages
         */
        async getAllAsync() {
            try {
                const snapshot = await db.collection('messages').orderBy('date', 'desc').get();
                return snapshot.docs.map(doc => {
                    const data = doc.data();
                    return { ...data, id: doc.id };
                });
            } catch (error) {
                console.error('Error getting messages:', error);
                return [];
            }
        },
        
        /**
         * Subscribe to real-time updates for a specific thread
         * @param {string} email - The email identifier for the thread
         * @param {Function} callback - Callback function to receive updates
         * @returns {Function} - Unsubscribe function
         */
        subscribeToThread(email, callback) {
            if (!email) {
                console.error('Cannot subscribe to thread: Email is required');
                return null;
            }
            
            console.log(`Subscribing to thread updates for ${email}...`);
            
            console.log(`Setting up real-time listener for thread ${email}`);
            
            // Use a more robust snapshot listener with better error handling and metadata
            const unsubscribe = db.collection('threads').doc(email)
                .onSnapshot({includeMetadataChanges: true}, doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data && Array.isArray(data.messages)) {
                            // Debug information about messages
                            console.log(`Thread update: ${data.messages.length} messages for ${email}`);
                            if (data.messages.length > 0) {
                                // Log the last message to help debug
                                const lastMsg = data.messages[data.messages.length - 1];
                                console.log('Last message:', {
                                    sender: lastMsg.sender,
                                    name: lastMsg.name,
                                    body: lastMsg.body ? (lastMsg.body.length > 30 ? 
                                          lastMsg.body.substring(0, 30) + '...' : lastMsg.body) : 'EMPTY',
                                    date: lastMsg.date
                                });
                            }
                            
                            // Call callback with messages
                            callback(data.messages);
                            
                            // Dispatch additional event for custom listeners
                            const evt = new CustomEvent('threadUpdated', { 
                                detail: { 
                                    email, 
                                    messages: data.messages,
                                    lastMessage: data.messages.length > 0 ? 
                                        data.messages[data.messages.length - 1] : null
                                } 
                            });
                            w.dispatchEvent(evt);
                        } else {
                            console.log(`Thread exists for ${email} but no messages array found`);
                            callback([]);
                        }
                    } else {
                        console.log(`No thread found for ${email} in onSnapshot`);
                        callback([]);
                    }
                }, error => {
                    console.error(`Error in thread subscription for ${email}:`, error);
                    callback([]);
                });
                
            return unsubscribe;
        },
        
        /**
         * Check if a user or admin is online
         * @param {string} userId - User ID or email to check
         * @returns {Promise<Object>} - Online status information
         */
        async checkOnlineStatus(userId) {
            try {
                const doc = await db.collection('online_status').doc(userId).get();
                if (doc.exists) {
                    return doc.data();
                }
                return { online: false, lastSeen: null };
            } catch (error) {
                console.error('Error checking online status:', error);
                return { online: false, lastSeen: null };
            }
        },
        
        /**
         * Subscribe to online status changes for a user or admin
         * @param {string} userId - User ID or email to monitor
         * @param {Function} callback - Callback function to receive status updates
         * @returns {Function} - Unsubscribe function
         */
        subscribeToOnlineStatus(userId, callback) {
            if (!userId) return null;
            
            return db.collection('online_status').doc(userId)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        callback(doc.data());
                    } else {
                        callback({ online: false, lastSeen: null });
                    }
                }, error => {
                    console.error('Error in online status subscription:', error);
                    callback({ online: false, lastSeen: null });
                });
        },
        
        /**
         * Set online status for a user
         * @param {string} userId - User ID or email to update
         * @param {boolean} isOnline - Whether the user is online
         * @param {string} [displayName] - Optional display name for the user
         * @returns {Promise<void>}
         */
        async setOnlineStatusAsync(userId, isOnline, displayName = null) {
            if (!userId) return Promise.reject(new Error('User ID is required'));
            
            try {
                const statusData = {
                    online: isOnline,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Add display name if provided
                if (displayName) {
                    statusData.displayName = displayName;
                }
                
                await db.collection('online_status').doc(userId).set(statusData, { merge: true });
                return true;
            } catch (error) {
                console.error('Error setting online status:', error);
                throw error;
            }
        },
        
        /**
         * Update typing status for a chat thread
         * @param {string} threadId - The email/ID of the thread
         * @param {boolean} isTyping - Whether the user is currently typing
         * @returns {Promise<void>}
         */
        async updateTypingStatus(threadId, isTyping) {
            if (!threadId) return Promise.reject(new Error('Thread ID is required'));
            
            try {
                const typingRef = db.collection('typing_status').doc(threadId);
                
                // Get current user identity
                const isAdmin = window.location.href.includes('admin.html') || 
                                window.location.href.includes('chat.html');
                const userId = isAdmin ? 'admin' : threadId;
                
                // Update typing status
                await typingRef.set({
                    [userId]: {
                        isTyping,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }
                }, { merge: true });
                
                return true;
            } catch (error) {
                console.error('Error updating typing status:', error);
                return false;
            }
        },
        
        /**
         * Subscribe to typing status updates for a thread
         * @param {string} threadId - The email/ID of the thread
         * @param {Function} callback - Callback function to receive updates
         * @returns {Function} - Unsubscribe function
         */
        subscribeToTypingStatus(threadId, callback) {
            if (!threadId) return null;
            
            // Determine which user type we are
            const isAdmin = window.location.href.includes('admin.html') || 
                           window.location.href.includes('chat.html');
                           
            // We want to know if the other party is typing
            const targetUser = isAdmin ? threadId : 'admin';
            
            return db.collection('typing_status').doc(threadId)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        if (data && data[targetUser]) {
                            const typingData = data[targetUser];
                            
                            // Check if typing status is recent (within 5 seconds)
                            let isRecent = true;
                            if (typingData.timestamp) {
                                const now = new Date();
                                const typingTime = typingData.timestamp.toDate();
                                isRecent = (now - typingTime) < 5000; // 5 seconds
                            }
                            
                            callback({
                                isTyping: typingData.isTyping && isRecent,
                                timestamp: typingData.timestamp
                            });
                        } else {
                            callback({ isTyping: false });
                        }
                    } else {
                        callback({ isTyping: false });
                    }
                }, error => {
                    console.error('Error in typing status subscription:', error);
                    callback({ isTyping: false });
                });
        },
        
        /**
         * Mark a thread as read
         * @param {string} email - Thread identifier
         * @returns {Promise<boolean>} Success status
         */
        async markThreadAsReadAsync(email) {
            if (!email) return Promise.reject(new Error('Email is required'));
            
            try {
                // Update the thread's read status
                await db.collection('threads').doc(email).update({
                    read: true,
                    lastReadAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Also mark any inbox messages from this user as read
                const messagesSnapshot = await db.collection('messages')
                    .where('email', '==', email)
                    .where('unread', '==', true)
                    .get();
                    
                const batch = db.batch();
                messagesSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { unread: false });
                });
                
                if (messagesSnapshot.docs.length > 0) {
                    await batch.commit();
                }
                
                return true;
            } catch (error) {
                console.error('Error marking thread as read:', error);
                return false;
            }
        },
        
        
        /**
         * Get all messages (synchronous version for compatibility)
         * @returns {Array} Empty array initially, use the callback for actual data
         */
        getAll(callback) {
            this.getAllAsync().then(messages => {
                if (callback && typeof callback === 'function') {
                    callback(messages);
                }
                // Also dispatch an event for other listeners
                const evt = new CustomEvent('messagesLoaded', { detail: { messages } });
                w.dispatchEvent(evt);
            });
            return []; // Return empty array immediately for compatibility
        },
        
        /**
         * Remove a message from Firestore
         * @param {string} id Message ID to remove
         * @returns {Promise<void>}
         */
        async removeAsync(id) {
            try {
                await db.collection('messages').doc(id).delete();
                const evt = new CustomEvent('messagesUpdated', { detail: { type: 'delete', id } });
                w.dispatchEvent(evt);
                return true;
            } catch (error) {
                console.error('Error removing message:', error);
                return false;
            }
        },
        
        /**
         * Remove a message (synchronous version for compatibility)
         * @param {string} id Message ID to remove
         */
        remove(id) {
            this.removeAsync(id);
        },
        
        /**
         * Get a chat thread from Firestore
         * @param {string} email Email identifier for the thread
         * @returns {Promise<Array>} Array of thread messages
         */
        async getThreadAsync(email) {
            if (!email) {
                console.error('Cannot get thread: Email is required');
                return [];
            }
            
            try {
                // First check if we have a dedicated thread doc for this email
                const threadDoc = await db.collection('threads').doc(email).get();
                if (threadDoc.exists) {
                    const data = threadDoc.data();
                    const messages = Array.isArray(data.messages) ? [...data.messages] : [];
                    
                    // Debug the thread messages
                    console.log(`Retrieved ${messages.length} messages for thread ${email}`);
                    if (messages.length > 0) {
                        console.log('First message:', {
                            id: messages[0].id,
                            sender: messages[0].sender,
                            bodyLength: messages[0].body ? messages[0].body.length : 0,
                            bodyPreview: messages[0].body ? messages[0].body.substring(0, 30) : 'EMPTY'
                        });
                    }
                    
                    return messages;
                }
                
                // If no dedicated thread found, check if there are any messages in the messages collection
                // that match this email address - this helps restore older conversations
                console.log(`No thread document found for ${email}, checking messages collection`);
                const messagesSnapshot = await db.collection('messages')
                    .where('email', '==', email)
                    .orderBy('date', 'asc')
                    .get();
                    
                if (!messagesSnapshot.empty) {
                    // Convert the messages to thread format
                    const threadMessages = messagesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            sender: data.email || email,
                            name: data.from || 'User',
                            body: data.body || '',
                            date: data.date || new Date().toISOString()
                        };
                    });
                    
                    // Create a thread document for this user for future use
                    await db.collection('threads').doc(email).set({
                        messages: threadMessages,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        created: firebase.firestore.FieldValue.serverTimestamp(),
                        userEmail: email,
                        unread: false
                    });
                    
                    console.log(`Created new thread document for ${email} with ${threadMessages.length} messages from inbox`);
                    return threadMessages;
                }
                
                console.log(`No thread or messages found for ${email}`);
                return [];
            } catch (error) {
                console.error('Error getting thread:', error);
                return [];
            }
        },
        
        /**
         * Get thread messages (sync version)
         * @param {string} email Email identifier for the thread
         * @returns {Array} Thread messages or empty array
         */
        getThread(email) {
            // Store the active thread email in session storage for real-time updates
            if (email) {
                sessionStorage.setItem('activeThreadEmail', email);
            }
            
            // Debug
            console.log(`Getting thread for ${email}`);
            
            // First check if we have this thread cached
            const cachedThreadKey = `thread_${email}`;
            const cachedThread = sessionStorage.getItem(cachedThreadKey);
            if (cachedThread) {
                try {
                    const parsedThread = JSON.parse(cachedThread);
                    console.log(`Retrieved cached thread with ${parsedThread.length} messages`);
                    
                    // Also fetch fresh data asynchronously for next time
                    this.getThreadAsync(email).then(messages => {
                        try {
                            sessionStorage.setItem(cachedThreadKey, JSON.stringify(messages));
                        } catch (e) {
                            console.warn('Could not cache thread:', e);
                        }
                    }).catch(console.error);
                    
                    return parsedThread;
                } catch (e) {
                    console.warn('Error parsing cached thread:', e);
                    // Fall through to fetch fresh data
                }
            }
            
            // We don't have cached data, so fetch it now
            // This will be asynchronous so we'll return an empty array
            // but we'll cache the result for next time
            this.getThreadAsync(email)
                .then(messages => {
                    console.log(`Retrieved thread from Firestore with ${messages.length} messages`);
                    
                    // Cache the thread data for faster access
                    try {
                        sessionStorage.setItem(cachedThreadKey, JSON.stringify(messages));
                    } catch (e) {
                        console.warn('Could not cache thread:', e);
                    }
                    
                    // Dispatch event to notify UI
                    const evt = new CustomEvent('threadLoaded', { 
                        detail: { email, messages } 
                    });
                    w.dispatchEvent(evt);
                })
                .catch(err => {
                    console.error('Error getting thread:', err);
                });
            
            // Return empty array immediately - async update will come later
            return [];
        },
        
        /**
         * Get all active threads
         * @returns {Promise<Array>} Array of threads with summary information
         */
        async getAllThreadsAsync() {
            try {
                const snapshot = await db.collection('threads')
                    .orderBy('lastUpdated', 'desc')
                    .get();
                    
                return Promise.all(snapshot.docs.map(async doc => {
                    const data = doc.data();
                    const email = doc.id;
                    const messages = Array.isArray(data.messages) ? data.messages : [];
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                    
                    // Get online status
                    const statusDoc = await db.collection('online_status').doc(email).get();
                    const onlineStatus = statusDoc.exists ? statusDoc.data() : { online: false };
                    
                    return {
                        email,
                        name: lastMessage ? lastMessage.name : 'Unknown',
                        lastMessage,
                        messageCount: messages.length,
                        lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : new Date(),
                        isOnline: onlineStatus.online
                    };
                }));
            } catch (error) {
                console.error('Error getting all threads:', error);
                return [];
            }
        },
        
        
        /**
         * Send a message to a thread in Firestore
         * @param {string} email Recipient email
         * @param {string} name Recipient name
         * @param {string} body Message body
         * @param {string} from Sender email (default: admin@lafsys.gov)
         * @returns {Promise<Object>} The sent message
         */
        async sendAsync(email, name, body, from = 'admin@lafsys.gov') {
            try {
                // Ensure required parameters are present
                if (!email) {
                    console.error('Cannot send message: Email is required');
                    throw new Error('Email is required');
                }
                
                // Ensure body is a string and not null/undefined
                const messageBody = body || '';
                
                // Debug what we're sending
                console.log('Sending message:', {
                    email,
                    name,
                    bodyLength: messageBody.length,
                    body: messageBody.substring(0, 100),
                    from,
                    isAdmin: from === 'admin@lafsys.gov'
                });
                
                // Get current item information if available
                let itemInfo = '';
                const currentItemId = sessionStorage.getItem('currentItemId');
                const currentItemTitle = sessionStorage.getItem('currentItemTitle');
                if (currentItemId && currentItemTitle) {
                    itemInfo = `[Item: ${currentItemTitle} (ID: ${currentItemId})]`;
                }
                
                // Create message object with a consistent ID format across user/admin
                const now = Date.now();
                const randomSuffix = Math.random().toString(36).substring(2, 10);
                const msgId = `msg_${now}_${randomSuffix}`;
                
                const msg = {
                    id: msgId,  // Use consistent ID format
                    sender: from,
                    name: from === 'admin@lafsys.gov' ? 'Admin' : name,
                    body: messageBody, // Use sanitized body
                    date: new Date(now).toISOString(), // Use the same timestamp as the ID
                    itemId: currentItemId || null,
                    itemTitle: currentItemTitle || null,
                    timestamp: now // Numeric timestamp for easier comparisons
                };
                
                // Get a reference to the thread document
                const threadRef = db.collection('threads').doc(email);
                
                // Add a console log for debugging
                console.log(`Attempting to send message from ${from} to thread ${email}`);
                
                // For admin messages, bypass transaction and use direct set for better reliability
                if (from === 'admin@lafsys.gov') {
                    const threadDoc = await threadRef.get();
                    
                    if (threadDoc.exists) {
                        // Get existing messages
                        const threadData = threadDoc.data();
                        const messages = threadData.messages || [];
                        
                        // Add new message
                        messages.push(msg);
                        
                        // Update thread with new message
                        await threadRef.set({
                            messages: messages,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                            lastMessage: msg,
                            userName: name,
                            userEmail: email
                        }, { merge: true });
                        
                        console.log(`Admin message ${msgId} added to thread ${email} successfully using direct update`);
                    } else {
                        // Create new thread
                        await threadRef.set({
                            messages: [msg],
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                            created: firebase.firestore.FieldValue.serverTimestamp(),
                            lastMessage: msg,
                            userName: name,
                            userEmail: email
                        });
                        
                        console.log(`New thread created for ${email} with admin message ${msgId}`);
                    }
                } else {
                    // For user messages, use transaction as before
                    try {
                        // Use a transaction to ensure thread consistency
                        await firebase.firestore().runTransaction(async (transaction) => {
                        // Get the current thread data
                        const threadDoc = await transaction.get(threadRef);
                        
                        if (threadDoc.exists) {
                            // Update existing thread
                            const threadData = threadDoc.data();
                            const messages = threadData.messages || [];
                            
                            // Add the new message
                            messages.push(msg);
                            
                            // Update the thread
                            transaction.update(threadRef, {
                                messages: messages,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                                lastMessage: msg,
                                userName: name, // Store the latest user name
                                userEmail: email // Store the user email for reference
                            });
                        } else {
                            // Create new thread
                            transaction.set(threadRef, {
                                messages: [msg],
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                                created: firebase.firestore.FieldValue.serverTimestamp(),
                                lastMessage: msg,
                                userName: name,
                                userEmail: email,
                                unread: from !== 'admin@lafsys.gov' // Mark as unread if from user
                            });
                        }
                    });
                    
                    console.log(`Message ${msgId} added to thread ${email} successfully`);
                    } catch (txError) {
                        console.error('Transaction failed for user message:', txError);
                        // Fallback to regular update if transaction fails
                        const threadDoc = await threadRef.get();
                        
                        if (threadDoc.exists) {
                            // Update existing thread
                            await threadRef.update({
                                messages: firebase.firestore.FieldValue.arrayUnion(msg),
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                                lastMessage: msg,
                                userName: name,
                                userEmail: email
                            });
                        } else {
                            // Create new thread
                            await threadRef.set({
                                messages: [msg],
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                                created: firebase.firestore.FieldValue.serverTimestamp(),
                                lastMessage: msg,
                                userName: name,
                                userEmail: email,
                                unread: from !== 'admin@lafsys.gov'
                            });
                        }
                    }
                }
                
                // Always create an inbox message for user-initiated messages
                // This ensures all user messages appear in the admin inbox
                if (from !== 'admin@lafsys.gov') {
                    // Use the same ID format as the message
                    const messageId = msgId;
                    
                    // Ensure we have at least some basic user information for display
                    const displayName = name || 'Visitor';
                    const emailAddress = email || `visitor_${Date.now()}@example.com`;
                    
                    // Create subject with item info if available
                    let subjectText = itemInfo ? `${itemInfo} ` : '';
                    subjectText += body ? body.substring(0, 50) + (body.length > 50 ? '...' : '') : 'No subject';
                    
                    // Debug what's being saved
                    console.log('Creating new inbox message with:', {
                        id: messageId,
                        from: displayName,
                        email: emailAddress,
                        subject: subjectText,
                        bodyLength: body ? body.length : 0
                    });
                    
                    // Add to the inbox collection
                    await db.collection('messages').doc(messageId).set({
                        from: displayName,
                        email: emailAddress,
                        subject: subjectText,
                        body: body || 'Empty message',
                        date: new Date(now).toISOString(),
                        unread: true,
                        sender: from,
                        itemId: currentItemId || null,
                        itemTitle: currentItemTitle || null,
                        timestamp: now
                    });
                    
                    console.log('Created new inbox message with ID:', messageId);
                    
                    // Dispatch event for inbox listeners
                    const inboxEvent = new CustomEvent('messageAdded', { 
                        detail: { message: {
                            id: messageId,
                            from: displayName,
                            email: emailAddress,
                            subject: subjectText,
                            body: body || 'Empty message',
                            date: new Date(now).toISOString(),
                            unread: true
                        }}
                    });
                    w.dispatchEvent(inboxEvent);
                }
                
                // Dispatch thread update event
                const evt = new CustomEvent('threadUpdated', { 
                    detail: { 
                        email, 
                        message: msg,
                        isAdmin: from === 'admin@lafsys.gov'
                    } 
                });
                w.dispatchEvent(evt);
                
                // Special handling for admin messages to ensure notification to user
                if (from === 'admin@lafsys.gov') {
                    console.log('Dispatching admin message notification event');
                    // Create a special event just for admin messages
                    const adminMsgEvent = new CustomEvent('adminMessageReceived', {
                        detail: {
                            email,
                            message: msg,
                            timestamp: now
                        }
                    });
                    w.dispatchEvent(adminMsgEvent);
                    
                    // Also dispatch a generic event that various components can listen for
                    const notifyEvent = new CustomEvent('notifyUser', {
                        detail: {
                            type: 'adminMessage',
                            title: 'New Message from Admin',
                            body: messageBody.substring(0, 50) + (messageBody.length > 50 ? '...' : ''),
                            thread: email
                        }
                    });
                    w.dispatchEvent(notifyEvent);
                }
                
                return msg;
            } catch (error) {
                console.error('Error sending message:', error);
                throw error;
            }
        },
        
        /**
         * Send a message (synchronous version for compatibility)
         * @param {string} email Recipient email
         * @param {string} name Recipient name
         * @param {string} body Message body
         * @param {string} from Sender email
         * @returns {Object} Partial message object (id may be temporary)
         */
        send(email, name, body, from = 'admin@lafsys.gov') {
            const tempId = `temp_${Date.now()}`;
            this.sendAsync(email, name, body, from).catch(console.error);
            return {
                id: tempId,
                sender: from,
                name: from === 'admin@lafsys.gov' ? 'Admin' : name,
                body,
                date: new Date().toISOString()
            };
        },
        
        /**
         * Mark a message as read
         * @param {string} id Message ID
         * @returns {Promise<boolean>} Success status
         */
        async markAsReadAsync(id) {
            try {
                await db.collection('messages').doc(id).update({
                    unread: false
                });
                return true;
            } catch (error) {
                console.error('Error marking message as read:', error);
                return false;
            }
        },
        
        /**
         * Add a new message from a user
         * @param {Object} messageData The message data
         * @returns {Promise<string>} New message ID
         */
        async addNewMessageAsync(messageData) {
            try {
                // Ensure required fields
                const message = {
                    from: messageData.from || 'Anonymous',
                    email: messageData.email || 'anonymous@example.com',
                    subject: messageData.subject || 'No Subject',
                    body: messageData.body || '',
                    date: new Date().toISOString(),
                    unread: true
                };
                
                // Create a unique ID for better tracking
                const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Use set with document ID instead of add for more control
                await db.collection('messages').doc(messageId).set(message);
                
                console.log('Created new message with ID:', messageId);
                
                // Create a thread for this message if needed
                const threadRef = db.collection('threads').doc(message.email);
                const threadDoc = await threadRef.get();
                
                if (!threadDoc.exists) {
                    // Create new thread with this message
                    const threadMsg = {
                        id: `msg_${Date.now()}`,
                        sender: message.email,
                        name: message.from,
                        body: message.body,
                        date: message.date
                    };
                    
                    await threadRef.set({
                        messages: [threadMsg],
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('Created new thread for email:', message.email);
                }
                
                // Dispatch multiple events to ensure all listeners are notified
                const messageWithId = { ...message, id: messageId };
                
                // Dispatch messageAdded event for real-time updates
                const addedEvt = new CustomEvent('messageAdded', { 
                    detail: { message: messageWithId } 
                });
                w.dispatchEvent(addedEvt);
                
                // Also dispatch general update event for backward compatibility
                const updatedEvt = new CustomEvent('messagesUpdated', { 
                    detail: { type: 'add', id: messageId, message } 
                });
                w.dispatchEvent(updatedEvt);
                
                return messageId;
            } catch (error) {
                console.error('Error adding new message:', error);
                throw error;
            }
        }
    };
    
    // Set up real-time listeners for messages and threads
    function setupRealtimeListeners() {
        // Listen for new messages in inbox
        db.collection('messages').orderBy('date', 'desc')
            .onSnapshot(snapshot => {
                const changes = snapshot.docChanges();
                
                changes.forEach(change => {
                    const data = change.doc.data();
                    const messageWithId = { ...data, id: change.doc.id };
                    
                    if (change.type === 'added') {
                        const evt = new CustomEvent('messageAdded', { 
                            detail: { message: messageWithId } 
                        });
                        w.dispatchEvent(evt);
                        
                        // Play notification sound for new messages
                        if (data.unread && data.sender !== 'admin@lafsys.gov') {
                            playNotificationSound();
                        }
                    } else if (change.type === 'modified') {
                        const evt = new CustomEvent('messageModified', { 
                            detail: { message: messageWithId } 
                        });
                        w.dispatchEvent(evt);
                    } else if (change.type === 'removed') {
                        const evt = new CustomEvent('messageRemoved', { 
                            detail: { id: change.doc.id } 
                        });
                        w.dispatchEvent(evt);
                    }
                });
                
                // Also dispatch a general update event
                if (changes.length > 0) {
                    const evt = new CustomEvent('messagesChanged', {
                        detail: { changes: changes.map(c => ({ 
                            type: c.type, 
                            id: c.doc.id, 
                            data: c.doc.data() 
                        })) }
                    });
                    w.dispatchEvent(evt);
                }
            }, error => {
                console.error('Error in messages listener:', error);
            });
            
        // Listen for changes to individual chat threads
        setupThreadListeners();
        
        // Set up online status tracking
        setupOnlineStatusTracking();
    }
    
    // Setup listeners for individual threads
    function setupThreadListeners() {
        // Listen for active thread if one is specified in the URL or session
        const urlParams = new URLSearchParams(window.location.search);
        const activeEmail = urlParams.get('email') || sessionStorage.getItem('activeThreadEmail');
        
        if (activeEmail) {
            // Listen for changes to this specific thread
            const threadListener = db.collection('threads').doc(activeEmail)
                .onSnapshot(doc => {
                    if (doc.exists) {
                        const threadData = doc.data();
                        if (threadData && Array.isArray(threadData.messages)) {
                            // Dispatch event with the updated thread
                            const evt = new CustomEvent('threadUpdated', { 
                                detail: { 
                                    email: activeEmail,
                                    messages: threadData.messages,
                                    lastMessage: threadData.messages[threadData.messages.length - 1]
                                } 
                            });
                            w.dispatchEvent(evt);
                            
                            // Play notification sound for new messages
                            const lastMessage = threadData.messages[threadData.messages.length - 1];
                            if (lastMessage && lastMessage.sender !== 'admin@lafsys.gov') {
                                // Check if we're on the admin side
                                const isAdmin = window.location.href.includes('admin.html') || 
                                               window.location.href.includes('chat.html');
                                               
                                // Only play sound for admin if message is from user
                                if (isAdmin && lastMessage.sender !== 'admin@lafsys.gov') {
                                    playNotificationSound();
                                }
                                
                                // Only play sound for user if message is from admin
                                if (!isAdmin && lastMessage.sender === 'admin@lafsys.gov') {
                                    playNotificationSound();
                                }
                            }
                        }
                    }
                }, error => {
                    console.error('Error in thread listener:', error);
                });
                
            // Store the listener to unsubscribe later if needed
            w.activeThreadListener = threadListener;
        }
    }
    
    // Function to handle online status tracking
    function setupOnlineStatusTracking() {
        // Get a reference to the online status collection
        const onlineRef = db.collection('online_status');
        
        // Determine if we're on admin or user side
        const isAdmin = window.location.href.includes('admin.html') || 
                       window.location.href.includes('chat.html');
        
        // Get URL parameters if any
        const urlParams = new URLSearchParams(window.location.search);
        
        // Get user identifier (email for users, 'admin' for admin)
        let userId = 'admin';
        if (!isAdmin) {
            userId = sessionStorage.getItem('userEmail') || 
                    urlParams.get('email') || 
                    `user_${Date.now()}`;
        }
        
        // Create a reference to this user's online status
        const userStatusRef = onlineRef.doc(userId);
        
        // Set user as online when they connect
        const setOnlineStatus = async () => {
            try {
                await userStatusRef.set({
                    online: true,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    displayName: isAdmin ? 'Admin Staff' : (sessionStorage.getItem('userName') || 'Visitor')
                });
                console.log('Online status set to online');
            } catch (error) {
                console.error('Error setting online status:', error);
            }
        };
        
        // Set user as offline when they disconnect
        const setOfflineStatus = async () => {
            try {
                await userStatusRef.update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Online status set to offline');
            } catch (error) {
                console.error('Error setting offline status:', error);
            }
        };
        
        // Call setOnlineStatus when the page loads
        setOnlineStatus();
        
        // Set up event listeners for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setOnlineStatus();
            } else {
                setOfflineStatus();
            }
        });
        
        // Set up event listener for page unload
        window.addEventListener('beforeunload', () => {
            setOfflineStatus();
        });
        
        // Setup a cleanup function
        w.cleanupOnlineStatus = setOfflineStatus;
    }
    
    // Helper function to play notification sound
    function playNotificationSound() {
        try {
            // Use a relative path that works in various deployment environments
            const notificationSound = new Audio('sounds/notification.mp3');
            notificationSound.volume = 0.5;
            notificationSound.play().catch(err => console.log('Could not play notification sound:', err));
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }
    
    // Initialize the system
    async function init() {
        console.log('Initializing Firebase Messages system...');
        try {
            // Force creation of demo data - this is critical for the system to work
            console.log('Creating demo data...');
            await checkAndCreateDemoData();
            
            // Setup real-time listeners for messages and threads
            console.log('Setting up real-time listeners...');
            setupRealtimeListeners();
            
            // Setup demo sound notification if needed
            try {
                console.log('Checking notification sound...');
                // Load the notification sound to verify it exists
                const notificationSound = new Audio('sounds/notification.mp3');
                notificationSound.load();
            } catch (e) {
                console.log('Sound setup not required or failed:', e);
            }
            
            console.log('Firebase Messages system initialized successfully');
            
            // Dispatch an event to notify the system is ready
            const readyEvent = new CustomEvent('firebaseMessagesReady');
            w.dispatchEvent(readyEvent);
            
            // Also check if we have any messages and dispatch the event
            const messages = await FirebaseMessagesStore.getAllAsync();
            const loadedEvent = new CustomEvent('messagesLoaded', { detail: { messages } });
            w.dispatchEvent(loadedEvent);
            
        } catch (error) {
            console.error('Failed to initialize Firebase Messages system:', error);
            // Try to recover by at least setting up the store
            setupRealtimeListeners();
        }
    }
    
    // Replace or extend the original MessagesStore
    if (w.MessagesStore) {
        console.log('Extending existing MessagesStore with Firebase functionality');
        // Add Firebase methods to existing store
        Object.assign(w.MessagesStore, FirebaseMessagesStore);
    } else {
        console.log('Creating new Firebase MessagesStore');
        w.MessagesStore = FirebaseMessagesStore;
    }
    
    // Add utility functions to MessagesStore
    w.MessagesStore.playNotificationSound = playNotificationSound;
    
    // Expose initialization function to global scope so it can be called from other scripts
    w.initFirebaseMessages = function() {
        console.log('Manual initialization of Firebase Messages requested');
        return init();
    };
    
    // Initialize automatically
    init();
})();
