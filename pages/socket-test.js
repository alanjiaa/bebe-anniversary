import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import io from 'socket.io-client'
import { toast } from 'react-hot-toast'

export default function SocketTest() {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [onlinePlayers, setOnlinePlayers] = useState(0)
  const [serverStatus, setServerStatus] = useState('Unknown')
  const [logs, setLogs] = useState([])

  const user = auth.currentUser

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    if (!user) return

    // Test server health first
    const testServerHealth = async () => {
      try {
        const response = await fetch('https://bebe-anniversary-production.up.railway.app/health')
        const data = await response.json()
        setServerStatus(`OK - ${data.onlinePlayers} players, ${data.activeGames} games`)
        addLog(`Server health check: ${JSON.stringify(data)}`)
      } catch (error) {
        setServerStatus('ERROR - Server not responding')
        addLog(`Server health check failed: ${error.message}`)
      }
    }

    testServerHealth()

    // Initialize socket connection
    const socketUrl = 'https://bebe-anniversary-production.up.railway.app'
    addLog(`Connecting to: ${socketUrl}`)
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: user.uid,
        displayName: user.displayName || user.email
      },
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      setConnected(true)
      addLog('✅ Connected to Socket.IO server')
      toast.success('Connected to game server!')
    })

    newSocket.on('connect_error', (error) => {
      setConnected(false)
      addLog(`❌ Connection error: ${error.message}`)
      toast.error('Failed to connect to game server')
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
      addLog('🔌 Disconnected from server')
    })

    newSocket.on('onlinePlayersUpdate', (data) => {
      setOnlinePlayers(data.count)
      addLog(`👥 Online players update: ${data.count}`)
    })

    // Request current online player count
    newSocket.emit('getOnlinePlayers')
    addLog('📡 Requested online player count')

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  const testConnection = () => {
    if (socket) {
      socket.emit('getOnlinePlayers')
      addLog('🔄 Manually requested player count')
    }
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      addLog('🔌 Manually disconnected')
    }
  }

  const reconnect = () => {
    if (socket) {
      socket.connect()
      addLog('🔄 Manually reconnecting...')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Socket.IO Connection Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
            <div className="space-y-2">
              <p><span className="font-semibold">Server Health:</span> {serverStatus}</p>
              <p><span className="font-semibold">Socket Connected:</span> 
                <span className={connected ? 'text-green-400' : 'text-red-400'}>
                  {connected ? ' ✅ Yes' : ' ❌ No'}
                </span>
              </p>
              <p><span className="font-semibold">Online Players:</span> {onlinePlayers}</p>
              <p><span className="font-semibold">User:</span> {user?.email || 'Not logged in'}</p>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <button
                onClick={testConnection}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded mr-2"
              >
                Test Connection
              </button>
              <button
                onClick={disconnect}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded mr-2"
              >
                Disconnect
              </button>
              <button
                onClick={reconnect}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Connection Logs</h2>
          <div className="bg-black p-4 rounded h-64 overflow-y-auto font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="text-gray-300">{log}</div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-500">No logs yet...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
