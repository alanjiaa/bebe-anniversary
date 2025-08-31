import dynamic from 'next/dynamic'
import BackNavigation from '@/components/BackNavigation'

const AirHockeyGame = dynamic(() => import('@/components/AirHockeyGame'), { ssr: false })

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-blue-700 text-white p-8">
      <AirHockeyGame />
      <BackNavigation 
        href="/home" 
        text="← Back to Home" 
        className="bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-2xl transition backdrop-blur-sm"
      />
    </div>
  )
}
