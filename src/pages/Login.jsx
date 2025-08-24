import { useState, useEffect } from 'react'
import { account } from '../lib/appwrite'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
  const checkSession = async () => {
    try {
      await account.get()
      navigate('/dashboard') // Redirect if already logged in
    } catch {
      // No session, continue as normal
    }
  }
  checkSession()
}, [])


  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await account.createEmailSession(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white font-mono overflow-hidden flex flex-col">
      
      {/* Background Gradient Glow */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-black to-black"
        aria-hidden="true"
      ></div>

      {/* Subtle Grid */}
      <div
        className="absolute inset-0 -z-10 bg-grid-slate-700/[0.05] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden="true"
      ></div>

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
        <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
        <Link to="/signup" className="text-gray-300 hover:text-white">Sign Up</Link>
      </nav>
      </header>

      {/* Login Form Section */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold">Log In to SoloDesk</h2>
            <p className="text-sm text-gray-400">Access your booking dashboard</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-black border border-gray-700 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-black border border-gray-700 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-200 transition"
            >
              Log In
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-white underline hover:text-gray-300">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
