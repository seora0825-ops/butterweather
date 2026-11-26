import Image from 'next/image'
import Link from 'next/link'
import { imageUrl } from '@/lib/images'
import { numberOf } from '@/lib/productTags'
import { formatKRW } from '@/lib/queries/products'
import type { ProductListItem } from '@/types/product'

export default function ProductTile({
  product,
  priority = false,
}: {
  product: ProductListItem
  priority?: boolean
}) {
  const soldOut = product.status === 'sold_out' || product.total_stock <= 0
  // 옵션마다 값이 다를 수 있다. 뷰가 주는 것은 최저가뿐이라 옵션이 둘
  // 이상이면 「부터」를 붙인다 — 같은 값이어도 틀린 말은 아니다
  const from = product.variant_count > 1
  const no = numberOf(product.tags)

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block h-full focus-visible:z-10"
    >
      {/* 손을 올리면 나래 그림의 윤곽선 굵기(2.6)로 테두리가 그려진다. 확대·그림자는 쓰지 않는다 */}
      <span className="aspect-tile group-hover:after:border-ink relative block overflow-hidden bg-white after:pointer-events-none after:absolute after:inset-0 after:border-[2.6px] after:border-transparent after:transition-colors">
        {product.images[0] && (
          <Image
            src={imageUrl(product.images[0])}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
          />
        )}
        {soldOut && (
          <span className="bg-ink text-cloud absolute top-3 left-3 rounded-full px-3 py-1 text-sm font-bold">
            품절
          </span>
        )}
      </span>
      <span className="block px-3 pt-3 pb-7 md:px-4">
        {no && (
          <span className="font-hand mb-1 block text-3xl leading-none">
            {no}
          </span>
        )}
        <span className="line-clamp-2 block text-[15px] leading-snug font-semibold group-hover:underline group-hover:decoration-2 group-hover:underline-offset-4">
          {product.name}
        </span>
        <span className="text-ink-muted mt-1 block text-[15px] tabular-nums">
          {formatKRW(product.min_price_krw)}
          {from && '부터'}
        </span>
      </span>
    </Link>
  )
}
