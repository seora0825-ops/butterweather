import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import ProductWall from '@/components/shop/ProductWall'
import { CATEGORIES, findCategory } from '@/lib/categories'
import { getProducts } from '@/lib/queries/products'

export const revalidate = 60
export const dynamicParams = false

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }))
}

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = findCategory((await params).category)
  return { title: category ? `${category.label} — 버터웨더` : '버터웨더' }
}

export default async function CategoryPage({ params }: Props) {
  const category = findCategory((await params).category)
  if (!category) notFound()

  const products = await getProducts({ category: category.id })

  return (
    <main id="main">
      <div className="border-ink grid grid-cols-2 border-b-2">
        <div
          className={`${category.board} flex h-28 items-end p-4 md:h-48 md:p-6`}
        >
          <h1 className="text-4xl leading-none font-extrabold tracking-tight text-white md:text-7xl">
            {category.label}
          </h1>
        </div>
        <div className="relative overflow-hidden">
          <Image
            src={category.pattern}
            alt=""
            fill
            unoptimized
            priority
            className="scale-[1.03] object-cover"
          />
        </div>
      </div>
      <ProductWall
        title="All"
        products={products}
        art={['/illustrations/figma/watering-can-yellow.svg']}
      />
    </main>
  )
}
