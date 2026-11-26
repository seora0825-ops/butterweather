import Link from 'next/link'
import { BUSINESS, businessRows } from '@/lib/business'
import { CATEGORIES } from '@/lib/categories'

/**
 * **갈 곳이 있는 link 만 둔다.** 배송·교환 안내는 상품 상세 안에 있다.
 * 사업자 정보 표기와 약관·방침 link 는 법이 요구한다 (lib/business.ts).
 */
const LINKS = [
  { label: '소개', href: '/about' },
  ...CATEGORIES.map((c) => ({ label: c.label, href: `/category/${c.id}` })),
  { label: '주문 내역', href: '/orders' },
  { label: 'Instagram', href: 'https://www.instagram.com/butterweather_/' },
  { label: '문의', href: `mailto:${BUSINESS.email}` },
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
]

export default function Footer() {
  const rows = businessRows()

  return (
    <footer className="border-ink mt-20 border-t-2 px-4 pt-10 pb-12 md:px-6">
      <p className="text-xl font-extrabold tracking-tight text-balance md:text-2xl">
        나의 하루에 부드럽게 스며드는 작은 온기
      </p>
      <ul className="mt-6 -ml-2 flex flex-wrap">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-11 items-center px-2 text-[15px] font-semibold hover:underline hover:decoration-2 hover:underline-offset-4"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      {rows.length > 0 && (
        <dl className="text-ink-muted mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-1.5">
              <dt className="shrink-0">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-ink-muted mt-4 text-sm">© 2026 Butter Weather</p>
    </footer>
  )
}
