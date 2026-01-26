const { createServer } = require('http')
const { Server } = require('socket.io')
const { initializeApp } = require('firebase/app')
const { getAuth, signInAnonymously } = require('firebase/auth')
const {
  getFirestore, doc, onSnapshot, setDoc, updateDoc,
  collection, serverTimestamp, deleteDoc, getDoc, getDocs
} = require('firebase/firestore')
const {
  createDeck, shuffleDeck, dealCards, isValidCombination,
  canBeat, CARD_VALUES
} = require('./src/utils/cardLogic')

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCCVxp1rwr3IyQWwrjQLtEoC_NnDVlFzYY",
  authDomain: "bebe-app-f4bb8.firebaseapp.com",
  projectId: "bebe-app-f4bb8",
  storageBucket: "bebe-app-f4bb8.firebasestorage.app",
  messagingSenderId: "744004885869",
  appId: "1:744004885869:web:9a89096b89ac6daf790e64",
  measurementId: "G-5ME2MQ61TQ"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Authenticate server anonymously to allow database writes
signInAnonymously(auth).then(() => {
  console.log('Server authenticated anonymously for Firestore access')
}).catch(error => {
  console.error('Server authentication failed:', error)
})

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ["https://bebe-anniversary.vercel.app", "https://www.bebe-anniversary.vercel.app"]
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Store active games and players
const connectedPlayers = new Map() // socketId -> { userId, displayName }

// Add health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      onlinePlayers: connectedPlayers.size
    }))
  }
})

// Cleanup stale games on startup
const cleanupStaleGames = async () => {
  try {
    console.log('Cleaning up stale games...')
    const gamesRef = collection(db, 'cardGames')
    const snapshot = await getDocs(gamesRef)
    const now = Date.now()
    let count = 0
    snapshot.forEach(async (docSnap) => {
      const data = docSnap.data()
      if (!data.createdAt) {
        await deleteDoc(docSnap.ref)
        count++
      } else {
        const created = data.createdAt.toDate ? data.createdAt.toDate().getTime() : 0
        if (now - created > 24 * 60 * 60 * 1000) {
          await deleteDoc(docSnap.ref)
          count++
        }
      }
    })
    console.log(`Cleaned up ${count} stale games.`)
  } catch (e) {
    console.error('Error cleaning up games:', e)
  }
}
// Run cleanup after a short delay to ensure auth is done
setTimeout(cleanupStaleGames, 2000)

