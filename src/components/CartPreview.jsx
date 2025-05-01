// components/CartPreview.jsx
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useCart } from '@/context/CartContext'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function CartPreview() {
  const router = useRouter()
  const { cart, points, removeFromCart, updateQuantity, checkout } = useCart()
  const total = cart.reduce((sum, i) => sum + i.points * i.qty, 0)
  const [open, setOpen] = useState(false)

  const handleCheckout = () => {
    checkout()                // redeem points & save purchase
    router.push('/checkout')  // go to receipt page
  }

  // hide on certain pages
  const hiddenRoutes = ['/', '/home', '/gallery']
  if (hiddenRoutes.includes(router.pathname)) return null

  return (
    <>
      {/* Cart Icon */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-50 bg-rose-pink p-3 rounded-full text-white shadow-lg"
      >
        🛒
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-rose-pink rounded-full text-xs px-1">
            {cart.length}
          </span>
        )}
      </button>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-16 right-4 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg z-50 max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <h2 className="font-semibold mb-2">Your Basket ({cart.length})</h2>

            {cart.length === 0 ? (
              <p className="text-gray-600">Your basket is empty</p>
            ) : (
              <>
                <ul className="space-y-2 max-h-40 overflow-auto mb-4">
                  {cart.map(item => (
                    <li key={item.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                          <Image src={item.image} alt={item.name} fill style={{ objectFit: 'cover' }}/>
                        </div>
                        <span>{item.name} x{item.qty}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.id, item.qty - 1)} disabled={item.qty <= 1} className="px-1">−</button>
                        <button onClick={() => updateQuantity(item.id, item.qty + 1)} className="px-1">＋</button>
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 px-1">×</button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mb-4">
                  <span className="font-medium">Total:</span> {total} pts<br/>
                  <span className="font-medium">You have:</span> {points} pts
                </div>

                {/* Updated Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-rose-pink text-white py-2 rounded"
                >
                  Checkout & View Receipt
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
