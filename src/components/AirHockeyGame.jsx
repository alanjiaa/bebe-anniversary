'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Physics, useBox, useCylinder, usePlane } from '@react-three/cannon'
import { Environment, PerspectiveCamera, Text } from '@react-three/drei'
import * as THREE from 'three'

// Constants for table dimensions
const TABLE_WIDTH = 8
const TABLE_LENGTH = 14
const WALL_THICKNESS = 0.5
const WALL_HEIGHT = 0.5
const GOAL_WIDTH = 3
const PADDLE_RADIUS = 0.6
const PUCK_RADIUS = 0.4

// ----------------------------------------------------
// Audio Synthesis (Web Audio API)
// ----------------------------------------------------
const playSound = (type, volume = 1) => {
  if (typeof window === 'undefined') return
  if (!window.audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  const ctx = window.audioCtx
  if (ctx.state === 'suspended') ctx.resume()
  
  const t = ctx.currentTime

  if (type === 'hit' || type === 'wall') {
    // Ice hockey "clack/thud"
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.setValueAtTime(type === 'hit' ? 600 : 300, t)
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05)
    
    // Short burst of noise
    const bufferSize = ctx.sampleRate * 0.05
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer

    // Filter to make it sound like plastic/wood
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = type === 'hit' ? 2000 : 800
    
    const gainNode = ctx.createGain()
    // Reduced volume globally based on user request
    const baseVolume = type === 'hit' ? 0.15 : 0.08
    gainNode.gain.setValueAtTime(baseVolume * volume, t)
    gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.05)
    
    osc.connect(gainNode)
    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    osc.start(t)
    osc.stop(t + 0.05)
    noise.start(t)
    noise.stop(t + 0.05)
  } else if (type === 'score') {
    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()
    osc.connect(gainNode)
    gainNode.connect(ctx.destination)
    osc.type = 'square'
    osc.frequency.setValueAtTime(400, t)
    osc.frequency.setValueAtTime(600, t + 0.1)
    osc.frequency.setValueAtTime(800, t + 0.2)
    // Reduced volume
    gainNode.gain.setValueAtTime(0.05 * volume, t)
    gainNode.gain.linearRampToValueAtTime(0.01, t + 0.4)
    osc.start(t)
    osc.stop(t + 0.4)
  }
}

// ----------------------------------------------------
// UI Overlay Component (HTML Absolute Overlay)
// ----------------------------------------------------
const ScoreOverlay = ({ score }) => (
  <div className="absolute top-6 left-0 w-full flex justify-center pointer-events-none z-50">
    <div className="bg-white/95 backdrop-blur-md border-4 border-rose-100 rounded-3xl px-8 py-3 shadow-2xl flex gap-12 items-center justify-center min-w-[300px]">
      <div className="text-center">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Opponent</p>
        <p className="text-4xl font-black text-gray-800 leading-none">{score.opponent}</p>
      </div>
      <div className="w-1 h-12 bg-gray-100 rounded-full" />
      <div className="text-center">
        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">You</p>
        <p className="text-4xl font-black text-rose-500 leading-none">{score.player}</p>
      </div>
    </div>
  </div>
)

