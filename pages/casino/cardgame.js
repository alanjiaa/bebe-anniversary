// pages/casino/cardgame.js
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCart } from '@/context/CartContext'
import { FaCoins, FaUsers, FaPlay, FaTimes, FaCheck } from 'react-icons/fa'
import { toast } from 'react-hot-toast'
import { auth, db } from '@/lib/firebase'
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore'
import io from 'socket.io-client'

// Card values in order (3 is smallest, 2 is biggest)
const CARD_VALUES = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
const CARD_SUITS = ['♠', '♥', '♦', '♣']

// Create a deck of cards
const createDeck = (numDecks = 1) => {
  const deck = []
  for (let d = 0; d < numDecks; d++) {
    for (const suit of CARD_SUITS) {
      for (const value of CARD_VALUES) {
        deck.push({ suit, value, id: `${value}${suit}${d}` })
      }
    }
    // Add jokers
    deck.push({ suit: '🃏', value: 'JOKER', id: `JOKER1${d}` })
    deck.push({ suit: '🃏', value: 'JOKER', id: `JOKER2${d}` })
  }
  return deck
}

// Shuffle deck
const shuffleDeck = (deck) => {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Deal cards to players
const dealCards = (deck, numPlayers) => {
  const hands = Array(numPlayers).fill().map(() => [])
  const cardsPerPlayer = Math.floor(deck.length / numPlayers)
  
  for (let i = 0; i < deck.length; i++) {
    const playerIndex = i % numPlayers
    if (hands[playerIndex].length < cardsPerPlayer) {
      hands[playerIndex].push(deck[i])
    }
  }
  
  // Sort each hand by card value
  hands.forEach(hand => {
    hand.sort((a, b) => {
      const indexA = CARD_VALUES.indexOf(a.value)
      const indexB = CARD_VALUES.indexOf(b.value)
      return indexA - indexB
    })
  })
  
  return hands
}

// Check if a combination is valid
const isValidCombination = (cards) => {
  if (!cards || cards.length === 0) return false
  
  // Single card
  if (cards.length === 1) return true
  
  // Double
  if (cards.length === 2) {
    return cards[0].value === cards[1].value || 
           (cards[0].value === 'JOKER' && cards[1].value === 'JOKER') ||
           (cards[0].value === 'JOKER' || cards[1].value === 'JOKER')
  }
  
  // Triplet
  if (cards.length === 3) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    return values.length === 0 || 
           (values.length === 1 && jokers === 2) ||
           (values.length === 2 && jokers === 1 && values[0] === values[1]) ||
           (values.length === 3 && values[0] === values[1] && values[1] === values[2])
  }
  
  // Bomb (4 of a kind)
  if (cards.length === 4) {
    const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
    const jokers = cards.filter(card => card.value === 'JOKER').length
    return values.length === 0 || 
           (values.length === 1 && jokers === 3) ||
           (values.length === 2 && jokers === 2 && values[0] === values[1]) ||
           (values.length === 3 && jokers === 1 && values[0] === values[1] && values[1] === values[2]) ||
           (values.length === 4 && values[0] === values[1] && values[1] === values[2] && values[2] === values[3])
  }
  
  return false
}

// Get the effective value of a card combination
const getCombinationValue = (cards) => {
  if (!cards || cards.length === 0) return null
  
  const values = cards.map(card => card.value).filter(v => v !== 'JOKER')
  const jokers = cards.filter(card => card.value === 'JOKER').length
  
  if (values.length === 0) {
    // All jokers - highest value
    return '2'
  }
  
  // For combinations with jokers, find the highest possible value
  const baseValue = values[0]
  const baseIndex = CARD_VALUES.indexOf(baseValue)
  
  // If we have jokers, we can potentially make this a higher value
  // For simplicity, we'll use the base value and let the game logic handle joker substitution
  return baseValue
}

// Check if combination A can beat combination B
const canBeat = (cardsA, cardsB) => {
  if (!isValidCombination(cardsA) || !isValidCombination(cardsB)) return false
  
  // Bombs can beat anything
  if (cardsA.length === 4 && cardsB.length !== 4) return true
  if (cardsB.length === 4 && cardsA.length !== 4) return false
  
  // Same length combinations
  if (cardsA.length !== cardsB.length) return false
  
  const valueA = getCombinationValue(cardsA)
  const valueB = getCombinationValue(cardsB)
  
  if (!valueA || !valueB) return false
  
  const indexA = CARD_VALUES.indexOf(valueA)
  const indexB = CARD_VALUES.indexOf(valueB)
  
  return indexA > indexB
}

