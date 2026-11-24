'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { useCart } from '@/lib/store/cart'

const PROVIDERS = [
  { id: 'google', label: '구글로 계속하기', busy: '구글을 여는 중…' },
  { id: 'kakao', label: '카카오로 계속하기', busy: '카카오를 여는 중…' },
] as const

type ProviderId = (typeof PROVIDERS)[number]['id']

const LOGIN_FAILED = '로그인을 완료하지 못했습니다. 아래에서 다시 골라 주세요.'
const LOGOUT_FAILED = '로그아웃하지 못했습니다. 다시 눌러 주세요.'

const BUTTON =
  'w-full cursor-pointer border border-gray-300 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40'

export default function LoginForm({
  next,
  failed,
}: {
  next: string
  failed: boolean
}) {
  /** 로그인한 사람의 이름. 로그인 전이면 null */
  const [name, setName] = useState<string | null>(null)
  const [busy, setBusy] = useState<ProviderId | 'signOut' | null>(null)
  const [error, setError] = useState<string | null>(
    failed ? LOGIN_FAILED : null
  )
  const clearCart = useCart((s) => s.clear)

  useEffect(() => {
    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (!user) {
        setName(null)
        return
      }
      // 카카오 손님은 이메일이 없을 수 있다 (social-login-setup.md 「알아둘 것」).
      // 이름 → 닉네임 → 이메일 순으로 **비어 있지 않은 것**을 쓴다
      const meta = user.user_metadata ?? {}
      setName(
        meta.name ||
          meta.full_name ||
          meta.preferred_username ||
          user.email ||
          '회원'
      )
    })

    return () => subscription.unsubscribe()
  }, [])

  // 구글·카카오 화면에서 「뒤로」를 누르면 브라우저가 떠날 때의 화면을 그대로
  // 되살린다(bfcache). 「여는 중」에 멈춘 채로 버튼이 안 눌리므로 풀어준다
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setBusy(null)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  async function signIn(provider: ProviderId) {
    setError(null)
    setBusy(provider)

    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: {
        // 돌아올 곳은 **우리 route handler** 다. 거기서 code 를 세션으로
        // 바꾼다 (`app/auth/callback/route.ts`)
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    // 성공하면 브라우저가 떠나므로 busy 를 풀지 않는다
    if (error) {
      setError(LOGIN_FAILED)
      setBusy(null)
    }
  }

  async function signOut() {
    setError(null)
    setBusy('signOut')

    const { error } = await createClient().auth.signOut()
    if (error) {
      setError(LOGOUT_FAILED)
    } else {
      // **로그아웃하면 장바구니를 비운다.** 브라우저에 남아 있어 다음 사람이
      // 앞사람 것을 물려받는다 (2026-09-22 에 실제로 그랬다).
      //
      // `SIGNED_OUT` 이벤트가 아니라 **누른 자리에서** 비운다. 그 이벤트는
      // 세션이 저절로 풀렸을 때도 오는데, 그때는 「담아둔 것은 그대로
      // 있습니다」가 약속이다 (writing.md 4절)
      clearCart()
    }
    setBusy(null)
  }

  const alert = error ? (
    <p role="alert" className="mb-4 border border-gray-300 p-3 text-sm">
      {error}
    </p>
  ) : null

  if (name) {
    return (
      <>
        <p className="mb-8 text-sm leading-relaxed">
          {`${name} 님으로 로그인되어 있습니다.`}
        </p>
        {error === LOGOUT_FAILED ? alert : null}
        <div className="flex flex-col gap-3">
          <Link href={next} className={`${BUTTON} text-center`}>
            계속 둘러보기
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={busy !== null}
            className={BUTTON}
          >
            {busy === 'signOut' ? '로그아웃하는 중…' : '로그아웃'}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="mb-8 text-sm leading-relaxed">
        따로 가입하실 것은 없습니다.
      </p>
      {alert}
      <div className="flex flex-col gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => signIn(p.id)}
            disabled={busy !== null}
            className={BUTTON}
          >
            {busy === p.id ? p.busy : p.label}
          </button>
        ))}
      </div>
    </>
  )
}
