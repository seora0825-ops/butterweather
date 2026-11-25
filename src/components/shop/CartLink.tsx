'use client'

import Link from 'next/link'
import { cartCount, useCartLines } from '@/lib/store/cart'
import { BagIcon } from './icons'

export default function CartLink() {
  const count = cartCount(useCartLines())

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `장바구니, ${count}개` : '장바구니'}
      className="relative flex size-12 items-center justify-center"
    >
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden
          className="bg-ink text-cloud absolute top-1 right-0.5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-bold tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
