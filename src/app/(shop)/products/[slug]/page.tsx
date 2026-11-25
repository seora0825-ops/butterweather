import { cache } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductBuy from '@/components/shop/ProductBuy'
import ProductGallery from '@/components/shop/ProductGallery'
import ProductTile from '@/components/shop/ProductTile'
import ShippingGuide from '@/components/shop/ShippingGuide'
import { findCategory } from '@/lib/categories'
import { imageUrl } from '@/lib/images'
import {
  formatKRW,
  getProductBySlug,
  getProducts,
} from '@/lib/queries/products'

export const revalidate = 60

/** 처음 열릴 때 만들어 두고 1분마다 새로 읽는다 */
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

// metadata 와 화면이 같은 것을 두 번 읽지 않게 한다
const getProduct = cache((slug: string) =>
  getProductBySlug(decodeURIComponent(slug))
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug)
  if (!product) return { title: '찾을 수 없음 — 버터웨더' }
  return {
    title: `${product.name} — 버터웨더`,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [imageUrl(product.images[0])] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug)
  if (!product) notFound()

  const category = findCategory(product.category)
  const prices = product.variants.map((v) => v.price_krw)
  const min = Math.min(...prices)
  const varied = Math.max(...prices) !== min

  const others = (await getProducts({ category: product.category, limit: 5 }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4)

  return (
    <main id="main">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="lg:border-ink flex lg:border-r-2">
          {/* 사진 왼쪽의 세로 띠. 나래의 긴 상세 시안에서 왔다 */}
          <div
            aria-hidden
            className={`${category?.board ?? 'bg-board-ink'} w-5 shrink-0 lg:w-12`}
          />
          <div className="min-w-0 flex-1">
            <ProductGallery images={product.images} alt={product.name} />
          </div>
        </div>

        <div className="px-4 pt-6 lg:sticky lg:top-16 lg:max-w-xl lg:px-10 lg:py-12">
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-balance lg:text-[2rem]">
            {product.name}
          </h1>
          <p className="mt-2 text-xl font-semibold tabular-nums">
            {formatKRW(min)}
            {varied && '부터'}
          </p>

          {product.description && (
            <p className="mt-5 max-w-[65ch] text-base leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          <ProductBuy product={product} />
          <ShippingGuide />
        </div>
      </div>

      {product.detail_images.length > 0 && (
        <div className="mx-auto mt-12 max-w-3xl">
          {product.detail_images.map((src, i) => (
            <Image
              key={src}
              src={imageUrl(src)}
              alt={`${product.name} 상세 ${i + 1}`}
              width={768}
              height={1024}
              sizes="(min-width: 768px) 768px, 100vw"
              className="h-auto w-full"
            />
          ))}
        </div>
      )}

      {others.length > 0 && category && (
        <section aria-labelledby="others" className="mt-20">
          <div className="flex min-h-16 items-center justify-between px-3 md:px-4">
            <h2
              id="others"
              className="text-xl font-extrabold tracking-tight md:text-2xl"
            >
              다른 {category.label}
            </h2>
            <Link
              href={`/category/${category.id}`}
              className="inline-flex min-h-11 items-center text-[15px] font-semibold underline decoration-2 underline-offset-4"
            >
              모두 보기
            </Link>
          </div>
          <ul className="grid grid-cols-2 lg:grid-cols-4">
            {others.map((p) => (
              <li key={p.id}>
                <ProductTile product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
