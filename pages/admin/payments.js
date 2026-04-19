import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var TABS = [['transactions','Transactions'],['payouts','Coach payouts'],['discounts','Discount codes'],['giftcards','Gift cards'],['packages','Packages'],['memberships','Memberships']]

function Badge({ label, bg, color }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:bg, color:color, fontWeight:500 }}>{label}</span>
}

export default function Payments() {
  var [tab, setTab] = useState('transactions')
  var [payments, setPayments] = useState([])
  var [discounts, setDiscounts] = useState([])
  var [giftCards, setGiftCards] = useState([])
  var [packages, setPackages] = useState([])
  var [memberships, setMemberships] = useState([])
  var [payouts, setPayouts] = useState([])
  var [loading, setLoading] = useState(true)
  var [showCreate, setShowCreate] = useState(false)
  var [saving, setSaving] = useState(false)

  // Forms
  var [discountForm, setDiscountForm] = useState({ code:'', type:'percentage', value:'', max_uses:'', expires_at:'', applicable_to:'all' })
  var [giftForm, setGiftForm] = useState({ initial_value:'', customer_email:'' })
  var [packageForm, setPackageForm] = useState({ name:'', description:'', package_type:'sessions', session_count:'', price:'', validity_days:'365' })
  var [membershipForm, setMembershipForm] = useState({ name:'', description:'', price_monthly:'', price_annual:'', classes_per_month:'', appointment_discount_pct:'0' })

  useEffect(function() { loadAll() }, [tab])

  async function loadAll() {
    setLoading(true)
    if (tab === 'transactions') {
      var r = await supabase.from('payments').select('*, profiles!payments_customer_id_fkey(full_name,email)').order('created_at',{ascending:false}).limit(50)
      setPayments(r.data||[])
    } else if (tab === 'discounts') {
      var r = await supabase.from('discount_codes').select('*').order('created_at',{ascending:false})
      setDiscounts(r.data||[])
    } else if (tab === 'giftcards') {
      var r = await supabase.from('gift_cards').select('*, profiles!gift_cards_issued_to_customer_id_fkey(full_name)').order('created_at',{ascending:false})
      setGiftCards(r.data||[])
    } else if (tab === 'packages') {
      var r = await supabase.from('packages').select('*').order('created_at',{ascending:false})
      setPackages(r.data||[])
    } else if (tab === 'memberships') {
      var r = await supabase.from('memberships').select('*').order('created_at',{ascending:false})
      setMemberships(r.data||[])
    } else if (tab === 'payouts') {
      var r = await supabase.from('payout_records').select('*, profiles!payout_records_staff_id_fkey(full_name)').order('period_end',{ascending:false})
      setPayouts(r.data||[])
    }
    setLoading(false)
  }

  async function saveDiscount() {
    setSaving(true)
    await supabase.from('discount_codes').insert({ code:discountForm.code.toUpperCase(), type:discountForm.type, value:parseFloat(discountForm.value)||0, max_uses:parseInt(discountForm.max_uses)||null, expires_at:discountForm.expires_at||null, applicable_to:discountForm.applicable_to, is_active:true })
    setSaving(false); setShowCreate(false); loadAll()
  }

  async function savePackage() {
    setSaving(true)
    await supabase.from('packages').insert({ name:packageForm.name, description:packageForm.description, package_type:packageForm.package_type, session_count:parseInt(packageForm.session_count)||null, price:parseFloat(packageForm.price)||0, validity_days:parseInt(packageForm.validity_days)||365, is_active:true })
    setSaving(false); setShowCreate(false); loadAll()
  }

  async function saveMembership() {
    setSaving(true)
    await supabase.from('memberships').insert({ name:membershipForm.name, description:membershipForm.description, price_monthly:parseFloat(membershipForm.price_monthly)||0, price_annual:parseFloat(membershipForm.price_annual)||null, classes_per_month:parseInt(membershipForm.classes_per_month)||null, appointment_discount_pct:parseInt(membershipForm.appointment_discount_pct)||0, is_active:true })
    setSaving(false); setShowCreate(false); loadAll()
  }

  async function toggleDiscount(id, current) {
    await supabase.from('discount_codes').update({ is_active:!current }).eq('id',id)
    setDiscounts(function(p){ return p.map(function(d){ return d.id===id?{...d,is_active:!current}:d }) })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px', whiteSpace:'nowrap' }
  }

  // Revenue totals
  var totalRev = payments.filter(function(p){return p.status==='succeeded'}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0)
  var pendingRev = payments.filter(function(p){return p.status==='pending'}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0)

  function CreateForm() {
    if (tab === 'discounts') return (
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create discount code</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Code</div><input type="text" style={inp} value={discountForm.code} onChange={function(e){setDiscountForm(function(p){return{...p,code:e.target.value.toUpperCase()}})}} placeholder="e.g. SPRING20" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
            <select style={inp} value={discountForm.type} onChange={function(e){setDiscountForm(function(p){return{...p,type:e.target.value}})}}>
              <option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option>
            </select>
          </div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Value ({discountForm.type==='percentage'?'%':'$'})</div><input type="number" style={inp} value={discountForm.value} onChange={function(e){setDiscountForm(function(p){return{...p,value:e.target.value}})}} placeholder={discountForm.type==='percentage'?'20':'10'} /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max uses (leave blank = unlimited)</div><input type="number" style={inp} value={discountForm.max_uses} onChange={function(e){setDiscountForm(function(p){return{...p,max_uses:e.target.value}})}} placeholder="e.g. 50" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Expires</div><input type="date" style={inp} value={discountForm.expires_at} onChange={function(e){setDiscountForm(function(p){return{...p,expires_at:e.target.value}})}} /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Applies to</div>
            <select style={inp} value={discountForm.applicable_to} onChange={function(e){setDiscountForm(function(p){return{...p,applicable_to:e.target.value}})}}>
              <option value="all">All bookings</option><option value="classes">Classes only</option><option value="appointments">Appointments only</option><option value="first_booking">First booking only</option>
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
          <button style={btnGold} onClick={saveDiscount} disabled={saving}>{saving?'Saving...':'Create code'}</button>
        </div>
      </div>
    )

    if (tab === 'giftcards') return (
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Issue gift card</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Amount ($)</div><input type="number" style={inp} value={giftForm.initial_value} onChange={function(e){setGiftForm(function(p){return{...p,initial_value:e.target.value}})}} placeholder="50" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Recipient email (optional)</div><input type="email" style={inp} value={giftForm.customer_email} onChange={function(e){setGiftForm(function(p){return{...p,customer_email:e.target.value}})}} placeholder="customer@email.com" /></div>
        </div>
        <div style={{ background:'#f5f5f3', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#888', marginBottom:'12px' }}>A unique code will be auto-generated. To accept payments for gift cards, connect Stripe in Settings.</div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
          <button style={btnGold} onClick={async function(){
            setSaving(true)
            var code = 'GC-'+Math.random().toString(36).substring(2,10).toUpperCase()
            var val = parseFloat(giftForm.initial_value)||0
            await supabase.from('gift_cards').insert({ code, initial_value:val, remaining_value:val, is_active:true })
            setSaving(false); setShowCreate(false); loadAll()
          }} disabled={saving}>{saving?'Issuing...':'Issue gift card'}</button>
        </div>
      </div>
    )

    if (tab === 'packages') return (
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create package</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Package name</div><input type="text" style={inp} value={packageForm.name} onChange={function(e){setPackageForm(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. 10-Session Tennis Pack" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
            <select style={inp} value={packageForm.package_type} onChange={function(e){setPackageForm(function(p){return{...p,package_type:e.target.value}})}}>
              <option value="sessions">Session pack (private lessons)</option><option value="classes">Class pack (group classes)</option><option value="unlimited">Unlimited</option>
            </select>
          </div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{packageForm.package_type==='unlimited'?'Label':'Number of sessions/classes'}</div><input type="number" style={inp} value={packageForm.session_count} onChange={function(e){setPackageForm(function(p){return{...p,session_count:e.target.value}})}} placeholder="10" disabled={packageForm.package_type==='unlimited'} /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={packageForm.price} onChange={function(e){setPackageForm(function(p){return{...p,price:e.target.value}})}} placeholder="700" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Valid for (days)</div><input type="number" style={inp} value={packageForm.validity_days} onChange={function(e){setPackageForm(function(p){return{...p,validity_days:e.target.value}})}} placeholder="365" /></div>
          <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={packageForm.description} onChange={function(e){setPackageForm(function(p){return{...p,description:e.target.value}})}} placeholder="What's included in this package..." /></div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
          <button style={btnGold} onClick={savePackage} disabled={saving}>{saving?'Saving...':'Create package'}</button>
        </div>
      </div>
    )

    if (tab === 'memberships') return (
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
        <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create membership</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
          <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Membership name</div><input type="text" style={inp} value={membershipForm.name} onChange={function(e){setMembershipForm(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. Elite Monthly Membership" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Monthly price ($)</div><input type="number" style={inp} value={membershipForm.price_monthly} onChange={function(e){setMembershipForm(function(p){return{...p,price_monthly:e.target.value}})}} placeholder="99" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Annual price ($, optional)</div><input type="number" style={inp} value={membershipForm.price_annual} onChange={function(e){setMembershipForm(function(p){return{...p,price_annual:e.target.value}})}} placeholder="990" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Classes per month included</div><input type="number" style={inp} value={membershipForm.classes_per_month} onChange={function(e){setMembershipForm(function(p){return{...p,classes_per_month:e.target.value}})}} placeholder="4" /></div>
          <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Appointment discount (%)</div><input type="number" style={inp} value={membershipForm.appointment_discount_pct} onChange={function(e){setMembershipForm(function(p){return{...p,appointment_discount_pct:e.target.value}})}} placeholder="10" /></div>
          <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={membershipForm.description} onChange={function(e){setMembershipForm(function(p){return{...p,description:e.target.value}})}} placeholder="Describe membership benefits..." /></div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
          <button style={btnGold} onClick={saveMembership} disabled={saving}>{saving?'Saving...':'Create membership'}</button>
        </div>
      </div>
    )

    return null
  }

  var canCreate = ['discounts','giftcards','packages','memberships'].includes(tab)
  var createLabels = { discounts:'+ Discount code', giftcards:'+ Issue gift card', packages:'+ New package', memberships:'+ New membership' }

  return (
    <AdminLayout active="payments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div><div style={{ fontSize:'22px', fontWeight:700 }}>Payments</div><div style={{ fontSize:'13px', color:'#888' }}>Revenue, payouts, discounts, gift cards, and packages</div></div>
          {canCreate && <button style={btnGold} onClick={function(){setShowCreate(function(x){return !x})}}>{createLabels[tab]}</button>}
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[['Total revenue','$'+payments.filter(function(p){return p.status==='succeeded'}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0).toLocaleString('en-US',{minimumFractionDigits:0}),'#1D9E75'],['Pending','$'+pendingRev.toFixed(0),'#BA7517'],['Active discounts',discounts.filter(function(d){return d.is_active}).length.toString(),'#534AB7'],['Packages sold','0','#185FA5']].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}><div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div><div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div></div>
          })}
        </div>

        {/* Stripe CTA */}
        <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1rem 1.25rem', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
          <div style={{ fontSize:'24px' }}>💳</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#fff' }}>Connect Stripe to accept payments</div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>Add your Stripe keys in Settings → Integrations to enable checkout, subscriptions, and payouts.</div>
          </div>
          <a href="/admin/settings" style={{ padding:'7px 14px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:600, textDecoration:'none', whiteSpace:'nowrap' }}>Configure Stripe →</a>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem', overflowX:'auto' }}>
          {TABS.map(function(t){ return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0]);setShowCreate(false)}}>{t[1]}</button> })}
        </div>

        {showCreate && <CreateForm />}

        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}

        {/* Transactions */}
        {!loading && tab === 'transactions' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Type','Amount','Status','Date',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No payments yet. Connect Stripe to start collecting payments.</td></tr>}
                {payments.map(function(p,i) {
                  var sc = { succeeded:['#E1F5EE','#0F6E56'], pending:['#FAEEDA','#854F0B'], failed:['#FCEBEB','#A32D2D'], refunded:['#F1EFE8','#5F5E5A'] }[p.status]||['#FAEEDA','#854F0B']
                  return <tr key={p.id} style={{ borderBottom:i<payments.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{p.profiles?p.profiles.full_name:'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{p.ref_type||'payment'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:p.status==='succeeded'?'#1D9E75':'#1a1a1a' }}>${parseFloat(p.amount||0).toFixed(2)}</td>
                    <td style={{ padding:'10px 14px' }}><Badge label={p.status} bg={sc[0]} color={sc[1]} /></td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{p.created_at?p.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>Receipt</button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Discount codes */}
        {!loading && tab === 'discounts' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Code','Type','Value','Uses','Expires','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {discounts.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No discount codes yet. Create one above.</td></tr>}
                {discounts.map(function(d,i) {
                  return <tr key={d.id} style={{ borderBottom:i<discounts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', fontWeight:700, fontSize:'13px', background:'#f5f5f3', padding:'2px 8px', borderRadius:'4px' }}>{d.code}</span></td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{d.type==='percentage'?'Percentage':'Fixed'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>{d.type==='percentage'?d.value+'%':'$'+parseFloat(d.value||0).toFixed(2)}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{d.uses_count||0}{d.max_uses?' / '+d.max_uses:' / ∞'}</td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{d.expires_at?d.expires_at.substring(0,10):'No expiry'}</td>
                    <td style={{ padding:'10px 14px' }}><Badge label={d.is_active?'Active':'Inactive'} bg={d.is_active?'#E1F5EE':'#F1EFE8'} color={d.is_active?'#0F6E56':'#888'} /></td>
                    <td style={{ padding:'10px 14px' }}>
                      <button style={{ ...btn, padding:'4px 10px', fontSize:'12px', color:d.is_active?'#BA7517':'#0F6E56' }} onClick={function(){toggleDiscount(d.id,d.is_active)}}>{d.is_active?'Deactivate':'Activate'}</button>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Gift cards */}
        {!loading && tab === 'giftcards' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Code','Initial value','Remaining','Issued to','Expires','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {giftCards.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No gift cards yet. Issue one above.</td></tr>}
                {giftCards.map(function(g,i) {
                  var remaining = parseFloat(g.remaining_value||0)
                  var initial = parseFloat(g.initial_value||0)
                  var pct = initial > 0 ? Math.round((remaining/initial)*100) : 0
                  return <tr key={g.id} style={{ borderBottom:i<giftCards.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', fontWeight:700, background:'#f5f5f3', padding:'2px 8px', borderRadius:'4px', fontSize:'12px' }}>{g.code}</span></td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>${initial.toFixed(2)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontWeight:600, color:remaining===0?'#A32D2D':'#1D9E75' }}>${remaining.toFixed(2)}</span>
                        <div style={{ width:'60px', height:'5px', background:'#f1f1f1', borderRadius:'3px' }}><div style={{ height:'100%', borderRadius:'3px', background:pct<20?'#A32D2D':'#1D9E75', width:pct+'%' }}></div></div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{g.profiles?g.profiles.full_name:'Unassigned'}</td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{g.expires_at?g.expires_at.substring(0,10):'No expiry'}</td>
                    <td style={{ padding:'10px 14px' }}><Badge label={g.is_active?'Active':'Used'} bg={g.is_active?'#E1F5EE':'#F1EFE8'} color={g.is_active?'#0F6E56':'#888'} /></td>
                    <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>Details</button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Packages */}
        {!loading && tab === 'packages' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {packages.length === 0 && (
              <div style={{ gridColumn:'span 4', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>📦</div>
                <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No packages yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Create session packs like "10 Private Lessons for $700" — great for customer loyalty.</div>
                <button style={btnGold} onClick={function(){setShowCreate(true)}}>+ Create first package</button>
              </div>
            )}
            {packages.map(function(pkg) {
              var perSession = pkg.session_count && pkg.price ? (parseFloat(pkg.price)/parseInt(pkg.session_count)).toFixed(2) : null
              return (
                <div key={pkg.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div style={{ fontSize:'15px', fontWeight:600 }}>{pkg.name}</div>
                    <Badge label={pkg.is_active?'Active':'Inactive'} bg={pkg.is_active?'#E1F5EE':'#F1EFE8'} color={pkg.is_active?'#0F6E56':'#888'} />
                  </div>
                  {pkg.description && <div style={{ fontSize:'12px', color:'#888', marginBottom:'10px', lineHeight:1.5 }}>{pkg.description}</div>}
                  <div style={{ display:'grid', gap:'5px', fontSize:'13px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Price</span><span style={{ fontWeight:700, color:'#1D9E75', fontSize:'16px' }}>${parseFloat(pkg.price||0).toFixed(2)}</span></div>
                    {pkg.session_count && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Sessions</span><span style={{ fontWeight:600 }}>{pkg.session_count}</span></div>}
                    {perSession && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Per session</span><span style={{ color:'#1D9E75' }}>${perSession}</span></div>}
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Valid for</span><span>{pkg.validity_days} days</span></div>
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button style={{ ...btn, flex:1, fontSize:'12px' }}>Edit</button>
                    <button style={{ ...btn, fontSize:'12px', color:'#A32D2D' }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Memberships */}
        {!loading && tab === 'memberships' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
            {memberships.length === 0 && (
              <div style={{ gridColumn:'span 4', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>🎟</div>
                <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>No memberships yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Create recurring monthly memberships with Stripe for predictable revenue.</div>
                <button style={btnGold} onClick={function(){setShowCreate(true)}}>+ Create first membership</button>
              </div>
            )}
            {memberships.map(function(m) {
              return (
                <div key={m.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div style={{ fontSize:'15px', fontWeight:600 }}>{m.name}</div>
                    <Badge label={m.is_active?'Active':'Inactive'} bg={m.is_active?'#E1F5EE':'#F1EFE8'} color={m.is_active?'#0F6E56':'#888'} />
                  </div>
                  {m.description && <div style={{ fontSize:'12px', color:'#888', marginBottom:'10px', lineHeight:1.5 }}>{m.description}</div>}
                  <div style={{ display:'grid', gap:'5px', fontSize:'13px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Monthly</span><span style={{ fontWeight:700, color:'#1D9E75', fontSize:'16px' }}>${parseFloat(m.price_monthly||0).toFixed(2)}/mo</span></div>
                    {m.price_annual && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Annual</span><span style={{ fontWeight:600 }}>${parseFloat(m.price_annual||0).toFixed(2)}/yr</span></div>}
                    {m.classes_per_month && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Classes included</span><span>{m.classes_per_month}/month</span></div>}
                    {m.appointment_discount_pct > 0 && <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#888' }}>Lesson discount</span><span style={{ color:'#534AB7', fontWeight:600 }}>{m.appointment_discount_pct}% off</span></div>}
                  </div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <button style={{ ...btn, flex:1, fontSize:'12px' }}>Edit</button>
                    <button style={{ ...btn, fontSize:'12px', color:'#A32D2D' }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Payouts */}
        {!loading && tab === 'payouts' && (
          <div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', marginBottom:'1rem' }}>
              <div style={{ fontSize:'24px', marginBottom:'12px' }}>💰</div>
              <div style={{ fontWeight:600, marginBottom:'6px', color:'#1a1a1a' }}>Coach payout reports</div>
              <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Generate payout reports from completed sessions using each coach's configured pay rate.</div>
              <button style={btnGold} onClick={async function(){
                var staffR = await supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true)
                var staff = staffR.data||[]
                if (staff.length === 0) { alert('No active coaches found.'); return }
                var now = new Date()
                var start = new Date(now.getFullYear(), now.getMonth(), 1)
                var end = new Date(now.getFullYear(), now.getMonth()+1, 0)
                for (var s of staff) {
                  await supabase.from('payout_records').insert({ staff_id:s.id, period_start:start.toISOString().split('T')[0], period_end:end.toISOString().split('T')[0], sessions_count:0, total_revenue:0, total_payout:0, status:'pending' })
                }
                loadAll()
              }}>Generate this month's payout reports</button>
            </div>
            {payouts.length > 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead><tr style={{ background:'#f9f9f7' }}>
                    {['Coach','Period','Sessions','Revenue','Payout','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
                  </tr></thead>
                  <tbody>
                    {payouts.map(function(po,i) {
                      return <tr key={po.id} style={{ borderBottom:i<payouts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}>{po.profiles?po.profiles.full_name:'—'}</td>
                        <td style={{ padding:'10px 14px', color:'#666', fontSize:'12px' }}>{po.period_start} – {po.period_end}</td>
                        <td style={{ padding:'10px 14px' }}>{po.sessions_count}</td>
                        <td style={{ padding:'10px 14px', fontWeight:600 }}>${parseFloat(po.total_revenue||0).toFixed(2)}</td>
                        <td style={{ padding:'10px 14px', fontWeight:700, color:'#1D9E75' }}>${parseFloat(po.total_payout||0).toFixed(2)}</td>
                        <td style={{ padding:'10px 14px' }}><Badge label={po.status} bg={po.status==='paid'?'#E1F5EE':'#FAEEDA'} color={po.status==='paid'?'#0F6E56':'#854F0B'} /></td>
                        <td style={{ padding:'10px 14px' }}>
                          {po.status==='pending' && <button style={{ ...btnGold, padding:'4px 10px', fontSize:'12px' }} onClick={async function(){ await supabase.from('payout_records').update({status:'paid',paid_at:new Date().toISOString()}).eq('id',po.id); loadAll() }}>Mark paid</button>}
                        </td>
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
