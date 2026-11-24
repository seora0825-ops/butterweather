import type { CounterLine, Method } from '@/lib/store/counter'
import { itemCount, totalKrw } from '@/lib/store/counter'

/** 페이앱이 받는 가장 작은 금액 */
export const PAYAPP_MIN_KRW = 1000

/**
 * 판매자 휴대폰의 페이앱을 **금액이 채워진 채로** 연다. 설치돼 있어야 한다.
 * 형식은 https://docs.payapp.kr/docs/09-mobile-app.md 「WebToApp」·「대면결제」.
 *
 * 열쇠를 넣지 않는다 — 앱에 로그인한 판매자로 받는다.
 *
 * `returnUri` 로 결과가 붙어 돌아오지만 **결제됐다는 증거로 쓰지 않는다.**
 * 주소는 누구나 만들 수 있고 문서도 다시 검증하라고 한다. 그래서 사람이
 * 페이앱에서 확인하고 기록한다.
 */
export function payappUrl(
  method: Method,
  lines: CounterLine[],
  saleId: string,
  returnUri: string
): string {
  const params = new URLSearchParams({
    reqType: method,
    returnUri,
    goodName: `버터웨더 ${itemCount(lines)}개`,
    goodPrice: String(totalKrw(lines)),
    var1: saleId,
  })
  // `+` 를 공백으로 풀지 않는 앱이 있어 `%20` 으로 보낸다
  return `https://payapp.kr/sdk-app?${params.toString().replace(/\+/g, '%20')}`
}

export function usesPayapp(method: Method): boolean {
  return method !== 'transfer' && method !== 'cash'
}
