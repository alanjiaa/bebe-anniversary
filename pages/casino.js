// pages/casino.js
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useCart } from '@/context/CartContext'
import { FaCoins, FaExchangeAlt } from 'react-icons/fa'

const games = [
  {
    id: 'roulette',
    name: 'Roulette',
    description: 'Classic casino roulette with real odds',
    image: '/images/shopping/nintendo.webp', // Using existing image as placeholder
    minBet: 0.25,
    maxBet: 1000,
    comingSoon: false
  },
  {
    id: 'cardgame',
    name: 'Big 2',
    description: 'Multiplayer card game - get rid of all your cards!',
    image: '/images/shopping/coffee.jpg',
    minBet: 0.50,
    maxBet: 100,
    comingSoon: false
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    description: 'Beat the dealer to 21',
    image: '/images/shopping/coffee.jpg',
    minBet: 0.25,
    maxBet: 500,
    comingSoon: true
  },
  {
    id: 'slots',
    name: 'Slots',
    description: 'Spin to win big!',
    image: '/images/shopping/milktea.jpeg',
    minBet: 0.10,
    maxBet: 100,
    comingSoon: true
  }
]

export default function CasinoPage() {
  const { points, pounds, isLoading } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

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
              🎰 Bebe Casino 🎰
            </h1>
            <p className="text-white text-lg mb-6">
              Welcome to the most exclusive casino in Bebe Land!
            </p>
            
            {/* Currency Display */}
            {mounted && !isLoading && (
              <div className="flex justify-center gap-8 mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <FaCoins className="text-xl" />
                    <span className="text-2xl font-bold">{pounds || 0}</span>
                  </div>
                  <p className="text-white text-sm">Pounds (£)</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="flex items-center gap-2 text-pink-400">
                    <span className="text-2xl font-bold">{points}</span>
                  </div>
                  <p className="text-white text-sm">Alsie Points</p>
                </div>
              </div>
            )}

            {/* Currency Exchange Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-white mb-2">
                <FaExchangeAlt />
                <span className="font-semibold">Currency Exchange</span>
              </div>
              <p className="text-white/80 text-sm">
                100 Alsie Points = £10 | Visit the shop to exchange points for pounds!
              </p>
            </div>
          </motion.div>

          {/* Games Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {games.map((game) => (
              <motion.div
                key={game.id}
                variants={item}
                whileHover={{ scale: 1.05 }}
                className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center border border-white/20"
              >
                <div className="relative mb-4">
                  <div className="w-full h-48 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                    <span className="text-6xl">🎰</span>
                  </div>
                  {game.comingSoon && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">Coming Soon</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{game.name}</h3>
                <p className="text-white/80 text-sm mb-4">{game.description}</p>
                
                <div className="text-white/60 text-xs mb-4">
                  <p>Min Bet: £{game.minBet}</p>
                  <p>Max Bet: £{game.maxBet}</p>
                </div>

                {game.comingSoon ? (
                  <button
                    disabled
                    className="w-full bg-gray-500 text-white py-2 rounded-lg cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <Link
                    href={`/casino/${game.id}`}
                    className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Play Now
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/home"
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm"
            >
              ← Back to Menu
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
    </ProtectedRoute>
  )
}