export default function CardGame() {
  const { pounds, updatePounds } = useCart()
  const [gameState, setGameState] = useState('lobby') // lobby, waiting, playing, finished
  const [players, setPlayers] = useState([])
  const [currentPlayer, setCurrentPlayer] = useState(null)
  const [myHand, setMyHand] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [lastPlay, setLastPlay] = useState(null)
  const [gameId, setGameId] = useState(null)
  const [socket, setSocket] = useState(null)
  const [betAmount, setBetAmount] = useState(1)
  const [mounted, setMounted] = useState(false)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [winner, setWinner] = useState(null)
  const [gameHistory, setGameHistory] = useState([])
  const [availableGames, setAvailableGames] = useState([])
  const [joinGameId, setJoinGameId] = useState('')
  
  const user = auth.currentUser

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user) return

    // Initialize socket connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
      (process.env.NODE_ENV === 'production' 
        ? window.location.origin.replace(/^https?:\/\//, 'https://').replace(/:\d+/, ':3001')
        : 'http://localhost:3001')
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: user.uid,
        displayName: user.displayName || user.email
      }
    })

    newSocket.on('connect', () => {
      console.log('Connected to game server')
    })

    newSocket.on('gameUpdate', (data) => {
      handleGameUpdate(data)
    })

    newSocket.on('playerJoined', (data) => {
      toast.success(`${data.playerName} joined the game!`)
    })

    newSocket.on('playerLeft', (data) => {
      toast.error(`${data.playerName} left the game`)
    })

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
        // Only show games that aren't full and don't include the current user
        if (gameData.players.length < 4 && 
            !gameData.players.some(p => p.id === user.uid)) {
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
        setIsMyTurn(myPlayer.id === data.currentPlayer)
      }
    }
  }

  const createGame = async () => {
    if (!user) return
    
    if (betAmount > (pounds || 0)) {
      toast.error('Not enough pounds to place this bet!')
      return
    }
    
    const gameRef = doc(collection(db, 'cardGames'))
    const gameData = {
      id: gameRef.id,
      players: [{
        id: user.uid,
        name: user.displayName || user.email,
        hand: [],
        ready: false
      }],
      gameState: 'waiting',
      currentPlayer: null,
      lastPlay: null,
      betAmount,
      createdAt: serverTimestamp(),
      deck: [],
      winner: null
    }
    
    await setDoc(gameRef, gameData)
    setGameId(gameRef.id)
    
    // Deduct bet amount
    updatePounds(-betAmount)
    
    if (socket) {
      socket.emit('createGame', { gameId: gameRef.id, betAmount })
    }
  }

  const joinGame = async (gameId) => {
    if (!user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    
    if (!gameDoc.exists()) {
      toast.error('Game not found')
      return
    }
    
    const gameData = gameDoc.data()
    if (gameData.players.length >= 4) {
      toast.error('Game is full')
      return
    }
    
    if (gameData.betAmount > (pounds || 0)) {
      toast.error('Not enough pounds to join this game!')
      return
    }
    
    const newPlayer = {
      id: user.uid,
      name: user.displayName || user.email,
      hand: [],
      ready: false
    }
    
    await updateDoc(gameRef, {
      players: [...gameData.players, newPlayer]
    })
    
    setGameId(gameId)
    
    // Deduct bet amount
    updatePounds(-gameData.betAmount)
    
    if (socket) {
      socket.emit('joinGame', { gameId })
    }
  }

  const readyToPlay = async () => {
    if (!gameId || !user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    const updatedPlayers = gameData.players.map(player => 
      player.id === user.uid ? { ...player, ready: true } : player
    )
    
    await updateDoc(gameRef, { players: updatedPlayers })
    
    // Check if all players are ready and we have at least 2 players
    const readyPlayers = updatedPlayers.filter(p => p.ready)
    if (readyPlayers.length >= 2 && readyPlayers.length === updatedPlayers.length) {
      startGame(gameData)
    }
  }

  const startGame = async (gameData) => {
    const numPlayers = gameData.players.length
    const numDecks = numPlayers <= 2 ? 1 : 2
    const deck = shuffleDeck(createDeck(numDecks))
    const hands = dealCards(deck, numPlayers)
    
    const updatedPlayers = gameData.players.map((player, index) => ({
      ...player,
      hand: hands[index]
    }))
    
    const firstPlayer = updatedPlayers[Math.floor(Math.random() * numPlayers)]
    
    await updateDoc(doc(db, 'cardGames', gameId), {
      players: updatedPlayers,
      gameState: 'playing',
      currentPlayer: firstPlayer.id,
      deck: deck.slice(numPlayers * Math.floor(deck.length / numPlayers))
    })
    
    if (socket) {
      socket.emit('startGame', { gameId })
    }
  }

  const playCards = async () => {
    if (!isMyTurn || !selectedCards.length || !gameId) return
    
    if (!isValidCombination(selectedCards)) {
      toast.error('Invalid card combination')
      return
    }
    
    if (lastPlay && !canBeat(selectedCards, lastPlay.cards)) {
      toast.error('Your cards must beat the previous play')
      return
    }
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Remove played cards from hand
    const updatedHand = myHand.filter(card => 
      !selectedCards.some(selected => selected.id === card.id)
    )
    
    const updatedPlayers = gameData.players.map(player => 
      player.id === user.uid ? { ...player, hand: updatedHand } : player
    )
    
    // Find next player
    const currentPlayerIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length
    const nextPlayer = gameData.players[nextPlayerIndex]
    
    const newLastPlay = {
      playerId: user.uid,
      playerName: user.displayName || user.email,
      cards: selectedCards,
      timestamp: serverTimestamp()
    }
    
    await updateDoc(gameRef, {
      players: updatedPlayers,
      currentPlayer: nextPlayer.id,
      lastPlay: newLastPlay
    })
    
    setSelectedCards([])
    
    // Check for winner
    if (updatedHand.length === 0) {
      await updateDoc(gameRef, {
        gameState: 'finished',
        winner: user.uid
      })
      
      // Distribute winnings
      const totalPot = gameData.betAmount * gameData.players.length
      updatePounds(totalPot)
      toast.success(`Congratulations! You won £${totalPot}!`)
    }
    
    if (socket) {
      socket.emit('playCards', { gameId, cards: selectedCards })
    }
  }

  const pass = async () => {
    if (!isMyTurn || !gameId) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Find next player
    const currentPlayerIndex = gameData.players.findIndex(p => p.id === gameData.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameData.players.length
    const nextPlayer = gameData.players[nextPlayerIndex]
    
    await updateDoc(gameRef, {
      currentPlayer: nextPlayer.id
    })
    
    if (socket) {
      socket.emit('pass', { gameId })
    }
  }

  const leaveGame = async () => {
    if (!gameId || !user) return
    
    const gameRef = doc(db, 'cardGames', gameId)
    const gameDoc = await getDoc(gameRef)
    const gameData = gameDoc.data()
    
    // Remove player from game
    const updatedPlayers = gameData.players.filter(p => p.id !== user.uid)
    
    if (updatedPlayers.length === 0) {
      // Delete game if no players left
      await deleteDoc(gameRef)
    } else {
      // Update game with remaining players
      await updateDoc(gameRef, {
        players: updatedPlayers
      })
    }
    
    // Reset game state
    setGameState('lobby')
    setGameId(null)
    setPlayers([])
    setMyHand([])
    setSelectedCards([])
    setLastPlay(null)
    setIsMyTurn(false)
    setWinner(null)
    
    toast.success('Left the game')
  }

  const selectCard = (card) => {
    if (!isMyTurn) return
    
    const isSelected = selectedCards.some(c => c.id === card.id)
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id))
    } else {
      setSelectedCards([...selectedCards, card])
    }
  }

  const getCardColor = (suit) => {
    return suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-black'
  }

  const renderCard = (card, isSelected = false) => {
    return (
      <motion.div
        key={card.id}
        whileHover={{ y: -10 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-16 h-24 bg-white rounded-lg shadow-lg border-2 cursor-pointer transition-all ${
          isSelected ? 'border-blue-500 transform -translate-y-2' : 'border-gray-300'
        }`}
        onClick={() => selectCard(card)}
      >
        <div className={`absolute top-1 left-1 text-sm font-bold ${getCardColor(card.suit)}`}>
          {card.value}
        </div>
        <div className={`absolute bottom-1 right-1 text-sm font-bold ${getCardColor(card.suit)}`}>
          {card.suit}
        </div>
        {card.value === 'JOKER' && (
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            🃏
          </div>
        )}
      </motion.div>
    )
  }

  if (!mounted) return null

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-script text-yellow-400 mb-4 drop-shadow-lg">
              🃏 Chinese Card Game 🃏
            </h1>
            <p className="text-white text-lg mb-6">
              Get rid of all your cards to win!
            </p>
            
            {/* Currency Display */}
            {mounted && (
              <div className="flex justify-center gap-8 mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FaCoins className="text-xl" />
                    <span className="text-2xl font-bold">{pounds || 0}</span>
                  </div>
                  <p className="text-white text-sm">Pounds (£)</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Game Content */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
            {gameState === 'lobby' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Game Lobby</h2>
                
                {/* Create Game Section */}
                <div className="bg-white/10 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-bold text-white mb-4">Create New Game</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <label className="text-white">Bet Amount (£):</label>
                    <input
                      type="number"
                      min="0.50"
                      max="100"
                      step="0.50"
                      value={betAmount}
                      onChange={(e) => setBetAmount(parseFloat(e.target.value))}
                      className="w-32 px-4 py-2 rounded-lg text-center"
                    />
                  </div>
                  <button
                    onClick={createGame}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    <FaPlay className="inline mr-2" />
                    Create Game
                  </button>
                </div>

                {/* Available Games Section */}
                <div className="bg-white/10 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Join Available Games</h3>
                  {availableGames.length === 0 ? (
                    <p className="text-white/80 text-center py-4">No games available. Create one above!</p>
                  ) : (
                    <div className="space-y-4">
                      {availableGames.map((game) => (
                        <div key={game.id} className="bg-white/20 rounded-lg p-4 flex justify-between items-center">
                          <div>
                            <p className="text-white font-semibold">Game ID: {game.id}</p>
                            <p className="text-white/80">Players: {game.players.length}/4</p>
                            <p className="text-white/80">Bet: £{game.betAmount}</p>
                          </div>
                          <button
                            onClick={() => joinGame(game.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition"
                          >
                            Join Game
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Join by Game ID */}
                <div className="bg-white/10 rounded-lg p-6 mt-6">
                  <h3 className="text-xl font-bold text-white mb-4">Join by Game ID</h3>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Enter Game ID"
                      value={joinGameId}
                      onChange={(e) => setJoinGameId(e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg"
                    />
                    <button
                      onClick={() => joinGame(joinGameId)}
                      disabled={!joinGameId}
                      className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </div>
            )}

            {gameState === 'waiting' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-6">Waiting for Players</h2>
                <div className="mb-6">
                  <p className="text-white mb-4">Game ID: {gameId}</p>
                  <p className="text-white mb-4">Players ({players.length}/4):</p>
                  <div className="flex justify-center gap-4 mb-6">
                    {players.map((player, index) => (
                      <div key={player.id} className="bg-white/20 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <FaUsers className="text-yellow-400" />
                          <span className="text-white">{player.name}</span>
                          {player.ready && <FaCheck className="text-green-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {players.find(p => p.id === user.uid)?.ready ? (
                  <p className="text-green-400">Ready to play!</p>
                ) : (
                  <button
                    onClick={readyToPlay}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                  >
                    Ready to Play
                  </button>
                )}
                <button
                  onClick={leaveGame}
                  className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Leave Game
                </button>
              </div>
            )}

            {gameState === 'playing' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">Game in Progress</h2>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-white">
                      Current Player: {players.find(p => p.id === currentPlayer)?.name}
                    </div>
                    <div className="text-white">
                      {isMyTurn && <span className="text-green-400 font-bold">Your turn!</span>}
                    </div>
                  </div>
                </div>

                {/* Last Play */}
                {lastPlay && (
                  <div className="mb-6">
                    <h3 className="text-white mb-2">Last Play by {lastPlay.playerName}:</h3>
                    <div className="flex gap-2">
                      {lastPlay.cards.map(card => renderCard(card))}
                    </div>
                  </div>
                )}

                {/* My Hand */}
                <div className="mb-6">
                  <h3 className="text-white mb-4">Your Hand ({myHand.length} cards):</h3>
                  <div className="flex flex-wrap gap-2">
                    {myHand.map(card => renderCard(card, selectedCards.some(c => c.id === card.id)))}
                  </div>
                </div>

                                 {/* Game Actions */}
                 {isMyTurn && (
                   <div className="flex justify-center gap-4">
                     <button
                       onClick={playCards}
                       disabled={!selectedCards.length}
                       className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       Play Cards
                     </button>
                     <button
                       onClick={pass}
                       className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition"
                     >
                       Pass
                     </button>
                   </div>
                 )}
                 <div className="flex justify-center mt-4">
                   <button
                     onClick={leaveGame}
                     className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition"
                   >
                     Leave Game
                   </button>
                 </div>
              </div>
            )}

            {gameState === 'finished' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-6">Game Finished!</h2>
                {winner && (
                  <div className="mb-6">
                    <p className="text-white text-lg">
                      Winner: {players.find(p => p.id === winner)?.name}
                    </p>
                    {winner === user.uid && (
                      <p className="text-green-400 text-xl font-bold">
                        Congratulations! You won £{betAmount * players.length}!
                      </p>
                    )}
                  </div>
                )}
                <Link
                  href="/casino"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition"
                >
                  Back to Casino
                </Link>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/casino"
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm"
            >
              ← Back to Casino
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
