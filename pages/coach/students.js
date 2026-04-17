import CoachLayout from '../../components/coach/CoachLayout'
export default function CoachPage() {
  var titles = { schedule:'My schedule', appointments:'Appointments', classes:'My classes', students:'My students', payouts:'My payouts', profile:'My profile' }
  var p = 'students'
  return (
    <CoachLayout active={p}>
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1.5rem' }}>{titles[p]}</div>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem 2rem', textAlign:'center', color:'#888' }}>
          <div style={{ fontSize:'32px', marginBottom:'14px' }}>🚧</div>
          <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px', color:'#1a1a1a' }}>{titles[p]}</div>
          <div style={{ fontSize:'13px' }}>This section is ready to be built. All data connects to your Supabase database.</div>
        </div>
      </div>
    </CoachLayout>
  )
}
