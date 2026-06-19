// pages/arcade.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import GlobalNav from '../src/components/GlobalNav'
import { motion } from 'framer-motion'

const GAMES = [
  {
    title: 'Bebe Casino',
    description: 'Try your luck at Slots, Blackjack, and Roulette to double your points!',
    icon: '🎰',
    href: '/casino',
    color: 'from-amber-400 to-orange-500'
  },
  {
    title: 'Photobooth',
    description: 'Strike a pose and capture cute memories with fun borders and filters.',
    icon: '📸',
    href: '/photobooth',
    color: 'from-pink-400 to-rose-500'
  },
  {
    title: 'Air Hockey',
    description: 'Fast-paced table action! First to 7 wins the match.',
    icon: '🏒',
    href: '/airhockey',
    color: 'from-cyan-400 to-blue-500'
  },
  {
    title: 'Classic Pong',
    description: 'A retro arcade classic. Defeat the AI to earn rewards!',
    icon: '🏓',
    href: '/pong',
    color: 'from-purple-400 to-indigo-500'
  }
]

export default function ArcadeHub() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#faf8f2] font-sans pb-20">
      <GlobalNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 md:pt-32">
        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[32px] shadow-xl flex items-center justify-center text-5xl mb-6 transform rotate-3"
          >
            🕹️
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4 tracking-tight">
            Bebe Arcade
          </h1>
          <p className="text-gray-500 font-medium max-w-xl mx-auto text-lg">
            Welcome to the Arcade! Choose a game to play and earn Alsie Points, or take some cute photos!
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {GAMES.map((game, index) => (
            <Link key={game.href} href={game.href}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-300 group cursor-pointer h-full flex flex-col items-center text-center hover:-translate-y-1"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${game.color} text-white text-4xl flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                  {game.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">{game.title}</h3>
                <p className="text-gray-500 font-medium">{game.description}</p>
                <div className="mt-auto pt-8 w-full">
                  <div className="w-full bg-gray-50 border border-gray-100 text-gray-600 font-bold py-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300 shadow-sm">
                    Play Now
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
