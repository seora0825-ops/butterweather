'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { useCart } from '@/lib/store/cart'
import { button } from './button'

export default function SignOutButton() {
  const router = useRouter()
  const clearCart = useCart((s) => s.clear)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function signOut() {
    setFailed(false)
    setBusy(true)

    try {
      const { error } = await createClient().auth.signOut()
      if (error) throw error

      // 세션이 저절로 풀릴 때는 담아둔 것이 남아야 하므로, 누른 자리에서 비운다.
      clearCart()
      router.replace('/')
      router.refresh()
    } catch {
      setFailed(true)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {failed && <p role="alert">로그아웃하지 못했습니다. 다시 눌러 주세요.</p>}
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className={button()}
      >
        {busy ? '로그아웃하는 중…' : '로그아웃'}
      </button>
    </div>
  )
}
