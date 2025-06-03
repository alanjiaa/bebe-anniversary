// pages/_app.js
import '../styles/globals.css'
import { useRouter } from 'next/router'
import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '../src/context/CartContext'
import dynamic from 'next/dynamic'
import { Toaster } from 'react-hot-toast'
import UserHeader from '../src/components/UserHeader'

// Only load the CartPreview on the client to avoid SSR mismatches
const CartPreview = dynamic(
  () => import('../src/components/CartPreview'),
  { ssr: false }
)

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()

  // Only show CartPreview on /shopping page
  const showCartPreview = router.pathname === '/shop'
  const hideHeaderOn = ['/login', '/signup']

  const showHeader = !hideHeaderOn.includes(router.pathname)

  return (
    <AuthProvider>
      <CartProvider>
        {showHeader && <UserHeader />}
        <Component {...pageProps} />
        {showCartPreview && <CartPreview />}
        <Toaster position="top-right" />
      </CartProvider>
    </AuthProvider>
  )
}
