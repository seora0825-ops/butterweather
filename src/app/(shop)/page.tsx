import ProductWall from '@/components/shop/ProductWall'
import TileStrip from '@/components/shop/TileStrip'
import { MARKET, isMarketOn } from '@/lib/market'
import { getProducts } from '@/lib/queries/products'

/** 상품을 올리면 1분 안에 보인다. 재고의 진짜 확인은 주문 때 서버가 한다 */
export const revalidate = 60

const ART = [
  '/illustrations/figma/watering-can-yellow.svg',
  '/illustrations/figma/tulip-sky.svg',
  '/illustrations/figma/flower-green.svg',
  '/illustrations/figma/scribble-purple.svg',
]

/**
 * 첫 화면. **물건이 바로 보인다** (foundation.md 5-15절).
 * 카테고리 타일 → 전체 상품. 그 사이에 설명을 넣지 않는다.
 */
export default async function HomePage() {
  const products = await getProducts()

  return (
    <main id="main">
      <h1 className="sr-only">버터웨더</h1>
      {isMarketOn() && (
        <p className="border-ink bg-butter border-b-2 px-4 py-2.5 text-center text-[15px] leading-snug font-semibold text-balance">
          {MARKET.text}
        </p>
      )}
      <TileStrip />
      <ProductWall title="전체" products={products} art={ART} />
    </main>
  )
}
