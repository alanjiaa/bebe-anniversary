// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from 'firebase/auth'
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Note: Persistence is now handled automatically by Firestore v9+
// No need to manually enable it

//const analytics = getAnalytics(app);
export { auth, app, db, storage };