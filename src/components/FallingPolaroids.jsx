// src/components/FallingPolaroids.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// List of your polaroid thumbnails to use as “raindrops”
const POLAROIDS = [
  '/images/polaroids/image1.jpg',
  '/images/polaroids/image16.jpg',
  '/images/polaroids/image6.jpg',
  // …add as many as you like
]

export default function FallingPolaroids() {
  const [drops, setDrops] = useState([])

  useEffect(() => {
    // Every 800ms, spawn a new drop
    const interval = setInterval(() => {
      const id = Date.now() + Math.random()
      const image = POLAROIDS[Math.floor(Math.random() * POLAROIDS.length)]
      const x = Math.random() * 100  // percent from left
      const rotate = (Math.random() - 0.5) * 30  // random tilt
      const duration = 6 + Math.random() * 4     // between 6s–10s

      setDrops((d) => [
        ...d,
        { id, image, x, rotate, duration },
      ])
    }, 800)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <AnimatePresence>
        {drops.map((drop) => (
          <motion.img
            key={drop.id}
            src={drop.image}
            alt=""
            className="absolute w-32 h-32 object-cover shadow-2xl rounded-sm"
            style={{ left: `${drop.x}%`, rotate: drop.rotate }}
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: '110vh', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: drop.duration,
              ease: 'linear',
            }}
            onAnimationComplete={() =>
              // remove this drop once it’s done falling
              setDrops((d) => d.filter((x) => x.id !== drop.id))
            }
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
