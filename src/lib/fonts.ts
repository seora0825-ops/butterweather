import { Gaegu, Gochi_Hand } from 'next/font/google'

/**
 * 손글씨 — **번호·짧은 메모에만** 쓴다. 메뉴·button·본문은 Pretendard 다.
 *
 * 나래 워드마크(굵은 마커로 둥글게 쓴 글씨)와 획이 가장 닮은 둘을 짝지었다
 * (2026-11-26 홍설아 승인). 영문·숫자는 Gochi Hand, 한글은 Gaegu Bold.
 * 나래 손글씨가 생기면 이 파일만 바꿔 끼운다. 둘 다 OFL 이고 next/font 가
 * 빌드 때 받아 우리 도메인에서 내보낸다.
 */
export const handLatin = Gochi_Hand({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-hand-latin',
  display: 'swap',
})

// 한글 글리프는 unicode-range 조각으로 쓴 글자만 받는다. 미리 받지 않는다
export const handKr = Gaegu({
  weight: '700',
  subsets: ['latin'],
  variable: '--font-hand-kr',
  display: 'swap',
  preload: false,
})
