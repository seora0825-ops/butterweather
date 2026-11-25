/**
 * 상품 이름 짓기. **물건의 색이 날씨를 부르고, 거기에 어느 하루의 순간을 붙인다.**
 *
 * 물건이 전부 하나뿐이라 이름이 백 개 넘게 필요하다. 「비즈 팔찌 37」로는
 * 하나뿐이라는 것이 안 느껴지고, 사람이 다 짓기에는 많다. weather 는 브랜드
 * 이름의 절반이고 「감정이 연결되는 형상화의 아이템」이다 (foundation.md 1-2절).
 *
 * **영문이다 (2026-11-25 홍설아).** 이름은 고유명사라 화면의 언어를 따르지 않는다
 * (writing.md 1절).
 *
 * **말의 목록은 임시다.** 나래가 빼고 더한다 — 아래 두 표만 고치면 된다.
 * AI 를 부르지 않는다. 같은 사진이면 어느 휴대폰에서나 같은 이름이 나온다.
 */

export type Tone =
  | 'black'
  | 'white'
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'sky'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'brown'

const WEATHER: Record<Tone, string[]> = {
  black: [
    'No Moon',
    'Storm Cloud',
    'Before Dawn',
    'Before the Rain',
    'Starless Night',
    'Night Fog',
  ],
  white: [
    'First Snow',
    'Cotton Cloud',
    'Frost',
    'After the Snow',
    'White Noon',
    'High Cloud',
  ],
  gray: [
    'Overcast',
    'Drizzle',
    'Thin Fog',
    'After the Rain',
    'Low Cloud',
    'Soft Rain',
  ],
  red: [
    'Afterglow',
    'Red Moon',
    'Sundown',
    'Maple Weather',
    'West Sky',
    'Late Autumn Sun',
  ],
  orange: [
    'High Noon',
    'Autumn Sun',
    'Golden Hour',
    'Late Summer',
    'Bonfire',
    'Last Light',
  ],
  yellow: [
    'Sunshine',
    'Spring Sun',
    'Afternoon Sun',
    'Clear Morning',
    'Sunny Side',
    'Butter Light',
  ],
  green: [
    'Early Summer',
    'Forest Shade',
    'After the Monsoon',
    'Morning Dew',
    'Summer Rain',
    'Cut Grass',
  ],
  sky: [
    'Clear',
    'Clearing Sky',
    'Sea Breeze',
    'Water Mist',
    'Summer Morning',
    'Light Wind',
  ],
  blue: [
    'Blue Night',
    'Summer Shower',
    'Swell',
    'Winter Sky',
    'Dawn Rain',
    'Night Sea',
  ],
  purple: [
    'Violet Dusk',
    'Dawn Mist',
    'Early Evening',
    'First Light',
    'Lilac Season',
    'Twilight',
  ],
  pink: [
    'Spring Chill',
    'Petal Rain',
    'Spring Night',
    'Blossom Cloud',
    'Morning Glow',
    'April Wind',
  ],
  brown: [
    'Dry Leaves',
    'Late Fall',
    'Cold Front',
    'Leaf Rain',
    'Short Day',
    'First Frost',
  ],
}

const MOMENT = [
  'Window Seat',
  'First Train',
  'Way Home',
  'Half Past Three',
  'Sunday Morning',
  'Afternoon Nap',
  'Long Walk',
  'One Stop Early',
  'A Letter',
  'Laundry Day',
  'No Umbrella',
  'Radio On',
  'Long Call',
  'Late Lunch',
  'Unknown Alley',
  'Second Coffee',
  'Last Train',
  'Between Pages',
  'Postcard',
  'Bicycle',
  'Rooftop',
  'Before Closing',
  'While Waiting',
  'Slow Steps',
  'Small Room',
  'Old Cinema',
  'Back of the Bus',
  'In My Pocket',
  'First Day Away',
  'Coming Back',
  'Saturday Night',
  'Early Monday',
  'Cold Tea',
  'Open Window',
  'Far Lights',
  'Wet Shoes',
  'Buying Flowers',
  'One More Song',
  'Scribbles',
  'Empty Chair',
] as const

