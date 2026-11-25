import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

/**
 * 첫 화면 맨 위의 타일 여섯 장. **장식이 아니라 카테고리 메뉴다.**
 *
 * 단색 보드의 왼쪽 아래에 굵은 흰 글자를 놓은 것은 나래의 피그마 보드
 * (`BUTTER WEATHER`)를 따랐다. 보드와 무늬가 번갈아 맞닿는다.
 * 첫 화면에서 물건이 바로 보여야 하므로(foundation.md 5-15절) 한 줄만 쓴다.
 */
export default function TileStrip() {
  return (
    <nav
      aria-label="카테고리"
      className="border-ink grid grid-cols-1 border-b-2 sm:grid-cols-3"
    >
      {CATEGORIES.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.id}`}
          className="group grid grid-cols-2 focus-visible:z-10"
        >
          <span
            className={`${c.board} sm:aspect-tile flex h-24 items-end p-3 sm:h-auto lg:aspect-[234/200] lg:p-5`}
          >
            <span className="text-3xl leading-none font-extrabold tracking-tight text-white underline-offset-8 group-hover:underline group-hover:decoration-4 lg:text-5xl">
              {c.label}
            </span>
          </span>
          <span className="relative block overflow-hidden">
            <Image
              src={c.pattern}
              alt=""
              fill
              unoptimized
              priority
              className="ease-out-expo scale-[1.03] object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </span>
        </Link>
      ))}
    </nav>
  )
}
