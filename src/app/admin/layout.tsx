import type { Metadata } from 'next'
import AdminGate from '@/components/admin/AdminGate'

export const metadata: Metadata = {
  title: '관리 — 버터웨더',
  // 문을 열 때 `robots.ts` 를 풀어도 여기는 계속 감춘다
  robots: { index: false, follow: false },
}

/**
 * 어드민 껍데기. **권한을 막는 것은 여기가 아니라 RLS 다** (AdminGate 주석).
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminGate>{children}</AdminGate>
}
