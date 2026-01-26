// Ensure Firebase is properly initialized
document.addEventListener('DOMContentLoaded', () => {
    console.log('Checking Firebase configuration...');
    
    // Only initialize if not already initialized
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
        console.log('Firebase not initialized. Attempting to initialize with default config...');
        try {
            // Use the same Firebase configuration as item-init.js
            const firebaseConfig = {
                apiKey: "AIzaSyBGH1-fruNM0GPOLpOjfOIxHpLgqzt8fe0",
                authDomain: "lafsys.firebaseapp.com",
                projectId: "lafsys",
                storageBucket: "lafsys.appspot.com",
                messagingSenderId: "103945210522",
                appId: "1:103945210522:web:f5a51c84653a0cab10ed23",
                measurementId: "G-EJ2X0PTDNH"
            };
            
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized successfully with project: lafsys');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
        }
    } else {
        console.log('Firebase is already initialized');
    }
    
    // Verify Firestore is available
    if (firebase.firestore) {
        console.log('Firestore is available');
        
        // Test connection to verify permissions
        firebase.firestore().collection('system_info').doc('connection_test').set({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            message: 'Connection test'
        })
        .then(() => {
            console.log('Firestore write test successful!');
        })
        .catch((error) => {
            console.error('Firestore write test failed:', error);
            
            // Check if it's a permissions error
            if (error.code === 'permission-denied') {
                console.log('Permission denied. This could be due to Firestore rules.');
                
                // Create alert about permissions
                const permissionAlert = document.createElement('div');
                permissionAlert.style.position = 'fixed';
                permissionAlert.style.bottom = '10px';
                permissionAlert.style.left = '10px';
                permissionAlert.style.right = '10px';
                permissionAlert.style.padding = '15px';
                permissionAlert.style.background = 'rgba(239, 68, 68, 0.9)';
                permissionAlert.style.color = 'white';
                permissionAlert.style.borderRadius = '5px';
                permissionAlert.style.zIndex = '9999';
                permissionAlert.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                permissionAlert.innerHTML = `
                    <strong>Firebase Permission Error</strong>
                    <p>Cannot access Firestore database. Please check your Firebase rules and make sure you're signed in with an account that has admin permissions.</p>
                    <button id="dismiss-perm-alert" style="background:white; color:black; border:none; padding:5px 10px; border-radius:3px; margin-top:5px; cursor:pointer;">Dismiss</button>
                `;
                document.body.appendChild(permissionAlert);
                
                document.getElementById('dismiss-perm-alert').addEventListener('click', () => {
                    permissionAlert.remove();
                });
            }
        });
    } else {
        console.error('Firestore is not available!');
    }
});
