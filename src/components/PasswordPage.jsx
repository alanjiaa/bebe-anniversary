// src/components/PasswordPage.jsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

const slides = [
  '/images/polaroids/image1.jpg',
  '/images/polaroids/image6.jpg',
  '/images/polaroids/image15.jpg',
  '/images/polaroids/image12.jpg',
]

export default function PasswordPage() {
  const [password, setPassword] = useState('')
  const router = useRouter()
  const correct = process.env.NEXT_PUBLIC_SECRET_CODE

  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === correct) {
      router.push('/home')
    } else {
      alert('❌ Wrong PW! Try again.')
      setPassword('')
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-rose-pink to-soft-lavender">
      {/* 3D Carousel */}
      <div
        className="relative w-72 h-72 mb-8"
        style={{ perspective: 1000 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: [0, 360] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        >
          {slides.map((src, i) => {
            const angle = (360 / slides.length) * i
            return (
              <div
                key={src}
                className="absolute top-1/2 left-1/2 w-56 h-56 -translate-x-1/2 -translate-y-1/2"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(300px)`
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover border-4 border-white rounded-sm shadow-2xl"
                />
              </div>
            )
          })}
        </motion.div>
      </div>

      <h1 className="font-script text-4xl text-white mb-6 drop-shadow-lg">
        Welcome bébé 💖
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex space-x-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl"
      >
        <input
          type="password"
          placeholder="Secret Code"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded-lg p-3 w-64 focus:outline-none focus:ring-2 focus:ring-rose-pink"
        />
        <button
          type="submit"
          className="bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold px-6 rounded-lg transition"
        >
          Enter
        </button>
      </form>
    </div>
  )
}
