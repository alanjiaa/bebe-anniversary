import { db } from '../../../src/lib/firebase';
import { ensureAuthenticated } from '../../../src/lib/serverAuth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await ensureAuthenticated();

        const { gameId, user } = req.body;

        if (!gameId || !user) {
            return res.status(400).json({ message: 'Missing gameId or user data' });
        }

        const gameRef = doc(db, 'cardGames', gameId);
        // Use transaction? Or just get/update for simplicity since we don't have high concurrency
        // A transaction is safer for "joining" to prevent overfilling.
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const game = gameSnap.data();

        if (game.gameState !== 'waiting') {
            return res.status(400).json({ message: 'Game already started' });
        }

        if (game.players.length >= 4) {
            return res.status(400).json({ message: 'Game is full' });
        }

        if (game.players.some(p => p.id === user.uid)) {
            return res.status(400).json({ message: 'Already in game' });
        }

        const newPlayer = {
            id: user.uid,
            name: user.displayName || user.email.split('@')[0],
            ready: false,
            hand: []
        };

        await updateDoc(gameRef, {
            players: [...game.players, newPlayer]
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Join game error:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
