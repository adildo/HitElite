import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0' }}>
      <div>
        <div style={{ fontSize:'13px', fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{sub}</div>}
      </div>
      <div onClick={onToggle} style={{ width:'38px', height:'21px', borderRadius:'11px', background:on?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
        <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'19px', transition:'right .15s' }}></div>
      </div>
    </div>
  )
}

var DEFAULT_EARN_RULES = [
  { key:'per_class', label:'Per class attended', points:10, enabled:true },
  { key:'per_appointment', label:'Per private lesson completed', points:15, enabled:true },
  { key:'first_booking', label:'First booking bonus', points:50, enabled:true },
  { key:'referral_signup', label:'Referred friend signs up', points:25, enabled:true },
  { key:'referral_books', label:'Referred friend completes first booking', points:50, enabled:true },
  { key:'birthday', label:'Birthday bonus', points:20, enabled:true },
  { key:'profile_complete', label:'Completes profile', points:10, enabled:false },
  { key:'review_left', label:'Leaves a review', points:15, enabled:false },
  { key:'milestone_10', label:'Reaches 10 total visits', points:100, enabled:true },
  { key:'milestone_25', label:'Reaches 25 total visits', points:250, enabled:true },
  { key:'milestone_50', label:'Reaches 50 total visits', points:500, enabled:true },
]

var DEFAULT_REDEEM_RULES = [
  { key:'discount_10', label:'$10 off any booking', points_required:100, value:10, type:'discount', enabled:true },
  { key:'discount_25', label:'$25 off any booking', points_required:250, value:25, type:'discount', enabled:true },
  { key:'free_class', label:'Free class drop-in', points_required:150, value:0, type:'free_class', enabled:true },
  { key:'free_lesson', label:'Free 30-min private lesson', points_required:400, value:0, type:'free_lesson', enabled:false },
]

