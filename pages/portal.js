import { useEffect } from 'react'
export default function PortalRedirect() {
  useEffect(function() { window.location.href = '/portal' }, [])
  return null
}
