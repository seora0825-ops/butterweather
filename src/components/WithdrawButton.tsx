'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { button } from '@/components/shop/button'
import { withdraw } from '@/app/(shop)/account/actions'
import { createClient } from '@/lib/supabase/browser'
import { useCart } from '@/lib/store/cart'

/**
 * 회원 탈퇴. **되돌릴 수 없어서 한 번에 눌리지 않게 한다.**
 *
 * 주문 취소는 사유를 적게 했는데(`CancelOrderButton`) 여기는 **무엇이
 * 사라지는지를 먼저 보여준다.** 사유를 받아도 쓸 데가 없고, 손님이
 * 알아야 하는 것은 「왜 나가는가」가 아니라 「무엇이 없어지는가」다.
 */
export default function WithdrawButton() {
  const router = useRouter()
  const clearCart = useCart((s) => s.clear)
  const [open, setOpen] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setError(null)
    setBusy(true)
    let accountDeleted = withdrawn
    try {
      if (!accountDeleted) {
        const result = await withdraw()
        if (!result.ok) {
          if (result.reason === '로그인이 필요합니다.') {
            router.replace('/login?next=%2Faccount')
            return
          }
          setError(result.reason)
          return
        }
        accountDeleted = true
        setWithdrawn(true)
      }

      // 계정이 없어졌다. 브라우저에 남은 것도 함께 치운다.
      const { error: signOutError } = await createClient().auth.signOut()
      if (signOutError) throw signOutError
      clearCart()
      router.replace('/')
      router.refresh()
    } catch {
      setError(
        accountDeleted
          ? '탈퇴는 완료됐지만 로그아웃하지 못했습니다. 로그아웃을 다시 시도해 주세요.'
          : '탈퇴하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
      )
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ink-muted min-h-11 cursor-pointer text-[15px] underline"
      >
        회원 탈퇴
      </button>
    )
  }

  return (
    <div className="space-y-3 text-base">
      {!withdrawn && (
        <>
          <p>
            <strong>되돌릴 수 없습니다.</strong>
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              로그인 계정이 없어집니다. 같은 계정으로 다시 들어오셔도 새
              회원입니다.
            </li>
            <li>지난 주문의 받는 분·연락처·주소가 지워집니다.</li>
            <li>주문 기록은 법에 따라 5년 동안 보관합니다.</li>
          </ul>
        </>
      )}

      {error && (
        <p role="alert" className="wrap-anywhere whitespace-pre-line">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className={button()}
        >
          {busy
            ? '처리하는 중…'
            : withdrawn
              ? '로그아웃 다시 시도하기'
              : '정말 탈퇴합니다'}
        </button>
        {!withdrawn && (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setError(null)
            }}
            disabled={busy}
            className={button()}
          >
            그만두기
          </button>
        )}
      </div>
    </div>
  )
}
