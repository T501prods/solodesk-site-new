import { useState, useEffect } from 'react'
import { account } from '../lib/appwrite'
import { useNavigate, Link } from 'react-router-dom'
import { ID } from 'appwrite'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
  const checkSession = async () => {
    try {
      await account.get()
      navigate('/dashboard') // Or wherever you want to send logged-in users
    } catch {
      // Not logged in, do nothing
    }
  }
  checkSession()
}, [])


  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError('You must agree to the terms and conditions.')
      return
    }

    try {
      setLoading(true)
      await account.create(ID.unique(), email, password, name)
      await account.createEmailSession(email, password)
      navigate('/welcome') // Or replace with onboarding route
    } catch (err) {
      setError(err.message || 'Signup failed')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white font-mono overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-black to-black"
        aria-hidden="true"
      ></div>
      <div
        className="absolute inset-0 -z-10 bg-grid-slate-700/[0.05] [mask-image:linear-gradient(to_bottom,black,transparent)]"
        aria-hidden="true"
      ></div>

      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-800">
        <h1 className="text-xl font-bold tracking-tight">SoloDesk</h1>
        <nav className="space-x-6 text-sm">
          <Link to="/" className="text-gray-300 hover:text-white">Home</Link>
          <Link to="/login" className="text-gray-300 hover:text-white">Log In</Link>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8 bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-lg backdrop-blur-sm">
          <div>
            <h2 className="text-2xl font-semibold text-center mb-2">Create Your Account</h2>
            <p className="text-sm text-gray-400 text-center">Start taking bookings today</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Your Name"
              className="w-full bg-black border border-gray-700 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-black border border-gray-700 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className="w-full bg-black border border-gray-700 px-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-xs text-gray-400 hover:text-white"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div className="flex items-center text-sm text-gray-400">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="mr-2"
              />
              <label htmlFor="terms">I agree to the <a href="#" className="underline hover:text-white">Terms & Conditions</a></label>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-200 transition"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-white underline">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