export default function Loyalty() {
  var [tab, setTab] = useState('overview')
  var [programEnabled, setProgramEnabled] = useState(false)
  var [pointsName, setPointsName] = useState('points')
  var [earnRules, setEarnRules] = useState(DEFAULT_EARN_RULES)
  var [redeemRules, setRedeemRules] = useState(DEFAULT_REDEEM_RULES)
  var [referralEnabled, setReferralEnabled] = useState(false)
  var [referralReward, setReferralReward] = useState({ referrer_points:'25', referee_discount:'10', referee_type:'percentage' })
  var [leaderboard, setLeaderboard] = useState([])
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)

  useEffect(function(){
    async function load(){
      var r = await supabase.from('loyalty_settings').select('*').limit(1).maybeSingle()
      if (r.data) {
        setProgramEnabled(r.data.is_enabled||false)
        setPointsName(r.data.points_name||'points')
        setEarnRules(r.data.earn_rules_json||DEFAULT_EARN_RULES)
        setRedeemRules(r.data.redeem_rules_json||DEFAULT_REDEEM_RULES)
        setReferralEnabled(r.data.referral_enabled||false)
        if (r.data.referral_config_json) setReferralReward(r.data.referral_config_json)
      }
      // Load top customers by points
      var lb = await supabase.from('loyalty_points').select('*, profiles!loyalty_points_customer_id_fkey(full_name, email)').order('total_points',{ascending:false}).limit(10)
      setLeaderboard(lb.data||[])
      setLoading(false)
    }
    load()
  },[])

  async function saveSettings(){
    setSaving(true)
    var existing = await supabase.from('loyalty_settings').select('id').limit(1).maybeSingle()
    var payload = { is_enabled:programEnabled, points_name:pointsName, earn_rules_json:earnRules, redeem_rules_json:redeemRules, referral_enabled:referralEnabled, referral_config_json:referralReward }
    if (existing.data) await supabase.from('loyalty_settings').update(payload).eq('id',existing.data.id)
    else await supabase.from('loyalty_settings').insert(payload)
    setSaving(false); setSaved(true)
    setTimeout(function(){setSaved(false)},2500)
  }

  function updateEarnRule(key, field, value){
    setEarnRules(function(p){ return p.map(function(r){ return r.key===key?{...r,[field]:value}:r }) })
  }
  function updateRedeemRule(key, field, value){
    setRedeemRules(function(p){ return p.map(function(r){ return r.key===key?{...r,[field]:value}:r }) })
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function tabStyle(t){
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  return (
    <AdminLayout active="marketing">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Loyalty & Referrals</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Points program, rewards, and referral system</div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <div style={{ fontSize:'13px', color:'#888' }}>Program {programEnabled?'active':'inactive'}</div>
            <div onClick={function(){setProgramEnabled(function(v){return !v})}} style={{ width:'42px', height:'23px', borderRadius:'12px', background:programEnabled?'#1D9E75':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
              <div style={{ position:'absolute', width:'19px', height:'19px', borderRadius:'50%', background:'#fff', top:'2px', right:programEnabled?'2px':'21px', transition:'right .15s' }}></div>
            </div>
            <button style={btnGold} onClick={saveSettings} disabled={saving}>{saving?'Saving...':saved?'✓ Saved!':'Save settings'}</button>
          </div>
        </div>

        {saved && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1rem' }}>✓ Settings saved.</div>}

        {!programEnabled && (
          <div style={{ background:'#f9f9f7', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'12px', padding:'2rem', textAlign:'center', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>⭐</div>
            <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>Loyalty program is off</div>
            <div style={{ fontSize:'13px', color:'#888', maxWidth:'400px', margin:'0 auto 1.25rem' }}>Enable the loyalty program to reward customers with points for bookings, referrals, and milestones. They can redeem points for discounts and free sessions.</div>
            <button style={btnGold} onClick={function(){setProgramEnabled(true)}}>Enable loyalty program</button>
          </div>
        )}

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          {[['overview','Overview'],['earn','Earn rules'],['redeem','Redeem rewards'],['referrals','Referrals'],['leaderboard','Leaderboard']].map(function(t){ return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setTab(t[0])}}>{t[1]}</button> })}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Program settings</div>
              <div style={{ marginBottom:'12px' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Points currency name</div>
                <input type="text" style={inp} value={pointsName} onChange={function(e){setPointsName(e.target.value)}} placeholder="e.g. points, stars, gems" />
                <div style={{ fontSize:'11px', color:'#aaa', marginTop:'4px' }}>Shown to customers as e.g. "You have 150 {pointsName}"</div>
              </div>
              <Toggle on={programEnabled} onToggle={function(){setProgramEnabled(function(v){return !v})}} label="Program active" sub="Customers start earning and redeeming points" />
              <Toggle on={referralEnabled} onToggle={function(){setReferralEnabled(function(v){return !v})}} label="Referral program active" sub="Customers get unique referral links" />
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Program snapshot</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[['Active members',leaderboard.length.toString(),'#185FA5'],['Points issued','0','#D4A843'],['Rewards redeemed','0','#1D9E75'],['Referrals made','0','#534AB7']].map(function(m,i){
                  return <div key={i} style={{ background:'#f5f5f3', borderRadius:'8px', padding:'10px' }}>
                    <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px' }}>{m[0]}</div>
                    <div style={{ fontSize:'20px', fontWeight:800, color:m[2] }}>{loading?'…':m[1]}</div>
                  </div>
                })}
              </div>
            </div>
          </div>
        )}

        {/* EARN RULES */}
        {tab === 'earn' && (
          <div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Configure how many {pointsName} customers earn for each action.</div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              {earnRules.map(function(rule, i){
                return (
                  <div key={rule.key} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 1.25rem', borderBottom:i<earnRules.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <div onClick={function(){updateEarnRule(rule.key,'enabled',!rule.enabled)}} style={{ width:'34px', height:'19px', borderRadius:'10px', background:rule.enabled?'#D4A843':'rgba(0,0,0,0.15)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                      <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:rule.enabled?'2px':'17px', transition:'right .15s' }}></div>
                    </div>
                    <div style={{ flex:1, fontSize:'13px', fontWeight:500, color:rule.enabled?'#1a1a1a':'#aaa' }}>{rule.label}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <input type="number" style={{ width:'80px', padding:'6px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', textAlign:'center', outline:'none', background:rule.enabled?'#fff':'#f9f9f7' }}
                        value={rule.points} onChange={function(e){updateEarnRule(rule.key,'points',parseInt(e.target.value)||0)}} disabled={!rule.enabled} />
                      <span style={{ fontSize:'12px', color:'#888', whiteSpace:'nowrap' }}>{pointsName}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* REDEEM REWARDS */}
        {tab === 'redeem' && (
          <div>
            <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Configure what customers can redeem their {pointsName} for.</div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              {redeemRules.map(function(rule, i){
                return (
                  <div key={rule.key} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 1.25rem', borderBottom:i<redeemRules.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <div onClick={function(){updateRedeemRule(rule.key,'enabled',!rule.enabled)}} style={{ width:'34px', height:'19px', borderRadius:'10px', background:rule.enabled?'#1D9E75':'rgba(0,0,0,0.15)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
                      <div style={{ position:'absolute', width:'15px', height:'15px', borderRadius:'50%', background:'#fff', top:'2px', right:rule.enabled?'2px':'17px', transition:'right .15s' }}></div>
                    </div>
                    <div style={{ flex:1, fontSize:'13px', fontWeight:500, color:rule.enabled?'#1a1a1a':'#aaa' }}>{rule.label}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <input type="number" style={{ width:'90px', padding:'6px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', textAlign:'center', outline:'none', background:rule.enabled?'#fff':'#f9f9f7' }}
                        value={rule.points_required} onChange={function(e){updateRedeemRule(rule.key,'points_required',parseInt(e.target.value)||0)}} disabled={!rule.enabled} />
                      <span style={{ fontSize:'12px', color:'#888', whiteSpace:'nowrap' }}>{pointsName} required</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* REFERRALS */}
        {tab === 'referrals' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Referral program</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Each customer gets a unique referral link. When a referred friend signs up and books, both parties get rewarded.</div>
              <Toggle on={referralEnabled} onToggle={function(){setReferralEnabled(function(v){return !v})}} label="Referral program active" sub="Customers see their referral link in the portal" />
              <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'1rem', marginTop:'4px' }}>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'12px' }}>Referrer reward (existing customer)</div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                  <input type="number" style={{ ...inp, width:'100px' }} value={referralReward.referrer_points} onChange={function(e){setReferralReward(function(p){return{...p,referrer_points:e.target.value}})}} />
                  <span style={{ fontSize:'13px', color:'#666', whiteSpace:'nowrap' }}>bonus {pointsName} when friend completes first booking</span>
                </div>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'12px' }}>Referee reward (new customer)</div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <input type="number" style={{ ...inp, width:'100px' }} value={referralReward.referee_discount} onChange={function(e){setReferralReward(function(p){return{...p,referee_discount:e.target.value}})}} />
                  <select style={{ padding:'8px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', fontFamily:'inherit' }} value={referralReward.referee_type} onChange={function(e){setReferralReward(function(p){return{...p,referee_type:e.target.value}})}}>
                    <option value="percentage">% off first booking</option>
                    <option value="fixed">$ off first booking</option>
                    <option value="points">bonus points</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>How it works — customer view</div>
              <div style={{ display:'grid', gap:'12px' }}>
                {[
                  ['1', 'Customer gets their unique referral link from their portal', '#D4A843'],
                  ['2', 'They share the link with friends', '#185FA5'],
                  ['3', 'Friend clicks link, signs up, and completes their first booking', '#534AB7'],
                  ['4', 'Both the referrer and the new customer automatically receive their reward', '#1D9E75'],
                ].map(function(step){
                  return (
                    <div key={step[0]} style={{ display:'flex', gap:'12px', alignItems:'flex-start' }}>
                      <div style={{ width:'26px', height:'26px', borderRadius:'50%', background:step[2]+'20', color:step[2], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, flexShrink:0 }}>{step[0]}</div>
                      <div style={{ fontSize:'13px', color:'#444', paddingTop:'3px' }}>{step[1]}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'14px', fontWeight:600 }}>Top customers by {pointsName}</div>
            {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {!loading && leaderboard.length === 0 && (
              <div style={{ padding:'3rem', textAlign:'center', color:'#888' }}>
                <div style={{ fontSize:'28px', marginBottom:'12px' }}>🏆</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>No loyalty points yet</div>
                <div style={{ fontSize:'13px' }}>Enable the program and customers will start earning {pointsName} with their bookings.</div>
              </div>
            )}
            {leaderboard.map(function(entry, i){
              var cust = entry.profiles ? entry.profiles.full_name : '—'
              var ini = cust.split(' ').map(function(n){return n[0]}).join('').substring(0,2)
              var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1).toString()
              return (
                <div key={entry.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 1.25rem', borderBottom:i<leaderboard.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                  <div style={{ width:'28px', textAlign:'center', fontSize:i<3?'18px':'13px', fontWeight:700, color:'#888' }}>{medal}</div>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700 }}>{ini}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:500 }}>{cust}</div>
                    <div style={{ fontSize:'11px', color:'#888' }}>{entry.profiles&&entry.profiles.email}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:'18px', fontWeight:800, color:'#D4A843' }}>{entry.total_points||0}</div>
                    <div style={{ fontSize:'11px', color:'#aaa' }}>{pointsName}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
