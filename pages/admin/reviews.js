import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Reviews() {
  var [reviews, setReviews] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('all')
  var [filterRating, setFilterRating] = useState(0)
  var [filterCoach, setFilterCoach] = useState('')
  var [coaches, setCoaches] = useState([])
  var [responding, setResponding] = useState(null)
  var [responseText, setResponseText] = useState('')
  var [saving, setSaving] = useState(false)
  var [settings, setSettings] = useState({ google_review_url:'', auto_redirect_stars:5, request_after:'checkin' })
  var [savingSettings, setSavingSettings] = useState(false)
  var [savedSettings, setSavedSettings] = useState(false)

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [revR, coachR] = await Promise.all([
      supabase.from('reviews').select('*, profiles!reviews_customer_id_fkey(full_name, email), coach:profiles!reviews_coach_id_fkey(full_name)').order('created_at', { ascending:false }),
      supabase.from('profiles').select('id, full_name').in('role',['coach']).eq('is_active', true),
    ])
    setReviews(revR.data||[])
    setCoaches(coachR.data||[])
    setLoading(false)
  }

  async function submitResponse(reviewId) {
    if (!responseText.trim()) return
    setSaving(true)
    await supabase.from('reviews').update({ admin_response: responseText, responded_at: new Date().toISOString() }).eq('id', reviewId)
    setReviews(function(p){ return p.map(function(r){ return r.id===reviewId ? {...r, admin_response:responseText, responded_at:new Date().toISOString()} : r }) })
    setResponding(null); setResponseText(''); setSaving(false)
  }

  async function flagReview(reviewId) {
    await supabase.from('reviews').update({ status:'flagged' }).eq('id', reviewId)
    setReviews(function(p){ return p.map(function(r){ return r.id===reviewId ? {...r, status:'flagged'} : r }) })
  }

  async function saveSettings() {
    setSavingSettings(true)
    var r = await supabase.from('review_settings').select('id').limit(1).maybeSingle()
    if (r.data) await supabase.from('review_settings').update({ config_json: settings }).eq('id', r.data.id)
    else await supabase.from('review_settings').insert({ config_json: settings })
    setSavingSettings(false); setSavedSettings(true)
    setTimeout(function(){ setSavedSettings(false) }, 2500)
  }

  var filtered = reviews.filter(function(r){
    if (tab === 'flagged' && r.status !== 'flagged') return false
    if (tab === 'responded' && !r.admin_response) return false
    if (tab === 'unanswered' && r.admin_response) return false
    if (filterRating > 0 && r.rating !== filterRating) return false
    if (filterCoach && r.coach_id !== filterCoach) return false
    return true
  })

  var avgRating = reviews.length > 0 ? (reviews.reduce(function(s,r){return s+(r.rating||0)},0)/reviews.length).toFixed(1) : '—'
  var fiveStars = reviews.filter(function(r){return r.rating===5}).length
  var ratingDist = [5,4,3,2,1].map(function(n){ return { n, count: reviews.filter(function(r){return r.rating===n}).length } })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  function Stars({ n, size }) {
    return <span style={{ fontSize:size||14, letterSpacing:'1px' }}>{[1,2,3,4,5].map(function(i){ return <span key={i} style={{ color:i<=n?'#D4A843':'#ddd' }}>★</span> })}</span>
  }

  return (
    <AdminLayout active="reviews">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Reviews</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Collect, manage and respond to customer reviews</div>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:'16px', marginBottom:'1.5rem' }}>
          <div style={{ background:'#0D0D0D', borderRadius:'12px', padding:'1.5rem', textAlign:'center' }}>
            <div style={{ fontSize:'48px', fontWeight:800, color:'#D4A843', lineHeight:1 }}>{avgRating}</div>
            <Stars n={Math.round(parseFloat(avgRating)||0)} size={18} />
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'6px' }}>{reviews.length} reviews</div>
          </div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
            <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'12px' }}>Rating breakdown</div>
            {ratingDist.map(function(d){
              var pct = reviews.length > 0 ? Math.round(d.count/reviews.length*100) : 0
              return (
                <div key={d.n} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'3px', width:'60px', flexShrink:0 }}>
                    <span style={{ fontSize:'13px', color:'#888' }}>{d.n}</span>
                    <span style={{ color:'#D4A843', fontSize:'12px' }}>★</span>
                  </div>
                  <div style={{ flex:1, height:'8px', background:'#f1f1f1', borderRadius:'4px' }}>
                    <div style={{ height:'100%', borderRadius:'4px', background:'#D4A843', width:pct+'%', transition:'width 0.4s' }}></div>
                  </div>
                  <div style={{ width:'40px', textAlign:'right', fontSize:'12px', color:'#888' }}>{d.count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {[['all','All'],['unanswered','Needs response'],['responded','Responded'],['flagged','Flagged']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        <div style={{ display:'flex', gap:'8px', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          <select style={{ ...sel, width:'auto' }} value={filterRating} onChange={function(e){setFilterRating(parseInt(e.target.value))}}>
            <option value={0}>All ratings</option>
            {[5,4,3,2,1].map(function(n){ return <option key={n} value={n}>{n} stars</option> })}
          </select>
          <select style={{ ...sel, width:'auto' }} value={filterCoach} onChange={function(e){setFilterCoach(e.target.value)}}>
            <option value="">All coaches</option>
            {coaches.map(function(c){ return <option key={c.id} value={c.id}>{c.full_name}</option> })}
          </select>
          <div style={{ marginLeft:'auto', fontSize:'13px', color:'#888', display:'flex', alignItems:'center' }}>
            {filtered.length} review{filtered.length!==1?'s':''}
          </div>
        </div>

        {/* Review list */}
        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>⭐</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>No reviews yet</div>
            <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Reviews appear here after customers submit them. Configure review requests in the Settings tab.</div>
          </div>
        )}

        <div style={{ display:'grid', gap:'12px' }}>
          {filtered.map(function(review){
            var cust = review.profiles ? review.profiles.full_name : 'Anonymous'
            var ini = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
            var coach = review.coach ? review.coach.full_name : null
            var isFlagged = review.status === 'flagged'

            return (
              <div key={review.id} style={{ background:'#fff', border:'0.5px solid '+(isFlagged?'#F09595':'rgba(0,0,0,0.08)'), borderRadius:'12px', padding:'1.25rem', opacity:isFlagged?0.7:1 }}>
                <div style={{ display:'flex', gap:'12px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' }}>
                      <div>
                        <span style={{ fontSize:'14px', fontWeight:600 }}>{cust}</span>
                        {coach && <span style={{ fontSize:'12px', color:'#888', marginLeft:'8px' }}>→ {coach}</span>}
                        {isFlagged && <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:'#FCEBEB', color:'#A32D2D', fontWeight:500, marginLeft:'8px' }}>Flagged</span>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <Stars n={review.rating||0} size={14} />
                        <div style={{ fontSize:'11px', color:'#aaa', marginTop:'2px' }}>{review.created_at?review.created_at.substring(0,10):'—'}</div>
                      </div>
                    </div>
                    {review.review_text && <div style={{ fontSize:'13px', color:'#444', lineHeight:1.7, marginBottom:'10px' }}>{review.review_text}</div>}

                    {/* Admin response */}
                    {review.admin_response && (
                      <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px', borderLeft:'3px solid #D4A843' }}>
                        <div style={{ fontSize:'11px', fontWeight:600, color:'#888', marginBottom:'4px' }}>YOUR RESPONSE</div>
                        <div style={{ fontSize:'13px', color:'#444' }}>{review.admin_response}</div>
                      </div>
                    )}

                    {/* Response composer */}
                    {responding === review.id && (
                      <div style={{ marginBottom:'10px' }}>
                        <textarea style={{ ...inp, resize:'vertical', minHeight:'80px' }} value={responseText} onChange={function(e){setResponseText(e.target.value)}} placeholder="Write a response visible to the customer..." />
                        <div style={{ display:'flex', gap:'8px', marginTop:'6px' }}>
                          <button style={btn} onClick={function(){setResponding(null);setResponseText('')}}>Cancel</button>
                          <button style={btnGold} onClick={function(){submitResponse(review.id)}} disabled={saving}>{saving?'Saving...':'Post response'}</button>
                        </div>
                      </div>
                    )}

                    <div style={{ display:'flex', gap:'6px' }}>
                      {!review.admin_response && responding !== review.id && (
                        <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){setResponding(review.id);setResponseText('')}}>Reply</button>
                      )}
                      {review.rating === 5 && settings.google_review_url && (
                        <a href={settings.google_review_url} target="_blank" rel="noreferrer" style={{ ...btn, fontSize:'12px', padding:'4px 10px', textDecoration:'none', color:'#185FA5' }}>⭐ Share to Google</a>
                      )}
                      {!isFlagged && (
                        <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){flagReview(review.id)}}>Flag</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Settings section */}
        <div style={{ marginTop:'2rem', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
          <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Review settings</div>
          <div style={{ display:'grid', gap:'14px', maxWidth:'480px' }}>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Google review page URL</div>
              <input type="text" style={inp} value={settings.google_review_url} onChange={function(e){setSettings(function(p){return{...p,google_review_url:e.target.value}})}} placeholder="https://g.page/r/your-business/review" />
              <div style={{ fontSize:'11px', color:'#aaa', marginTop:'4px' }}>5-star reviewers are automatically redirected here</div>
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Auto-redirect to Google at</div>
              <select style={sel} value={settings.auto_redirect_stars} onChange={function(e){setSettings(function(p){return{...p,auto_redirect_stars:parseInt(e.target.value)}})}}>
                <option value={5}>5 stars only</option>
                <option value={4}>4+ stars</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px', fontWeight:500 }}>Send review request after</div>
              <select style={sel} value={settings.request_after} onChange={function(e){setSettings(function(p){return{...p,request_after:e.target.value}})}}>
                <option value="checkin">Check-in to a class</option>
                <option value="appointment_complete">Appointment completed</option>
                <option value="both">Both</option>
              </select>
            </div>
            {savedSettings && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#0F6E56' }}>✓ Settings saved.</div>}
            <button style={btnGold} onClick={saveSettings} disabled={savingSettings}>{savingSettings?'Saving...':'Save review settings'}</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
