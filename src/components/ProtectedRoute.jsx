import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show nothing while checking authentication
  if (loading) {
    return null
  }

  // If not authenticated, don't render children
  if (!user) {
    return null
  }

  // If authenticated, render children
  return children
} 