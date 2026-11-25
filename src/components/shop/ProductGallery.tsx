'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { imageUrl } from '@/lib/images'
import { cn } from '@/lib/cn'

/**
 * 상세의 사진. **손가락으로 밀면 넘어간다** — 누를 것을 따로 두지 않는다.
 * 넓은 화면에서는 아래 작은 사진을 눌러도 넘어간다.
 */
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[]
  alt: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)

  function onScroll() {
    const el = track.current
    if (!el || el.clientWidth === 0) return
    setCurrent(Math.round(el.scrollLeft / el.clientWidth))
  }

  function go(index: number) {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' })
  }

  if (images.length === 0) {
    return <div className="aspect-tile bg-white" />
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={track}
          onScroll={onScroll}
          tabIndex={images.length > 1 ? 0 : undefined}
          role="group"
          aria-label={`${alt} 사진 ${images.length}장`}
          className="flex snap-x snap-mandatory overflow-x-auto bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <div
              key={src}
              className={cn(
                'aspect-tile relative w-full shrink-0 snap-center max-lg:max-h-[70dvh] lg:aspect-auto lg:min-h-136',
                images.length > 1
                  ? 'lg:h-[calc(100dvh-12rem)]'
                  : 'lg:h-[calc(100dvh-4rem)]'
              )}
            >
              <Image
                src={imageUrl(src)}
                alt={images.length > 1 ? `${alt} ${i + 1}` : alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <span
            aria-hidden
            className="bg-ink text-cloud absolute right-3 bottom-3 rounded-full px-3 py-1 text-sm font-bold tabular-nums lg:hidden"
          >
            {current + 1}/{images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="hidden grid-cols-8 lg:grid">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => go(i)}
              aria-label={`사진 ${i + 1} 보기`}
              aria-current={i === current}
              className={cn(
                'aspect-tile relative bg-white',
                i === current &&
                  'after:border-ink after:absolute after:inset-0 after:border-4'
              )}
            >
              <Image
                src={imageUrl(src)}
                alt=""
                fill
                sizes="10vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
