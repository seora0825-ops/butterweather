import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ORDERING_OPEN } from '@/lib/shopStatus'

/**
 * 이 사람이 온라인 주문을 할 수 있는가. 문을 열기 전에는 **관리자만** —
 * 페이앱에는 테스트 모드가 없어 운영에서 실제 결제로 시험한다.
 *
 * 화면이 아니라 **server action 이 부른다.** button 을 감추는 것은 막는 것이
 * 아니다.
 */
export async function canOrder(supabase: SupabaseClient): Promise<boolean> {
  if (ORDERING_OPEN) return true
  const { data } = await supabase.rpc('is_admin')
  return data === true
}
