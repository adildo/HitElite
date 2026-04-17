import Head from 'next/head'

var nav = { background: '#0D0D0D', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }
var goldBtn = { padding: '9px 22px', background: '#D4A843', color: '#0D0D0D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em' }
var outlineBtn = { padding: '9px 22px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }

export default function Home() {
  var features = [
    { icon: '📅', title: 'Smart Scheduling', desc: 'Day, week, and month views for all classes and appointments. Real-time availability.' },
    { icon: '🎾', title: 'Private Lessons', desc: 'Full appointment booking with instant or request-based approval and add-ons.' },
    { icon: '👥', title: 'Group Classes', desc: 'Manage capacity, waitlists, drop-ins, and multi-week cohorts all in one place.' },
    { icon: '💳', title: 'Payments', desc: 'Stripe-powered checkout with deposits, card on file, and discount codes.' },
    { icon: '📊', title: 'Analytics', desc: 'Revenue, attendance, coach performance, and customer retention at a glance.' },
    { icon: '📝', title: 'Coach Feedback', desc: 'Session-by-session progress notes delivered to students with drill assignments.' },
  ]

  return (
    <>
      <Head>
        <title>Hit Elite — Tennis & Pickleball Management</title>
        <meta name="description" content="The complete management platform for tennis and pickleball businesses." />
      </Head>

      <nav style={nav}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          HIT <span style={{ color: '#D4A843' }}>ELITE</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/classes" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', padding: '8px 14px' }}>Classes</a>
          <a href="/coaches" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', padding: '8px 14px' }}>Coaches</a>
          <button onClick={() => window.location.href = '/login'} style={outlineBtn}>Sign in</button>
          <button onClick={() => window.location.href = '/signup'} style={goldBtn}>Join now</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background: '#0D0D0D', padding: '6rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.08) 0%, transparent 70%)' }}></div>
        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '4px 14px', background: 'rgba(212,168,67,0.15)', border: '1px solid rgba(212,168,67,0.3)', borderRadius: '20px', fontSize: '12px', color: '#D4A843', fontWeight: 600, marginBottom: '1.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Tennis & Pickleball Platform
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: '1.25rem', letterSpacing: '-0.03em' }}>
            Run your club<br />
            <span style={{ color: '#D4A843' }}>like a pro</span>
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
            Hit Elite brings scheduling, booking, payments, and coaching tools into one polished platform — built specifically for tennis and pickleball businesses.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.href = '/signup'} style={{ ...goldBtn, padding: '13px 32px', fontSize: '15px' }}>
              Start booking today
            </button>
            <button onClick={() => window.location.href = '/classes'} style={{ ...outlineBtn, padding: '13px 32px', fontSize: '15px' }}>
              Browse classes
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {[['500+','Sessions booked'],['20+','Active coaches'],['98%','Customer satisfaction'],['5★','Average rating']].map(function(s,i) {
            return (
              <div key={i}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#D4A843', marginBottom: '4px' }}>{s[0]}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s[1]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '5rem 2rem', background: '#f5f5f3', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 800, marginBottom: '10px', letterSpacing: '-0.02em' }}>Everything you need to run your business</h2>
          <p style={{ color: '#666', fontSize: '16px' }}>Built for court operators who want less admin and more time on the court.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {features.map(function(f, i) {
            return (
              <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: '#0D0D0D', padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Ready to get started?</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontSize: '16px' }}>Join Hit Elite and transform how you run your tennis or pickleball business.</p>
        <button onClick={() => window.location.href = '/signup'} style={{ ...goldBtn, padding: '14px 36px', fontSize: '16px' }}>
          Create your account free
        </button>
      </div>

      <footer style={{ background: '#0D0D0D', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '1.5rem 2rem', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
        © 2026 Hit Elite. All rights reserved.
      </footer>
    </>
  )
}
