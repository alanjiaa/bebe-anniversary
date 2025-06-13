import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'

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
  const { user } = useAuth()
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart')) || [] }
    catch { return [] }
  })
  const [points, setPoints] = useState(150)
  const [isLoading, setIsLoading] = useState(true)

  // Load points from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setPoints(150)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const userDoc = doc(db, 'users', user.uid)

    // Set up real-time listener for points
    const unsubscribe = onSnapshot(userDoc, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const currentPoints = userData.points
          // Handle both number and string types, and ensure it's a valid number
          const pointsValue = typeof currentPoints === 'string' ? 
            parseInt(currentPoints, 10) : 
            (typeof currentPoints === 'number' ? currentPoints : 150)
          
          console.log('Points updated from Firestore:', pointsValue)
          setPoints(pointsValue)
        } else {
          // Initialize new user with default points
          console.log('Initializing new user with 150 points')
          setDoc(userDoc, { points: 150 })
            .then(() => setPoints(150))
            .catch(error => {
              console.error('Error initializing user:', error)
              toast.error('Error setting up your account')
            })
        }
        setIsLoading(false)
      },
      (error) => {
        console.error('Error listening to points:', error)
        toast.error('Error loading points')
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Save cart to localStorage
  useEffect(() => { 
    localStorage.setItem('cart', JSON.stringify(cart)) 
  }, [cart])

  const addToCart = (item) =>
    setCart(c => [...c, { ...item, id: Date.now(), qty: item.qty || 1 }])
  const removeFromCart = (id) =>
    setCart(c => c.filter(i => i.id !== id))
  const updateQuantity = (id, qty) =>
    setCart(c => c.map(i => i.id === id ? { ...i, qty } : i))
  const clearCart = () => setCart([])

  const checkout = async () => {
    if (!user) {
      toast.error('Please log in to make a purchase')
      return false
    }

    const total = cart.reduce((sum, i) => sum + i.points * i.qty, 0)
    if (total > points) {
      toast.error(`Not enough Alsie Points! You need ${total} points but only have ${points}`)
      return false
    }

    try {
      const userDoc = doc(db, 'users', user.uid)
      const newPoints = Math.max(0, points - total) // Ensure points don't go below 0

      // Save purchase history
      localStorage.setItem(
        'lastPurchase',
        JSON.stringify({ items: cart, date: new Date().toISOString(), total })
      )

      // Update points in Firestore
      await updateDoc(userDoc, { points: newPoints })
      console.log('Points updated in Firestore:', newPoints)
      
      clearCart()
      toast.success('Purchase successful! 🎉')
      return true
    } catch (error) {
      console.error('Error during checkout:', error)
      toast.error('Error processing checkout')
      return false
    }
  }

  const applyPromo = async (code) => {
    if (!user) {
      toast.error('Please log in to use promo codes')
      return
    }

    const bonus = PROMO_CODES[code.toUpperCase()]
    if (!bonus) {
      toast.error('Invalid promo code')
      return
    }

    try {
      const userDoc = doc(db, 'users', user.uid)
      const newPoints = points + bonus
      await updateDoc(userDoc, { points: newPoints })
      console.log('Promo points added in Firestore:', newPoints)
      toast.success(`You earned ${bonus} Alsie Points! 💰`)
    } catch (error) {
      console.error('Error applying promo:', error)
      toast.error('Error applying promo code')
    }
  }

  return (
    <CartContext.Provider value={{
      cart, points, isLoading,
      addToCart, removeFromCart, updateQuantity,
      checkout, applyPromo, clearCart
    }}>
      {children}
    </CartContext.Provider>
  )
}
