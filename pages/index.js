import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'

export default function Home() {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [tool, setTool] = useState('linkedin')
  const [profileText, setProfileText] = useState('')
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('business')
  const [platform, setPlatform] = useState('instagram')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    checkSession()

    const { data } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  async function checkSession() {
    const { data } = await supabase.auth.getSession()

    if (data.session?.user) {
      setUser(data.session.user)
    } else {
      setUser(null)
    }
  }

  async function handleAuth(e) {
    e.preventDefault()

    if (!email || !password) {
      alert('Enter your email and password.')
      return
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters.')
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password
      })

      if (error) {
        alert(error.message)
        return
      }

      alert('Account created. Check your email to verify your account, then log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        alert(error.message)
        return
      }
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
    setResult('')
    setUsage(null)
  }

  async function generate() {
    setResult('')

    if (tool === 'linkedin' && !profileText.trim()) {
      alert('Paste your LinkedIn profile text first.')
      return
    }

    if (tool === 'content' && !topic.trim()) {
      alert('Enter a content topic first.')
      return
    }

    setLoading(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        alert('Please log in again.')
        setLoading(false)
        return
      }

      const response = await axios.post(
        '/api/generate',
        {
          tool,
          profileText,
          topic,
          niche,
          platform
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setResult(response.data.result)
      setUsage(response.data.usage)
    } catch (error) {
      alert(error.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function upgrade() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        alert('Please log in again.')
        return
      }

      const response = await axios.post(
        '/api/create-checkout-session',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      await stripe.redirectToCheckout({ sessionId: response.data.sessionId })
    } catch (error) {
      alert(error.response?.data?.error || 'Checkout error.')
    }
  }

  if (!user) {
    return (
      <main className="page">
        <section className="card auth-card">
          <h1>Max Style Creation Tools</h1>

          <p className="subtitle">
            AI-powered LinkedIn profile optimization and content creation tools.
          </p>

          <form onSubmit={handleAuth} className="form">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password, at least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button type="submit">
              {mode === 'signup' ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <button
            className="link-button"
            onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}
          >
            {mode === 'signup'
              ? 'Already have an account? Log in'
              : 'Need an account? Sign up'}
          </button>

          <p className="small">
            Free trial: 7 generations per month. Upgrade for $5/month.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="page">
      <section className="card">
        <div className="topbar">
          <div>
            <h1>Max Style Creation Tools</h1>
            <p className="subtitle">Logged in as {user.email}</p>
          </div>

          <button className="secondary" onClick={logout}>
            Log Out
          </button>
        </div>

        <div className="usage-box">
          <p>
            Free trial: <strong>7 generations per month</strong>
          </p>

          {usage && (
            <p>
              Used this month: <strong>{usage.used}</strong> / {usage.limit}
            </p>
          )}
        </div>

        <div className="tabs">
          <button
            className={tool === 'linkedin' ? 'active' : ''}
            onClick={() => {
              setTool('linkedin')
              setResult('')
            }}
          >
            LinkedIn Optimizer
          </button>

          <button
            className={tool === 'content' ? 'active' : ''}
            onClick={() => {
              setTool('content')
              setResult('')
            }}
          >
            Content Generator
          </button>
        </div>

        {tool === 'linkedin' && (
          <div className="tool-box">
            <h2>LinkedIn Profile Optimizer</h2>

            <p>
              Paste your LinkedIn headline, About section, experience summary, or full profile text.
            </p>

            <textarea
              placeholder="Paste your LinkedIn profile text here..."
              value={profileText}
              onChange={(e) => setProfileText(e.target.value)}
              rows={8}
            />

            <button onClick={generate} disabled={loading}>
              {loading ? 'Optimizing...' : 'Optimize My Profile'}
            </button>
          </div>
        )}

        {tool === 'content' && (
          <div className="tool-box">
            <h2>Content Generator</h2>

            <p>
              Create ready-to-post content for Instagram, TikTok, LinkedIn, email, and blogs.
            </p>

            <label>Your niche</label>
            <input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Example: fitness, beauty, trucking, real estate"
            />

            <label>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
              <option value="blog">Blog</option>
            </select>

            <label>Topic</label>
            <textarea
              placeholder="Example: how to stay consistent with workouts"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={5}
            />

            <button onClick={generate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Content'}
            </button>
          </div>
        )}

        {result && (
          <div className="result">
            <h2>Your Result</h2>

            <pre>{result}</pre>

            <button
              className="secondary"
              onClick={() => navigator.clipboard.writeText(result)}
            >
              Copy Result
            </button>
          </div>
        )}

        <div className="upgrade">
          <h2>Need unlimited generations?</h2>
          <p>Upgrade to unlimited access for $5/month.</p>
          <button onClick={upgrade}>Upgrade Now</button>
        </div>
      </section>
    </main>
  )
  }
