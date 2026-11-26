/**
 * 상품의 `tags` 로 붙이는 표시. **표를 늘리지 않으려고 tag 로 둔다** —
 * 마이그레이션 없이 관리툴에서 바로 바꿀 수 있다.
 *
 * - `today` — 첫 화면 「오늘의 날씨」. 없으면 가장 최근 상품
 * - `no-03` — 매대 칸 카드와 같은 번호 (01–26)
 */
export const TODAY_TAG = 'today'

export function withNumber(
  tags: string[] | null | undefined,
  no: number | null
): string[] {
  if (no !== null && (!Number.isInteger(no) || no < 1 || no > 999)) {
    throw new RangeError('Product number must be an integer from 1 to 999')
  }
  const rest = (tags ?? []).filter((tag) => !tag.startsWith('no-'))
  return no === null ? rest : [...rest, `no-${String(no).padStart(2, '0')}`]
}

export function withToday(
  tags: string[] | null | undefined,
  on: boolean
): string[] {
  const rest = (tags ?? []).filter((tag) => tag !== TODAY_TAG)
  return on ? [...rest, TODAY_TAG] : rest
}

export function numberOf(tags: string[] | null | undefined): string | null {
  for (const tag of tags ?? []) {
    const m = /^no-(\d{1,3})$/.exec(tag)
    if (m) return m[1].padStart(2, '0')
  }
  return null
}
