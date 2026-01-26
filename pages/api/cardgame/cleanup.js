import { db } from '../../../src/lib/firebase';
import { ensureAuthenticated } from '../../../src/lib/serverAuth';
import { collection, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        await ensureAuthenticated();

        const gamesRef = collection(db, 'cardGames');
        const snapshot = await getDocs(gamesRef);

        const now = new Date();
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const ONE_HOUR_MS = 60 * 60 * 1000;

        let deletedCount = 0;

        const cleanupPromises = snapshot.docs.map(async (docSnap) => {
            const game = docSnap.data();
            const createdAt = game.createdAt ? game.createdAt.toDate() : new Date(0); // Default to old if missing
            const age = now - createdAt;

            let shouldDelete = false;

            // Rule 1: Delete any game older than 24 hours
            if (age > ONE_DAY_MS) {
                shouldDelete = true;
            }

            // Rule 2: Delete "waiting" games older than 1 hour
            if (game.gameState === 'waiting' && age > ONE_HOUR_MS) {
                shouldDelete = true;
            }

            // Rule 3: Delete games with no players (if not just created)
            // Give a 1 minute grace period for creation
            if ((!game.players || game.players.length === 0) && age > 60000) {
                shouldDelete = true;
            }

            if (shouldDelete) {
                await deleteDoc(doc(db, 'cardGames', docSnap.id));
                deletedCount++;
            }
        });

        await Promise.all(cleanupPromises);

        return res.status(200).json({ success: true, deletedCount });
    } catch (error) {
        console.error("Cleanup error:", error);
        return res.status(500).json({ message: 'Cleanup failed', error: error.message });
    }
}
