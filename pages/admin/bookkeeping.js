import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Bookkeeping() {
  var [tab, setTab] = useState('income')
  var [payments, setPayments] = useState([])
  var [payouts, setPayouts] = useState([])
  var [courtCosts, setCourtCosts] = useState([])
  var [refunds, setRefunds] = useState([])
  var [loading, setLoading] = useState(true)
  var [period, setPeriod] = useState('month')
  var [customStart, setCustomStart] = useState('')
  var [customEnd, setCustomEnd] = useState('')

  useEffect(function(){ loadAll() }, [period, customStart, customEnd])

  function getRange() {
    var now = new Date()
    var start = new Date()
    if (period === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1) }
    else if (period === 'quarter') { start.setMonth(now.getMonth()-3) }
    else if (period === 'year') { start = new Date(now.getFullYear(), 0, 1) }
    else if (period === 'custom' && customStart) { start = new Date(customStart) }
    var end = period === 'custom' && customEnd ? new Date(customEnd+'T23:59:59') : now
    return { start, end }
  }

  async function loadAll() {
    setLoading(true)
    var { start, end } = getRange()
    var s = start.toISOString(); var e = end.toISOString()
    var [payR, payoutR, courtR] = await Promise.all([
      supabase.from('payments').select('*, profiles!payments_customer_id_fkey(full_name)').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}),
      supabase.from('payout_records').select('*, profiles!payout_records_staff_id_fkey(full_name)').gte('period_start',s).lte('period_end',e).order('period_end',{ascending:false}),
      supabase.from('court_reservations').select('*').gte('created_at',s).lte('created_at',e),
    ])
    setPayments(payR.data||[])
    setPayouts(payoutR.data||[])
    setCourtCosts(courtR.data||[])
    setRefunds((payR.data||[]).filter(function(p){return p.status==='refunded'||p.status==='partially_refunded'}))
    setLoading(false)
  }

  var succeeded = payments.filter(function(p){return p.status==='succeeded'})
  var apptRev = succeeded.filter(function(p){return p.ref_type==='appointment'}).reduce(function(s,p){return s+parseFloat(p.amount||0)},0)
  var classRev = succeeded.filter(function(p){return p.ref_type==='enrollment'}).reduce(function(s,p){return s+parseFloat(p.amount||0)},0)
  var otherRev = succeeded.filter(function(p){return p.ref_type!=='appointment'&&p.ref_type!=='enrollment'}).reduce(function(s,p){return s+parseFloat(p.amount||0)},0)
  var totalRev = apptRev + classRev + otherRev
  var totalPayouts = payouts.reduce(function(s,p){return s+parseFloat(p.total_payout||0)},0)
  var totalRefunds = refunds.reduce(function(s,p){return s+parseFloat(p.amount||0)},0)
  var totalCourts = courtCosts.reduce(function(s,c){return s+parseFloat(c.cost_amount||0)},0)
  var netProfit = totalRev - totalPayouts - totalRefunds - totalCourts

  function currency(n){ return '$'+(parseFloat(n)||0).toFixed(2) }

  function exportCSV() {
    var rows = [['Category','Amount']]
    rows.push(['--- REVENUE ---',''])
    rows.push(['Appointment revenue', apptRev.toFixed(2)])
    rows.push(['Class revenue', classRev.toFixed(2)])
    rows.push(['Other revenue', otherRev.toFixed(2)])
    rows.push(['TOTAL REVENUE', totalRev.toFixed(2)])
    rows.push(['--- EXPENSES ---',''])
    rows.push(['Coach payouts', totalPayouts.toFixed(2)])
    rows.push(['Refunds issued', totalRefunds.toFixed(2)])
    rows.push(['Court costs', totalCourts.toFixed(2)])
    rows.push(['TOTAL EXPENSES', (totalPayouts+totalRefunds+totalCourts).toFixed(2)])
    rows.push(['NET PROFIT', netProfit.toFixed(2)])
    var csv = rows.map(function(r){return r.join(',')}).join('\n')
    var blob = new Blob([csv],{type:'text/csv'})
    var a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='income-statement.csv'; a.click()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { padding:'8px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  function Row({ label, value, bold, color, indent }) {
    return (
      <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px', paddingLeft:indent?'1.5rem':'0' }}>
        <span style={{ color:bold?'#1a1a1a':'#555', fontWeight:bold?700:400 }}>{label}</span>
        <span style={{ fontWeight:bold?700:500, color:color||'#1a1a1a' }}>{value}</span>
      </div>
    )
  }

  return (
    <AdminLayout active="payments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Bookkeeping</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Income statement, deposit reconciliation, and export</div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
            {['month','quarter','year','custom'].map(function(p){
              var active = period===p
              return <button key={p} onClick={function(){setPeriod(p)}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#D4A843':'transparent', color:active?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:active?600:400 }}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>
            })}
            {period==='custom' && <>
              <input type="date" style={inp} value={customStart} onChange={function(e){setCustomStart(e.target.value)}} />
              <span style={{ color:'#888' }}>→</span>
              <input type="date" style={inp} value={customEnd} onChange={function(e){setCustomEnd(e.target.value)}} />
            </>}
            <button style={btnGold} onClick={exportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          <button style={tabStyle('income')} onClick={function(){setTab('income')}}>Income statement</button>
          <button style={tabStyle('transactions')} onClick={function(){setTab('transactions')}}>Transactions</button>
          <button style={tabStyle('expenses')} onClick={function(){setTab('expenses')}}>Expenses</button>
          <button style={tabStyle('integrations')} onClick={function(){setTab('integrations')}}>QuickBooks / Xero</button>
        </div>

        {/* INCOME STATEMENT */}
        {tab === 'income' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:'20px', alignItems:'start' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'1.25rem' }}>Income Statement</div>

              <div style={{ fontSize:'12px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px' }}>Revenue</div>
              <Row label="Appointment revenue" value={currency(apptRev)} indent />
              <Row label="Class revenue" value={currency(classRev)} indent />
              <Row label="Other revenue" value={currency(otherRev)} indent />
              <Row label="Total revenue" value={currency(totalRev)} bold color="#1D9E75" />

              <div style={{ fontSize:'12px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'4px', marginTop:'1rem' }}>Expenses</div>
              <Row label="Coach payouts" value={currency(totalPayouts)} indent color="#A32D2D" />
              <Row label="Refunds issued" value={currency(totalRefunds)} indent color="#A32D2D" />
              <Row label="Court reservation costs" value={currency(totalCourts)} indent color="#A32D2D" />
              <Row label="Total expenses" value={currency(totalPayouts+totalRefunds+totalCourts)} bold color="#A32D2D" />

              <div style={{ borderTop:'2px solid #1a1a1a', marginTop:'12px', paddingTop:'12px', display:'flex', justifyContent:'space-between', fontSize:'16px', fontWeight:800 }}>
                <span>Net profit</span>
                <span style={{ color:netProfit>=0?'#1D9E75':'#A32D2D' }}>{currency(netProfit)}</span>
              </div>
            </div>

            {/* Summary cards */}
            <div style={{ display:'grid', gap:'10px' }}>
              {[
                ['Total revenue', currency(totalRev), '#1D9E75'],
                ['Total expenses', currency(totalPayouts+totalRefunds+totalCourts), '#A32D2D'],
                ['Net profit', currency(netProfit), netProfit>=0?'#1D9E75':'#A32D2D'],
                ['Transactions', succeeded.length.toString(), '#185FA5'],
              ].map(function(m,i){
                return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}>
                  <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
                  <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{loading?'…':m[1]}</div>
                </div>
              })}
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {tab === 'transactions' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Date','Customer','Type','Amount','Status'].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {!loading && payments.length===0 && <tr><td colSpan={5} style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No transactions this period.</td></tr>}
                {payments.map(function(p,i){
                  var sc = { succeeded:['#E1F5EE','#0F6E56'], pending:['#FAEEDA','#854F0B'], refunded:['#F1EFE8','#5F5E5A'], failed:['#FCEBEB','#A32D2D'] }[p.status]||['#FAEEDA','#854F0B']
                  return <tr key={p.id} style={{ borderBottom:i<payments.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{p.created_at?p.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{p.profiles?p.profiles.full_name:'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{p.ref_type||'payment'}</td>
                    <td style={{ padding:'10px 14px', fontWeight:700, color:'#1D9E75' }}>{currency(p.amount)}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{p.status}</span></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* EXPENSES */}
        {tab === 'expenses' && (
          <div style={{ display:'grid', gap:'12px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'10px 1.25rem', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', fontWeight:600 }}>Coach payouts — {currency(totalPayouts)}</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <tbody>
                  {payouts.length===0 && <tr><td colSpan={4} style={{ padding:'1.5rem', textAlign:'center', color:'#999' }}>No payouts this period.</td></tr>}
                  {payouts.map(function(p,i){
                    return <tr key={p.id} style={{ borderBottom:i<payouts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>{p.profiles?p.profiles.full_name:'—'}</td>
                      <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{p.period_start} – {p.period_end}</td>
                      <td style={{ padding:'10px 14px' }}>{p.sessions_count||0} sessions</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#A32D2D' }}>{currency(p.total_payout)}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ padding:'10px 1.25rem', background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', fontWeight:600 }}>Court costs — {currency(totalCourts)}</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <tbody>
                  {courtCosts.length===0 && <tr><td colSpan={3} style={{ padding:'1.5rem', textAlign:'center', color:'#999' }}>No court costs this period.</td></tr>}
                  {courtCosts.map(function(c,i){
                    return <tr key={c.id} style={{ borderBottom:i<courtCosts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px', fontWeight:500 }}>{c.notes||c.ref_type}</td>
                      <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{c.created_at?c.created_at.substring(0,10):'—'}</td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#A32D2D' }}>{currency(c.cost_amount)}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INTEGRATIONS */}
        {tab === 'integrations' && (
          <div style={{ display:'grid', gap:'14px', maxWidth:'560px' }}>
            {[
              { name:'QuickBooks Online', icon:'🟢', desc:'Sync reconciled income statements as journal entries directly into QuickBooks.', vars:['QUICKBOOKS_CLIENT_ID','QUICKBOOKS_CLIENT_SECRET','QUICKBOOKS_REALM_ID'], link:'https://developer.intuit.com' },
              { name:'Xero', icon:'🔵', desc:'Push income and expense records to Xero automatically after each period closes.', vars:['XERO_CLIENT_ID','XERO_CLIENT_SECRET'], link:'https://developer.xero.com' },
            ].map(function(intg){
              return (
                <div key={intg.name} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                    <div style={{ fontSize:'15px', fontWeight:600 }}>{intg.icon} {intg.name}</div>
                    <a href={intg.link} target="_blank" rel="noreferrer" style={{ fontSize:'12px', color:'#D4A843', fontWeight:600 }}>Get credentials →</a>
                  </div>
                  <div style={{ fontSize:'13px', color:'#666', marginBottom:'12px' }}>{intg.desc}</div>
                  <div style={{ background:'#f9f9f7', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#666' }}>
                    Add to <strong>Vercel → Settings → Environment Variables</strong>:
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'6px' }}>
                      {intg.vars.map(function(v){ return <code key={v} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.15)', padding:'2px 8px', borderRadius:'4px', fontSize:'11px' }}>{v}</code> })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px' }}>📄 Manual export</div>
              <div style={{ fontSize:'13px', color:'#666', marginBottom:'12px' }}>Download the income statement for the current period as CSV.</div>
              <button style={btnGold} onClick={exportCSV}>⬇ Download income statement CSV</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
