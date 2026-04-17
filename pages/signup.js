import Head from 'next/head'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  var [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  var [loading, setLoading] = useState(false)
  var [error, setError] = useState('')
  var [success, setSuccess] = useState(false)

  function setField(key, val) { setForm(function(prev) { var n = {...prev}; n[key] = val; return n }) }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    var result = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name, role: 'customer' } }
    })
    if (result.error) { setError(result.error.message); setLoading(false); return }
    if (form.phone && result.data.user) {
      await supabase.from('profiles').update({ phone: form.phone }).eq('id', result.data.user.id)
    }
    setSuccess(true)
    setLoading(false)
  }

  var inp = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.15)', fontSize: '14px', background: '#111', color: '#fff', outline: 'none' }

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '10px' }}>Welcome to Hit Elite!</div>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Check your email at <strong style={{ color: '#D4A843' }}>{form.email}</strong> to confirm your account, then sign in to start booking.
        </p>
        <a href="/login" style={{ display: 'inline-block', padding: '11px 28px', background: '#D4A843', color: '#0D0D0D', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}>Go to sign in</a>
      </div>
    </div>
  )

  return (
    <>
      <Head><title>Join Hit Elite</title></Head>
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
              HIT <span style={{ color: '#D4A843' }}>ELITE</span>
            </div>
            <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>Create your free account</div>
          </div>
          <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '2rem' }}>
            {error && <div style={{ background: '#2a1515', border: '0.5px solid #A32D2D', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#F09595', marginBottom: '1rem' }}>{error}</div>}
            <form onSubmit={handleSignup}>
              {[['Full name','text','full_name','Sarah Thompson'],['Email','email','email','you@email.com'],['Phone','tel','phone','(555) 000-0000'],['Password','password','password','Create a strong password']].map(function(f) {
                return (
                  <div key={f[2]} style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '5px', fontWeight: 500 }}>{f[0]}</label>
                    <input type={f[1]} style={inp} value={form[f[2]]} onChange={function(e) { setField(f[2], e.target.value) }} placeholder={f[3]} required={f[2] !== 'phone'} minLength={f[2] === 'password' ? 6 : undefined} />
                  </div>
                )
              })}
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: loading ? '#9a7a2e' : '#D4A843', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: '4px' }}>
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Already have an account? <a href="/login" style={{ color: '#D4A843', fontWeight: 600 }}>Sign in</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
