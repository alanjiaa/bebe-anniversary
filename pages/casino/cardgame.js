// pages/casino/cardgame.js
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCart } from '@/context/CartContext'
import { FaCoins, FaUsers, FaPlay, FaTimes, FaCheck, FaWifi } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { auth, db } from '@/lib/firebase'
import ConfirmationModal from '@/components/ConfirmationModal'
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import io from 'socket.io-client'

// We can optionally import isValidCombination for UI feedback if we configure Next.js to handle it,
// but for now let's rely on server validation or basic UI checks. 
// Ideally we should use the shared logic but importing commonJS into Next.js client component might require config.
// Let's implement basic UI validation here or just trust server.
// For best UX, simple check:
const CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

export default function CardGame() {
  const { pounds, updatePounds } = useCart()
  const [gameState, setGameState] = useState('lobby') // lobby, waiting, playing, finished
  const [players, setPlayers] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [lastPlay, setLastPlay] = useState(null)
  const [passedPlayers, setPassedPlayers] = useState([]) // From server
  const [gameId, setGameId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [betAmount, setBetAmount] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [winner, setWinner] = useState(null)
  const [availableGames, setAvailableGames] = useState([])
  const [joinGameId, setJoinGameId] = useState('')
  const [onlinePlayers, setOnlinePlayers] = useState(0)

  // Confirmation modal state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null)

  const user = auth.currentUser

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) return

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://bebe-anniversary.vercel.app'  // Updated to production URL if needed
        : 'http://localhost:3001')

    // In production, we might need specific URL logic, but let's stick to what was there or derived.
    // The previous code had: 'https://bebe-anniversary-production.up.railway.app'
    // Let's use that if it was working or intended.
    const actualSocketUrl = process.env.NODE_ENV === 'production'
      ? 'https://bebe-anniversary-production.up.railway.app'
      : 'http://localhost:3001'

    console.log('Connecting to Socket.IO server:', actualSocketUrl)

    const newSocket = io(actualSocketUrl, {
      auth: {
        userId: user.uid,
        displayName: user.displayName || user.email
      },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('Connected to game server')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      toast.error('Failed to connect to game server')
    })

    newSocket.on('gameCreated', ({ gameId }) => {
      setGameId(gameId)
      toast.success('Game created! Waiting for players...')
    })

    newSocket.on('error', ({ message }) => {
      toast.error(message)
    })

    // Server events that might not come through Firestore listener instantly
    newSocket.on('gameStarted', () => {
      toast.success('Game Started!')
    })

    newSocket.on('onlinePlayersUpdate', (data) => {
      setOnlinePlayers(data.count)
    })

    newSocket.emit('getOnlinePlayers')

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  // Listen for available games
  useEffect(() => {
    if (!user) return

    const gamesQuery = query(
      collection(db, 'cardGames'),
      where('gameState', '==', 'waiting'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      const games = []
      snapshot.forEach((doc) => {
        const gameData = doc.data()
        // Filter out games that are stale (older than 24h) handled by server, but we can also filter UI
        // Filter out full games or games user is already in (unless we want to show them)
        if (gameData.players.length < 4) {
          games.push({
            id: doc.id,
            ...gameData
          })
        }
      })
      setAvailableGames(games)
    })

    return () => unsubscribe()
  }, [user])

  // Listen to current game state
  useEffect(() => {
    if (!gameId) return

    const gameRef = doc(db, 'cardGames', gameId)
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (!doc.exists()) {
        // Game deleted?
        if (gameState !== 'lobby') {
          toast('Game ended or closed')
          setGameState('lobby')
          setGameId(null)
          setPlayers([])
          setMyHand([])
        }
        return
      }

      handleGameUpdate(doc.data())
    })

    return () => unsubscribe()
  }, [gameId, user, gameState])

  const handleGameUpdate = (data) => {
    setGameState(data.gameState)
    setPlayers(data.players)
    setCurrentPlayer(data.currentPlayer)
    setLastPlay(data.lastPlay)
    setWinner(data.winner)

    if (data.players) {
      const myPlayer = data.players.find(p => p.id === user.uid)
      if (myPlayer) {
        setMyHand(myPlayer.hand || [])
        setIsMyTurn(data.currentPlayer === user.uid)
        // If I was kicked or something?
      } else {
        // I am not in players list?
        if (gameId) {
          setGameId(null)
          setGameState('lobby')
          toast.error("You have been removed from the game")
        }
      }
    }

    // Clear selected cards if turn changed or game state changed
    // We can't strictly detect "turn changed" easily without prev state, 
    // but usually if it's not my turn, I shouldn't have cards selected? 
    // Or just clear on successful play.
  }

  const createGame = () => {
    if (!user || !socket) return
    if (betAmount > (pounds || 0)) {
      toast.error('Not enough pounds!')
      return
    }
    // We can allow solo testing if needed, but original code blocked < 2 players.
    // Let's trust server validation or allow it but warn.
    socket.emit('createGame', { betAmount })
  }

  const joinGame = (id) => {
    if (!user || !socket) return
    socket.emit('joinGame', { gameId: id })
    // We assume success and wait for Firestore update to setGameId?
    // Better: setGameId immediately so we listen to it?
    // Actually server emits nothing on success for join, so we rely on user seeing updated list or whatever.
    // But we need to switch view.
    // Let's setGameId here. If it fails, the onSnapshot will handle empty/error or we get socket error.
    setGameId(id)
  }

  const leaveGame = async () => {
    if (!gameId || !socket) return
    socket.emit('leaveGame', { gameId })
    setGameId(null)
    setGameState('lobby')
    setMyHand([])
    setPlayers([])
  }

  const handleLeaveGameClick = () => {
    setPendingLeaveAction(() => leaveGame)
    setShowLeaveConfirmation(true)
  }

  const toggleReady = () => {
    if (!gameId || !socket) return
    socket.emit('toggleReady', { gameId })
  }

  const startGame = () => {
    if (!gameId || !socket) return
    socket.emit('startGame', { gameId })
  }

  const playCards = () => {
    if (!gameId || !socket || !isMyTurn) return
    if (selectedCards.length === 0) return

    socket.emit('playCards', { gameId, cards: selectedCards })
    setSelectedCards([])
  }

  const pass = () => {
    if (!gameId || !socket || !isMyTurn) return
    socket.emit('pass', { gameId })
  }

  const selectCard = (card) => {
    if (!isMyTurn && gameState === 'playing') {
      // Optional: allow selecting even if not turn, but can't play?
      // Standard UX: yes allow select.
    }

    // Toggle
    const isSelected = selectedCards.some(c => c.id === card.id)
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id))
    } else {
      setSelectedCards([...selectedCards, card])
    }
  }

  // --- RENDER HELPERS ---

  // Render cards
  const renderCard = (card, index, isSelected = false, onClick = null) => {
    // Simple card rendering
    const isRed = card.suit === '♥' || card.suit === '♦' || card.value === 'JOKER'
    return (
      <motion.div
        key={card.id || index}
        whileHover={{ y: -10 }}
        animate={{ y: isSelected ? -20 : 0 }}
        className={`
                relative w-16 h-24 md:w-20 md:h-28 bg-white rounded-lg shadow-xl cursor-pointer
                flex flex-col items-center justify-center border border-gray-200 select-none
                ${isRed ? 'text-red-500' : 'text-gray-900'}
            `}
        onClick={onClick}
        style={{
          marginLeft: index === 0 ? 0 : '-30px',
          zIndex: index
        }}
      >
        <div className="absolute top-1 left-1 text-xs md:text-sm font-bold">{card.value}</div>
        <div className="text-2xl md:text-3xl">{card.suit}</div>
        <div className="absolute bottom-1 right-1 text-xs md:text-sm font-bold rotate-180">{card.value}</div>
      </motion.div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-green-800 p-4">

        {/* LOBBY */}
        {gameState === 'lobby' && (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl text-yellow-400 font-bold mb-8 text-center">Chinese Poker (Big 2)</h1>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Create Game */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h2 className="text-2xl text-white mb-4">Create Game</h2>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-white">Bet Amount:</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={betAmount}
                    onChange={e => setBetAmount(parseInt(e.target.value))}
                    className="w-20 p-2 rounded"
                  />
                </div>
                <button
                  onClick={createGame}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-lg transition"
                >
                  Create Table
                </button>
              </div>

              {/* Join Game */}
              <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm">
                <h2 className="text-2xl text-white mb-4">Join Game</h2>
                {availableGames.length === 0 ? (
                  <p className="text-white/60">No games available</p>
                ) : (
                  <div className="space-y-3">
                    {availableGames.map(game => (
                      <div key={game.id} className="flex justify-between items-center bg-black/20 p-3 rounded">
                        <div className="text-white">
                          <div>Host: {game.players[0]?.name}</div>
                          <div className="text-sm opacity-75">Bet: £{game.betAmount} • Players: {game.players.length}/4</div>
                        </div>
                        <button
                          onClick={() => joinGame(game.id)}
                          className="bg-green-500 px-4 py-2 rounded text-white font-bold hover:bg-green-600"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 text-center p-4">
              <Link href="/casino" className="text-white hover:underline">← Back to Casino</Link>
            </div>
          </div>
        )}

        {/* WAITING ROOM */}
        {gameState === 'waiting' && (
          <div className="max-w-2xl mx-auto bg-white/10 p-8 rounded-xl backdrop-blur-sm mt-12 text-center">
            <h2 className="text-3xl text-white mb-8">Waiting for Players...</h2>
            <div className="flex justify-center gap-4 mb-8">
              {players.map(p => (
                <div key={p.id} className="relative">
                  <div className={`
                                w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold
                                ${p.ready ? 'bg-green-500' : 'bg-gray-500'}
                                border-4 border-white text-white
                            `}>
                    {p.name[0]}
                  </div>
                  <div className="text-white mt-2">{p.name}</div>
                  {p.ready && <FaCheck className="absolute top-0 right-0 text-yellow-400 bg-black rounded-full p-1" />}
                </div>
              ))}
              {[...Array(4 - players.length)].map((_, i) => (
                <div key={`empty-${i}`} className="w-20 h-20 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center text-white/30">
                  ?
                </div>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleReady}
                className={`
                           px-8 py-3 rounded-lg font-bold text-white transition
                           ${players.find(p => p.id === user?.uid)?.ready
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-green-500 hover:bg-green-600'}
                       `}
              >
                {players.find(p => p.id === user?.uid)?.ready ? 'Not Ready' : 'Ready'}
              </button>

              {players.find(p => p.id === user?.uid)?.ready && players.length >= 2 && (
                <button
                  onClick={startGame}
                  className="bg-yellow-500 hover:bg-yellow-600 px-8 py-3 rounded-lg font-bold text-black"
                >
                  Start Game
                </button>
              )}

              <button
                onClick={() => setShowLeaveConfirmation(true)}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg text-white"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* PLAYING */}
        {(gameState === 'playing' || gameState === 'finished') && (
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center bg-black/30 p-4 rounded-lg mb-4">
              <div className="text-white">Pot: £{(gameId && players.length * Number(betAmount || 0)) || 0}</div>
              <button onClick={() => setShowLeaveConfirmation(true)} className="text-red-400 hover:text-red-300">Exit Game</button>
            </div>

            {/* Game Area */}
            <div className="flex-1 relative flex flex-col justify-between p-4">

              {/* Other Players (Simplified Layout) */}
              <div className="flex justify-around mb-8">
                {players.filter(p => p.id !== user?.uid).map((p, i) => (
                  <div key={p.id} className={`text-center ${p.id === currentPlayer ? 'bg-yellow-500/20 p-2 rounded' : ''} ${p.passed ? 'opacity-50' : ''}`}>
                    <div className="w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center text-white border-2 border-white">
                      {p.name[0]}
                    </div>
                    <div className="text-white text-sm">{p.name}</div>
                    <div className="text-yellow-400 text-xs">{p.hand?.length} cards</div>
                    {p.passed && <div className="text-red-400 text-xs font-bold">PASS</div>}
                  </div>
                ))}
              </div>

              {/* Table / Last Play */}
              <div className="flex-1 flex flex-col items-center justify-center relative">
                {lastPlay ? (
                  <div className="text-center">
                    <div className="text-white/50 mb-2">Last played by {lastPlay.playerName}</div>
                    <div className="flex justify-center">
                      {lastPlay.cards.map((c, i) => renderCard(c, i))}
                    </div>
                  </div>
                ) : (
                  <div className="text-white/30 text-xl font-bold border-2 border-dashed border-white/20 p-8 rounded-xl">
                    YOUR TURN TO START A NEW ROUND
                  </div>
                )}

                {winner && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-xl z-50">
                    <h2 className="text-5xl text-yellow-400 font-bold mb-4">
                      {winner === user?.uid ? 'YOU WON!' : 'GAME OVER'}
                    </h2>
                    <p className="text-white text-xl mb-6">
                      {players.find(p => p.id === winner)?.name} takes the pot!
                    </p>
                    <button
                      onClick={leaveGame}
                      className="bg-yellow-500 px-8 py-3 rounded-lg font-bold text-black"
                    >
                      Back to Lobby
                    </button>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4 mb-4">
                <button
                  disabled={!isMyTurn}
                  onClick={pass}
                  className={`px-8 py-2 rounded-full font-bold text-white shadow-lg ${isMyTurn ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 cursor-not-allowed'}`}
                >
                  Pass
                </button>
                <button
                  disabled={!isMyTurn || selectedCards.length === 0}
                  onClick={playCards}
                  className={`px-8 py-2 rounded-full font-bold text-white shadow-lg ${isMyTurn && selectedCards.length > 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-700 cursor-not-allowed'}`}
                >
                  Play
                </button>
              </div>

              {/* My Hand */}
              <div className="flex justify-center pl-8 mb-4">
                {myHand.map((card, i) => renderCard(
                  card,
                  i,
                  selectedCards.some(c => c.id === card.id),
                  () => selectCard(card)
                ))}
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={showLeaveConfirmation}
          onClose={() => setShowLeaveConfirmation(false)}
          onConfirm={() => {
            if (pendingLeaveAction) pendingLeaveAction()
            else leaveGame()
            setShowLeaveConfirmation(false)
          }}
          title="Leave Game?"
          message="Are you sure you want to leave? If game is in progress, you may lose your bet."
        />
      </div>
    </ProtectedRoute>
  )
}
