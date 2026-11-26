/**
 * 상품의 `tags` 로 붙이는 표시. **표를 늘리지 않으려고 tag 로 둔다** —
 * 마이그레이션 없이 관리툴에서 바로 바꿀 수 있다.
 *
 * - `today` — 첫 화면 「오늘의 날씨」. 없으면 가장 최근 상품
 * - `no-03` — 매대 칸 카드와 같은 번호 (01–26)
 * - `len-16.5` — 한 바퀴 둘레(cm). 상세의 크기 자에 쓴다
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

/** 둘레는 0.5cm 단위까지 받는다. 그보다 잘게 재는 일은 없다 */
export function withLength(
  tags: string[] | null | undefined,
  cm: number | null
): string[] {
  if (cm !== null && (!Number.isFinite(cm) || cm <= 0 || cm > 200)) {
    throw new RangeError('Length must be between 0 and 200 cm')
  }
  const rest = (tags ?? []).filter((tag) => !tag.startsWith('len-'))
  return cm === null ? rest : [...rest, `len-${Math.round(cm * 2) / 2}`]
}

export function lengthOf(tags: string[] | null | undefined): number | null {
  for (const tag of tags ?? []) {
    const m = /^len-(\d{1,3}(?:\.5)?)$/.exec(tag)
    if (m) return Number(m[1])
  }
  return null
}
