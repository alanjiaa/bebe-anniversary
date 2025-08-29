const { createServer } = require('http')
const { Server } = require('socket.io')
const { initializeApp } = require('firebase/app')
const { getFirestore, doc, onSnapshot } = require('firebase/firestore')

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
const db = getFirestore(app)

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://bebe-anniversary.vercel.app", "https://www.bebe-anniversary.vercel.app"] // Your Vercel domain
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
})

// Store active games and players
const activeGames = new Map()
const connectedPlayers = new Map()

// Function to broadcast online player count to all clients
const broadcastOnlinePlayers = () => {
  const count = connectedPlayers.size
  io.emit('onlinePlayersUpdate', { count })
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  
  const userId = socket.handshake.auth.userId
  const displayName = socket.handshake.auth.displayName
  
  if (userId) {
    connectedPlayers.set(socket.id, { userId, displayName })
    // Broadcast updated count to all clients
    broadcastOnlinePlayers()
  }

  // Handle getting online player count
  socket.on('getOnlinePlayers', () => {
    const count = connectedPlayers.size
    socket.emit('onlinePlayersUpdate', { count })
  })

  // Handle game creation
  socket.on('createGame', ({ gameId, betAmount }) => {
    console.log('Game created:', gameId)
    activeGames.set(gameId, {
      players: new Set([socket.id]),
      betAmount
    })
    
    // Listen to Firestore changes for this game
    const gameRef = doc(db, 'cardGames', gameId)
    onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = doc.data()
        socket.emit('gameUpdate', gameData)
        
        // Broadcast to all players in the game
        const game = activeGames.get(gameId)
        if (game) {
          game.players.forEach(playerSocketId => {
            const playerSocket = io.sockets.sockets.get(playerSocketId)
            if (playerSocket) {
              playerSocket.emit('gameUpdate', gameData)
            }
          })
        }
      }
    })
  })

  // Handle joining a game
  socket.on('joinGame', ({ gameId }) => {
    console.log('Player joining game:', gameId)
    
    const game = activeGames.get(gameId)
    if (game) {
      game.players.add(socket.id)
      
      // Notify other players
      game.players.forEach(playerSocketId => {
        if (playerSocketId !== socket.id) {
          const playerSocket = io.sockets.sockets.get(playerSocketId)
          if (playerSocket) {
            playerSocket.emit('playerJoined', { 
              playerName: displayName 
            })
          }
        }
      })
    }
  })

  // Handle game start
  socket.on('startGame', ({ gameId }) => {
    console.log('Game started:', gameId)
    const game = activeGames.get(gameId)
    if (game) {
      game.players.forEach(playerSocketId => {
        const playerSocket = io.sockets.sockets.get(playerSocketId)
        if (playerSocket) {
          playerSocket.emit('gameStarted', { gameId })
        }
      })
    }
  })

  // Handle playing cards
  socket.on('playCards', ({ gameId, cards }) => {
    console.log('Cards played:', gameId, cards.length)
    const game = activeGames.get(gameId)
    if (game) {
      game.players.forEach(playerSocketId => {
        if (playerSocketId !== socket.id) {
          const playerSocket = io.sockets.sockets.get(playerSocketId)
          if (playerSocket) {
            playerSocket.emit('cardsPlayed', { 
              gameId, 
              playerName: displayName,
              cards 
            })
          }
        }
      })
    }
  })

  // Handle passing
  socket.on('pass', ({ gameId }) => {
    console.log('Player passed:', gameId)
    const game = activeGames.get(gameId)
    if (game) {
      game.players.forEach(playerSocketId => {
        if (playerSocketId !== socket.id) {
          const playerSocket = io.sockets.sockets.get(playerSocketId)
          if (playerSocket) {
            playerSocket.emit('playerPassed', { 
              gameId, 
              playerName: displayName 
            })
          }
        }
      })
    }
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    
    // Remove from connected players
    connectedPlayers.delete(socket.id)
    
    // Broadcast updated count to all clients
    broadcastOnlinePlayers()
    
    // Remove from active games and notify other players
    activeGames.forEach((game, gameId) => {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id)
        
        // Notify remaining players
        game.players.forEach(playerSocketId => {
          const playerSocket = io.sockets.sockets.get(playerSocketId)
          if (playerSocket) {
            const playerInfo = connectedPlayers.get(socket.id)
            playerSocket.emit('playerLeft', { 
              playerName: playerInfo?.displayName || 'Unknown Player' 
            })
          }
        })
        
        // Remove game if no players left
        if (game.players.size === 0) {
          activeGames.delete(gameId)
        }
      }
    })
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
  console.log(`Server URL: ${process.env.RAILWAY_STATIC_URL || 'http://localhost:' + PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
