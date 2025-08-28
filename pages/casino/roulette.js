// pages/casino/roulette.js
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCart } from '@/context/CartContext'
import { FaCoins, FaUndo, FaPlay } from 'react-icons/fa'
import { toast } from 'react-hot-toast'

// Roulette wheel numbers (European roulette with single zero)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

// Betting options with their payouts
const BETTING_OPTIONS = {
  straight: { name: 'Straight Up', payout: 35, description: 'Single number' },
  split: { name: 'Split', payout: 17, description: 'Two adjacent numbers' },
  street: { name: 'Street', payout: 11, description: 'Three numbers in a row' },
  corner: { name: 'Corner', payout: 8, description: 'Four adjacent numbers' },
  line: { name: 'Line', payout: 5, description: 'Six numbers (two rows)' },
  dozen: { name: 'Dozen', payout: 2, description: '1-12, 13-24, or 25-36' },
  column: { name: 'Column', payout: 2, description: '1st, 2nd, or 3rd column' },
  red: { name: 'Red', payout: 1, description: 'All red numbers' },
  black: { name: 'Black', payout: 1, description: 'All black numbers' },
  even: { name: 'Even', payout: 1, description: 'Even numbers (2-36)' },
  odd: { name: 'Odd', payout: 1, description: 'Odd numbers (1-35)' },
  low: { name: 'Low', payout: 1, description: 'Numbers 1-18' },
  high: { name: 'High', payout: 1, description: 'Numbers 19-36' }
}

// Red numbers on the roulette wheel
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

