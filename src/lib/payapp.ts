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
 * `var1` 에 판매 id 를 싣지만 **페이앱 앱으로 받은 결제는 그것을 통보에 돌려주지
 * 않는다** (2026-11-26). 그래서 상품명 끝에 판매 번호를 붙인다(`saleCode`).
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
    // 끝의 네 글자는 판매 번호다. 앱 결제는 `var1` 을 돌려주지 않고 상품명만
    // 돌려준다(2026-11-26 실제 결제로 확인) — 그것으로 짝을 찾는다
    goodName: `버터웨더 ${goodsLabel(lines)} ${saleCode(saleId)}`,
    goodPrice: String(totalKrw(lines)),
    var1: saleId,
  })
  // `+` 를 공백으로 풀지 않는 앱이 있어 `%20` 으로 보낸다
  return `https://payapp.kr/sdk-app?${params.toString().replace(/\+/g, '%20')}`
}

/**
 * 페이앱 판매내역만 보고도 무엇이 팔렸는지 알게 상품 번호를 싣는다 — `07·13×2`.
 * 길면 앞의 다섯 줄만 적고 「외 N」. 번호가 하나도 없으면 개수만 적는다.
 * ⚠️ 판매 번호(`#AB12`)는 **반드시 맨 끝**이다. 통보에서 그것으로 짝을 찾는다
 */
export function goodsLabel(lines: CounterLine[]): string {
  const coded = lines.filter((l) => l.code)
  if (coded.length === 0) return `${itemCount(lines)}개`
  const shown = coded
    .slice(0, 5)
    .map((l) => (l.quantity > 1 ? `${l.code}×${l.quantity}` : l.code))
    .join('·')
  const rest =
    itemCount(lines) - coded.slice(0, 5).reduce((n, l) => n + l.quantity, 0)
  return rest > 0 ? `${shown} 외 ${rest}` : shown
}

/**
 * 안드로이드는 크롬이 App Link 를 놓치면 payapp.kr 이 **홈페이지로 보낸다**
 * (2026-11-28 현장). 그래서 앱 패키지를 찍어 여는 intent 주소로 바꾼다.
 * 패키지는 payapp.kr/.well-known/assetlinks.json 의 `com.udid.payapp`.
 * 앱이 없으면 플레이 스토어로 간다. iOS 는 Universal Link 만 된다.
 */
export function appLink(url: string, userAgent: string): string {
  if (!/android/i.test(userAgent)) return url
  const rest = url.replace(/^https:\/\//, '')
  return `intent://${rest}#Intent;scheme=https;package=com.udid.payapp;end`
}

/** 판매 번호의 앞 네 글자. 손님 영수증에도 보인다 */
export function saleCode(saleId: string): string {
  return `#${saleId.slice(0, 4).toUpperCase()}`
}

export function usesPayapp(method: Method): boolean {
  return method !== 'transfer' && method !== 'cash'
}
