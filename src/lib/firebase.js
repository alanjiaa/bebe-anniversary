// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
} catch (error) {
  console.error('Error enabling persistence:', error);
}

//const analytics = getAnalytics(app);
export { auth, app, db };