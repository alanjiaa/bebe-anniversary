'use client'
import { useEffect, useRef, useState } from 'react'

const AirHockeyGame = () => {
  const canvasRef = useRef(null)
  const [score, setScore] = useState({ player: 0, opponent: 0 })

  const canvasWidth = 800
  const canvasHeight = 500

  const paddleRadius = 30
  const puckRadius = 15

  let paddle = { x: canvasWidth / 2, y: canvasHeight - 60 }
  let opponent = { x: canvasWidth / 2, y: 60 }
  let puck = { x: canvasWidth / 2, y: canvasHeight / 2, vx: 4, vy: 4 }

  const resetPuck = () => {
    puck.x = canvasWidth / 2
    puck.y = canvasHeight / 2
    puck.vx = (Math.random() > 0.5 ? 1 : -1) * 4
    puck.vy = (Math.random() > 0.5 ? 1 : -1) * 4
  }

  const update = (ctx) => {
    puck.x += puck.vx
    puck.y += puck.vy
  
    // Wall bounce (side walls only)
    if (puck.x - puckRadius < 0 || puck.x + puckRadius > canvasWidth) puck.vx *= -1
  
    // Goal dimensions
    const goalWidth = 200
    const goalLeft = (canvasWidth - goalWidth) / 2
    const goalRight = goalLeft + goalWidth
  
    // Goal detection
    if (
      puck.y - puckRadius <= 0 && 
      puck.x > goalLeft && 
      puck.x < goalRight
    ) {
      setScore((s) => ({ ...s, player: s.player + 1 }))
      resetPuck()
    } else if (
      puck.y + puckRadius >= canvasHeight && 
      puck.x > goalLeft && 
      puck.x < goalRight
    ) {
      setScore((s) => ({ ...s, opponent: s.opponent + 1 }))
      resetPuck()
    } else if (puck.y - puckRadius <= 0 || puck.y + puckRadius >= canvasHeight) {
      // Bounce off top/bottom walls if not in goal
      puck.vy *= -1
    }
  
    // Paddle collisions
    const hit = (px, py) => {
      const dx = puck.x - px
      const dy = puck.y - py
      return Math.sqrt(dx * dx + dy * dy) < paddleRadius + puckRadius
    }
  
    if (hit(paddle.x, paddle.y) || hit(opponent.x, opponent.y)) {
      puck.vy *= -1
    }
  
    // Basic opponent AI
    if (opponent.x < puck.x) opponent.x += 2
    else opponent.x -= 2
    if (opponent.y < puck.y && opponent.y < canvasHeight / 2) opponent.y += 1.5
    else if (opponent.y > canvasHeight / 4) opponent.y -= 1.5
  
    // Draw everything
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  
    // Midline
    ctx.strokeStyle = '#ccc'
    ctx.beginPath()
    ctx.moveTo(0, canvasHeight / 2)
    ctx.lineTo(canvasWidth, canvasHeight / 2)
    ctx.stroke()
  
    // Draw goals
    ctx.fillStyle = '#888'
    ctx.fillRect(goalLeft, 0, goalWidth, 10) // Top goal
    ctx.fillRect(goalLeft, canvasHeight - 10, goalWidth, 10) // Bottom goal
  
    // Puck
    ctx.fillStyle = '#f00'
    ctx.beginPath()
    ctx.arc(puck.x, puck.y, puckRadius, 0, 2 * Math.PI)
    ctx.fill()
  
    // Paddles
    ctx.fillStyle = '#00f'
    ctx.beginPath()
    ctx.arc(paddle.x, paddle.y, paddleRadius, 0, 2 * Math.PI)
    ctx.fill()
  
    ctx.fillStyle = '#0f0'
    ctx.beginPath()
    ctx.arc(opponent.x, opponent.y, paddleRadius, 0, 2 * Math.PI)
    ctx.fill()
  
    // Score
    ctx.fillStyle = '#fff'
    ctx.font = '24px sans-serif'
    ctx.fillText(`You: ${score.player}  Opponent: ${score.opponent}`, 10, 30)
  }
  

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // Restrict to bottom half
      if (y > canvasHeight / 2 + paddleRadius) {
        paddle.x = x
        paddle.y = y
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    let animationId
    const loop = () => {
      update(ctx)
      animationId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(animationId)
      canvas.removeEventListener('mousemove', handleMouseMove)
    }
  }, [score])

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold mb-4">🎯 Arcade Air Hockey</h2>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="rounded-lg shadow-lg border-4 border-white"
      />
    </div>
  )
}

export default AirHockeyGame
