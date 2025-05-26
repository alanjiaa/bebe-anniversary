// pages/_app.js
import '../styles/globals.css'
import { CartProvider } from '../src/context/CartContext'
import dynamic from 'next/dynamic'
import { Toaster } from 'react-hot-toast'
import VersionFooter from '../src/components/VersionFooter'


// Only load the CartPreview on the client to avoid SSR mismatches
const CartPreview = dynamic(
  () => import('../src/components/CartPreview'),
  { ssr: false }
)

export default function MyApp({ Component, pageProps }) {
  return (
    <CartProvider>
      <Component {...pageProps} />
      <CartPreview />
      <Toaster position="top-right" />
      <VersionFooter />
    </CartProvider>
  )
}
