import { db } from '../../../src/lib/firebase';
import { ensureAuthenticated } from '../../../src/lib/serverAuth';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await ensureAuthenticated();
        const { gameId, userId } = req.body;

        if (!gameId || !userId) {
            return res.status(400).json({ message: 'Missing gameId or userId' });
        }

        const gameRef = doc(db, 'cardGames', gameId);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
            // already gone
            return res.status(200).json({ success: true });
        }

        const gameData = gameSnap.data();
        const updatedPlayers = gameData.players.filter(p => p.id !== userId);

        if (updatedPlayers.length === 0) {
            await deleteDoc(gameRef);
        } else {
            let updates = { players: updatedPlayers };

            // If host left, assign new host
            if (gameData.hostId === userId && updatedPlayers.length > 0) {
                updates.hostId = updatedPlayers[0].id;
            }

            // If playing and current turn left?
            if (gameData.gameState === 'playing' && gameData.currentTurn === userId) {
                // Pass turn to next
                updates.currentTurn = updatedPlayers[0].id; // Simplified fallback
            }

            await updateDoc(gameRef, updates);
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Leave game error:", error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
