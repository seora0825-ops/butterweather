'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

type Gate =
  | { state: 'checking' }
  | { state: 'admin'; email: string }
  | { state: 'stranger'; email: string | null }
  | { state: 'error' }

/**
 * 어드민의 문. **안내이지 방어가 아니다 ★**
 *
 * 막는 것은 RLS 다 — 관리자가 아니면 감춘 상품이 조회되지 않고 쓰기가 전부
 * 거부된다 (`0003`). 화면의 검사는 우회할 수 있고 DB 의 검사는 못 한다.
 * `service_role` 을 쓰는 server action 은 **스스로 `is_admin()` 을 묻는다**
 * (`admin/orders/actions.ts`). 이 component 를 믿고 그 검사를 빼지 말 것.
 *
 * 여기서 하는 일은 **알려주는 것**이다. 관리자가 아닌 계정으로 들어와도
 * 화면은 열리고 쓰기만 조용히 막히므로, 「저장이 안 되는데 이유를 모르는」
 * 상태가 된다. 그래서 누구로 들어와 있는지 늘 띄우고, 관리자가 아니면
 * 들어오기 전에 말한다.
 *
 * **로그인 화면을 따로 두지 않는다 (2026-11-25).** 옛 레포는 이메일·비밀번호
 * 화면(`/admin/login`)이 있었다. 관리자 이메일이 둘 다 Gmail 이라 손님과 같은
 * `/login` 의 구글로 들어온다 — 관리할 비밀번호가 없으면 새지도 않는다.
 * ⚠️ 카카오로 들어오면 카카오계정 이메일이 명단과 달라 막힐 수 있다.
 *
 * **서버가 아니라 브라우저에서 묻는다.** 세션 갱신을 브라우저가 맡고 있어서
 * 서버 component 는 새 token 을 쿠키에 쓸 수 없다 (`lib/supabase/server.ts`).
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [gate, setGate] = useState<Gate>({ state: 'checking' })
  const [signOutFailed, setSignOutFailed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let alive = true

    // 부르는 순간의 주소를 읽는다. 이 component 는 layout 에 있어 화면을
    // 옮겨도 다시 mount 되지 않는다
    const toLogin = () =>
      router.replace(
        `/login?next=${encodeURIComponent(window.location.pathname)}`
      )

    async function check() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (!alive) return

      if (!session) {
        if (sessionError) setGate({ state: 'error' })
        else toLogin()
        return
      }

      const { data, error } = await supabase.rpc('is_admin')
      if (!alive) return
      const email = session.user.email ?? null
      if (error) setGate({ state: 'error' })
      else if (data === true) setGate({ state: 'admin', email: email ?? '' })
      else setGate({ state: 'stranger', email })
    }

    check()

    // 다른 탭에서 로그아웃하면 여기도 닫는다
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') toLogin()
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [router])

  async function signOut() {
    setSignOutFailed(false)
    // 성공하면 위의 SIGNED_OUT 이 로그인 화면으로 보낸다
    const { error } = await createClient().auth.signOut()
    if (error) setSignOutFailed(true)
  }

  if (gate.state === 'checking') {
    return <p className="px-7 py-20 text-sm">관리자인지 확인하는 중…</p>
  }

  if (gate.state === 'error') {
    return (
      <p role="alert" className="px-7 py-20 text-sm">
        관리자인지 확인하지 못했습니다. 새로고침해 주세요.
      </p>
    )
  }

  if (gate.state === 'stranger') {
    return (
      <div className="px-7 py-20 text-sm leading-relaxed">
        <p role="alert" className="mb-4">
          {gate.email
            ? `${gate.email} 은(는) 관리자 계정이 아닙니다. 로그아웃한 뒤 관리자 구글 계정으로 다시 로그인해 주세요.`
            : '이 계정에는 이메일이 없어 관리자인지 알 수 없습니다. 로그아웃한 뒤 관리자 구글 계정으로 다시 로그인해 주세요.'}
        </p>
        <button
          type="button"
          onClick={signOut}
          className="cursor-pointer underline"
        >
          로그아웃
        </button>
        {signOutFailed ? (
          <p role="alert" className="mt-2">
            로그아웃하지 못했습니다. 다시 눌러 주세요.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-gray-200 px-7 py-4 text-sm">
        <div className="flex items-center gap-6">
          <Link href="/admin/products">상품</Link>
          <Link href="/">가게 화면 보기</Link>
        </div>
        <div className="flex items-center gap-6">
          {signOutFailed ? (
            <span role="alert">로그아웃하지 못했습니다. 다시 눌러 주세요.</span>
          ) : null}
          <span>{gate.email}</span>
          <button
            type="button"
            onClick={signOut}
            className="cursor-pointer underline"
          >
            로그아웃
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-3xl px-7 py-10">{children}</main>
    </>
  )
}
