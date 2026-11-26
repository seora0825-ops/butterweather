import type { Metadata } from 'next'
import { handKr, handLatin } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: '버터웨더',
  description: '나의 하루에 부드럽게 스며드는 작은 온기',
}

/**
 * 모든 화면의 껍데기. **Header·Footer 는 여기 없다** — 손님 화면
 * (`(shop)`·`(auth)`)의 layout 이 각각 붙인다. 어드민에는 필요 없다.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        {/* 동적 서브셋이라 쓰인 글자의 조각만 받는다. next/font/local 은
            unicode-range 를 지원하지 않아 쓸 수 없다
            (public/fonts/pretendard/README.md) */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/fonts/pretendard/pretendard.css" />
      </head>
      <body
        className={`${handLatin.variable} ${handKr.variable} min-h-dvh antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
