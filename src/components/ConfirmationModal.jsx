import { motion, AnimatePresence } from 'framer-motion'

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Yes", 
  cancelText = "No",
  confirmColor = "bg-red-500 hover:bg-red-600",
  cancelColor = "bg-gray-500 hover:bg-gray-600"
}) => {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative max-w-md w-full p-8 rounded-2xl text-center shadow-2xl bg-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>

          {/* Icon */}
          <div className="text-6xl mb-4">⚠️</div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            {title}
          </h2>

          {/* Message */}
          <p className="text-lg mb-6 text-gray-600">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={onClose}
              className={`${cancelColor} text-white font-semibold px-6 py-3 rounded-lg transition`}
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`${confirmColor} text-white font-semibold px-6 py-3 rounded-lg transition`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ConfirmationModal
