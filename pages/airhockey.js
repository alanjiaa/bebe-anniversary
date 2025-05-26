import dynamic from 'next/dynamic'

const AirHockeyGame = dynamic(() => import('@/components/AirHockeyGame'), { ssr: false })

export default function ArcadePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-blue-700 text-white p-8">
      <AirHockeyGame />
    </div>
  )
}
