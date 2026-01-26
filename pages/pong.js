import Link from 'next/link'

export default function PongPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-900 text-white">
      <h1 className="font-script text-3xl text-rose-pink mb-4">Couple Pong</h1>
      <p className="mb-8">This game is undergoing maintenance as we migrate to a new serverless architecture.</p>

      <Link href="/home" className="bg-rose-pink hover:bg-rose-pink/90 text-white font-semibold px-6 py-3 rounded-2xl transition">
        ← Back to Home
      </Link>
    </div>
  )
}
