import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var PRESETS = [
  { key:'today', label:'Today' },
  { key:'week', label:'This week' },
  { key:'month', label:'This month' },
  { key:'30days', label:'Last 30 days' },
  { key:'quarter', label:'Quarter' },
  { key:'year', label:'This year' },
  { key:'custom', label:'Custom' },
]

var COMPARE_OPTIONS = [
  { key:'none', label:'No comparison' },
  { key:'prev_period', label:'vs prior period' },
  { key:'prev_year', label:'vs same period last year' },
]

function KPI({ label, value, compare, color, loading }) {
  var diff = compare !== null && compare !== undefined ? parseFloat(value) - parseFloat(compare) : null
  var pct = compare && parseFloat(compare) > 0 ? Math.round(diff / parseFloat(compare) * 100) : null
  return (
    <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
      <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
      <div style={{ fontSize:'24px', fontWeight:800, color:color||'#1a1a1a' }}>{loading?'…':value}</div>
      {pct !== null && !loading && (
        <div style={{ fontSize:'12px', marginTop:'4px', color:diff>=0?'#1D9E75':'#A32D2D', fontWeight:500 }}>
          {diff>=0?'▲':'▼'} {Math.abs(pct)}% vs prior period
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>{title}</div>
      {children}
    </div>
  )
}

function getDateRange(preset, customStart, customEnd) {
  var now = new Date()
  var start = new Date()
  var end = new Date()
  if (preset === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999) }
  else if (preset === 'week') { start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0); end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999) }
  else if (preset === 'month') { start = new Date(now.getFullYear(),now.getMonth(),1); end = new Date(now.getFullYear(),now.getMonth()+1,0,23,59,59,999) }
  else if (preset === '30days') { start.setDate(now.getDate()-30); start.setHours(0,0,0,0) }
  else if (preset === 'quarter') { start.setMonth(now.getMonth()-3); start.setHours(0,0,0,0) }
  else if (preset === 'year') { start = new Date(now.getFullYear(),0,1) }
  else if (preset === 'custom') { start = customStart ? new Date(customStart) : new Date(now.getFullYear(),now.getMonth(),1); end = customEnd ? new Date(customEnd+'T23:59:59') : now }
  return { start, end }
}

function getCompareRange(preset, start, end, compareMode) {
  if (compareMode === 'none') return null
  var duration = end - start
  if (compareMode === 'prev_period') {
    return { start: new Date(start - duration), end: new Date(end - duration) }
  }
  if (compareMode === 'prev_year') {
    var cs = new Date(start); cs.setFullYear(cs.getFullYear()-1)
    var ce = new Date(end); ce.setFullYear(ce.getFullYear()-1)
    return { start: cs, end: ce }
  }
  return null
}

