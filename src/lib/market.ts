/**
 * 지금 나가 있는 오프라인 매대. 끝나는 시각이 지나면 화면에서 사라진다.
 * 다음 매대가 잡히면 값을 바꾼다.
 */
export const MARKET = {
  text: '11월 28–29일 11시–17시, 성수 언더스탠드에비뉴 하베스트 카니발 매대에 있습니다.',
  endsAt: '2026-11-29T17:00:00+09:00',
} as const

export function isMarketOn(now: number = Date.now()): boolean {
  return now < Date.parse(MARKET.endsAt)
}