export default function RouletteGame() {
  const { pounds, updatePounds } = useCart()
  const [currentBet, setCurrentBet] = useState(0.25)
  const [bets, setBets] = useState({})
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [ballPosition, setBallPosition] = useState(0)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [resultData, setResultData] = useState({ won: false, amount: 0, message: '' })

  const wheelRef = useRef(null)
  const ballRef = useRef(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const placeBet = (betType, value, amount = currentBet) => {
    if (isSpinning) return

    const key = `${betType}-${value}`
    const newBets = { ...bets }
    
    if (newBets[key]) {
      newBets[key] += amount
    } else {
      newBets[key] = amount
    }

    setBets(newBets)
  }

  const removeBet = (betType, value) => {
    if (isSpinning) return

    const key = `${betType}-${value}`
    const newBets = { ...bets }
    delete newBets[key]
    setBets(newBets)
  }

  const clearAllBets = () => {
    if (isSpinning) return
    setBets({})
  }

  const getTotalBet = () => {
    return Object.values(bets).reduce((sum, bet) => sum + bet, 0)
  }

  const spinWheel = async () => {
    if (isSpinning || getTotalBet() < 0.25) {
      toast.error('Minimum bet is £0.25')
      return
    }

    if (getTotalBet() > (pounds || 0)) {
      toast.error('Not enough pounds!')
      return
    }

    setIsSpinning(true)
    setResult(null)

    // Deduct bet amount
    const totalBet = getTotalBet()
    const newPounds = (pounds || 0) - totalBet
    await updatePounds(newPounds)

    // Generate random result
    const randomIndex = Math.floor(Math.random() * WHEEL_NUMBERS.length)
    const winningNumber = WHEEL_NUMBERS[randomIndex]

    // Calculate wheel rotation (multiple spins + final position)
    const spins = 3 + Math.random() * 2 // 3-5 spins
    const finalRotation = spins * 360 + (randomIndex * (360 / WHEEL_NUMBERS.length))
    
    // Animate wheel and ball
    const duration = 5000 // 5 seconds
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3)
      
      const currentRotation = finalRotation * easeOut
      setWheelRotation(currentRotation)
      
      // Ball follows wheel but with slight lag
      const ballProgress = Math.min((elapsed - 500) / duration, 1)
      const ballEaseOut = 1 - Math.pow(1 - ballProgress, 2)
      setBallPosition(currentRotation * ballEaseOut)

             if (progress < 1) {
         requestAnimationFrame(animate)
               } else {
          // Animation complete
          setResult(winningNumber)
          setIsSpinning(false)
          
          // Calculate winnings
          const winnings = calculateWinnings(winningNumber)
          if (winnings > 0) {
            const finalPounds = newPounds + winnings
            updatePounds(finalPounds).then(() => {
              setResultData({
                won: true,
                amount: winnings,
                message: `You won £${winnings.toFixed(2)}! 🎉`
              })
              setShowResult(true)
            })
          } else {
            setResultData({
              won: false,
              amount: 0,
              message: 'Better luck next time! 💔'
            })
            setShowResult(true)
          }

          // Update history
          setHistory(prev => [winningNumber, ...prev.slice(0, 9)])
          
          // Reset bets after a short delay
          setTimeout(() => {
            setBets({})
          }, 2000)
        }
    }

    requestAnimationFrame(animate)
  }

  const calculateWinnings = (winningNumber) => {
    let totalWinnings = 0

    Object.entries(bets).forEach(([betKey, betAmount]) => {
      const [betType, value] = betKey.split('-')
      let won = false

      switch (betType) {
        case 'straight':
          won = parseInt(value) === winningNumber
          break
        case 'red':
          won = RED_NUMBERS.includes(winningNumber)
          break
        case 'black':
          won = winningNumber !== 0 && !RED_NUMBERS.includes(winningNumber)
          break
        case 'even':
          won = winningNumber !== 0 && winningNumber % 2 === 0
          break
        case 'odd':
          won = winningNumber % 2 === 1
          break
        case 'low':
          won = winningNumber >= 1 && winningNumber <= 18
          break
        case 'high':
          won = winningNumber >= 19 && winningNumber <= 36
          break
        case 'dozen':
          const dozen = parseInt(value)
          if (dozen === 1) won = winningNumber >= 1 && winningNumber <= 12
          else if (dozen === 2) won = winningNumber >= 13 && winningNumber <= 24
          else if (dozen === 3) won = winningNumber >= 25 && winningNumber <= 36
          break
        case 'column':
          const column = parseInt(value)
          won = winningNumber % 3 === column
          break
      }

      if (won) {
        const option = BETTING_OPTIONS[betType]
        totalWinnings += betAmount * (option.payout + 1)
      }
    })

    return totalWinnings
  }

  const getNumberColor = (number) => {
    if (number === 0) return 'bg-green-600'
    return RED_NUMBERS.includes(number) ? 'bg-red-600' : 'bg-black'
  }

  const renderNumberGrid = () => {
    // Roulette layout: 3 columns, 12 rows + zero at top
    const layout = [
      [0], // Zero at top
      [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], // Row 1
      [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], // Row 2
      [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]  // Row 3
    ]

    return (
      <div className="space-y-2 mb-4">
        {/* Zero */}
        <div className="flex justify-center">
          <button
            onClick={() => placeBet('straight', 0)}
            className={`w-16 h-12 rounded text-white font-bold text-sm transition-all hover:scale-110 ${
              getNumberColor(0)
            } ${bets['straight-0'] ? 'ring-4 ring-yellow-400' : ''}`}
          >
            0
          </button>
        </div>
        
        {/* Number rows */}
        {layout.slice(1).map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-12 gap-1">
            {row.map((num) => (
              <button
                key={num}
                onClick={() => placeBet('straight', num)}
                className={`w-8 h-8 rounded text-white font-bold text-xs transition-all hover:scale-110 ${
                  getNumberColor(num)
                } ${bets[`straight-${num}`] ? 'ring-4 ring-yellow-400' : ''}`}
              >
                {num}
              </button>
            ))}
          </div>
        ))}
      </div>
    )
  }

  const renderOutsideBets = () => {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => placeBet('red', 'red')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['red-red'] ? 'ring-4 ring-yellow-400' : ''
          } bg-red-600`}
        >
          Red
        </button>
        <button
          onClick={() => placeBet('black', 'black')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['black-black'] ? 'ring-4 ring-yellow-400' : ''
          } bg-black`}
        >
          Black
        </button>
        <button
          onClick={() => placeBet('even', 'even')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['even-even'] ? 'ring-4 ring-yellow-400' : ''
          } bg-gray-600`}
        >
          Even
        </button>
        <button
          onClick={() => placeBet('odd', 'odd')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['odd-odd'] ? 'ring-4 ring-yellow-400' : ''
          } bg-gray-600`}
        >
          Odd
        </button>
        <button
          onClick={() => placeBet('low', 'low')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['low-low'] ? 'ring-4 ring-yellow-400' : ''
          } bg-gray-600`}
        >
          1-18
        </button>
        <button
          onClick={() => placeBet('high', 'high')}
          className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
            bets['high-high'] ? 'ring-4 ring-yellow-400' : ''
          } bg-gray-600`}
        >
          19-36
        </button>
      </div>
    )
  }

  const renderDozenBets = () => {
    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3].map((dozen) => (
          <button
            key={dozen}
            onClick={() => placeBet('dozen', dozen)}
            className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
              bets[`dozen-${dozen}`] ? 'ring-4 ring-yellow-400' : ''
            } bg-blue-600`}
          >
            {dozen === 1 ? '1st 12' : dozen === 2 ? '2nd 12' : '3rd 12'}
          </button>
        ))}
      </div>
    )
  }

  const renderColumnBets = () => {
    return (
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 0].map((column) => (
          <button
            key={column}
            onClick={() => placeBet('column', column)}
            className={`p-3 rounded text-white font-bold transition-all hover:scale-105 ${
              bets[`column-${column}`] ? 'ring-4 ring-yellow-400' : ''
            } bg-purple-600`}
          >
            {column === 0 ? '3rd Col' : column === 1 ? '1st Col' : '2nd Col'}
          </button>
        ))}
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-script text-yellow-400 mb-2">🎰 Bebe Roulette 🎰</h1>
            {mounted && (
              <div className="flex justify-center gap-4 mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FaCoins />
                    <span className="text-xl font-bold">£{(pounds || 0).toFixed(2)}</span>
                  </div>
                  <p className="text-white text-sm">Balance</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
                  <span className="text-xl font-bold text-white">£{getTotalBet().toFixed(2)}</span>
                  <p className="text-white text-sm">Total Bet</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Wheel and Controls */}
            <div className="space-y-6">
              {/* Roulette Wheel */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <div className="relative w-64 h-64 mx-auto mb-4">
                  <div
                    ref={wheelRef}
                    className="w-full h-full rounded-full border-8 border-yellow-400 bg-gradient-to-br from-red-600 to-black relative overflow-hidden"
                    style={{
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isSpinning ? 'none' : 'transform 0.3s ease-out'
                    }}
                  >
                    {/* Wheel segments */}
                    {WHEEL_NUMBERS.map((number, index) => {
                      const angle = (index * 360) / WHEEL_NUMBERS.length
                      const color = getNumberColor(number)
                      return (
                        <div
                          key={index}
                          className="absolute w-0 h-0 border-l-8 border-r-8 border-b-16 border-transparent"
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            borderBottomColor: number === 0 ? '#059669' : RED_NUMBERS.includes(number) ? '#dc2626' : '#000000'
                          }}
                        />
                      )
                    })}
                  </div>
                  
                  {/* Ball */}
                  <div
                    ref={ballRef}
                    className="absolute w-4 h-4 bg-white rounded-full shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotate(${ballPosition}deg) translateY(-110px)`,
                      transition: isSpinning ? 'none' : 'all 0.3s ease-out'
                    }}
                  />
                </div>

                                 {/* Result Display */}
                 {result !== null && (
                   <motion.div
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     className="text-2xl font-bold text-white mb-4"
                   >
                     <div className="flex items-center justify-center gap-2">
                       <span>Result:</span>
                       <span className={`px-3 py-1 rounded-full ${getNumberColor(result)}`}>
                         {result}
                       </span>
                       {calculateWinnings(result) > 0 && (
                         <span className="text-green-400 text-lg">✓</span>
                       )}
                     </div>
                   </motion.div>
                 )}

                {/* Spin Button */}
                <button
                  onClick={spinWheel}
                  disabled={isSpinning || getTotalBet() < 0.25}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:transform-none flex items-center gap-2 mx-auto"
                >
                  <FaPlay />
                  {isSpinning ? 'Spinning...' : 'Spin Wheel'}
                </button>
              </div>

              {/* Betting Controls */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Betting Controls</h3>
                
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-white font-semibold">Bet Amount:</label>
                  <select
                    value={currentBet}
                    onChange={(e) => setCurrentBet(parseFloat(e.target.value))}
                    className="bg-white/20 text-white border border-white/30 rounded px-3 py-2"
                    style={{ color: 'black' }}
                  >
                    <option value={0.25}>£0.25</option>
                    <option value={0.50}>£0.50</option>
                    <option value={1.00}>£1.00</option>
                    <option value={5.00}>£5.00</option>
                    <option value={10.00}>£10.00</option>
                    <option value={25.00}>£25.00</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearAllBets}
                    disabled={isSpinning}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-500 text-white font-semibold px-4 py-2 rounded transition flex items-center gap-2"
                  >
                    <FaUndo />
                    Clear All
                  </button>
                </div>
              </div>

              {/* History */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Recent Results</h3>
                <div className="flex gap-2 flex-wrap">
                  {history.map((number, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-full text-white font-bold text-sm flex items-center justify-center ${getNumberColor(number)}`}
                    >
                      {number}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Betting Board */}
            <div className="space-y-6">
              {/* Number Grid */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Numbers</h3>
                {renderNumberGrid()}
              </div>

              {/* Outside Bets */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Outside Bets</h3>
                {renderOutsideBets()}
              </div>

              {/* Dozen Bets */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Dozen Bets</h3>
                {renderDozenBets()}
              </div>

              {/* Column Bets */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Column Bets</h3>
                {renderColumnBets()}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-8">
            <Link
              href="/casino"
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm"
            >
              ← Back to Casino
            </Link>
            <Link
              href="/shop"
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-3 rounded-2xl transition"
            >
              Exchange Points
            </Link>
                     </div>
         </div>
       </div>

       {/* Result Modal */}
       <AnimatePresence>
         {showResult && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
             onClick={() => setShowResult(false)}
           >
             <motion.div
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.8, opacity: 0 }}
               className={`relative max-w-md w-full p-8 rounded-2xl text-center shadow-2xl ${
                 resultData.won 
                   ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' 
                   : 'bg-gradient-to-br from-gray-800 to-gray-900 text-white'
               }`}
               onClick={(e) => e.stopPropagation()}
             >
               {/* Close button */}
               <button
                 onClick={() => setShowResult(false)}
                 className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl"
               >
                 ×
               </button>

               {/* Result Icon */}
               <div className="text-6xl mb-4">
                 {resultData.won ? '🎉' : '💔'}
               </div>

               {/* Result Message */}
               <h2 className="text-2xl font-bold mb-2">
                 {resultData.won ? 'Congratulations!' : 'Better Luck Next Time'}
               </h2>

               <p className="text-lg mb-4">
                 {resultData.message}
               </p>

               {resultData.won && (
                 <div className="bg-white/20 rounded-lg p-4 mb-4">
                   <p className="text-sm opacity-90">Amount Won</p>
                   <p className="text-3xl font-bold">£{resultData.amount.toFixed(2)}</p>
                 </div>
               )}

               {/* Continue Button */}
               <button
                 onClick={() => setShowResult(false)}
                 className={`px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${
                   resultData.won
                     ? 'bg-white text-yellow-600 hover:bg-gray-100'
                     : 'bg-white/20 text-white hover:bg-white/30'
                 }`}
               >
                 Continue Playing
               </button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
     </ProtectedRoute>
   )
 }
