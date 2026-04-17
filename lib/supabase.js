import { createClient } from '@supabase/supabase-js'

var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
var supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export var supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getSession() {
  var result = await supabase.auth.getSession()
  return result.data.session
}

export async function getProfile(userId) {
  var result = await supabase.from('profiles').select('*').eq('id', userId).single()
  return result.data
}

export async function requireAuth(redirectTo) {
  if (typeof window === 'undefined') return null
  var session = await getSession()
  if (!session) {
    window.location.href = redirectTo || '/login'
    return null
  }
  return session
}

export async function requireRole(role) {
  if (typeof window === 'undefined') return null
  var session = await getSession()
  if (!session) { window.location.href = '/login'; return null }
  var profile = await getProfile(session.user.id)
  if (!profile) { window.location.href = '/login'; return null }
  var roles = Array.isArray(role) ? role : [role]
  if (!roles.includes(profile.role)) {
    window.location.href = '/unauthorized'
    return null
  }
  return { session, profile }
}