export default function Analytics() {
  var [preset, setPreset] = useState('month')
  var [customStart, setCustomStart] = useState('')
  var [customEnd, setCustomEnd] = useState('')
  var [compareMode, setCompareMode] = useState('none')
  var [loading, setLoading] = useState(true)
  var [data, setData] = useState({})
  var [compareData, setCompareData] = useState(null)
  var [filterLocation, setFilterLocation] = useState('')
  var [filterCoach, setFilterCoach] = useState('')
  var [locations, setLocations] = useState([])
  var [coaches, setCoaches] = useState([])

  useEffect(function(){ loadMeta() }, [])
  useEffect(function(){ loadAll() }, [preset, customStart, customEnd, compareMode, filterLocation, filterCoach])

  async function loadMeta() {
    var [locR, coachR] = await Promise.all([
      supabase.from('locations').select('id,name').eq('is_active',true),
      supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true),
    ])
    setLocations(locR.data||[])
    setCoaches(coachR.data||[])
  }

  async function fetchMetrics(start, end) {
    var s = start.toISOString()
    var e = end.toISOString()

    var apptQ = supabase.from('appointments').select('id,amount_paid,status,coach_id,location_id').gte('starts_at',s).lte('starts_at',e).neq('status','cancelled')
    var enrQ = supabase.from('enrollments').select('id,amount_paid,payment_status').gte('created_at',s).lte('created_at',e)
    var custQ = supabase.from('profiles').select('id',{count:'exact'}).eq('role','customer').gte('created_at',s).lte('created_at',e)
    var totalCustQ = supabase.from('profiles').select('id',{count:'exact'}).eq('role','customer')
    var cancelQ = supabase.from('appointments').select('id',{count:'exact'}).eq('status','cancelled').gte('starts_at',s).lte('starts_at',e)
    var payoutQ = supabase.from('payout_records').select('total_payout').gte('period_start',s).lte('period_end',e)
    var courtQ = supabase.from('court_reservations').select('cost_amount').gte('created_at',s).lte('created_at',e)
    var payR = supabase.from('payments').select('id,amount,status,created_at,profiles!payments_customer_id_fkey(full_name)').gte('created_at',s).lte('created_at',e).order('created_at',{ascending:false}).limit(8)

    if (filterCoach) { apptQ = apptQ.eq('coach_id', filterCoach) }
    if (filterLocation) { apptQ = apptQ.eq('location_id', filterLocation) }

    var [apptR, enrR, custR, totalR, cancelR, payoutR, courtR, recentR] = await Promise.all([apptQ, enrQ, custQ, totalCustQ, cancelQ, payoutQ, courtQ, payR])

    var appts = apptR.data||[]
    var enrs = enrR.data||[]
    var apptRev = appts.reduce(function(s,a){return s+parseFloat(a.amount_paid||0)},0)
    var classRev = enrs.reduce(function(s,e){return s+parseFloat(e.amount_paid||0)},0)
    var totalRev = apptRev + classRev
    var totalPayouts = (payoutR.data||[]).reduce(function(s,p){return s+parseFloat(p.total_payout||0)},0)
    var courtCosts = (courtR.data||[]).reduce(function(s,c){return s+parseFloat(c.cost_amount||0)},0)

    return {
      totalRevenue: totalRev, apptRevenue: apptRev, classRevenue: classRev,
      netProfit: totalRev - totalPayouts - courtCosts,
      totalVisits: appts.length + enrs.length, classVisits: enrs.length, apptVisits: appts.length,
      newCustomers: custR.count||0, totalCustomers: totalR.count||0,
      cancellations: cancelR.count||0,
      totalPayouts, courtCosts,
      recentPayments: recentR.data||[],
    }
  }

  async function loadAll() {
    setLoading(true)
    var { start, end } = getDateRange(preset, customStart, customEnd)
    var main = await fetchMetrics(start, end)
    setData(main)

    var compareRange = getCompareRange(preset, start, end, compareMode)
    if (compareRange) {
      var comp = await fetchMetrics(compareRange.start, compareRange.end)
      setCompareData(comp)
    } else {
      setCompareData(null)
    }

    // Predictive: project next 30 days revenue from existing bookings
    var futureStart = new Date()
    var futureEnd = new Date(); futureEnd.setDate(futureEnd.getDate()+30)
    var futureR = await supabase.from('appointments').select('amount_paid').gte('starts_at',futureStart.toISOString()).lte('starts_at',futureEnd.toISOString()).in('status',['confirmed','pending'])
    var projectedRev = (futureR.data||[]).reduce(function(s,a){return s+parseFloat(a.amount_paid||0)},0)
    setData(function(p){ return {...p, projectedRevenue: projectedRev} })

    setLoading(false)
  }

  function currency(n){ return '$'+(parseFloat(n)||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}) }

  function exportCSV() {
    var rows = [['Metric','Value','Compare']]
    var metrics = [
      ['Total revenue', currency(data.totalRevenue), compareData?currency(compareData.totalRevenue):''],
      ['Appointment revenue', currency(data.apptRevenue), compareData?currency(compareData.apptRevenue):''],
      ['Class revenue', currency(data.classRevenue), compareData?currency(compareData.classRevenue):''],
      ['Net profit', currency(data.netProfit), compareData?currency(compareData.netProfit):''],
      ['Total visits', data.totalVisits, compareData?compareData.totalVisits:''],
      ['New customers', data.newCustomers, compareData?compareData.newCustomers:''],
      ['Cancellations', data.cancellations, compareData?compareData.cancellations:''],
      ['Coach payouts', currency(data.totalPayouts), compareData?currency(compareData.totalPayouts):''],
      ['Court costs', currency(data.courtCosts), compareData?currency(compareData.courtCosts):''],
    ]
    metrics.forEach(function(m){ rows.push(m) })
    var csv = rows.map(function(r){return r.join(',')}).join('\n')
    var blob = new Blob([csv],{type:'text/csv'})
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a'); a.href=url; a.download='hitelite-analytics.csv'; a.click()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { padding:'8px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none', fontFamily:'inherit' }

  var cd = compareData

  return (
    <AdminLayout active="analytics">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Analytics</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Full business performance overview</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button style={btn} onClick={exportCSV}>⬇ Export CSV</button>
          </div>
        </div>

        {/* Controls */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1rem 1.25rem', marginBottom:'1.25rem', display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          {/* Period presets */}
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {PRESETS.map(function(p){
              var active = preset===p.key
              return <button key={p.key} onClick={function(){setPreset(p.key)}} style={{ padding:'6px 12px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#D4A843':'transparent', color:active?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:active?600:400 }}>{p.label}</button>
            })}
          </div>

          {/* Custom date range */}
          {preset === 'custom' && (
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              <input type="date" style={inp} value={customStart} onChange={function(e){setCustomStart(e.target.value)}} />
              <span style={{ color:'#888', fontSize:'13px' }}>→</span>
              <input type="date" style={inp} value={customEnd} onChange={function(e){setCustomEnd(e.target.value)}} />
            </div>
          )}

          <div style={{ width:'1px', height:'24px', background:'rgba(0,0,0,0.1)' }}></div>

          {/* Compare mode */}
          <select style={inp} value={compareMode} onChange={function(e){setCompareMode(e.target.value)}}>
            {COMPARE_OPTIONS.map(function(o){ return <option key={o.key} value={o.key}>{o.label}</option> })}
          </select>

          {/* Filters */}
          <select style={inp} value={filterLocation} onChange={function(e){setFilterLocation(e.target.value)}}>
            <option value="">All locations</option>
            {locations.map(function(l){ return <option key={l.id} value={l.id}>{l.name}</option> })}
          </select>
          <select style={inp} value={filterCoach} onChange={function(e){setFilterCoach(e.target.value)}}>
            <option value="">All coaches</option>
            {coaches.map(function(c){ return <option key={c.id} value={c.id}>{c.full_name}</option> })}
          </select>
        </div>

        {/* Comparison banner */}
        {compareMode !== 'none' && cd && !loading && (
          <div style={{ background:'#EEEDFE', border:'0.5px solid #534AB7', borderRadius:'10px', padding:'10px 16px', fontSize:'13px', color:'#534AB7', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'center' }}>
            <span>🔄</span>
            <span>Comparing to {compareMode === 'prev_period' ? 'prior period' : 'same period last year'} · Prior: Revenue {currency(cd.totalRevenue)} · Visits {cd.totalVisits} · New customers {cd.newCustomers}</span>
          </div>
        )}

        {/* PREDICTIVE insight card */}
        {data.projectedRevenue > 0 && !loading && (
          <div style={{ background:'#0D0D0D', border:'0.5px solid rgba(212,168,67,0.2)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1.5rem', display:'flex', gap:'16px', alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ fontSize:'24px' }}>🔮</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#fff', marginBottom:'2px' }}>Projected revenue — next 30 days</div>
              <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.4)' }}>Based on {Math.round(data.projectedRevenue / 80)} confirmed bookings already on the calendar</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'28px', fontWeight:800, color:'#D4A843' }}>{currency(data.projectedRevenue)}</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>confirmed + pending</div>
            </div>
          </div>
        )}

        {/* REVENUE */}
        <Section title="Revenue & Sales">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total revenue" value={currency(data.totalRevenue)} compare={cd&&cd.totalRevenue} color="#1D9E75" loading={loading} />
            <KPI label="Appointment revenue" value={currency(data.apptRevenue)} compare={cd&&cd.apptRevenue} color="#185FA5" loading={loading} />
            <KPI label="Class revenue" value={currency(data.classRevenue)} compare={cd&&cd.classRevenue} color="#534AB7" loading={loading} />
            <KPI label="Net profit" value={currency(data.netProfit)} compare={cd&&cd.netProfit} color={(data.netProfit||0)>=0?'#1D9E75':'#A32D2D'} loading={loading} />
          </div>
        </Section>

        {/* VISITS */}
        <Section title="Visits & Attendance">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total visits" value={data.totalVisits||0} compare={cd&&cd.totalVisits} color="#1a1a1a" loading={loading} />
            <KPI label="Class visits" value={data.classVisits||0} compare={cd&&cd.classVisits} color="#D4A843" loading={loading} />
            <KPI label="Appointment visits" value={data.apptVisits||0} compare={cd&&cd.apptVisits} color="#185FA5" loading={loading} />
            <KPI label="Cancellations" value={data.cancellations||0} compare={cd&&cd.cancellations} color="#A32D2D" loading={loading} />
          </div>
        </Section>

        {/* CUSTOMERS */}
        <Section title="Customers">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total customers" value={data.totalCustomers||0} color="#185FA5" loading={loading} />
            <KPI label="New this period" value={data.newCustomers||0} compare={cd&&cd.newCustomers} color="#1D9E75" loading={loading} />
            <KPI label="Returning" value={Math.max(0,(data.totalCustomers||0)-(data.newCustomers||0))} color="#534AB7" loading={loading} />
          </div>
        </Section>

        {/* STAFF & PAYOUTS */}
        <Section title="Staff & Payouts">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Coach payouts" value={currency(data.totalPayouts)} compare={cd&&cd.totalPayouts} color="#534AB7" loading={loading} />
            <KPI label="Court costs" value={currency(data.courtCosts)} compare={cd&&cd.courtCosts} color="#A32D2D" loading={loading} />
            <KPI label="Net after costs" value={currency(data.netProfit)} compare={cd&&cd.netProfit} color={(data.netProfit||0)>=0?'#1D9E75':'#A32D2D'} loading={loading} />
          </div>
        </Section>

        {/* Revenue breakdown + Recent payments */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'1.5rem' }}>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Revenue breakdown</div>
            {[
              ['Appointments', data.apptRevenue, '#185FA5'],
              ['Classes', data.classRevenue, '#D4A843'],
            ].map(function(r,i){
              var total = data.totalRevenue||1
              var pct = Math.round((r[1]||0)/total*100)
              return (
                <div key={i} style={{ marginBottom:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px' }}>
                    <span style={{ color:'#666' }}>{r[0]}</span>
                    <span style={{ fontWeight:600 }}>{currency(r[1])} <span style={{ color:'#aaa', fontWeight:400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:'6px', background:'#f1f1f1', borderRadius:'3px' }}>
                    <div style={{ height:'100%', borderRadius:'3px', background:r[2], width:pct+'%', transition:'width 0.5s' }}></div>
                  </div>
                </div>
              )
            })}
            <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'10px', display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
              <span style={{ color:'#888' }}>Total</span>
              <span style={{ fontWeight:700, color:'#1D9E75', fontSize:'15px' }}>{currency(data.totalRevenue)}</span>
            </div>
          </div>

          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'14px', fontWeight:600 }}>Recent payments</div>
            {(data.recentPayments||[]).length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No payments this period.</div>}
            {(data.recentPayments||[]).map(function(p,i){
              var sc = p.status==='succeeded'?['#E1F5EE','#0F6E56']:['#FAEEDA','#854F0B']
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 1.25rem', borderBottom:i<(data.recentPayments||[]).length-1?'0.5px solid rgba(0,0,0,0.05)':'none', fontSize:'13px' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500 }}>{p.profiles?p.profiles.full_name:'—'}</div>
                    <div style={{ fontSize:'11px', color:'#aaa' }}>{p.created_at?p.created_at.substring(0,10):'—'}</div>
                  </div>
                  <div style={{ fontWeight:700, color:'#1D9E75' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                  <span style={{ display:'inline-block', padding:'2px 7px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{p.status}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