// Broadcast online player count
const broadcastOnlinePlayers = () => {
  const unique = new Set()
  connectedPlayers.forEach(p => unique.add(p.userId))
  io.emit('onlinePlayersUpdate', { count: unique.size })
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  const userId = socket.handshake.auth.userId
  const displayName = socket.handshake.auth.displayName

  if (userId) {
    connectedPlayers.set(socket.id, { userId, displayName })
    broadcastOnlinePlayers()
  }

  // Handle getting online player count
  socket.on('getOnlinePlayers', () => {
    const unique = new Set()
    connectedPlayers.forEach(p => unique.add(p.userId))
    socket.emit('onlinePlayersUpdate', { count: unique.size })
  })

  // createGame
  socket.on('createGame', async ({ betAmount }) => {
    try {
      if (!userId) return

      const gameRef = doc(collection(db, 'cardGames'))
      const gameId = gameRef.id

      const gameData = {
        id: gameId,
        players: [{
          id: userId,
          name: displayName,
          hand: [],
          ready: false,
          passed: false
        }],
        gameState: 'waiting',
        currentPlayer: null,
        lastPlay: null,
        betAmount,
        createdAt: serverTimestamp(),
        winner: null
      }

      await setDoc(gameRef, gameData)
      socket.join(`game:${gameId}`)
      socket.emit('gameCreated', { gameId })
    } catch (e) {
      console.error("Error creating game:", e)
      socket.emit('error', { message: 'Failed to create game' })
    }
  })

  // joinGame
  socket.on('joinGame', async ({ gameId }) => {
    try {
      if (!userId) return

      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      const gameData = gameSnap.data()

      if (gameData.gameState !== 'waiting') {
        socket.emit('error', { message: 'Game already started' })
        return
      }
      if (gameData.players.length >= 4) {
        socket.emit('error', { message: 'Game is full' })
        return
      }
      if (gameData.players.some(p => p.id === userId)) {
        socket.join(`game:${gameId}`)
        return
      }

      const newPlayer = {
        id: userId,
        name: displayName,
        hand: [],
        ready: false,
        passed: false
      }

      await updateDoc(gameRef, {
        players: [...gameData.players, newPlayer]
      })

      socket.join(`game:${gameId}`)
    } catch (e) {
      console.error("Error joining game:", e)
      socket.emit('error', { message: 'Failed to join game' })
    }
  })

  // leaveGame
  socket.on('leaveGame', async ({ gameId }) => {
    try {
      if (!userId) return
      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) return

      const gameData = gameSnap.data()
      const updatedPlayers = gameData.players.filter(p => p.id !== userId)

      if (updatedPlayers.length === 0) {
        await deleteDoc(gameRef)
      } else {
        await updateDoc(gameRef, { players: updatedPlayers })
      }
      socket.leave(`game:${gameId}`)
    } catch (e) {
      console.error("Error leaving game:", e)
    }
  })

  // toggleReady
  socket.on('toggleReady', async ({ gameId }) => {
    try {
      if (!userId) return
      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) return

      const gameData = gameSnap.data()
      const updatedPlayers = gameData.players.map(p => {
        if (p.id === userId) return { ...p, ready: !p.ready }
        return p
      })

      await updateDoc(gameRef, { players: updatedPlayers })
    } catch (e) { console.error(e) }
  })

  // startGame
  socket.on('startGame', async ({ gameId }) => {
    try {
      if (!userId) return
      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) return

      const gameData = gameSnap.data()
      if (gameData.players.length < 2) return
      if (gameData.players.some(p => !p.ready)) return

      const numPlayers = gameData.players.length
      const numDecks = numPlayers <= 2 ? 1 : 2
      const deck = shuffleDeck(createDeck(numDecks))

      const hands = Array(numPlayers).fill().map(() => [])
      const cardsPerPlayer = Math.floor(deck.length / numPlayers)
      for (let i = 0; i < deck.length; i++) {
        const playerIndex = i % numPlayers
        if (hands[playerIndex].length < cardsPerPlayer) {
          hands[playerIndex].push(deck[i])
        }
      }

      hands.forEach(hand => {
        hand.sort((a, b) => CARD_VALUES.indexOf(a.value) - CARD_VALUES.indexOf(b.value))
      })

      const updatedPlayers = gameData.players.map((p, i) => ({
        ...p,
        hand: hands[i],
        passed: false
      }))

      let startIdx = 0
      let found3D = false
      updatedPlayers.forEach((p, idx) => {
        if (p.hand.some(c => c.value === '3' && c.suit === '♦')) {
          startIdx = idx
          found3D = true
        }
      })
      if (!found3D) startIdx = Math.floor(Math.random() * numPlayers)

      await updateDoc(gameRef, {
        players: updatedPlayers,
        gameState: 'playing',
        currentPlayer: updatedPlayers[startIdx].id,
        lastPlay: null,
        deck: []
      })

      io.to(`game:${gameId}`).emit('gameStarted')

    } catch (e) { console.error(e) }
  })

  // playCards
  socket.on('playCards', async ({ gameId, cards }) => {
    try {
      if (!userId) return
      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) return

      const gameData = gameSnap.data()

      if (gameData.currentPlayer !== userId) return

      const player = gameData.players.find(p => p.id === userId)
      const hasCards = cards.every(c => player.hand.some(h => h.id === c.id))
      if (!hasCards) {
        socket.emit('error', { message: "You don't have these cards" })
        return
      }

      if (!isValidCombination(cards)) {
        socket.emit('error', { message: "Invalid combination" })
        return
      }

      if (gameData.lastPlay) {
        if (!canBeat(cards, gameData.lastPlay.cards)) {
          socket.emit('error', { message: "Your play doesn't beat the last hand" })
          return
        }
      }

      const newHand = player.hand.filter(h => !cards.some(c => c.id === h.id))

      if (newHand.length === 0) {
        const updatedPlayers = gameData.players.map(p => {
          if (p.id === userId) return { ...p, hand: newHand }
          return p
        })
        await updateDoc(gameRef, {
          players: updatedPlayers,
          currentPlayer: null,
          lastPlay: { playerId: userId, playerName: displayName, cards },
          gameState: 'finished',
          winner: userId
        })
        return
      }

      const players = gameData.players
      const currIdx = players.findIndex(p => p.id === userId)
      let nextIdx = (currIdx + 1) % players.length

      const updatedPlayers = players.map(p => {
        if (p.id === userId) return { ...p, hand: newHand, passed: false }
        return { ...p, passed: false }
      })

      await updateDoc(gameRef, {
        players: updatedPlayers,
        currentPlayer: players[nextIdx].id,
        lastPlay: { playerId: userId, playerName: displayName, cards }
      })

    } catch (e) { console.error(e) }
  })

  // pass
  socket.on('pass', async ({ gameId }) => {
    try {
      if (!userId) return
      const gameRef = doc(db, 'cardGames', gameId)
      const gameSnap = await getDoc(gameRef)
      if (!gameSnap.exists()) return

      const gameData = gameSnap.data()
      if (gameData.currentPlayer !== userId) return

      if (!gameData.lastPlay || (gameData.lastPlay.playerId === userId)) {
        socket.emit('error', { message: "You cannot pass when you are in lead" })
        return
      }

      const players = gameData.players
      const currIdx = players.findIndex(p => p.id === userId)

      const updatedPlayers = players.map((p, i) => {
        if (i === currIdx) return { ...p, passed: true }
        return p
      })

      let nextIdx = (currIdx + 1) % players.length
      const lastPlayOwnerId = gameData.lastPlay.playerId

      if (players[nextIdx].id === lastPlayOwnerId) {
        const resetPlayers = updatedPlayers.map(p => ({ ...p, passed: false }))
        await updateDoc(gameRef, {
          players: resetPlayers,
          currentPlayer: lastPlayOwnerId,
          lastPlay: null
        })
      } else {
        await updateDoc(gameRef, {
          players: updatedPlayers,
          currentPlayer: players[nextIdx].id
        })
      }

    } catch (e) { console.error(e) }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    connectedPlayers.delete(socket.id)
    broadcastOnlinePlayers()
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
  console.log(`Server URL: ${process.env.RAILWAY_STATIC_URL || 'http://localhost:' + PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
