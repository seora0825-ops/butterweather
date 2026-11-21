import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '버터웨더',
  description: '나의 하루에 부드럽게 스며드는 작은 온기',
}

/**
 * 화면을 새로 짓기 전의 최소본이다.
 *
 * 옛 저장소(`jerryko570/global-butter-weather`)의 layout 은 font·다크모드
 * 스크립트·사이드바 구조를 들고 있었다. 디자인을 새로 정하므로 **가져오지
 * 않았다.** 필요해지면 그쪽 `src/app/layout.tsx` 의 주석을 먼저 읽는다 —
 * 다크모드 깜빡임과 font 서브셋을 왜 그렇게 했는지가 거기 있다.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
