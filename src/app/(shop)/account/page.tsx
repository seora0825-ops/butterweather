import { redirect } from 'next/navigation'
import Link from 'next/link'
import WithdrawButton from '@/components/WithdrawButton'
import SignOutButton from '@/components/shop/SignOutButton'
import { button } from '@/components/shop/button'
import { ChevronIcon } from '@/components/shop/icons'
import { BUSINESS } from '@/lib/business'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/server'

/**
 * 내 정보. **지금은 탈퇴를 두기 위한 자리다.**
 *
 * 이용약관과 개인정보처리방침에 「말씀해 주시면 처리합니다」라고 적어
 * 두었는데, **탈퇴만큼은 화면에 있는 편이 낫다** — 나가겠다는 사람에게
 * 메일을 쓰게 하는 것은 붙잡는 것에 가깝다.
 *
 * 열람·정정은 아직 메일로 받는다. 보여줄 것이 이름과 이메일뿐이라
 * 화면을 만들 값어치가 아직 없다.
 */
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent('/account')}`)

  const meta = user.user_metadata ?? {}
  // 빈 문자열로 오는 칸이 있다. LoginForm 과 같은 순서로 비어 있지 않은 것을 쓴다
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    (meta.preferred_username as string) ||
    ''

  return (
    <main id="main" className="mx-auto max-w-2xl space-y-6 px-4 py-8 text-base">
      <h1 className="text-2xl font-extrabold tracking-tight">내 정보</h1>
      <Link
        href="/orders"
        className={cn(
          button({ tone: 'primary', size: 'full' }),
          'justify-between'
        )}
      >
        주문 내역
        <span className="-rotate-90">
          <ChevronIcon />
        </span>
      </Link>

      <section aria-label="계정 정보" className="space-y-3">
        <dl className="divide-line border-ink divide-y border-t-2">
          {[
            ['이름', name || '—'],
            ['이메일', user.email ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3 py-2">
              <dt className="w-16 shrink-0">{label}</dt>
              <dd className="min-w-0 wrap-anywhere">{value}</dd>
            </div>
          ))}
        </dl>
        <p>
          구글·카카오에서 가져온 값입니다. 고치시려면 그쪽에서 바꾸시면 됩니다.
        </p>
      </section>

      <SignOutButton />

      <section className="border-ink space-y-2 border-t-2 pt-4">
        <p className="wrap-anywhere">
          정보를 보거나 고치고 싶으시면{' '}
          <a
            href={`mailto:${BUSINESS.email}`}
            className="inline-flex min-h-11 items-center underline"
          >
            {BUSINESS.email}
          </a>
          로 말씀해 주세요.
        </p>
        <WithdrawButton />
      </section>
    </main>
  )
}
