'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/cn'

/**
 * 카테고리. 좁은 화면에서는 **물건을 고르는 화면에서만** 보인다 —
 * 첫 화면은 TileStrip 이 같은 일을 하고, 장바구니부터는 방해가 된다.
 */
export default function CategoryNav({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const pathname = usePathname()
  const browsing =
    pathname.startsWith('/category/') || pathname.startsWith('/products/')
  if (compact && !browsing) return null

  const items = [
    { href: '/', label: 'All' },
    ...CATEGORIES.map((c) => ({ href: `/category/${c.id}`, label: c.label })),
  ]

  return (
    <nav
      aria-label="카테고리"
      className={cn(compact ? 'flex' : 'items-stretch', className)}
    >
      {items.map((item) => {
        const here = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={here ? 'page' : undefined}
            className={cn(
              'flex items-center justify-center text-[15px]',
              compact ? 'h-11 flex-1' : 'px-4',
              here
                ? 'font-extrabold underline decoration-2 underline-offset-8'
                : 'font-medium hover:underline hover:decoration-2 hover:underline-offset-8'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
