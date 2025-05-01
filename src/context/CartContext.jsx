import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

const CartContext = createContext()
export function useCart() {
  return useContext(CartContext)
}

const PROMO_CODES = {
  LOVE20: 20,
  FIRSTYEAR: 50,
  SURPRISE10: 10,
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || [] }
    catch { return [] }
  })
  const [points, setPoints] = useState(() => {
    try { return parseInt(localStorage.getItem('points'), 10) || 150 }
    catch { return 150 }
  })

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('points', String(points)) }, [points])

  const addToCart = (item) =>
    setCart(c => [...c, { ...item, id: Date.now(), qty: item.qty || 1 }])
  const removeFromCart = (id) =>
    setCart(c => c.filter(i => i.id !== id))
  const updateQuantity = (id, qty) =>
    setCart(c => c.map(i => i.id === id ? { ...i, qty } : i))
  const clearCart = () => setCart([])

  const checkout = () => {
    const total = cart.reduce((sum, i) => sum + i.points * i.qty, 0)
    if (total > points) {
      toast.error('Not enough Alsie Points!')
      return
    }

    localStorage.setItem(
        'lastPurchase',
        JSON.stringify({ items: cart, date: new Date().toISOString(), total })
    )

    setPoints(points - total)
    clearCart()
    toast.success('Purchase successful! 🎉')
  }

  const applyPromo = (code) => {
    const bonus = PROMO_CODES[code.toUpperCase()]
    if (!bonus) {
      toast.error('Invalid promo code')
      return
    }
    setPoints(points + bonus)
    toast.success(`You earned ${bonus} Alsie Points! 💰`)
  }

  return (
    <CartContext.Provider value={{
      cart, points,
      addToCart, removeFromCart, updateQuantity,
      checkout, applyPromo, clearCart
    }}>
      {children}
    </CartContext.Provider>
  )
}
