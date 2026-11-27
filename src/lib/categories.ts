import type { ProductCategory } from '@/types/product'

/**
 * 카테고리의 얼굴 — **단색 보드 하나와 무늬 하나.**
 *
 * 나래의 피그마에 있는 두 가지를 짝지었다. 왼쪽 아래에 흰 글자를 굵게 놓은
 * 단색 보드(`BUTTER WEATHER`)와, 더 쨍하게 다시 칠한 무늬
 * (`public/illustrations/figma/README.md`). 새로 고른 색은 없다.
 * **어느 짝이 어느 카테고리인지는 임시이고, 바꿀 때는 이 표만 고친다.**
 */
export interface Category {
  id: ProductCategory
  label: string
  /** 단색 보드. Tailwind class 라 통째로 적는다 */
  board: string
  pattern: string
}

/** 형태마다 하나. 화면의 순서이기도 하다 */
export const ALL_CATEGORIES: (Category & { hidden?: boolean })[] = [
  {
    id: 'bracelet',
    label: '팔찌',
    board: 'bg-board-purple',
    pattern: '/illustrations/figma/flower-green.svg',
  },
  {
    id: 'necklace',
    label: '목걸이',
    board: 'bg-board-blue',
    pattern: '/illustrations/figma/berry-orange.svg',
  },
  {
    id: 'ring',
    label: '반지',
    board: 'bg-board-orange',
    pattern: '/illustrations/figma/scribble-purple.svg',
  },
  {
    // 2026-11-27 다시 판다 — 하나 5,000원, 매대에서는 뚜껑 연 상자에 쌓는다
    id: 'keyring',
    label: '키링',
    board: 'bg-board-ink',
    pattern: '/illustrations/figma/tulip-sky.svg',
  },
]

/** 가게 화면에 보이는 것. 메뉴·첫 화면 타일·Footer 가 이것을 쓴다 */
export const CATEGORIES: Category[] = ALL_CATEGORIES.filter((c) => !c.hidden)

export function findCategory(id: string): Category | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id)
}
