import Head from 'next/head'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  var [email, setEmail] = useState('')
  var [password, setPassword] = useState('')
  var [loading, setLoading] = useState(false)
  var [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    var result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) { setError(result.error.message); setLoading(false); return }
    var userId = result.data.user.id
    var profile = await supabase.from('profiles').select('role').eq('id', userId).single()
    var role = profile.data ? profile.data.role : 'customer'
    if (role === 'admin' || role === 'manager') window.location.href = '/admin'
    else if (role === 'coach') window.location.href = '/coach'
    else if (role === 'staff') window.location.href = '/admin'
    else window.location.href = '/portal'
  }

  var inp = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '0.5px solid rgba(0,0,0,0.2)', fontSize: '14px', background: '#fff', color: '#1a1a1a', outline: 'none' }

  return (
    <>
      <Head><title>Sign in — Hit Elite</title></Head>
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              HIT <span style={{ color: '#D4A843' }}>ELITE</span>
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>Sign in to your account</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '2rem' }}>
            {error && (
              <div style={{ background: '#2a1515', border: '0.5px solid #A32D2D', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Email</label>
                <input type="email" style={{ ...inp, background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)' }} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>Password</label>
                <input type="password" style={{ ...inp, background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)' }} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9a7a2e' : '#D4A843', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Don't have an account?{' '}
              <a href="/signup" style={{ color: '#D4A843', fontWeight: 600 }}>Join Hit Elite</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
