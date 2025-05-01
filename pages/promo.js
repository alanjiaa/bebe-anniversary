// pages/promo.js
import { useState, useEffect } from 'react'
import { useCart } from '@/context/CartContext'
import Link from 'next/link'

export default function PromoPage() {
  // only render after client‐side mount to avoid SSR/client mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // grab from context
  const { points, applyPromo } = useCart()
  const [code, setCode] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    applyPromo(code)
    setCode('')
  }

  // before mount: render nothing (or a spinner)
  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-8">
      <h1 className="text-4xl font-script mb-6">Enter Promo Code</h1>
      <p className="mb-4">
        You currently have <span className="font-bold">{points}</span> Alsie Points.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          className="border border-gray-300 p-2 rounded w-64
                     focus:outline-none focus:ring-2 focus:ring-rose-pink"
        />
        <button
          type="submit"
          className="bg-rose-pink hover:bg-rose-pink/90 text-white
                     font-semibold px-6 py-2 rounded transition"
        >
          Apply Code
        </button>
      </form>

      <Link
        href="/shop"
        className="mt-8 text-rose-pink underline hover:text-rose-pink/90"
      >
        ← Back to Shop
      </Link>
    </div>
  )
}
