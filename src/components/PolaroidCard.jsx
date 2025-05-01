// src/components/PolaroidCard.jsx
import { memo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

const PolaroidCard = memo(function PolaroidCard({ image, caption, onClick }) {
  return (
    <motion.div
      className="cursor-pointer bg-white rounded-xl shadow-lg border-4 border-white overflow-hidden"
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
    >
      <div className="relative w-48 h-48">
        <Image
          src={image}
          alt={caption}
          fill
          style={{ objectFit: 'cover' }}
          loading="lazy"
          sizes="(max-width: 640px) 100vw, 12rem"
        />
      </div>
      <p className="text-center font-script p-2">{caption}</p>
    </motion.div>
  )
})

export default PolaroidCard
