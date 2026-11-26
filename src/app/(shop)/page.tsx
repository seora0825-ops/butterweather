import ProductWall from '@/components/shop/ProductWall'
import TileStrip from '@/components/shop/TileStrip'
import TodayWeather from '@/components/shop/TodayWeather'
import { MARKET, isMarketOn } from '@/lib/market'
import { TODAY_TAG } from '@/lib/productTags'
import { getProducts } from '@/lib/queries/products'

/** 상품을 올리면 1분 안에 보인다. 재고의 진짜 확인은 주문 때 서버가 한다 */
export const revalidate = 60

// 착용 사진은 지금 한 장뿐이라 첫 장면에만 쓴다. 늘면 여기 끼운다
const ART = [
  '/illustrations/figma/watering-can-yellow.svg',
  '/illustrations/figma/tulip-sky.svg',
  '/illustrations/figma/flower-green.svg',
  '/illustrations/figma/scribble-purple.svg',
]

/**
 * 첫 화면. **물건이 바로 보인다** (foundation.md 5-15절).
 * 「오늘의 날씨」 한 장면 → 카테고리 → 전체 상품. 그 사이에 설명을 넣지 않는다.
 *
 * 오늘의 날씨는 `today` tag 가 붙은 상품, 없으면 가장 최근 것이다.
 */
export default async function HomePage() {
  const products = await getProducts()
  const today =
    products.find((p) => p.tags?.includes(TODAY_TAG) && p.images[0]) ??
    products.find((p) => p.images[0])
  const photos: Record<string, string> = {}
  for (const p of products) {
    if (p.images[0] && !photos[p.category]) photos[p.category] = p.images[0]
  }

  return (
    <main id="main">
      <h1 className="sr-only">버터웨더</h1>
      {isMarketOn() && (
        <p className="border-ink bg-butter border-b-2 px-4 py-2.5 text-center text-[15px] leading-snug font-semibold text-balance">
          {MARKET.text}
        </p>
      )}
      {today && (
        <TodayWeather
          product={today}
          wear={{
            src: '/photos/wear-wrist.webp',
            alt: '손목에 겹쳐 찬 비즈 팔찌',
          }}
        />
      )}
      <TileStrip photos={photos} />
      <ProductWall title="전체" products={products} art={ART} />
    </main>
  )
}
