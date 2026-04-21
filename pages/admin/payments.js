import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

function Badge({ label, bg, color }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:bg, color:color, fontWeight:500 }}>{label}</span>
}

export default function Payments() {
  var [tab, setTab] = useState('transactions')
  var [payments, setPayments] = useState([])
  var [payouts, setPayouts] = useState([])
  var [discounts, setDiscounts] = useState([])
  var [giftCards, setGiftCards] = useState([])
  var [packages, setPackages] = useState([])
  var [memberships, setMemberships] = useState([])
  var [staff, setStaff] = useState([])
  var [loading, setLoading] = useState(true)
  var [refunding, setRefunding] = useState(null)
  var [refundAmount, setRefundAmount] = useState('')
  var [saving, setSaving] = useState(false)
  // New forms
  var [showNewDiscount, setShowNewDiscount] = useState(false)
  var [showNewGift, setShowNewGift] = useState(false)
  var [showNewPayout, setShowNewPayout] = useState(false)
  var [df, setDf] = useState({ code:'', type:'percentage', value:'', max_uses:'', expires_at:'' })
  var [gf, setGf] = useState({ value:'', recipient_email:'' })
  var [pf, setPf] = useState({ staff_id:'', period_start:'', period_end:'', total_payout:'', sessions_count:'', notes:'' })

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [payR, payoutR, discR, gcR, pkgR, memR, staffR] = await Promise.all([
      supabase.from('payments').select('*, profiles!payments_customer_id_fkey(full_name,email)').order('created_at',{ascending:false}).limit(50),
      supabase.from('payout_records').select('*, profiles!payout_records_staff_id_fkey(full_name)').order('period_end',{ascending:false}).limit(30),
      supabase.from('discount_codes').select('*').order('created_at',{ascending:false}),
      supabase.from('gift_cards').select('*, profiles!gift_cards_issued_to_customer_id_fkey(full_name,email)').order('created_at',{ascending:false}).limit(30),
      supabase.from('packages').select('*').order('created_at',{ascending:false}),
      supabase.from('memberships').select('*').order('created_at',{ascending:false}),
      supabase.from('profiles').select('id,full_name').in('role',['coach','staff']).eq('is_active',true),
    ])
    setPayments(payR.data||[])
    setPayouts(payoutR.data||[])
    setDiscounts(discR.data||[])
    setGiftCards(gcR.data||[])
    setPackages(pkgR.data||[])
    setMemberships(memR.data||[])
    setStaff(staffR.data||[])
    setLoading(false)
  }

  async function issueRefund(payment) {
    if (!confirm('Refund '+(refundAmount?'$'+refundAmount:'full amount')+' to '+payment.profiles?.full_name+'?')) return
    setSaving(true)
    var r = await fetch('/api/stripe/refund', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ payment_id:payment.id, amount:refundAmount||null, reason:'requested_by_customer' })
    })
    var data = await r.json()
    if (data.error) { alert('Refund failed: '+data.error) }
    else {
      setPayments(function(p){ return p.map(function(x){ return x.id===payment.id?{...x,status:refundAmount&&parseFloat(refundAmount)<parseFloat(payment.amount)?'partially_refunded':'refunded'}:x }) })
    }
    setRefunding(null); setRefundAmount(''); setSaving(false)
  }

  async function saveDiscount() {
    setSaving(true)
    await supabase.from('discount_codes').insert({ code:df.code.toUpperCase(), type:df.type, value:parseFloat(df.value), max_uses:parseInt(df.max_uses)||null, expires_at:df.expires_at||null, is_active:true, uses_count:0 })
    setSaving(false); setShowNewDiscount(false); setDf({ code:'', type:'percentage', value:'', max_uses:'', expires_at:'' }); loadAll()
  }

  async function saveGiftCard() {
    setSaving(true)
    var code = Math.random().toString(36).substring(2,10).toUpperCase()
    await supabase.from('gift_cards').insert({ code, initial_value:parseFloat(gf.value), remaining_value:parseFloat(gf.value), status:'active' })
    setSaving(false); setShowNewGift(false); setGf({ value:'', recipient_email:'' }); loadAll()
  }

  async function savePayout() {
    setSaving(true)
    await supabase.from('payout_records').insert({ staff_id:pf.staff_id, period_start:pf.period_start, period_end:pf.period_end, total_payout:parseFloat(pf.total_payout), sessions_count:parseInt(pf.sessions_count)||0, status:'pending', notes:pf.notes })
    setSaving(false); setShowNewPayout(false); setPf({ staff_id:'', period_start:'', period_end:'', total_payout:'', sessions_count:'', notes:'' }); loadAll()
  }

  async function markPayoutPaid(id) {
    await supabase.from('payout_records').update({ status:'paid', paid_at:new Date().toISOString() }).eq('id',id)
    setPayouts(function(p){ return p.map(function(x){ return x.id===id?{...x,status:'paid',paid_at:new Date().toISOString()}:x }) })
  }

  async function toggleDiscount(id, active) {
    await supabase.from('discount_codes').update({ is_active:!active }).eq('id',id)
    setDiscounts(function(p){ return p.map(function(x){ return x.id===id?{...x,is_active:!active}:x }) })
  }

  var totalRev = payments.filter(function(p){return p.status==='succeeded'}).reduce(function(s,p){return s+parseFloat(p.amount||0)},0)
  var totalPayouts = payouts.filter(function(p){return p.status==='paid'}).reduce(function(s,p){return s+parseFloat(p.total_payout||0)},0)
  var pendingPayouts = payouts.filter(function(p){return p.status==='pending'}).reduce(function(s,p){return s+parseFloat(p.total_payout||0)},0)

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'8px 16px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px', whiteSpace:'nowrap' }
  }

  var statusColors = { succeeded:['#E1F5EE','#0F6E56'], pending:['#FAEEDA','#854F0B'], failed:['#FCEBEB','#A32D2D'], refunded:['#F1EFE8','#5F5E5A'], partially_refunded:['#FAEEDA','#854F0B'], paid:['#E1F5EE','#0F6E56'], active:['#E1F5EE','#0F6E56'], inactive:['#F1EFE8','#5F5E5A'] }

  return (
    <AdminLayout active="payments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1rem' }}>Payments & Financials</div>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[['Total revenue','$'+totalRev.toFixed(0),'#1D9E75'],['Payouts paid','$'+totalPayouts.toFixed(0),'#534AB7'],['Payouts pending','$'+pendingPayouts.toFixed(0),'#BA7517'],['Active gift cards',giftCards.filter(function(g){return g.status==='active'}).length.toString(),'#185FA5']].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{loading?'…':m[1]}</div>
            </div>
          })}
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem', overflowX:'auto' }}>
          {[['transactions','Transactions'],['payouts','Coach payouts'],['discounts','Discount codes'],['giftcards','Gift cards'],['packages','Packages'],['memberships','Memberships']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Amount','Status','Date','Description',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {!loading && payments.length===0 && <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No transactions yet.</td></tr>}
                {payments.map(function(p,i){
                  var cust = p.profiles ? p.profiles.full_name : '—'
                  var sc = statusColors[p.status]||statusColors.pending
                  var isRefunding = refunding === p.id
                  return [
                    <tr key={p.id} style={{ borderBottom:i<payments.length-1&&!isRefunding?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#1D9E75' }}>${parseFloat(p.amount||0).toFixed(2)}</td>
                      <td style={{ padding:'10px 14px' }}><Badge label={p.status} bg={sc[0]} color={sc[1]} /></td>
                      <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{p.created_at?p.created_at.substring(0,10):'—'}</td>
                      <td style={{ padding:'10px 14px', color:'#666', fontSize:'12px' }}>{p.description||p.ref_type||'—'}</td>
                      <td style={{ padding:'10px 14px' }}>
                        {p.status==='succeeded' && !refunding && (
                          <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){setRefunding(p.id);setRefundAmount('')}}>Refund</button>
                        )}
                      </td>
                    </tr>,
                    isRefunding && (
                      <tr key={p.id+'-refund'} style={{ background:'#FFFBF0', borderBottom:'0.5px solid rgba(0,0,0,0.05)' }}>
                        <td colSpan={6} style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                            <span style={{ fontSize:'13px', color:'#888' }}>Refund amount (leave blank for full refund):</span>
                            <input type="number" style={{ ...inp, width:'120px' }} placeholder={'Full: $'+parseFloat(p.amount||0).toFixed(2)} value={refundAmount} onChange={function(e){setRefundAmount(e.target.value)}} />
                            <button style={{ ...btn, fontSize:'12px', padding:'5px 12px', color:'#A32D2D' }} onClick={function(){issueRefund(p)}} disabled={saving}>{saving?'Processing...':'Confirm refund'}</button>
                            <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){setRefunding(null);setRefundAmount('')}}>Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )
                  ]
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* COACH PAYOUTS */}
        {tab === 'payouts' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
              <button style={btnGold} onClick={function(){setShowNewPayout(function(x){return !x})}}>+ Record payout</button>
            </div>
            {showNewPayout && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Record coach payout</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach / Staff member</div>
                    <select style={sel} value={pf.staff_id} onChange={function(e){setPf(function(p){return{...p,staff_id:e.target.value}})}}>
                      <option value="">Select staff...</option>
                      {staff.map(function(s){return <option key={s.id} value={s.id}>{s.full_name}</option>})}
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Payout amount ($)</div><input type="number" style={inp} value={pf.total_payout} onChange={function(e){setPf(function(p){return{...p,total_payout:e.target.value}})}} placeholder="0.00" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Period start</div><input type="date" style={inp} value={pf.period_start} onChange={function(e){setPf(function(p){return{...p,period_start:e.target.value}})}} /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Period end</div><input type="date" style={inp} value={pf.period_end} onChange={function(e){setPf(function(p){return{...p,period_end:e.target.value}})}} /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Sessions in period</div><input type="number" style={inp} value={pf.sessions_count} onChange={function(e){setPf(function(p){return{...p,sessions_count:e.target.value}})}} /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div><input type="text" style={inp} value={pf.notes} onChange={function(e){setPf(function(p){return{...p,notes:e.target.value}})}} placeholder="e.g. Paid via bank transfer" /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowNewPayout(false)}}>Cancel</button>
                  <button style={btnGold} onClick={savePayout} disabled={saving||!pf.staff_id||!pf.total_payout}>{saving?'Saving...':'Save payout'}</button>
                </div>
              </div>
            )}
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Coach','Period','Sessions','Amount','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading && payouts.length===0 && <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No payout records yet.</td></tr>}
                  {payouts.map(function(po,i){
                    var coach = po.profiles ? po.profiles.full_name : '—'
                    var sc = statusColors[po.status]||statusColors.pending
                    return <tr key={po.id} style={{ borderBottom:i<payouts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>{coach}</td>
                      <td style={{ padding:'10px 14px', color:'#666', fontSize:'12px' }}>{po.period_start} – {po.period_end}</td>
                      <td style={{ padding:'10px 14px', color:'#888' }}>{po.sessions_count||0}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#534AB7' }}>${parseFloat(po.total_payout||0).toFixed(2)}</td>
                      <td style={{ padding:'10px 14px' }}><Badge label={po.status} bg={sc[0]} color={sc[1]} /></td>
                      <td style={{ padding:'10px 14px' }}>
                        {po.status==='pending' && <button style={{ ...btnGold, fontSize:'12px', padding:'4px 12px' }} onClick={function(){markPayoutPaid(po.id)}}>Mark paid</button>}
                        {po.status==='paid' && <span style={{ fontSize:'11px', color:'#aaa' }}>Paid {po.paid_at?po.paid_at.substring(0,10):''}</span>}
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DISCOUNT CODES */}
        {tab === 'discounts' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
              <button style={btnGold} onClick={function(){setShowNewDiscount(function(x){return !x})}}>+ New code</button>
            </div>
            {showNewDiscount && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create discount code</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Code</div><input type="text" style={inp} value={df.code} onChange={function(e){setDf(function(p){return{...p,code:e.target.value.toUpperCase()}})}} placeholder="SUMMER20" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
                    <select style={sel} value={df.type} onChange={function(e){setDf(function(p){return{...p,type:e.target.value}})}}>
                      <option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option>
                    </select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Value ({df.type==='percentage'?'%':'$'})</div><input type="number" style={inp} value={df.value} onChange={function(e){setDf(function(p){return{...p,value:e.target.value}})}} placeholder={df.type==='percentage'?'20':'10'} /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max uses (blank = unlimited)</div><input type="number" style={inp} value={df.max_uses} onChange={function(e){setDf(function(p){return{...p,max_uses:e.target.value}})}} placeholder="100" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Expires at (optional)</div><input type="date" style={inp} value={df.expires_at} onChange={function(e){setDf(function(p){return{...p,expires_at:e.target.value}})}} /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowNewDiscount(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveDiscount} disabled={saving||!df.code||!df.value}>{saving?'Saving...':'Create code'}</button>
                </div>
              </div>
            )}
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Code','Discount','Uses','Expires','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
                </tr></thead>
                <tbody>
                  {discounts.length===0 && <tr><td colSpan={6} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No discount codes yet.</td></tr>}
                  {discounts.map(function(d,i){
                    return <tr key={d.id} style={{ borderBottom:i<discounts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:700, fontFamily:'monospace' }}>{d.code}</td>
                      <td style={{ padding:'10px 14px', fontWeight:500, color:'#D4A843' }}>{d.type==='percentage'?d.value+'% off':'$'+d.value+' off'}</td>
                      <td style={{ padding:'10px 14px', color:'#888' }}>{d.uses_count||0}{d.max_uses?'/'+d.max_uses:''}</td>
                      <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{d.expires_at?d.expires_at.substring(0,10):'Never'}</td>
                      <td style={{ padding:'10px 14px' }}><Badge label={d.is_active?'active':'inactive'} bg={d.is_active?'#E1F5EE':'#F1EFE8'} color={d.is_active?'#0F6E56':'#5F5E5A'} /></td>
                      <td style={{ padding:'10px 14px' }}>
                        <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){toggleDiscount(d.id,d.is_active)}}>{d.is_active?'Disable':'Enable'}</button>
                      </td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GIFT CARDS */}
        {tab === 'giftcards' && (
          <div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
              <button style={btnGold} onClick={function(){setShowNewGift(function(x){return !x})}}>+ Issue gift card</button>
            </div>
            {showNewGift && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Issue gift card</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Value ($)</div><input type="number" style={inp} value={gf.value} onChange={function(e){setGf(function(p){return{...p,value:e.target.value}})}} placeholder="50.00" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Recipient email (optional)</div><input type="email" style={inp} value={gf.recipient_email} onChange={function(e){setGf(function(p){return{...p,recipient_email:e.target.value}})}} placeholder="friend@email.com" /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowNewGift(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveGiftCard} disabled={saving||!gf.value}>{saving?'Saving...':'Issue gift card'}</button>
                </div>
              </div>
            )}
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Code','Initial value','Remaining','Issued to','Status'].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
                </tr></thead>
                <tbody>
                  {giftCards.length===0 && <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No gift cards yet.</td></tr>}
                  {giftCards.map(function(g,i){
                    var sc = statusColors[g.status]||statusColors.active
                    return <tr key={g.id} style={{ borderBottom:i<giftCards.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:700, fontFamily:'monospace', color:'#534AB7' }}>{g.code}</td>
                      <td style={{ padding:'10px 14px', fontWeight:600 }}>${parseFloat(g.initial_value||0).toFixed(2)}</td>
                      <td style={{ padding:'10px 14px', color:parseFloat(g.remaining_value||0)>0?'#1D9E75':'#aaa', fontWeight:600 }}>${parseFloat(g.remaining_value||0).toFixed(2)}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{g.profiles?g.profiles.full_name:'—'}</td>
                      <td style={{ padding:'10px 14px' }}><Badge label={g.status||'active'} bg={sc[0]} color={sc[1]} /></td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PACKAGES & MEMBERSHIPS - abbreviated */}
        {(tab === 'packages' || tab === 'memberships') && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'28px', marginBottom:'12px' }}>{tab==='packages'?'📦':'🏆'}</div>
            <div style={{ fontWeight:600, marginBottom:'6px', color:'#1a1a1a' }}>{tab==='packages'?'Packages':'Memberships'}</div>
            <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>
              {tab==='packages'?`${packages.length} packages configured.`:`${memberships.length} membership plans configured.`}
              &nbsp;Manage full details in <a href="/admin/services" style={{ color:'#D4A843' }}>Services</a>.
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
