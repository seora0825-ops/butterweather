import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { button } from '@/components/shop/button'

const title = '오늘에 스며드는 작은 온기, 버터웨더'

export const metadata: Metadata = {
  title: '소개 — 버터웨더',
  description: title,
}

export default function AboutPage() {
  return (
    <main id="main">
      <div className="border-ink grid border-b-2 md:grid-cols-[minmax(0,1fr)_min(30vw,360px)]">
        <div className="bg-board-ink flex items-end p-4 md:p-6">
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight break-keep text-white md:text-5xl lg:text-7xl">
            {title}
          </h1>
        </div>
        <Image
          src="/illustrations/figma/tulip-sky.svg"
          alt=""
          width={234}
          height={280}
          unoptimized
          className="h-auto w-full"
        />
      </div>
      <div className="mx-auto max-w-2xl px-4 pt-10 md:px-6 md:pt-14">
        <p className="max-w-[65ch] text-lg leading-relaxed break-keep">
          버터웨더(BUTTER WEATHER)는 자연과 일상에서 따뜻한 영감을 받아,
          심플하고 포근한 데일리 악세서리를 전합니다. 버터처럼 부드럽게,
          날씨처럼 살랑살랑 자연스럽게. 살며시 스며드는 일상의 작은 설렘을
          함께합니다. 누구나 가볍게, 언제든 기분 좋게. 따뜻한 하루를 완성하는
          작은 포인트. 당신의 오늘에 살며시 스며듭니다.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/" className={button({ tone: 'primary' })}>
            상품 보러 가기
          </Link>
          <a
            href="https://www.instagram.com/butterweather_/"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            Instagram
          </a>
        </div>
      </div>
    </main>
  )
}
