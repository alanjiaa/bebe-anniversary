'use client'
import { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'

export default function PongPage() {
  const canvasRef = useRef(null)
  const socketRef = useRef(null)
  const [player, setPlayer] = useState(null)
  const [state, setState]   = useState(null)

  useEffect(() => {
    // connect
    socketRef.current = io('http://localhost:3001')
    socketRef.current.on('playerNumber', setPlayer)
    socketRef.current.on('gameState', setState)

    // paddle control
    const handleMouse = e => {
      const rect = canvasRef.current.getBoundingClientRect()
      const y = e.clientY - rect.top - 50
      socketRef.current.emit('paddleMove', y)
    }
    window.addEventListener('mousemove', handleMouse)

    return () => {
      socketRef.current.disconnect()
      window.removeEventListener('mousemove', handleMouse)
    }
  }, [])

  useEffect(() => {
    if (!state) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, 800, 400)

    // draw ball
    ctx.fillStyle = '#F9C2D9'
    ctx.beginPath()
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, 2*Math.PI)
    ctx.fill()

    // draw paddles
    ctx.fillStyle = player===0?'#E8D4F1':'#FFF8F0'
    ctx.fillRect(0, state.paddles[0], 20, 100)
    ctx.fillStyle = player===1?'#E8D4F1':'#FFF8F0'
    ctx.fillRect(780, state.paddles[1], 20, 100)

    // scores
    ctx.fillStyle = '#D63384'
    ctx.font = '24px sans-serif'
    ctx.fillText(state.scores[0], 350, 30)
    ctx.fillText(state.scores[1], 430, 30)
  }, [state, player])

  return (
    <div className="flex flex-col items-center p-8">
      <h1 className="font-script text-3xl text-rose-pink mb-4">Couple Pong</h1>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="border-4 border-white rounded-lg shadow-lg cursor-none"
      />
      {player===null && <p>Watching…</p>}
      {player!==null && <p>You are Player {player + 1}</p>}
    </div>
  )
}