// ----------------------------------------------------
// Puck Component
// ----------------------------------------------------
const Puck = ({ setScore, puckPos }) => {
  const [ref, api] = useCylinder(() => ({
    mass: 1,
    args: [PUCK_RADIUS, PUCK_RADIUS, 0.2, 32],
    position: [0, 0.2, 0],
    material: { friction: 0.0, restitution: 0.9 },
    linearDamping: 0.1,
    angularDamping: 0.1,
    fixedRotation: true, // Prevents puck from flipping or tumbling
    onCollide: (e) => {
      if (e.contact.impactVelocity > 2) {
        playSound(e.body.name === 'paddle' ? 'hit' : 'wall', Math.min(e.contact.impactVelocity / 20, 1))
      }
    }
  }))
  
  const vel = useRef([0, 0, 0])

  useEffect(() => {
    const unsubscribePos = api.position.subscribe(p => (puckPos.current = p))
    const unsubscribeVel = api.velocity.subscribe(v => (vel.current = v))
    return () => {
      unsubscribePos()
      unsubscribeVel()
    }
  }, [api.position, api.velocity, puckPos])

  useFrame(() => {
    const [x, y, z] = puckPos.current
    
    // Player Goal (Positive Z)
    if (z > TABLE_LENGTH / 2 + 0.5 && Math.abs(x) < GOAL_WIDTH / 2) {
      playSound('score')
      setScore(s => ({ ...s, opponent: s.opponent + 1 }))
      api.position.set(0, 0.2, 0)
      api.velocity.set(0, 0, 0)
    }
    // Opponent Goal (Negative Z)
    else if (z < -TABLE_LENGTH / 2 - 0.5 && Math.abs(x) < GOAL_WIDTH / 2) {
      playSound('score')
      setScore(s => ({ ...s, player: s.player + 1 }))
      api.position.set(0, 0.2, 0)
      api.velocity.set(0, 0, 0)
    }
    
    // Safety check: Reset if it glitches completely out of bounds
    if (y < -2 || y > 5 || Math.abs(x) > TABLE_WIDTH + 2 || Math.abs(z) > TABLE_LENGTH + 2) {
      api.position.set(0, 0.2, 0)
      api.velocity.set(0, 0, 0)
    }

    // Speed limit to prevent horizontal tunneling through walls!
    const vx = vel.current[0]
    const vz = vel.current[2]
    const speed = Math.sqrt(vx * vx + vz * vz)
    const MAX_SPEED = 30 // Safe speed that won't tunnel through 0.5 thick walls at 60fps
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed
      api.velocity.set(vx * scale, vel.current[1], vz * scale)
    }
  })

  return (
    <mesh ref={ref} castShadow receiveShadow name="puck">
      <cylinderGeometry args={[PUCK_RADIUS, PUCK_RADIUS, 0.2, 32]} />
      <meshStandardMaterial color="#52525b" roughness={0.2} metalness={0.8} />
    </mesh>
  )
}

// ----------------------------------------------------
// Player Paddle Component
// ----------------------------------------------------
const PlayerPaddle = () => {
  const { camera, mouse } = useThree()
  const [ref, api] = useCylinder(() => ({
    type: 'Kinematic',
    mass: 5,
    args: [PADDLE_RADIUS, PADDLE_RADIUS, 0.4, 32],
    position: [0, 0.2, TABLE_LENGTH / 4],
    material: { friction: 0.1, restitution: 0.5 }
  }))

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const vec = useMemo(() => new THREE.Vector3(), [])
  
  // Track position locally to avoid 1-frame async delay from Cannon subscribe
  const myPos = useRef([0, 0.2, TABLE_LENGTH / 4])

  useFrame((state, delta) => {
    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(plane, vec)
    
    const targetX = THREE.MathUtils.clamp(vec.x, -TABLE_WIDTH / 2 + PADDLE_RADIUS, TABLE_WIDTH / 2 - PADDLE_RADIUS)
    const targetZ = THREE.MathUtils.clamp(vec.z, PADDLE_RADIUS, TABLE_LENGTH / 2 - PADDLE_RADIUS)
    
    const dt = delta || 0.016
    const vx = (targetX - myPos.current[0]) / dt
    const vz = (targetZ - myPos.current[2]) / dt
    
    api.position.set(targetX, 0.2, targetZ)
    api.velocity.set(vx, 0, vz)
    
    myPos.current = [targetX, 0.2, targetZ]
  })

  return (
    <mesh ref={ref} castShadow receiveShadow name="paddle">
      <cylinderGeometry args={[PADDLE_RADIUS * 0.8, PADDLE_RADIUS, 0.4, 32]} />
      <meshStandardMaterial color="#fb7185" roughness={0.3} metalness={0.1} />
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.3} />
      </mesh>
    </mesh>
  )
}

