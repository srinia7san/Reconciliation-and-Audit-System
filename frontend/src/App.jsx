import { useState, useEffect } from 'react'
import api from "./api.js"
import Upload from "./components/Upload.jsx"
import Dashboard from "./components/Dashboard.jsx"
import Login from "./components/Login.jsx"
import Register from "./components/Register.jsx"

function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(decoded)))
  } catch (e) {
    return null
  }
}


function App() {
  const [status, setStatus] = useState("Loading...")
  const [currentView, setCurrentView] = useState("upload")
  const [authView, setAuthView] = useState("login") // 'login' or 'register'
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })

  useEffect(() => {
    api.get("/check")
      .then(res => setStatus(res.data.status))
      .catch(() => setStatus("Backend Not Reachble"))
  }, [])

  useEffect(() => {
    // validate token expiry
    const token = localStorage.getItem('token')
    if (!token) return
    const payload = parseJwt(token)
    if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
      // token expired
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }, [])

  const handleLogin = (u) => {
    setUser(u)
    setAuthView("login")
  }

  const handleRegister = (u) => {
    setUser(u)
    setAuthView("login")
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setAuthView("login")
  }

  if (!user) {
    return authView === "login" ?
      <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView("register")} />
      :
      <Register onSuccess={handleRegister} onSwitchToLogin={() => setAuthView("login")} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">RECONCILIATION APP</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <p className="font-semibold text-gray-900">{user.name || user.email}</p>
              <p className="text-gray-500">Role: {user.role}</p>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setCurrentView("upload")}
            className={`px-4 py-3 font-medium border-b-2 transition ${currentView === "upload"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setCurrentView("dashboard")}
            className={`px-4 py-3 font-medium border-b-2 transition ${currentView === "dashboard"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
          >
            Dashboard
          </button>
        </div>

        {/* Content */}
        {currentView === "upload" && <Upload user={user} onUploadSuccess={() => setCurrentView("dashboard")} />}
        {currentView === "dashboard" && <Dashboard user={user} />}
      </div>
    </div>
  )
}

export default App
