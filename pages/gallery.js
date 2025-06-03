import PolaroidGallery from '@/components/PolaroidGallery';
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'

export default function Gallery() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (user.email === 'vivi_444@icloud.com' || user.email === 'alanjiaa@gmail.com') {
        setIsAuthorized(true)
      }
    }
  }, [user, loading])

  if (loading || (!user && typeof window !== 'undefined')) return null

  if (!isAuthorized && user?.email !== 'vivi_444@icloud.com' || user.email === 'alanjiaa@gmail.com') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center flex-col text-center p-6">
        <h1 className="text-3xl font-script mb-4">🔒 Access Denied</h1>
        <p className="text-lg text-gray-700">This page is only accessible to Vivi.</p>
      </div>
    )
  }


  return <PolaroidGallery />;
}