// ----------------------------------------------------
// Opponent AI Paddle
// ----------------------------------------------------
const OpponentPaddle = ({ puckPos }) => {
  const [ref, api] = useCylinder(() => ({
    type: 'Kinematic',
    mass: 5,
    args: [PADDLE_RADIUS, PADDLE_RADIUS, 0.4, 32],
    position: [0, 0.2, -TABLE_LENGTH / 4],
    material: { friction: 0.1, restitution: 0.5 }
  }))

  // Track position locally to avoid 1-frame async delay from Cannon subscribe,
  // which completely breaks LERP math and causes freezing/jittering
  const myPos = useRef([0, 0.2, -TABLE_LENGTH / 4])

  useFrame((state, delta) => {
    const [px, , pz] = puckPos.current
    const currentX = myPos.current[0]
    const currentZ = myPos.current[2]
    
    const targetX = THREE.MathUtils.clamp(px, -TABLE_WIDTH / 2 + PADDLE_RADIUS, TABLE_WIDTH / 2 - PADDLE_RADIUS)
    let targetZ = -TABLE_LENGTH / 4
    if (pz < 0) {
      targetZ = THREE.MathUtils.clamp(pz, -TABLE_LENGTH / 2 + PADDLE_RADIUS, -PADDLE_RADIUS)
    }

    const newX = THREE.MathUtils.lerp(currentX, targetX, 0.08)
    const newZ = THREE.MathUtils.lerp(currentZ, targetZ, 0.08)

    const dt = delta || 0.016
    const vx = (newX - currentX) / dt
    const vz = (newZ - currentZ) / dt

    api.position.set(newX, 0.2, newZ)
    api.velocity.set(vx, 0, vz)
    
    myPos.current = [newX, 0.2, newZ]
  })

  return (
    <mesh ref={ref} castShadow receiveShadow name="paddle">
      <cylinderGeometry args={[PADDLE_RADIUS * 0.8, PADDLE_RADIUS, 0.4, 32]} />
      <meshStandardMaterial color="#d4d4d8" roughness={0.3} metalness={0.1} />
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#a1a1aa" roughness={0.3} />
      </mesh>
    </mesh>
  )
}

// ----------------------------------------------------
// Table Environment Component
// ----------------------------------------------------
const Table = () => {
  usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: { friction: 0.01, restitution: 0.1 }
  }))

  const Wall = ({ position, args }) => {
    const [ref] = useBox(() => ({ type: 'Static', position, args, material: { friction: 0.0, restitution: 0.8 } }))
    return (
      <mesh ref={ref} receiveShadow castShadow name="wall">
        <boxGeometry args={args} />
        <meshStandardMaterial color="#fecdd3" roughness={0.5} />
      </mesh>
    )
  }

  const InvisibleWall = ({ position, args }) => {
    useBox(() => ({ type: 'Static', position, args, material: { friction: 0.0, restitution: 0.5 } }))
    return null
  }

  const Leg = ({ position }) => (
    <mesh position={position} receiveShadow castShadow>
      <cylinderGeometry args={[0.3, 0.2, 4, 16]} />
      <meshStandardMaterial color="#fecdd3" roughness={0.7} />
    </mesh>
  )

  return (
    <group>
      {/* Table Legs */}
      <Leg position={[-TABLE_WIDTH / 2 + 0.5, -2, -TABLE_LENGTH / 2 + 0.5]} />
      <Leg position={[TABLE_WIDTH / 2 - 0.5, -2, -TABLE_LENGTH / 2 + 0.5]} />
      <Leg position={[-TABLE_WIDTH / 2 + 0.5, -2, TABLE_LENGTH / 2 - 0.5]} />
      <Leg position={[TABLE_WIDTH / 2 - 0.5, -2, TABLE_LENGTH / 2 - 0.5]} />

      {/* Floor Visual */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[TABLE_WIDTH, TABLE_LENGTH]} />
        <meshStandardMaterial color="#fff1f2" roughness={0.2} metalness={0.1} />
      </mesh>
      
      {/* Center Line Visual */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TABLE_WIDTH, 0.1]} />
        <meshBasicMaterial color="#fca5a5" />
      </mesh>
      {/* Center Circle */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 32]} />
        <meshBasicMaterial color="#fca5a5" />
      </mesh>
      
      {/* Goal Areas Visual */}
      <mesh position={[0, 0.01, TABLE_LENGTH / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GOAL_WIDTH, 1]} />
        <meshBasicMaterial color="#e11d48" transparent opacity={0.2} />
      </mesh>
      <mesh position={[0, 0.01, -TABLE_LENGTH / 2 + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[GOAL_WIDTH, 1]} />
        <meshBasicMaterial color="#e11d48" transparent opacity={0.2} />
      </mesh>

      {/* Side Walls */}
      <Wall position={[-TABLE_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS, WALL_HEIGHT, TABLE_LENGTH + WALL_THICKNESS * 2]} />
      <Wall position={[TABLE_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS, WALL_HEIGHT, TABLE_LENGTH + WALL_THICKNESS * 2]} />
      
      {/* Top/Bottom Walls (Split for goals) */}
      <Wall position={[-TABLE_WIDTH / 4 - GOAL_WIDTH / 4, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - WALL_THICKNESS / 2]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[TABLE_WIDTH / 4 + GOAL_WIDTH / 4, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - WALL_THICKNESS / 2]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[0, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - WALL_THICKNESS / 2 - 1]} args={[GOAL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[-GOAL_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - WALL_THICKNESS / 2 - 0.5]} args={[WALL_THICKNESS, WALL_HEIGHT, 1]} />
      <Wall position={[GOAL_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - WALL_THICKNESS / 2 - 0.5]} args={[WALL_THICKNESS, WALL_HEIGHT, 1]} />
      
      <Wall position={[-TABLE_WIDTH / 4 - GOAL_WIDTH / 4, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + WALL_THICKNESS / 2]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[TABLE_WIDTH / 4 + GOAL_WIDTH / 4, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + WALL_THICKNESS / 2]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[0, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + WALL_THICKNESS / 2 + 1]} args={[GOAL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[-GOAL_WIDTH / 2 - WALL_THICKNESS / 2, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + WALL_THICKNESS / 2 + 0.5]} args={[WALL_THICKNESS, WALL_HEIGHT, 1]} />
      <Wall position={[GOAL_WIDTH / 2 + WALL_THICKNESS / 2, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + WALL_THICKNESS / 2 + 0.5]} args={[WALL_THICKNESS, WALL_HEIGHT, 1]} />

      {/* HUGE Invisible Physics Bumpers behind the walls to 100% guarantee no tunneling! */}
      <InvisibleWall position={[-TABLE_WIDTH / 2 - 10, WALL_HEIGHT / 2, 0]} args={[20, 10, TABLE_LENGTH + 40]} />
      <InvisibleWall position={[TABLE_WIDTH / 2 + 10, WALL_HEIGHT / 2, 0]} args={[20, 10, TABLE_LENGTH + 40]} />
      
      <InvisibleWall position={[-TABLE_WIDTH / 4 - GOAL_WIDTH / 4, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - 10]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, 10, 20]} />
      <InvisibleWall position={[TABLE_WIDTH / 4 + GOAL_WIDTH / 4, WALL_HEIGHT / 2, -TABLE_LENGTH / 2 - 10]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, 10, 20]} />
      
      <InvisibleWall position={[-TABLE_WIDTH / 4 - GOAL_WIDTH / 4, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + 10]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, 10, 20]} />
      <InvisibleWall position={[TABLE_WIDTH / 4 + GOAL_WIDTH / 4, WALL_HEIGHT / 2, TABLE_LENGTH / 2 + 10]} args={[(TABLE_WIDTH - GOAL_WIDTH) / 2, 10, 20]} />

      {/* Invisible Infinite Ceiling facing DOWN to trap the puck flat on the table! */}
      <InvisibleCeiling />
    </group>
  )
}

