import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { auth, db } from '../src/lib/firebase'
import {
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  signOut
} from 'firebase/auth'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'
import toast from 'react-hot-toast'

const AVATAR_OPTIONS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸']

export default function Profile() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Profile fields
  const [displayName, setDisplayName] = useState('')

  // Admin Notification fields
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [notifIcon, setNotifIcon] = useState('✨')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login')
      } else {
        setUser(currentUser)
        setDisplayName(currentUser.displayName || '')
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#faf8f2]">Loading...</div>
  }

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      await updateProfile(user, { displayName })
      toast.success('Profile updated successfully!')
      // Force reload to update global nav
      router.reload()
    } catch (error) {
      toast.error('Error updating profile: ' + error.message)
    }
  }

  // Handle Avatar Selection Update
  const handleUpdateAvatar = async (emoji) => {
    const toastId = toast.loading('Updating avatar...')
    try {
      await updateProfile(user, { photoURL: emoji })
      toast.success('Avatar updated!', { id: toastId })
      setShowAvatarPicker(false)
      // Force reload to update global nav
      router.reload()
    } catch (error) {
      toast.error('Error updating avatar: ' + error.message, { id: toastId })
    }
  }

  // Handle Password Reset
  const handleResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success(`Password reset email sent to ${user.email}`)
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
      try {
        await deleteUser(user)
        toast.success('Account deleted successfully.')
        router.push('/login')
      } catch (error) {
        toast.error('Error: You may need to log in again before deleting your account.')
      }
    }
  }

  // Handle Logout
  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  // Handle Sending Notification (Admin Feature)
  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!notifTitle || !notifMessage) return toast.error('Please fill in title and message')
    if (!user) return toast.error('You must be logged in') // Safety check

    const toastId = toast.loading('Sending notification...')
    try {
      // 1. Verify admin status from the Firestore collection
      const adminDocRef = doc(db, 'admins', user.uid)
      const adminDocSnap = await getDoc(adminDocRef)

      if (!adminDocSnap.exists() || adminDocSnap.data().isAdmin !== true) {
        throw new Error('You do not have administrative permissions.')
      }

      // 2. Proceed with broadcast if verification passes
      await addDoc(collection(db, 'notifications'), {
        title: notifTitle,
        message: notifMessage,
        icon: notifIcon,
        createdAt: serverTimestamp(),
        authorId: user.uid
      })

      toast.success('Notification broadcasted globally!', { id: toastId })
      setNotifTitle('')
      setNotifMessage('')
    } catch (error) {
      toast.error('Error sending notification: ' + error.message, { id: toastId })
    }
  }


  return (
    <div className="min-h-screen bg-[#faf8f2] py-20 px-4 flex justify-center">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Left Column: Account Settings */}
        <div className="bg-white p-8 rounded-[32px] shadow-lg border border-gray-100 flex flex-col items-center">
          <h2 className="text-2xl font-black text-gray-800 mb-6">Your Profile</h2>

          {/* Avatar Selection */}
          <div className="relative group cursor-pointer mb-6" onClick={() => setShowAvatarPicker(!showAvatarPicker)}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-100 shadow-md flex items-center justify-center bg-gray-50">
              {user?.photoURL && (user.photoURL.startsWith('http') || user.photoURL.startsWith('/')) ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-70 transition" />
              ) : (
                <span className="text-6xl">{user?.photoURL || '🐻'}</span>
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white font-bold text-xs">Change Avatar</span>
            </div>
          </div>

          {showAvatarPicker && (
            <div className="flex flex-wrap justify-center gap-3 mb-8 bg-white p-4 rounded-xl shadow-sm border border-rose-100 animate-fade-in w-full max-w-xs mx-auto">
              <p className="w-full text-center text-sm font-medium text-gray-500 mb-2">Choose your avatar</p>
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleUpdateAvatar(emoji)}
                  className="text-3xl hover:scale-125 hover:-translate-y-1 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="w-full flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 font-semibold cursor-not-allowed mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your cute nickname"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-semibold focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition mt-1"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#ff758f] hover:bg-[#ff5a79] text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95"
            >
              Save Profile
            </button>
          </form>

          <div className="w-full border-t border-gray-100 my-6"></div>

          {/* Account Actions */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleResetPassword}
              className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-3 rounded-xl transition"
            >
              Send Password Reset
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold py-3 rounded-xl transition"
            >
              Log Out 👋
            </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full text-red-500 hover:bg-red-50 font-bold py-3 rounded-xl transition mt-2"
            >
              Delete Account
            </button>
          </div>
        </div>

        {/* Right Column: Admin Panel */}
        <div className="bg-gradient-to-br from-[#45cfc9]/10 to-blue-100/30 p-8 rounded-[32px] shadow-lg border border-[#45cfc9]/20 flex flex-col h-fit">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800">Admin Panel</h2>
              <p className="text-xs font-semibold text-gray-500">Broadcast updates to Bebe Land</p>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Notification Title</label>
              <input
                type="text"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="e.g., New Update Launch"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-semibold focus:ring-2 focus:ring-[#45cfc9]/30 focus:border-[#45cfc9] outline-none transition mt-1"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Icon (Emoji)</label>
              <input
                type="text"
                value={notifIcon}
                onChange={(e) => setNotifIcon(e.target.value)}
                maxLength={2}
                className="w-20 bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-bold text-center text-xl focus:ring-2 focus:ring-[#45cfc9]/30 focus:border-[#45cfc9] outline-none transition mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Message</label>
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Describe what's new in Bebe Land..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-800 font-medium focus:ring-2 focus:ring-[#45cfc9]/30 focus:border-[#45cfc9] outline-none transition mt-1 resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-[#45cfc9] hover:bg-[#38bdb7] text-white font-bold py-3 rounded-xl shadow-md transition active:scale-95 mt-2 flex items-center justify-center gap-2"
            >
              <span>Broadcast Update</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
