import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'

/**
 * 첫 화면 맨 위의 타일 여섯 장. **장식이 아니라 카테고리 메뉴다.**
 *
 * 그림과 무늬가 한 장씩 번갈아 맞닿는 것은 이나래의 원본 시트 그대로다.
 * 첫 화면에서 물건이 바로 보여야 하므로(foundation.md 5-15절) 한 줄만 쓴다.
 */
export default function TileStrip() {
  return (
    <nav aria-label="카테고리" className="grid grid-cols-3">
      {CATEGORIES.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.id}`}
          className="group block focus-visible:z-10"
        >
          <span className="grid grid-cols-2">
            {[c.motif, c.pattern].map((src) => (
              <span
                key={src}
                className="aspect-tile relative block overflow-hidden lg:aspect-[234/220]"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  unoptimized
                  priority
                  className="ease-out-expo scale-[1.03] object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </span>
            ))}
          </span>
          <span className="border-ink group-hover:bg-ink group-hover:text-cloud block border-b-2 py-3 text-center text-base font-extrabold md:text-lg">
            {c.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
