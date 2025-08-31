import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'

const BackNavigation = ({ 
  href = null, 
  text = "← Back", 
  className = "bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm",
  showHomeButton = false 
}) => {
  const router = useRouter()

  const handleBack = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <div className="flex justify-center gap-4 mt-8">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleBack}
        className={className}
      >
        {text}
      </motion.button>
      
      {showHomeButton && (
        <Link href="/home">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold px-6 py-3 rounded-2xl transition"
          >
            🏠 Home
          </motion.button>
        </Link>
      )}
    </div>
  )
}

export default BackNavigation
