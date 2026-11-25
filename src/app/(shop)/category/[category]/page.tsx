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
      <h1 className="sr-only">{category.label}</h1>
      <div className="border-ink relative h-24 overflow-hidden border-b-2 md:h-40">
        <Image
          src={category.pattern}
          alt=""
          fill
          unoptimized
          priority
          className="scale-[1.03] object-cover"
        />
      </div>
      <ProductWall
        title={category.label}
        products={products}
        art={[category.motif]}
      />
    </main>
  )
}
