// pages/home.js
import FallingPolaroids from '@/components/FallingPolaroids'
import { motion } from 'framer-motion'
import Link from 'next/link'

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.3,
    },
  },
}

const heading = {
  hidden: { opacity: 0, y: -40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 12, delay: 0.2 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 20 },
  },
}

export default function HomeMenu() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-cream">
      {/* Falling polaroids in the background */}
      <div className="absolute inset-0 z-0">
        <FallingPolaroids />
      </div>

      {/* Centered menu card */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          className="bg-white/60 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-lg text-center"
          initial="hidden"
          animate="show"
          variants={container}
        >
          <motion.h1
            className="font-script text-4xl text-rose-pink mb-8 drop-shadow"
            variants={heading}
          >
            Hoiiiii bebe welcome to our 1 year anniversary!
          </motion.h1>

          <motion.div className="flex flex-col sm:flex-row gap-6" variants={container}>
            <motion.div variants={item}>
              <Link
                href="/gallery"
                className="block bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold
                           px-6 py-3 rounded-2xl text-lg transition"
              >
                View Our Memories
              </Link>
            </motion.div>

            <motion.div variants={item}>
              <Link
                href="/shop"
                className="block bg-soft-lavender hover:bg-soft-lavender/90 text-white font-semibold
                           px-6 py-3 rounded-2xl text-lg transition"
              >
                Spend Alsie Points
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
