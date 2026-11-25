import Image from 'next/image'
import Link from 'next/link'
import CartLink from './CartLink'
import CategoryNav from './CategoryNav'
import { PersonIcon } from './icons'

/**
 * 손님 화면의 위쪽 줄. 늘 붙어 있다.
 *
 * 로고 자리는 이나래의 튤립 워드마크 **한 장을 통째로** 놓은 것이다 —
 * 배경까지가 그림이라 떼지 않는다 (foundation.md 5-11절).
 */
export default function Header() {
  return (
    <header className="border-ink bg-cloud sticky top-0 z-30 border-b-2">
      <a
        href="#main"
        className="focus:bg-ink focus:text-cloud sr-only focus:not-sr-only focus:absolute focus:z-10 focus:p-3"
      >
        본문으로 건너뛰기
      </a>
      <div className="flex h-16 items-stretch">
        <Link href="/" className="flex items-center gap-3 pr-3">
          <Image
            src="/illustrations/motif-tulip-wordmark.svg"
            alt=""
            width={233}
            height={278}
            unoptimized
            priority
            className="h-full w-auto"
          />
          <span className="text-[17px] leading-none font-extrabold tracking-tight whitespace-nowrap">
            BUTTER WEATHER
          </span>
        </Link>

        <CategoryNav className="ml-6 hidden md:flex" />

        <nav aria-label="내 메뉴" className="ml-auto flex items-center pr-2">
          <Link
            href="/account"
            aria-label="내 정보"
            className="flex size-12 items-center justify-center"
          >
            <PersonIcon />
          </Link>
          <CartLink />
        </nav>
      </div>
      <CategoryNav className="border-line border-t md:hidden" compact />
    </header>
  )
}
