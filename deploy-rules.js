const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCCVxp1rwr3IyQWwrjQLtEoC_NnDVlFzYY",
  authDomain: "bebe-app-f4bb8.firebaseapp.com",
  projectId: "bebe-app-f4bb8",
  storageBucket: "bebe-app-f4bb8.firebasestorage.app",
  messagingSenderId: "744004885869",
  appId: "1:744004885869:web:9a89096b89ac6daf790e64",
  measurementId: "G-5ME2MQ61TQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase initialized successfully!');
console.log('To deploy Firestore rules, run:');
console.log('firebase deploy --only firestore:rules');
