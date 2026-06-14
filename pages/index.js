import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [session, setSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [tool, setTool] = useState('linkedin')
  const [profileText, setProfileText] = useState('')
  const [topic, setTopic] = useState('')
  const [niche, setNiche] = useState('')
  const [platform, setPlatform] = useState('LinkedIn')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [usage, setUsage] = useState({
    used: 0,
    limit: 7,
    isPaid: false
  })

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoadingAuth(false)
    })

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const remaining = useMemo(() => {
    if (usage.isPaid) return 'Unlimited'
    return `${Math.max(usage.limit - usage.used, 0)} left`
  }, [usage])

  async function handleAuthSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (authMode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (loginError) throw loginError
      } else {
        const { error: signupError } = await supabase.auth.signUp({
          email,
          password
        })

        if (signupError) throw signupError
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setResult('')
    setLoading(true)

    try {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession()

      if (!currentSession?.access_token) {
        throw new Error('You are not logged in.')
      }

      const body =
        tool === 'linkedin'
          ? { tool, profileText }
          : { tool, topic, niche, platform }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed.')
      }

      setResult(data.result || '')
      if (data.usage) setUsage(data.usage)
    } catch (err) {
      setError(err.message || 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade() {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Could not start checkout.')
      }

      if (data.url) {
        window.location.href = data.url
        return
      }

      if (data.sessionUrl) {
        window.location.href = data.sessionUrl
        return
      }

      throw new Error('Checkout link missing.')
    } catch (err) {
      setError(err.message || 'Upgrade failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loadingAuth) {
    return (
      <div className="page">
        <div className="card">
          <h1>Max Style Creation Tools</h1>
          <p className="subtitle">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="page">
        <div className="card auth-card">
          <h1>Max Style Creation Tools</h1>
          <p className="subtitle">
            Create better content faster with AI-powered LinkedIn and content
            generation.
          </p>

          <form className="form" onSubmit={handleAuthSubmit}>
            <div className="tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className={authMode === 'signup' ? 'active' : ''}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
            </div>

            <div className="tool-box">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button type="submit" disabled={loading}>
                {loading
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Log In'
                    : 'Create Account'}
              </button>
            </div>
          </form>

          {error ? <p className="small" style={{ color: '#dc2626' }}>{error}</p> : null}
          <p className="small">
            By continuing, you agree to use the app responsibly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="card">
        <div className="topbar">
          <div>
            <h1>Max Style Creation Tools</h1>
            <p className="subtitle">
              Build polished LinkedIn profiles and content in seconds.
            </p>
          </div>

          <div className="usage-box">
            <strong>{usage.isPaid ? 'Pro Access' : 'Free Trial'}</strong>
            <p>
              Used this month: {usage.used}
              {!usage.isPaid ? ` / ${usage.limit}` : ''}
            </p>
            <p>Remaining: {remaining}</p>
            <button className="secondary" type="button" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={tool === 'linkedin' ? 'active' : ''}
            onClick={() => setTool('linkedin')}
          >
            LinkedIn Profile
          </button>
          <button
            type="button"
            className={tool === 'content' ? 'active' : ''}
            onClick={() => setTool('content')}
          >
            Content Generator
          </button>
        </div>

        <form className="form" onSubmit={handleGenerate}>
          {tool === 'linkedin' ? (
            <div className="tool-box">
              <h2>Improve your LinkedIn profile</h2>
              <p>Paste your current profile text and get a cleaner, stronger version.</p>

              <label htmlFor="profileText">Profile text</label>
              <textarea
                id="profileText"
                placeholder="Paste your LinkedIn headline, About section, experience, and anything else you want improved..."
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="tool-box">
              <h2>Create high-quality content</h2>
              <p>Generate content tailored to your niche and platform.</p>

              <label htmlFor="niche">Business / Niche</label>
              <input
                id="niche"
                type="text"
                placeholder="Example: personal branding, fitness coaching, SaaS"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                required
              />

              <label htmlFor="platform">Platform</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                required
              >
                <option>LinkedIn</option>
                <option>Instagram</option>
                <option>TikTok</option>
                <option>Facebook</option>
                <option>Email</option>
                <option>Blog</option>
              </select>

              <label htmlFor="topic">Topic</label>
              <input
                id="topic"
                type="text"
                placeholder="Example: how to get more leads on LinkedIn"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        {error ? (
          <p className="small" style={{ color: '#dc2626' }}>
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="result">
            <h2>Your Result</h2>
            <pre>{result}</pre>
          </div>
        ) : null}

        {!usage.isPaid ? (
          <div className="upgrade">
            <h2>Want unlimited access?</h2>
            <p>Upgrade when you are ready to keep generating without limits.</p>
            <button type="button" onClick={handleUpgrade} disabled={loading}>
              Upgrade Now
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
