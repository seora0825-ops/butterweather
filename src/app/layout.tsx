import type { Metadata } from 'next'
import { handKr, handLatin } from '@/lib/fonts'
import './globals.css'

/**
 * 공유 미리보기의 주소는 **대표 주소(`www`)로 고정한다** — 프리뷰 주소는
 * Vercel 로그인을 요구해(CLAUDE.md 7절) 카카오가 그림을 못 가져간다.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://www.butterweather.com'),
  title: '버터웨더',
  description: '나의 하루에 부드럽게 스며드는 작은 온기',
  openGraph: {
    siteName: '버터웨더',
    locale: 'ko_KR',
    type: 'website',
  },
  // 탭의 작은 아이콘 — Header 로고와 같은 원본 한 장
  icons: { icon: '/illustrations/motif-tulip-wordmark.svg' },
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
