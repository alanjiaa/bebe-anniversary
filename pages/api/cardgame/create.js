import { db } from '../../../src/lib/firebase';
import { ensureAuthenticated } from '../../../src/lib/serverAuth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await ensureAuthenticated();

        const { betAmount, createdBy } = req.body;

        if (!createdBy) {
            return res.status(400).json({ message: 'User ID required' });
        }

        const gameData = {
            players: [{
                id: createdBy.uid,
                name: createdBy.displayName || createdBy.email.split('@')[0],
                ready: false,
                hand: []
            }],
            gameState: 'waiting',
            currentTurn: null,
            betAmount: Number(betAmount) || 1,
            createdAt: serverTimestamp(),
            deck: [],
            lastPlay: null,
            passes: 0,
            hostId: createdBy.uid,
            winner: null
        };

        const docRef = await addDoc(collection(db, 'cardGames'), gameData);

        return res.status(200).json({ gameId: docRef.id });
    } catch (error) {
        console.error("Create game error:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