// ----------------------------------------------------
// Invisible Infinite Ceiling
// ----------------------------------------------------
const InvisibleCeiling = () => {
  // Puck is at Y=0.2 with height 0.2 (spans Y=0.1 to Y=0.3).
  // Ceiling must be ABOVE Y=0.3 to prevent intersecting and exploding the physics engine!
  usePlane(() => ({
    rotation: [Math.PI / 2, 0, 0], // Facing downwards (-Y)
    position: [0, 0.4, 0],
    material: { friction: 0.0, restitution: 0.1 }
  }))
  return null
}

// ----------------------------------------------------
// Main Game Component
// ----------------------------------------------------
const AirHockeyGame = () => {
  const [score, setScore] = useState({ player: 0, opponent: 0 })
  const puckPos = useRef([0, 0.2, 0])

  return (
    <div className="w-full max-w-6xl mx-auto aspect-[16/10] rounded-[40px] overflow-hidden shadow-2xl border-8 border-white bg-gray-900 relative cursor-none touch-none">
      <ScoreOverlay score={score} />
      
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={['#111827']} />
        <PerspectiveCamera 
          makeDefault 
          position={[0, 10, TABLE_LENGTH / 2 + 6]} 
          fov={55} 
          rotation={[-0.75, 0, 0]} 
        />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={2048}
        />
        <pointLight position={[0, 5, 0]} intensity={0.8} color="#fecdd3" />
        
        <Physics 
          defaultContactMaterial={{ friction: 0, restitution: 1.0 }} 
          gravity={[0, -40, 0]}
        >
          <Table />
          <Puck setScore={setScore} puckPos={puckPos} />
          <PlayerPaddle />
          <OpponentPaddle puckPos={puckPos} />
        </Physics>
        
        <Environment preset="city" />
      </Canvas>
      {/* Decorative Arcade Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  )
}

export default AirHockeyGame
