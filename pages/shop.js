// pages/shop.js
import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import ProtectedRoute from '@/components/ProtectedRoute'

const items = [
  { id: 1, name: 'Free Boba',    image: '/images/shopping/milktea.jpeg',     points: 20 },
  { id: 2, name: '1hr Massage', image: '/images/shopping/massage.png',  points: 50 },
  { id: 3, name: 'Cinema Date',   image: '/images/shopping/movie-date.webp',     points: 80 },
  { id: 4, name: 'Meet Fresh',   image: '/images/shopping/meetfresh.jpeg',     points: 30 },
  { id: 5, name: 'Fried Chicken',   image: '/images/shopping/jolibee.webp',     points: 65 },
  { id: 6, name: 'Free Coffee',   image: '/images/shopping/coffee.jpg',     points: 10 },
  { id: 7, name: 'Sephora Gift ',   image: '/images/shopping/sephora.webp',     points: 500 }
]

export default function ShopPage() {
  const { points, addToCart } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ProtectedRoute>
      <div className="min-h-screen p-8 bg-cream">
        <h1 className="text-3xl font-script mb-4">Alsie Shop 🛍️</h1>

        {/* Only show the points once hydrated */}
        {mounted && (
          <p className="mb-6">
            Your Points: <span className="font-bold">{points}</span>
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.05 }}
              className="bg-white p-6 rounded-xl shadow flex flex-col items-center"
            >
              <div className="relative w-32 h-32 mb-4">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  loading="lazy"
                  sizes="(max-width:128px) 100vw, 128px"
                />
              </div>
              <h2 className="font-semibold mb-2">{item.name}</h2>
              <p className="mb-4">{item.points} pts</p>
              <button
                onClick={() => addToCart({ ...item, qty: 1 })}
                className="mt-auto bg-rose-pink text-white px-4 py-2 rounded transition hover:bg-rose-pink/90"
              >
                Add to Basket
              </button>
            </motion.div>
          ))}
        </div>
   
        {/* Link to promo page */}
        <div className="mt-8 flex justify-center gap-4 flex-wrap">
        <Link
        href="/home" className="bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold px-6 py-3 rounded-2xl transition"
        >
        ← Back to Menu
        </Link>
        <Link href="/promo" className="bg-soft-lavender hover:bg-soft-lavender/90 text-white font-semibold px-6 py-3 rounded-2xl transition"
        >
        Have a Promo Code?
        </Link>
        </div>
      </div>
    </ProtectedRoute>
  )
}
