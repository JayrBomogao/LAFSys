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
    
    // Check if we need to create demo data (first-time setup)
    async function checkAndCreateDemoData() {
        try {
            // Check if messages collection exists and has documents
            const messagesSnapshot = await db.collection('messages').limit(1).get();
            if (messagesSnapshot.empty) {
                console.log('Creating demo messages data...');
                
                // Create demo messages
                const demoMessages = [
                    { 
                        id: 'demo1', 
                        from: 'John Doe', 
                        email: 'john@example.com', 
                        subject: 'Inquiry about black wallet', 
                        body: 'Hi, I might have lost a black leather wallet near Burnham Park last Sunday. Does it match any item you found?', 
                        date: new Date().toISOString(),
                        unread: true
                    },
                    { 
                        id: 'demo2', 
                        from: 'Jane Smith', 
                        email: 'jane@example.com', 
                        subject: 'Lost phone claim', 
                        body: 'I think the iPhone listed on your site is mine. It has a cracked back and a blue case.', 
                        date: new Date(Date.now() - 86400000).toISOString(),
                        unread: true
                    }
                ];
                
                // Add messages to Firestore
                for (const message of demoMessages) {
                    await db.collection('messages').doc(message.id).set(message);
                }
                
                // Create demo threads
                await createDemoThread('john@example.com', 'John Doe', 'Inquiry about black wallet', 
                    'Hi, I might have lost a black leather wallet near Burnham Park last Sunday. Does it match any item you found?');
                
                await createDemoThread('jane@example.com', 'Jane Smith', 'Lost phone claim', 
                    'I think the iPhone listed on your site is mine. It has a cracked back and a blue case.');
                
                console.log('Demo data created successfully');
            }
        } catch (error) {
            console.error('Error checking/creating demo data:', error);
        }
    }
    
    // Helper to create a demo chat thread
    async function createDemoThread(email, name, subject, body) {
        const threadRef = db.collection('threads').doc(email);
        const now = Date.now();
        
        const threadData = [
            { 
                id: `msg_${now - 7200000}`, 
                sender: email, 
                name, 
                body, 
                date: new Date(now - 7200000).toISOString() 
            },
            { 
                id: `msg_${now - 3600000}`, 
                sender: 'admin@lafsys.gov', 
                name: 'Admin', 
                body: `Hi ${name.split(' ')[0]}, thanks for reaching out. Could you share more identifying details?`, 
                date: new Date(now - 3600000).toISOString() 
            }
        ];
        
        await threadRef.set({ messages: threadData });
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
            try {
                const threadDoc = await db.collection('threads').doc(email).get();
                if (threadDoc.exists) {
                    const data = threadDoc.data();
                    return Array.isArray(data.messages) ? [...data.messages] : [];
                }
                return [];
            } catch (error) {
                console.error('Error getting thread:', error);
                return [];
            }
        },
        
        /**
         * Get a chat thread (synchronous version for compatibility)
         * @param {string} email Email identifier for the thread
         * @returns {Array} Empty array initially
         */
        getThread(email, callback) {
            this.getThreadAsync(email).then(messages => {
                if (callback && typeof callback === 'function') {
                    callback(messages);
                }
            });
            return []; // Return empty array immediately for compatibility
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
                const msg = {
                    id: `msg_${Date.now()}`,
                    sender: from,
                    name: from === 'admin@lafsys.gov' ? 'Admin' : name,
                    body,
                    date: new Date().toISOString()
                };
                
                const threadRef = db.collection('threads').doc(email);
                const threadDoc = await threadRef.get();
                
                if (threadDoc.exists) {
                    // Update existing thread
                    await threadRef.update({
                        messages: firebase.firestore.FieldValue.arrayUnion(msg),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Create new thread
                    await threadRef.set({
                        messages: [msg],
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Also create an inbox message if this is a new thread from a user
                    if (from !== 'admin@lafsys.gov') {
                        await db.collection('messages').add({
                            from: name || 'User',
                            email: email,
                            subject: body.substring(0, 50) + (body.length > 50 ? '...' : ''),
                            body: body,
                            date: new Date().toISOString(),
                            unread: true
                        });
                    }
                }
                
                const evt = new CustomEvent('threadUpdated', { detail: { email, message: msg } });
                w.dispatchEvent(evt);
                
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
                
                const docRef = await db.collection('messages').add(message);
                
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
                }
                
                const evt = new CustomEvent('messagesUpdated', { 
                    detail: { type: 'add', id: docRef.id, message } 
                });
                w.dispatchEvent(evt);
                
                return docRef.id;
            } catch (error) {
                console.error('Error adding new message:', error);
                throw error;
            }
        }
    };
    
    // Set up real-time listeners for messages and threads
    function setupRealtimeListeners() {
        // Listen for new messages
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
    }
    
    // Initialize the system
    async function init() {
        console.log('Initializing Firebase Messages system...');
        try {
            await checkAndCreateDemoData();
            setupRealtimeListeners();
            console.log('Firebase Messages system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase Messages system:', error);
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
    
    // Initialize
    init();
})();
