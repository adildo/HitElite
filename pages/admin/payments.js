import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Payments() {
  var [payments, setPayments] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('payments')

  useEffect(function() {
    async function load() {
      var result = await supabase.from('payments').select('*, profiles!payments_customer_id_fkey(full_name, email)').order('created_at', { ascending:false }).limit(50)
      setPayments(result.data || [])
      setLoading(false)
    }
    load()
  }, [])

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  var totalRev = payments.filter(function(p){return p.status==='succeeded'}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0)

  return (
    <AdminLayout active="payments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Payments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Revenue, transactions, and payouts</div>
          </div>
          <button style={btnGold}>+ Record payment</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[['Total revenue','$'+totalRev.toFixed(2),'#1D9E75'],['This month','$0','#D4A843'],['Pending','$0','#BA7517'],['Refunded','$0','#A32D2D']].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}><div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div><div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div></div>
          })}
        </div>

        <div style={{ display:'flex', gap:0, borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {[['payments','Transactions'],['payouts','Coach payouts'],['discounts','Discount codes']].map(function(t){
            return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button>
          })}
        </div>

        {tab === 'payments' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Type','Amount','Status','Date',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {!loading && payments.length === 0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No payments yet</td></tr>}
                {payments.map(function(p,i){
                  var cust = p.profiles ? p.profiles.full_name : '—'
                  var statusColors = { succeeded:['#E1F5EE','#0F6E56'], pending:['#FAEEDA','#854F0B'], failed:['#FCEBEB','#A32D2D'], refunded:['#F1EFE8','#5F5E5A'] }
                  var sc = statusColors[p.status] || statusColors.pending
                  return <tr key={p.id} style={{ borderBottom:i<payments.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{p.ref_type||'payment'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:p.status==='succeeded'?'#1D9E75':'#1a1a1a' }}>${parseFloat(p.amount||0).toFixed(2)}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{p.status}</span></td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{p.created_at?p.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>Details</button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payouts' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'24px', marginBottom:'12px' }}>💰</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>Coach payout reports</div>
            <div style={{ fontSize:'13px', marginBottom:'1rem' }}>Payout reports are auto-generated from completed sessions using each coach's configured pay rate.</div>
            <button style={btnGold}>Generate payout report</button>
          </div>
        )}

        {tab === 'discounts' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'24px', marginBottom:'12px' }}>🎟</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>Discount codes</div>
            <div style={{ fontSize:'13px', marginBottom:'1rem' }}>Create percentage or fixed-amount discount codes for promotions and campaigns.</div>
            <button style={btnGold}>+ Create discount code</button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
