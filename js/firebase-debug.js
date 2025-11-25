// Firebase Debug Helper

// This function tests the Firebase connection and services
async function testFirebaseConnection() {
    try {
        console.log('Testing Firebase connection...');
        
        // Check if Firebase is initialized
        if (!window.firebase) {
            throw new Error('Firebase is not initialized or not loaded properly');
        }
        
        console.log('Firebase SDK is available');
        
        // Check Firestore
        try {
            const db = firebase.firestore();
            const testDoc = await db.collection('test').doc('connection-test').set({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                testValue: 'Testing connection at ' + new Date().toString()
            });
            console.log('Firestore write test successful:', testDoc);
            
            const readTest = await db.collection('test').doc('connection-test').get();
            console.log('Firestore read test successful:', readTest.exists ? 'Document exists' : 'Document does not exist');
            
        } catch (firestoreError) {
            console.error('Firestore test failed:', firestoreError);
            throw new Error('Firestore Error: ' + firestoreError.message);
        }
        
        // Check Storage
        try {
            const storage = firebase.storage();
            const testRef = storage.ref('test/connection-test.txt');
            const testBlob = new Blob(['Testing storage connection'], {type: 'text/plain'});
            
            const uploadTask = await testRef.put(testBlob);
            console.log('Storage upload test successful:', uploadTask);
            
            const downloadURL = await testRef.getDownloadURL();
            console.log('Storage download URL test successful:', downloadURL);
            
        } catch (storageError) {
            console.error('Storage test failed:', storageError);
            throw new Error('Storage Error: ' + storageError.message);
        }
        
        return {
            success: true,
            message: 'Firebase connection tests passed successfully'
        };
        
    } catch (error) {
        console.error('Firebase connection test failed:', error);
        return {
            success: false,
            message: error.message,
            error: error
        };
    }
}

// Function to check Firebase configuration
function checkFirebaseConfig(config) {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        if (!config[field]) {
            missingFields.push(field);
        }
    });
    
    if (missingFields.length > 0) {
        console.error('Firebase config is missing required fields:', missingFields);
        return {
            isValid: false,
            missingFields: missingFields,
            message: 'Firebase config is missing required fields: ' + missingFields.join(', ')
        };
    }
    
    // Check for common storage bucket format issues
    if (config.storageBucket && !config.storageBucket.includes('.appspot.com')) {
        console.warn('Storage bucket may be incorrectly formatted. Expected format: projectId.appspot.com');
    }
    
    return {
        isValid: true,
        message: 'Firebase config appears valid'
    };
}

// Export functions
window.firebaseDebug = {
    testConnection: testFirebaseConnection,
    checkConfig: checkFirebaseConfig
};
