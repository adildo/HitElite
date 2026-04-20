import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function Checkout() {
  var [loading, setLoading] = useState(true)
  var [booking, setBooking] = useState(null)
  var [error, setError] = useState(null)
  var [discountCode, setDiscountCode] = useState('')
  var [discountApplied, setDiscountApplied] = useState(null)
  var [discountError, setDiscountError] = useState('')
  var [checkingDiscount, setCheckingDiscount] = useState(false)
  var [redirecting, setRedirecting] = useState(false)

  useEffect(function(){
    // Read booking from sessionStorage (set by book.js on submit)
    if (typeof window !== 'undefined') {
      var b = sessionStorage.getItem('pending_booking')
      if (b) {
        try { setBooking(JSON.parse(b)) } catch(e) { setError('Invalid booking data') }
      } else {
        setError('No booking found. Please start again.')
      }
    }
    setLoading(false)
  },[])

  async function applyDiscount() {
    if (!discountCode.trim()) return
    setCheckingDiscount(true); setDiscountError('')
    var r = await supabase.from('discount_codes').select('*').eq('code', discountCode.toUpperCase()).eq('is_active', true).maybeSingle()
    if (!r.data) { setDiscountError('Invalid or expired discount code.'); setCheckingDiscount(false); return }
    // Check expiry
    if (r.data.expires_at && new Date(r.data.expires_at) < new Date()) { setDiscountError('This code has expired.'); setCheckingDiscount(false); return }
    // Check max uses
    if (r.data.max_uses && r.data.uses_count >= r.data.max_uses) { setDiscountError('This code has reached its usage limit.'); setCheckingDiscount(false); return }
    setDiscountApplied(r.data)
    setCheckingDiscount(false)
  }

  function calculateTotal() {
    if (!booking) return 0
    var base = parseFloat(booking.amount || 0)
    if (!discountApplied) return base
    if (discountApplied.type === 'percentage') return Math.max(0, base * (1 - discountApplied.value/100))
    if (discountApplied.type === 'fixed') return Math.max(0, base - discountApplied.value)
    return base
  }

  async function proceedToPayment() {
    if (!booking) return
    setRedirecting(true)
    var s = await supabase.auth.getSession()
    if (!s.data.session) { window.location.href = '/login'; return }

    try {
      var response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_type: booking.type,
          booking_id: booking.id,
          customer_id: s.data.session.user.id,
          amount: booking.amount,
          description: booking.description,
          payment_mode: booking.payment_mode || 'full',
          deposit_amount: booking.deposit_amount,
          discount_code: discountApplied ? discountCode : null,
        })
      })
      var data = await response.json()
      if (data.error) { setError(data.error); setRedirecting(false); return }
      // Clear pending booking and redirect to Stripe
      sessionStorage.removeItem('pending_booking')
      window.location.href = data.url
    } catch(err) {
      setError(err.message)
      setRedirecting(false)
    }
  }

  var total = calculateTotal()
  var btn = { padding:'10px 20px', borderRadius:'8px', fontSize:'14px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:700, width:'100%', padding:'14px', fontSize:'15px' }
  var inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  if (loading) return <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'rgba(255,255,255,0.4)', fontSize:'13px' }}>Loading checkout...</div></div>

  return (
    <>
      <Head><title>Checkout — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <a href="/" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.4)' }}>🔒 Secure checkout</div>
        </nav>

        <div style={{ maxWidth:'480px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1.5rem' }}>Complete your booking</div>

          {error && (
            <div style={{ background:'#FCEBEB', border:'0.5px solid #A32D2D', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#A32D2D', marginBottom:'1.25rem' }}>
              {error} <a href="/portal/book" style={{ color:'#A32D2D', fontWeight:600 }}>Start again →</a>
            </div>
          )}

          {booking && (
            <>
              {/* Booking summary */}
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Booking summary</div>
                <div style={{ display:'grid', gap:'8px', fontSize:'13px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Type</span><span style={{ fontWeight:500 }}>{booking.type === 'enrollment' ? 'Group class' : 'Private lesson'}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Service</span><span style={{ fontWeight:500 }}>{booking.description}</span></div>
                  {booking.date && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Date</span><span>{booking.date}</span></div>}
                  {booking.time && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Time</span><span>{booking.time}</span></div>}
                  {booking.coach && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Coach</span><span>{booking.coach}</span></div>}
                  {booking.payment_mode === 'deposit' && booking.deposit_amount && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Payment</span><span style={{ color:'#BA7517', fontWeight:500 }}>Deposit (${booking.deposit_amount} now, balance due at session)</span></div>
                  )}
                </div>

                {/* Discount code */}
                <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'1rem', marginTop:'1rem' }}>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px', fontWeight:500 }}>Promo code</div>
                  {discountApplied ? (
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:'#E1F5EE', borderRadius:'8px', border:'0.5px solid #5DCAA5' }}>
                      <span style={{ fontSize:'13px', color:'#0F6E56', fontWeight:600 }}>✓ {discountApplied.code} applied</span>
                      <span style={{ fontSize:'12px', color:'#0F6E56' }}>— {discountApplied.type==='percentage'?discountApplied.value+'% off':'$'+discountApplied.value+' off'}</span>
                      <button onClick={function(){setDiscountApplied(null);setDiscountCode('')}} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#0F6E56', fontSize:'16px' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:'8px' }}>
                      <input type="text" style={inp} value={discountCode} onChange={function(e){setDiscountCode(e.target.value.toUpperCase())}} placeholder="Enter promo code" onKeyDown={function(e){if(e.key==='Enter')applyDiscount()}} />
                      <button style={{ ...btn, flexShrink:0, padding:'9px 16px' }} onClick={applyDiscount} disabled={checkingDiscount}>{checkingDiscount?'Checking...':'Apply'}</button>
                    </div>
                  )}
                  {discountError && <div style={{ fontSize:'12px', color:'#A32D2D', marginTop:'5px' }}>{discountError}</div>}
                </div>

                {/* Total */}
                <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.1)', paddingTop:'1rem', marginTop:'1rem' }}>
                  {discountApplied && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#888', marginBottom:'6px' }}>
                      <span>Original price</span><span style={{ textDecoration:'line-through' }}>${parseFloat(booking.amount||0).toFixed(2)}</span>
                    </div>
                  )}
                  {discountApplied && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', color:'#1D9E75', marginBottom:'6px' }}>
                      <span>Discount</span><span>−${(parseFloat(booking.amount||0) - total).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'15px', fontWeight:700 }}>Total{booking.payment_mode==='deposit'?' (deposit)':''}</span>
                    <span style={{ fontSize:'22px', fontWeight:800, color:'#1D9E75' }}>{total === 0 ? 'Free' : '$'+total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {total === 0 ? (
                <button style={btnGold} onClick={async function(){
                  setRedirecting(true)
                  sessionStorage.removeItem('pending_booking')
                  window.location.href = '/portal/bookings?payment=success'
                }}>Confirm free booking</button>
              ) : (
                <div>
                  <button style={{ ...btnGold, marginBottom:'12px' }} onClick={proceedToPayment} disabled={redirecting}>
                    {redirecting ? 'Redirecting to Stripe...' : '🔒 Pay $'+total.toFixed(2)+' securely'}
                  </button>
                  <div style={{ textAlign:'center', fontSize:'12px', color:'#aaa', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                    <span>🔒</span> Powered by Stripe · SSL encrypted · Cards, Apple Pay, Google Pay
                  </div>
                </div>
              )}

              <button style={{ ...btn, width:'100%', marginTop:'10px', textAlign:'center', color:'#888' }} onClick={function(){window.history.back()}}>← Go back</button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
