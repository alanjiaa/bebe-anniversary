// pages/home.js
import FallingPolaroids from '@/components/FallingPolaroids'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import VersionFooter from '../src/components/VersionFooter'
import { FaSearch } from 'react-icons/fa'

// Define the custom attractions matching the generated graphic exactly
const ATTRACTIONS = [
  {
    id: 'gallery',
    title: 'Cozy Memories Cottage',
    description: 'Walk down memory lane! Browse our polaroids, letters, diaries, and timeline milestones.',
    href: '/gallery',
    icon: '🏡',
    category: 'Rides',
    // Hotspot coordinates (percentage on the map container)
    coords: { left: '47%', top: '29.5%', width: '20%', height: '40%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  },
  {
    id: 'arcade',
    title: 'Bebe Arcade',
    description: 'Play games to win Alsie Points! Includes Casino, Air Hockey, Pong, and the Photobooth.',
    href: '/arcade',
    icon: '🕹️',
    category: 'Games',
    coords: { left: '14%', top: '35.5%', width: '24%', height: '33%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  },
  {
    id: 'spin-wheel',
    title: 'Spin the Wheel',
    description: 'Hop on the Ferris Wheel and spin the lucky wheel to claim tokens, rewards, and sweet promises.',
    href: '/spin-wheel',
    icon: '🎡',
    category: 'Rides',
    coords: { left: '26.5%', top: '10%', width: '22%', height: '25%' },
    tooltipPosition: { bottom: '40%', left: '15%', transform: 'translateX(-50%)' }
  },
  {
    id: 'shop',
    title: 'Souvenir Shop',
    description: 'Redeem your hard-earned Alsie Points for real-world gift coupons, cute vouchers, and cute dates.',
    href: '/shop',
    icon: '🏪',
    category: 'Shop',
    coords: { left: '69%', top: '21.5%', width: '20%', height: '35%' },
    tooltipPosition: { bottom: '58%', left: '25%', transform: 'translateX(-50%)' }
  },
  // {
  //   id: 'photobooth',
  //   title: 'Photobooth Kiosk',
  //   description: 'Strike a pose! Snap cute digital photo strips with custom frames, borders, and lovely filters.',
  //   href: '/photobooth',
  //   icon: '📷',
  //   category: 'Games',
  //   coords: { left: '50.5%', top: '44.5%', width: '16%', height: '17%' },
  //   tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  // },
  {
    id: 'home',
    title: 'Bebe Land Entrance',
    description: 'Return to the bebe land entrance',
    href: '/home',
    icon: '🎪',
    category: 'Rides',
    coords: { left: '23%', top: '73.5%', width: '15%', height: '23%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  }
]

// Custom Bear Head SVG for logo
const BearHeadLogo = () => (
  <svg viewBox="0 0 100 100" className="w-9 h-9 mx-1">
    <circle cx="28" cy="28" r="14" fill="#a16207" />
    <circle cx="72" cy="28" r="14" fill="#a16207" />
    <circle cx="28" cy="28" r="8" fill="#fecdd3" />
    <circle cx="72" cy="28" r="8" fill="#fecdd3" />
    <circle cx="50" cy="55" r="32" fill="#a16207" />
    <circle cx="50" cy="55" r="30" fill="#d97706" />
    <ellipse cx="50" cy="62" rx="13" ry="9" fill="#fff" />
    <polygon points="50,56 46,51 54,51" fill="#1e1b4b" />
    <circle cx="38" cy="46" r="3.5" fill="#1e1b4b" />
    <circle cx="62" cy="46" r="3.5" fill="#1e1b4b" />
    <ellipse cx="28" cy="54" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.65" />
    <ellipse cx="72" cy="54" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.65" />
  </svg>
)

const AeroCloud = ({ className }) => (
  <svg viewBox="0 0 100 60" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#e0f7fa" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#b2ebf2" stopOpacity="0.75" />
      </linearGradient>
      <filter id="cloudGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#00bcd4" floodOpacity="0.3" />
        <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#ffffff" floodOpacity="0.9" />
      </filter>
    </defs>
    <path
      d="M 25 50 C 15 50 10 40 15 30 C 10 20 20 10 35 15 C 40 5 60 5 65 15 C 80 10 90 20 85 30 C 90 40 85 50 75 50 Z"
      fill="url(#cloudGrad)"
      filter="url(#cloudGlow)"
    />
  </svg>
)

export default function HomeMenu() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1);

  // Custom Modals states
  const [showShowtimesModal, setShowShowtimesModal] = useState(false)
  const [showRestaurantModal, setShowRestaurantModal] = useState(false)
  const [showTicketsModal, setShowTicketsModal] = useState(false)
  const [activeTab, setActiveTab] = useState('EXPLORE')

  // Debug hotspots helper
  const [debugMode, setDebugMode] = useState(false)
  const [clickCount, setClickCount] = useState(0)
  const [showBottomPane, setShowBottomPane] = useState(false)

  const handleMenuClick = () => {
    // Hidden debug toggle by clicking Menu text 3 times
    setClickCount((c) => {
      if (c >= 2) {
        setDebugMode((d) => !d)
        return 0
      }
      return c + 1
    })
  }

  // Close tooltip when clicking background
  const handleMapBackgroundClick = (e) => {
    if (e.target.id === 'map-wrapper-canvas' || e.target.id === 'map-bg-image') {
      setSelectedId(null)
    }
    if (debugMode) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      console.log(`Clicked coords: left: '${x.toFixed(1)}%', top: '${y.toFixed(1)}%'`)
    }
  }

  // Filter attractions based on search query and category tab selection
  const filteredAttractions = ATTRACTIONS.filter((attr) => {
    const matchesSearch = attr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      attr.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeFilter === 'All') return matchesSearch
    return matchesSearch && attr.category === activeFilter
  })

  // Determine if a specific landmark should be highlighted
  const isHighlighted = (attrId) => {
    const attr = ATTRACTIONS.find((a) => a.id === attrId)
    if (!attr) return false

    // Check query match
    if (searchQuery.trim()) {
      const match = attr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attr.description.toLowerCase().includes(searchQuery.toLowerCase())
      if (!match) return false
    }

    // Check active category filter match
    if (activeFilter !== 'All' && attr.category !== activeFilter) {
      return false
    }

    return true
  }

  return (
    <div className="relative h-screen w-full bg-[#FDFDFD] overflow-hidden select-none flex items-center justify-center">

      {/* 16:9 Aspect Ratio Map Board Container */}
      <div
        onClick={handleMapBackgroundClick}
        id="map-wrapper-canvas"
        // Added transition-transform for smooth zooming
        className="relative aspect-[16/9] w-full h-full max-w-[177.78vh] max-h-[56.25vw] overflow-hidden cursor-default transition-transform duration-300 ease-out"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {/* Main Map Background Illustration */}
        <img
          src="/images/bebe-land-map.png"
          alt="Bebe Land Map Illustration"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
          id="map-bg-image"
        />

        {/* Interactive Landmark Hotspots */}
        {ATTRACTIONS.map((attr) => {
          const isMatch = isHighlighted(attr.id)
          const isSel = selectedId === attr.id
          const isHover = hoveredId === attr.id
          const showActiveGlow = isMatch && (isSel || isHover)

          return (
            <div
              key={attr.id}
              style={{
                position: 'absolute',
                left: attr.coords.left,
                top: attr.coords.top,
                width: attr.coords.width,
                height: attr.coords.height,
                zIndex: isSel ? 50 : 20,
              }}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredId(attr.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedId(selectedId === attr.id ? null : attr.id)}
            >
              {/* Hotspot Debug outlines */}
              {debugMode && (
                <div className="absolute inset-0 border-2 border-red-500 bg-red-500/20 flex items-center justify-center z-40">
                  <span className="bg-black text-white text-[9px] px-1 font-mono rounded">{attr.id}</span>
                </div>
              )}

              {/* Glow ring indicator showing filter status or selection */}
              <div className={`absolute inset-[-4px] rounded-full blur-[8px] transition-all duration-300 pointer-events-none ${showActiveGlow
                ? 'bg-rose-500/40 opacity-100 scale-105'
                : isMatch
                  ? 'bg-amber-400/10 group-hover:bg-amber-400/30 opacity-70'
                  : 'opacity-0 scale-95'
                }`} />

              {/* Pulse ring animation on matching active filter attractions */}
              {isMatch && !selectedId && (
                <div className="absolute inset-0 border border-[#ff758f]/40 rounded-full animate-ping pointer-events-none opacity-40" />
              )}

              {/* Floating Tooltip Bubble when selected */}
              <AnimatePresence>
                {isSel && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      ...attr.tooltipPosition,
                    }}
                    initial={{ scale: 0.85, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: 10 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-[180px] sm:w-[220px] bg-white border border-gray-200/80 p-3 rounded-2xl shadow-xl z-50 text-center flex flex-col items-center justify-center cursor-default gap-1.5"
                    onClick={(e) => e.stopPropagation()} // Prevent closing on tooltip click
                  >
                    {/* Tooltip arrow pointing down */}
                    <div className="absolute top-[100%] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.06)]" />

                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-xl">{attr.icon}</span>
                      <h3 className="font-extrabold text-[12px] sm:text-sm text-gray-800 uppercase tracking-wide">
                        {attr.title}
                      </h3>
                    </div>
                    <p className="text-gray-500 text-[9px] sm:text-[11px] leading-relaxed font-semibold">
                      {attr.description}
                    </p>
                    <Link
                      href={attr.href}
                      className="mt-1 block text-center text-white text-[10px] sm:text-xs font-bold py-1.5 px-4 rounded-full shadow bg-gradient-to-r from-[#ff758f] to-rose-500 hover:brightness-105 active:scale-95 transition-all w-full"
                    >
                      Enter 🚪
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {/* Toggle Button for Bottom Pane */}
        <div className="absolute bottom-6 left-6 z-40">
          <button
            onClick={() => setShowBottomPane(!showBottomPane)}
            className="w-14 h-14 bg-white/90 backdrop-blur-md text-gray-700 border-2 border-[#ff758f] rounded-full shadow-xl flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition"
          >
            {showBottomPane ? '✕' : '🔍'}
          </button>
        </div>

        {/* Bottom Panel Container (Search bar + Filters + Action Buttons) */}
        <AnimatePresence>
          {showBottomPane && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-24 left-6 w-full max-w-[360px] md:max-w-[400px] bg-white/95 backdrop-blur-md border border-gray-200 p-5 rounded-[32px] shadow-2xl flex flex-col gap-4 z-40"
            >

              {/* Search bar & Results */}
              <div className="w-full flex flex-col gap-2">
                {/* Find search bar */}
                <div className="relative w-full">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Search places... (Casino, Shop, Gallery...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 pl-11 pr-5 text-gray-700 placeholder-gray-400 text-xs font-semibold focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200 transition shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery.trim() && (() => {
                  const SEARCHABLE_PAGES = [
                    { name: 'Casino', icon: '🎰', href: '/casino', desc: 'Try your luck at the slots & cards' },
                    { name: 'Shop', icon: '🛍️', href: '/shop', desc: 'Browse the souvenir shop' },
                    { name: 'Photo Booth', icon: '📸', href: '/photobooth', desc: 'Take fun photos together' },
                    { name: 'Gallery', icon: '🖼️', href: '/gallery', desc: 'View your photo memories' },
                    { name: 'Spin Wheel', icon: '🎡', href: '/spin-wheel', desc: 'Spin the prize wheel' },
                    { name: 'Complaints', icon: '📝', href: '/complaints', desc: 'Submit feedback or complaints' },
                    { name: 'Air Hockey', icon: '🏒', href: '/airhockey', desc: 'Play air hockey' },
                    { name: 'Pong', icon: '🏓', href: '/pong', desc: 'Classic pong game' },
                    { name: 'Profile', icon: '👤', href: '/profile', desc: 'View your profile & settings' },
                    { name: 'Checkout', icon: '💳', href: '/checkout', desc: 'Complete your purchase' },
                  ]
                  const results = SEARCHABLE_PAGES.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  return (
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                      {results.length === 0 ? (
                        <div className="text-center text-gray-400 text-xs font-semibold py-3">
                          No results found for "{searchQuery}" 🔍
                        </div>
                      ) : (
                        results.map(page => (
                          <Link
                            key={page.href}
                            href={page.href}
                            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-rose-50 transition group"
                          >
                            <span className="text-xl w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 group-hover:scale-110 transition">{page.icon}</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-gray-800">{page.name}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{page.desc}</span>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Bottom Action Grid Row */}
              <div className="w-full grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowShowtimesModal(true)}
                  className="bg-[#45cfc9] hover:bg-[#38bdb7] active:scale-95 text-white font-bold py-3 px-2 rounded-2xl shadow transition text-[10px] uppercase tracking-wider text-center"
                >
                  Upcoming Events🎡
                </button>

                <button
                  onClick={() => setShowRestaurantModal(true)}
                  className="bg-[#ff758f] hover:bg-[#ff5a79] active:scale-95 text-white font-bold py-3 px-2 rounded-2xl shadow transition text-[10px] uppercase tracking-wider text-center"
                >
                  Dining 🍔
                </button>

                <button
                  onClick={() => setShowTicketsModal(true)}
                  className="bg-[#45cfc9] hover:bg-[#38bdb7] active:scale-95 text-white font-bold py-3 px-2 rounded-2xl shadow transition text-[10px] uppercase tracking-wider text-center"
                >
                  Tickets 🎟️
                </button>

                <Link
                  href="/complaints"
                  className="bg-gray-50 border border-gray-200 hover:bg-gray-100 active:scale-95 text-gray-700 font-bold py-3 px-2 rounded-2xl shadow transition text-[10px] uppercase tracking-wider text-center flex items-center justify-center"
                >
                  Help Desk 💬
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Living Map Animations Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {/* Drifting Clouds */}
        <AeroCloud className="cloud-drift-1 absolute top-[8%] left-[-150px] w-40 h-24 opacity-80" />
        <AeroCloud className="cloud-drift-2 absolute top-[18%] right-[-150px] w-48 h-28 opacity-70" />
        <AeroCloud className="cloud-drift-3 absolute top-[5%] left-[-100px] w-32 h-20 opacity-60" />

        {/* Flying Birds */}
        <svg className="bird-fly-1 absolute top-[15%] left-[-30px] w-8 h-8 opacity-70" viewBox="0 0 40 20">
          <path d="M 0 10 Q 10 0 20 10 Q 30 0 40 10" stroke="#555" strokeWidth="2" fill="none">
            <animate attributeName="d" values="M 0 10 Q 10 0 20 10 Q 30 0 40 10;M 0 10 Q 10 15 20 10 Q 30 15 40 10;M 0 10 Q 10 0 20 10 Q 30 0 40 10" dur="0.6s" repeatCount="indefinite" />
          </path>
        </svg>
        <svg className="bird-fly-2 absolute top-[10%] left-[-50px] w-6 h-6 opacity-50" viewBox="0 0 40 20">
          <path d="M 0 10 Q 10 0 20 10 Q 30 0 40 10" stroke="#666" strokeWidth="2" fill="none">
            <animate attributeName="d" values="M 0 10 Q 10 0 20 10 Q 30 0 40 10;M 0 10 Q 10 15 20 10 Q 30 15 40 10;M 0 10 Q 10 0 20 10 Q 30 0 40 10" dur="0.5s" repeatCount="indefinite" />
          </path>
        </svg>
        <svg className="bird-fly-3 absolute top-[22%] left-[-20px] w-5 h-5 opacity-40" viewBox="0 0 40 20">
          <path d="M 0 10 Q 10 0 20 10 Q 30 0 40 10" stroke="#777" strokeWidth="2" fill="none">
            <animate attributeName="d" values="M 0 10 Q 10 0 20 10 Q 30 0 40 10;M 0 10 Q 10 15 20 10 Q 30 15 40 10;M 0 10 Q 10 0 20 10 Q 30 0 40 10" dur="0.7s" repeatCount="indefinite" />
          </path>
        </svg>

        {/* Floating Hot Air Balloons */}
        <div className="balloon-float-1 absolute bottom-[10%] left-[20%] text-2xl drop-shadow-md">🎈</div>
        <div className="balloon-float-2 absolute bottom-[20%] right-[30%] text-3xl drop-shadow-md">🎈</div>

        {/* Twinkling Theme Park Lights / Sparkles */}
        <div className="absolute top-[35%] left-[25%] w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_#fde047] animate-ping opacity-75" />
        <div className="absolute top-[45%] right-[35%] w-2.5 h-2.5 bg-pink-400 rounded-full shadow-[0_0_10px_#f472b6] animate-pulse opacity-80" />
        <div className="absolute top-[20%] left-[65%] w-2 h-2 bg-cyan-300 rounded-full shadow-[0_0_8px_#67e8f9] animate-ping opacity-60" />
        <div className="absolute top-[55%] left-[45%] w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_#fbbf24] animate-pulse opacity-90" />
        <div className="absolute top-[30%] left-[38%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_#fff] animate-ping opacity-50" />
        <div className="absolute top-[50%] left-[58%] w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_6px_#fff] animate-pulse opacity-40" />

        {/* Chimney Smoke from Cottage */}
        <div className="absolute top-[32%] left-[42%] flex flex-col items-center gap-1">
          <div className="smoke-puff w-3 h-3 bg-white/50 rounded-full" style={{ animationDelay: '0s' }} />
          <div className="smoke-puff w-2.5 h-2.5 bg-white/40 rounded-full" style={{ animationDelay: '0.8s' }} />
          <div className="smoke-puff w-2 h-2 bg-white/30 rounded-full" style={{ animationDelay: '1.6s' }} />
        </div>
      </div>

      {/* Floating BEBE LAND Logo */}
      <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <div className="flex items-center justify-center cursor-pointer pointer-events-auto drop-shadow-[0_2px_8px_rgba(255,117,143,0.4)]" onClick={handleMenuClick}>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">B</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">E</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">B</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">E</span>
          <BearHeadLogo />
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">L</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">A</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">N</span>
          <span className="text-3xl md:text-4xl font-black text-[#ff758f] tracking-wide font-sans">D</span>
        </div>
      </div>

      {/* MODAL 1: Live Show Times */}
      <AnimatePresence>
        {showShowtimesModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md p-6 rounded-[28px] border-2 border-white shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🎡 Events
              </h3>
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-semibold text-xs text-[#ff758f]">10:00 AM</span>
                  <span className="text-xs text-gray-700 font-medium">Yoghurt breakie</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-semibold text-xs text-[#ff758f]">1:00 PM</span>
                  <span className="text-xs text-gray-700 font-medium">Gym sesh</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-semibold text-xs text-[#ff758f]">6:00 PM</span>
                  <span className="text-xs text-gray-700 font-medium">Spagbol dinner</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-semibold text-xs text-[#ff758f]">8:30 PM</span>
                  <span className="text-xs text-gray-700 font-medium">Love island stream</span>
                </div>
              </div>
              <button
                onClick={() => setShowShowtimesModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-2xl transition"
              >
                Close Booklet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Restaurant Menu */}
      <AnimatePresence>
        {showRestaurantModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md p-6 rounded-[28px] border-2 border-white shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                🍔 Bebe Land Diner Menu
              </h3>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Sarvs slice 🍕</span>
                    <span className="text-[10px] text-gray-400">Alan & Vivi's pizza outing</span>
                  </div>
                  <span className="text-xs font-bold text-[#ff758f]">5 Points</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Vivi Spagbol 🍝</span>
                    <span className="text-[10px] text-gray-400">Meatballs and Spaghetti by Vi</span>
                  </div>
                  <span className="text-xs font-bold text-[#ff758f]">8 Points</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-gray-800">Couples Sushi Box 🍣</span>
                    <span className="text-[10px] text-gray-400">Fresh salmon maki platters</span>
                  </div>
                  <span className="text-xs font-bold text-[#ff758f]">10 Points</span>
                </div>
              </div>
              <button
                onClick={() => setShowRestaurantModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-2xl transition"
              >
                Close Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Buy Tickets */}
      <AnimatePresence>
        {showTicketsModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm p-6 rounded-[28px] border-2 border-white shadow-2xl relative text-center"
            >
              <span className="text-4xl mb-2 inline-block">🎟️</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Bebe Land Admission</h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed mb-6">
                Admission to Bebe Land is free! Paid in full with love and smiles. No tickets are required to enter any attraction. ❤️
              </p>
              <button
                onClick={() => setShowTicketsModal(false)}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-2xl transition shadow-md"
              >
                Yuh
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded Animations and Keyframes */}
      <style jsx global>{`
        @keyframes cloud-slide-right {
          0% { transform: translateX(0); }
          100% { transform: translateX(120vw); }
        }
        @keyframes cloud-slide-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-120vw); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) rotate(-5deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-70vh) rotate(5deg); opacity: 0; }
        }
        @keyframes walk-right {
          0% { transform: translateX(0); }
          100% { transform: translateX(110vw); }
        }
        @keyframes walk-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-110vw); }
        }
        @keyframes fly-right {
          0% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(25vw) translateY(-15px); }
          50% { transform: translateX(55vw) translateY(5px); }
          75% { transform: translateX(80vw) translateY(-10px); }
          100% { transform: translateX(110vw) translateY(0); }
        }
        @keyframes smoke-rise {
          0% { transform: translateY(0) scale(1); opacity: 0.5; }
          50% { transform: translateY(-20px) scale(1.8); opacity: 0.25; }
          100% { transform: translateY(-40px) scale(2.5); opacity: 0; }
        }
        @keyframes ocean-drift {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        .cloud-drift-1 { animation: cloud-slide-right 55s infinite linear; }
        .cloud-drift-2 { animation: cloud-slide-left 65s infinite linear; }
        .cloud-drift-3 { animation: cloud-slide-right 45s infinite linear 15s; }
        .balloon-float-1 { animation: float-up 25s infinite ease-in; }
        .balloon-float-2 { animation: float-up 35s infinite ease-in 12s; }
        .person-walk-1 { animation: walk-right 30s infinite linear 2s; }
        .person-walk-2 { animation: walk-left 35s infinite linear 8s; }
        .person-walk-3 { animation: walk-right 28s infinite linear 15s; }
        .bird-fly-1 { animation: fly-right 18s infinite linear 0s; }
        .bird-fly-2 { animation: fly-right 22s infinite linear 6s; }
        .bird-fly-3 { animation: fly-right 15s infinite linear 10s; }
        .smoke-puff { animation: smoke-rise 3s infinite ease-out; }
      `}</style>
    </div>
  )
}
