import { useEffect, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

export default function PortalProfile() {
  var [profile, setProfile] = useState(null)
  var [loading, setLoading] = useState(true)
  var [editing, setEditing] = useState(false)
  var [form, setForm] = useState({})
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [agreements, setAgreements] = useState([])
  var [loyaltyPoints, setLoyaltyPoints] = useState(null)
  var [credits, setCredits] = useState([])
  var [referralCode, setReferralCode] = useState(null)
  var [copied, setCopied] = useState(false)

  useEffect(function(){
    async function load(){
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href='/login'; return }
      var uid = s.data.session.user.id
      var [pR, agR, lpR, crR] = await Promise.all([
        supabase.from('profiles').select('*').eq('id',uid).single(),
        supabase.from('signed_agreements').select('*, terms_documents(title,type,version)').eq('customer_id',uid).order('signed_at',{ascending:false}),
        supabase.from('loyalty_points').select('*').eq('customer_id',uid).maybeSingle(),
        supabase.from('customer_credits').select('*').eq('customer_id',uid).eq('is_used',false).gte('expires_at',new Date().toISOString()),
      ])
      setProfile(pR.data)
      setForm({ full_name:pR.data&&pR.data.full_name||'', phone:pR.data&&pR.data.phone||'', city:(pR.data&&pR.data.address_json&&pR.data.address_json.city)||'' })
      setAgreements(agR.data||[])
      setLoyaltyPoints(lpR.data)
      setCredits(crR.data||[])
      setReferralCode(lpR.data&&lpR.data.referral_code)
      setLoading(false)
    }
    load()
  },[])

  async function saveProfile(){
    setSaving(true)
    var s = await supabase.auth.getSession()
    if (!s.data.session) return
    await supabase.from('profiles').update({ full_name:form.full_name, phone:form.phone, address_json:{...((profile&&profile.address_json)||{}), city:form.city} }).eq('id',s.data.session.user.id)
    setProfile(function(p){ return {...p, full_name:form.full_name, phone:form.phone} })
    setSaving(false); setSaved(true); setEditing(false)
    setTimeout(function(){setSaved(false)},2500)
  }

  async function signOut(){
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <div style={{ minHeight:'100vh', background:'#f5f5f3', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ color:'#999', fontSize:'13px' }}>Loading...</div></div>

  var initials = (profile&&profile.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
  var totalCredits = credits.reduce(function(s,c){return s+parseFloat(c.amount||0)},0)
  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  return (
    <>
      <Head><title>My profile — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#f5f5f3' }}>
        <nav style={{ background:'#0D0D0D', padding:'0 1.5rem', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
          <a href="/" style={{ fontSize:'17px', fontWeight:800, color:'#fff', letterSpacing:'-0.02em', textDecoration:'none' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></a>
          <a href="/portal" style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)' }}>← My portal</a>
        </nav>

        <div style={{ maxWidth:'720px', margin:'0 auto', padding:'2rem 1.5rem' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.5rem' }}>
            <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'#D4A843', color:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:800 }}>{initials}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'22px', fontWeight:700 }}>{profile&&profile.full_name}</div>
              <div style={{ fontSize:'13px', color:'#888' }}>{profile&&profile.email}</div>
            </div>
            {!editing && <button style={btnGold} onClick={function(){setEditing(true)}}>Edit profile</button>}
          </div>

          {/* Loyalty + credits */}
          {(loyaltyPoints || totalCredits > 0) && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1.25rem' }}>
              {loyaltyPoints && (
                <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Loyalty points</div>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#D4A843' }}>{loyaltyPoints.total_points||0}</div>
                  <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'2px' }}>{loyaltyPoints.lifetime_points||0} lifetime · {loyaltyPoints.redeemed_points||0} redeemed</div>
                </div>
              )}
              {totalCredits > 0 && (
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ fontSize:'11px', color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>Account credits</div>
                  <div style={{ fontSize:'28px', fontWeight:800, color:'#1D9E75' }}>${totalCredits.toFixed(2)}</div>
                  <div style={{ fontSize:'12px', color:'#aaa', marginTop:'2px' }}>Auto-applied at checkout</div>
                </div>
              )}
            </div>
          )}

          {/* Profile info */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Personal details</div>
            {editing ? (
              <div style={{ display:'grid', gap:'12px' }}>
                {[['Full name','full_name','text'],['Phone','phone','tel'],['City','city','text']].map(function(f){
                  return <div key={f[1]}>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>{f[0]}</div>
                    <input type={f[2]} style={inp} value={form[f[1]]||''} onChange={function(e){var v=e.target.value;setForm(function(p){var n={...p};n[f[1]]=v;return n})}} />
                  </div>
                })}
                {saved && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#0F6E56' }}>✓ Profile saved.</div>}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setEditing(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveProfile} disabled={saving}>{saving?'Saving...':'Save changes'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gap:'2px' }}>
                {[['Name',profile&&profile.full_name],['Email',profile&&profile.email],['Phone',profile&&profile.phone||'—'],['City',profile&&profile.address_json&&profile.address_json.city||'—'],['Member since',profile&&profile.created_at?new Date(profile.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'—']].map(function(row,i){
                  return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}>
                    <div style={{ color:'#888', width:'120px', flexShrink:0 }}>{row[0]}</div>
                    <div style={{ fontWeight:500 }}>{row[1]}</div>
                  </div>
                })}
              </div>
            )}
          </div>

          {/* Referral */}
          {referralCode && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Refer a friend</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>Share your unique link and earn points when your friend completes their first booking.</div>
              <div style={{ display:'flex', gap:'8px' }}>
                <div style={{ flex:1, padding:'10px 14px', background:'#f9f9f7', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.1)', fontSize:'13px', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {typeof window!=='undefined'?window.location.origin+'/signup?ref='+referralCode:''}
                </div>
                <button style={btnGold} onClick={function(){
                  var url = window.location.origin+'/signup?ref='+referralCode
                  navigator.clipboard&&navigator.clipboard.writeText(url)
                  setCopied(true); setTimeout(function(){setCopied(false)},2000)
                }}>{copied?'✓ Copied!':'Copy link'}</button>
              </div>
            </div>
          )}

          {/* Signed agreements */}
          {agreements.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Signed agreements</div>
              <div style={{ display:'grid', gap:'8px' }}>
                {agreements.map(function(a){
                  var doc = a.terms_documents||{}
                  return (
                    <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'#f9f9f7', borderRadius:'8px' }}>
                      <span style={{ fontSize:'18px' }}>📄</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:500 }}>{doc.title||'Document'}</div>
                        <div style={{ fontSize:'11px', color:'#888' }}>Signed {new Date(a.signed_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} · v{a.document_version||1}</div>
                      </div>
                      <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>✓ Signed</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button onClick={signOut} style={{ ...btn, color:'#A32D2D', width:'100%', padding:'12px', textAlign:'center' }}>Sign out</button>
        </div>
      </div>
    </>
  )
}
