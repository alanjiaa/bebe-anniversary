import { useState, useEffect } from 'react'
import { auth } from '../src/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ProtectedRoute from '@/components/ProtectedRoute'

export default function ComplaintsPage() {
  const [userEmail, setUserEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUserEmail(user.email)
      else setUserEmail('')
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message) {
      setStatus('Please enter a message')
      return
    }

    setStatus('Sending...')
    try {
      const res = await fetch('/api/sendSuggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, message }),
      })

      if (res.ok) {
        setStatus('Suggestion sent! Thank you.')
        setMessage('')
      } else {
        const data = await res.json()
        setStatus('Error: ' + data.message)
      }
    } catch (err) {
      setStatus('Failed to send suggestion.')
    }
  }

  if (!userEmail) {
    return <p>Please log in to submit suggestions.</p>
  }

  return (
    <ProtectedRoute>
      <div style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
        <h1>Suggestions & Complaints</h1>
        <p>Logged in as: {userEmail}</p>
        <form onSubmit={handleSubmit}>
          <textarea
            rows={6}
            placeholder="Enter your suggestion or complaint here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ marginTop: 10 ,width: '100%', padding: 10, borderColor: 'black', border: '1px solid #ccc', borderRadius: 5, fontSize: 16, resize: 'none' }}
          />
          <button type="submit" style={{ marginTop: 10, color: 'white', backgroundColor: '#F9C2D9', padding: '10px 20px', border: 'none', borderRadius: 5 }}>
            Send
          </button>
        </form>
        <p>{status}</p>
      </div>
    </ProtectedRoute>
  )
}
