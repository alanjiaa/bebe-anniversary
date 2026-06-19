import dynamic from 'next/dynamic'
import BackNavigation from '@/components/BackNavigation'

const AirHockeyGame = dynamic(() => import('@/components/AirHockeyGame'), { ssr: false })

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-[#faf8f2] flex flex-col items-center justify-center text-gray-800 p-8 pb-20">
      <AirHockeyGame />
      <div className="mt-8">
        <BackNavigation 
          href="/arcade" 
          text="← Back to Arcade" 
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-2xl transition shadow-sm"
        />
      </div>
    </div>
  )
}
