import { auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';

let isSignedIn = false;

export async function ensureAuthenticated() {
    if (auth.currentUser) return auth.currentUser;

    try {
        const userCredential = await signInAnonymously(auth);
        isSignedIn = true;
        return userCredential.user;
    } catch (error) {
        console.error("Server anonymous auth failed:", error);
        throw error;
    }
}
