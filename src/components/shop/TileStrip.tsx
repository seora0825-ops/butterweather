import Image from 'next/image'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { imageUrl } from '@/lib/images'

/**
 * 「오늘의 날씨」 아래의 카테고리 메뉴. **장식이 아니라 메뉴다.**
 *
 * 왼쪽은 단색 보드에 굵은 흰 글자(나래 피그마의 `BUTTER WEATHER` 보드),
 * 오른쪽은 **그 카테고리의 물건 사진**이다. 처음에는 무늬를 깔았는데
 * 2026-11-26 홈 컨셉에서 「피그마 그림을 바탕에 깔지 않는다」로 바꿨다 —
 * 그림은 상품 벽의 한 칸처럼 작게 쓰는 자리로 돌려보낸다. 물건이 아직 없는
 * 카테고리만 무늬로 대신한다.
 *
 * 칸 사이 먹선은 바탕(`bg-ink`)과 `gap` 으로 낸다 — 넷이 되면서 휴대폰 1줄,
 * 태블릿 2×2, PC 1×4 로 줄이 바뀌어 칸마다 테두리를 붙이면 어긋난다.
 */
export default function TileStrip({
  photos = {},
}: {
  /** 카테고리마다 보여줄 사진 경로(`images[0]`) */
  photos?: Partial<Record<string, string>>
}) {
  return (
    <nav
      aria-label="카테고리"
      className="border-ink bg-ink grid grid-cols-1 gap-0.5 border-b-2 sm:grid-cols-2 xl:grid-cols-4"
    >
      {CATEGORIES.map((c) => {
        const photo = photos[c.id]
        return (
          <Link
            key={c.id}
            href={`/category/${c.id}`}
            className="group grid grid-cols-2 focus-visible:z-10"
          >
            <span
              className={`${c.board} sm:aspect-tile flex h-28 items-end p-3 sm:h-auto 2xl:p-5`}
            >
              <span className="text-3xl leading-none font-extrabold tracking-tight whitespace-nowrap text-white underline-offset-8 group-hover:underline group-hover:decoration-4 xl:text-[28px] 2xl:text-4xl">
                {c.label}
              </span>
            </span>
            <span className="relative block overflow-hidden bg-white">
              <Image
                src={photo ? imageUrl(photo) : c.pattern}
                alt=""
                fill
                unoptimized={!photo}
                sizes="(min-width: 1280px) 13vw, (min-width: 640px) 25vw, 50vw"
                className="ease-out-expo object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
