// src/components/UserHeader.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import Link from 'next/link'

export default function UserHeader() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 20px',
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd',
      }}
    >
      {/* Left side: user info or guest */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold' }}>
          {user ? "👤Current user: " + user.displayName || user.email : 'Guest'}
        </span>
      </div>

      {/* Right side: logout or login */}
      <div>
        {user ? (
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: '#F9C2D9',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Log Out
          </button>
        ) : (
          <Link href="/login">
            <button
              style={{
                backgroundColor: '#F9C2D9',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Log In
            </button>
          </Link>
        )}
      </div>
    </header>
  )
}
