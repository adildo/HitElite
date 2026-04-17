import Head from 'next/head'
export default function Unauthorized() {
  return (
    <>
      <Head><title>Access denied — Hit Elite</title></Head>
      <div style={{ minHeight:'100vh', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem' }}>
        <div style={{ textAlign:'center', maxWidth:'400px' }}>
          <div style={{ fontSize:'22px', fontWeight:800, color:'#fff', marginBottom:'16px' }}>HIT <span style={{ color:'#D4A843' }}>ELITE</span></div>
          <div style={{ background:'rgba(163,45,45,0.2)', border:'0.5px solid #A32D2D', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, color:'#F09595', marginBottom:'8px' }}>Access denied</div>
            <div style={{ fontSize:'13px', color:'#F09595', lineHeight:1.6 }}>You don't have permission to access this page. Please contact your administrator.</div>
          </div>
          <a href="/login" style={{ display:'inline-block', padding:'9px 20px', background:'#D4A843', color:'#0D0D0D', borderRadius:'8px', fontSize:'13px', fontWeight:700 }}>Back to login</a>
        </div>
      </div>
    </>
  )
}
