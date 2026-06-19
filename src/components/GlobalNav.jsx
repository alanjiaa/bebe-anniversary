import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { motion, AnimatePresence } from 'framer-motion'
import { FaBell } from 'react-icons/fa'

// Define the custom attractions matching the home screen and generated graphic
const ATTRACTIONS = [
  {
    id: 'gallery',
    title: 'Cozy Memories Cottage',
    description: 'Walk down memory lane! Browse our polaroids, letters, diaries, and timeline milestones.',
    href: '/gallery',
    icon: '🏡',
    coords: { left: '47%', top: '29.5%', width: '20%', height: '40%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  },
  {
    id: 'arcade',
    title: 'Bebe Arcade',
    description: 'Play games to win Alsie Points! Includes Casino, Air Hockey, Pong, and the Photobooth.',
    href: '/arcade',
    icon: '🕹️',
    coords: { left: '14%', top: '35.5%', width: '24%', height: '33%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  },
  {
    id: 'spin-wheel',
    title: 'Spin the Wheel',
    description: 'Hop on the Ferris Wheel and spin the lucky wheel to claim tokens, rewards, and sweet promises.',
    href: '/spin-wheel',
    icon: '🎡',
    coords: { left: '26.5%', top: '10%', width: '22%', height: '25%' },
    tooltipPosition: { bottom: '30%', left: '10%', transform: 'translateX(-50%)' }
  },
  {
    id: 'shop',
    title: 'Souvenir Shop',
    description: 'Redeem your hard-earned Alsie Points for real-world gift coupons, cute vouchers, and cute dates.',
    href: '/shop',
    icon: '🏪',
    coords: { left: '69%', top: '21.5%', width: '20%', height: '35%' },
    tooltipPosition: { bottom: '58%', left: '25%', transform: 'translateX(-50%)' }
  },
  {
    id: 'photobooth',
    title: 'Photobooth Kiosk',
    description: 'Strike a pose! Snap cute digital photo strips with custom frames, borders, and lovely filters.',
    href: '/photobooth',
    icon: '📷',
    coords: { left: '50.5%', top: '44.5%', width: '16%', height: '17%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  },
  {
    id: 'home',
    title: 'Bebe Land Entrance',
    description: 'Return to entrance',
    href: '/home',
    icon: '🎪',
    coords: { left: '23%', top: '73.5%', width: '15%', height: '23%' },
    tooltipPosition: { bottom: '105%', left: '50%', transform: 'translateX(-50%)' }
  }
]

export default function GlobalNav() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  const notifRef = useRef(null)

  // Reset selected/hovered states when modal closes or opens
  useEffect(() => {
    if (!showMapModal) {
      setSelectedId(null)
      setHoveredId(null)
    }
  }, [showMapModal])

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // Fetch Notifications
  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setNotifications(notifs)
      // Basic unread logic: any newly added notification increments count
      // For a real app, track read status per user
      if (notifs.length > 0 && !showNotifications) {
        setUnreadCount(notifs.length)
      }
    })

    return () => unsubscribe()
  }, [])

  // Close notifications on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleToggleNotifications = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) setUnreadCount(0)
  }

  // Hide the global nav entirely on login/signup pages
  const hideOnPaths = ['/login', '/signup']
  if (hideOnPaths.includes(router.pathname)) return null

  const isHome = router.pathname === '/home' || router.pathname === '/'

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-3 py-3 pointer-events-none">
      <div className="w-full flex justify-end items-start pointer-events-auto">

        {/* Right Side: Map, Notifications & Profile */}
        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border border-gray-200/60 p-1.5 rounded-full shadow-lg">

          {/* Map Icon Button */}
          <button
            onClick={() => setShowMapModal(true)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:scale-105 transition shadow-sm border border-gray-100 group"
          >
            <span className="text-xl group-hover:scale-110 transition">📍</span>
          </button>

          {/* Notifications Toggle */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={handleToggleNotifications}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 transition shadow-sm relative border border-gray-100"
            >
              <FaBell className="text-lg" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-72 sm:w-80 bg-white border border-gray-100 rounded-3xl shadow-2xl overflow-hidden origin-top-right"
                >
                  <div className="p-4 border-b border-gray-100 bg-rose-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm">Recent Updates 🔔</h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-xs font-semibold">
                        No new updates right now! 🎈
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map(notif => (
                          <div key={notif.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition flex gap-3 items-start">
                            <span className="text-xl mt-1">{notif.icon || '✨'}</span>
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-gray-800">{notif.title}</span>
                              <span className="text-xs text-gray-500 mt-0.5">{notif.message}</span>
                              <span className="text-[10px] text-gray-400 mt-1 font-medium">
                                {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Button */}
          <Link href="/profile">
            <button className="h-10 w-10 sm:w-auto sm:px-2 sm:pr-3 rounded-full bg-white flex items-center justify-center gap-2 hover:bg-gray-50 transition shadow-sm border border-gray-100 group">
              <div className="w-8 h-8 rounded-full bg-rose-100 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                {user?.photoURL && (user.photoURL.startsWith('http') || user.photoURL.startsWith('/')) ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg">{user?.photoURL || '🐻'}</span>
                )}
              </div>
              <span className="hidden sm:inline font-bold text-xs text-gray-700 max-w-[80px] truncate">
                {user?.displayName || 'Guest'}
              </span>
            </button>
          </Link>

        </div>
      </div>

      {/* Map Popup Modal */}
      <AnimatePresence>
        {showMapModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-8 pointer-events-auto"
            onClick={() => setShowMapModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl aspect-[16/9] bg-white rounded-[32px] border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center"
              onClick={() => setSelectedId(null)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setShowMapModal(false); }}
                className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-800 hover:bg-gray-100 transition shadow-md font-bold text-xl"
              >
                ✕
              </button>

              <img
                src="/images/bebe-land-map.png"
                alt="Bebe Land Map"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0"
              />

              {/* Interactive Landmark Hotspots */}
              {ATTRACTIONS.map((attr) => {
                const isCurrent = router.pathname.startsWith(attr.href)
                const isSel = selectedId === attr.id
                const isHover = hoveredId === attr.id
                const showActiveGlow = isSel || isHover

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
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(selectedId === attr.id ? null : attr.id)
                    }}
                  >
                    {/* Glow ring indicator showing filter status or selection */}
                    <div className={`absolute inset-[-4px] rounded-full blur-[8px] transition-all duration-300 pointer-events-none ${showActiveGlow
                      ? 'bg-rose-500/40 opacity-100 scale-105'
                      : 'bg-amber-400/10 group-hover:bg-amber-400/30 opacity-70'
                      }`} />

                    {/* Pulse ring animation on matching active attraction */}
                    {isCurrent && !selectedId && (
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
                            onClick={() => setShowMapModal(false)}
                            className="mt-1 block text-center text-white text-[10px] sm:text-xs font-bold py-1.5 px-4 rounded-full shadow bg-gradient-to-r from-[#ff758f] to-rose-500 hover:brightness-105 active:scale-95 transition-all w-full"
                          >
                            {isCurrent ? 'Return here 🚪' : 'Enter Location 🚪'}
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {/* Dynamic You Are Here Pin */}
              {(() => {
                const currentAttr = ATTRACTIONS.find(a => router.pathname.startsWith(a.href))

                if (currentAttr) {
                  const leftPercent = parseFloat(currentAttr.coords.left)
                  const topPercent = parseFloat(currentAttr.coords.top)
                  const widthPercent = parseFloat(currentAttr.coords.width)

                  const pinLeft = `${leftPercent + widthPercent / 2}%`
                  const pinTop = `${topPercent}%`

                  return (
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="absolute z-30 flex flex-col items-center pointer-events-none"
                      style={{
                        left: pinLeft,
                        top: pinTop,
                        transform: 'translate(-50%, -100%)'
                      }}
                    >
                      <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg border border-gray-200 text-[9px] sm:text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#45cfc9] rounded-full animate-pulse"></span>
                        YOU ARE HERE
                      </div>
                      <span className="text-2xl sm:text-4xl drop-shadow-md animate-bounce">📍</span>
                    </motion.div>
                  )
                }
                return null
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