/** 색상(0–360)·채도·밝기에서 이름표를 고른다 */
export function toneOf(r: number, g: number, b: number): Tone {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 510
  const d = max - min
  const s = d === 0 ? 0 : d / (255 * (1 - Math.abs(2 * l - 1)))

  if (l < 0.1 || (l < 0.24 && s < 0.3)) return 'black'
  if (d < 20 || s < 0.1) return l > 0.8 ? 'white' : l < 0.3 ? 'black' : 'gray'

  let h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4
  h = (h * 60 + 360) % 360

  if (h >= 10 && h < 50 && l > 0.62 && s < 0.6) return 'white'
  if (h >= 12 && h < 48 && l < 0.42) return 'brown'
  if (h < 14 || h >= 345) return 'red'
  if (h < 40) return 'orange'
  if (h < 66) return 'yellow'
  if (h < 165) return 'green'
  if (h < 212) return 'sky'
  if (h < 255) return 'blue'
  if (h < 300) return 'purple'
  return 'pink'
}

/** 32비트 hash. 이름이 매번 같은 사진에서 같게 나오게 한다 */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * 쓰지 않은 이름 하나. `turn` 을 올리면 다른 이름이 나온다(「다시 짓기」).
 * 다 쓰면 숫자를 붙인다 — 이름이 모자라 등록이 막히면 안 된다.
 */
export function nameFor(
  tones: Tone[],
  seed: string,
  taken: ReadonlySet<string>,
  turn = 0
): string {
  const from: Tone[] = tones.length > 0 ? tones : ['gray']
  const weathers = from.flatMap((t) => WEATHER[t])
  const total = weathers.length * MOMENT.length
  const start = hash(seed) % total
  // 서로소 걸음이라 모든 조합을 한 번씩 지난다
  let step = 7919 % total
  while (gcd(step, total) !== 1) step += 1

  let skip = turn
  for (let i = 0; i < total; i++) {
    const n = (start + i * step) % total
    const name = `${weathers[n % weathers.length]}, ${MOMENT[Math.floor(n / weathers.length)]}`
    if (taken.has(name)) continue
    if (skip === 0) return name
    skip -= 1
  }
  let n = 2
  const base = `${weathers[start % weathers.length]}, ${MOMENT[start % MOMENT.length]}`
  while (taken.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/**
 * 사진에서 물건의 색을 고른다. **바탕은 가장자리 색과 비슷한 것으로 보고 뺀다** —
 * 흰 종이에 놓고 찍는다. 많이 보이는 색이 먼저다.
 */
export function tonesOf(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): Tone[] {
  const at = (x: number, y: number) => (y * width + x) * 4
  const edge = [0, 0, 0]
  let n = 0
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = at(x, y)
      for (let k = 0; k < 3; k++) edge[k] += pixels[i + k]
      n += 1
    }
  }
  for (let k = 0; k < 3; k++) edge[k] /= n

  // 어두운 방에서 찍으면 종이도 물건도 어둡다. **종이가 흰색이 되게** 맞춘 뒤 본다
  const gain = edge.map((v) => Math.min(238 / Math.max(v, 1), 2.2))

  const counts = new Map<Tone, number>()
  let kept = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y)
      const [r, g, b] = gain.map((k, c) => Math.min(255, pixels[i + c] * k))
      const max = Math.max(r, g, b)
      const chroma = max - Math.min(r, g, b)
      // 종이와 그 그림자는 밝기만 다르고 색이 없다
      if (chroma < 26 && max > 70) continue
      const tone = toneOf(r, g, b)
      // 검은 비즈는 어디에나 있다. 그 사이의 색이 그 물건의 얼굴이다
      const weight = tone === 'black' ? 1 : 2
      counts.set(tone, (counts.get(tone) ?? 0) + weight)
      kept += weight
    }
  }

  return [...counts]
    .filter(([, count]) => count / Math.max(kept, 1) > 0.14)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tone]) => tone)
}
