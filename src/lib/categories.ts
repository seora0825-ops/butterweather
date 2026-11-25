import type { ProductCategory } from '@/types/product'

/**
 * 카테고리마다 그림 두 장 — **모티프 하나와 무늬 하나.**
 *
 * 짝은 이나래의 원본 시트(`docs/brand/references/narae-illustrations-2025.png`)
 * 에서 **나란히 놓인 순서 그대로** 가져왔다. 새로 고른 조합이 아니다.
 * 어느 짝이 어느 카테고리인지는 임시이고, 바꿀 때는 이 표만 고친다.
 */
export interface Category {
  id: ProductCategory
  label: string
  motif: string
  pattern: string
}

export const CATEGORIES: Category[] = [
  {
    id: 'keyring',
    label: '키링',
    motif: '/illustrations/motif-cloud-rainbow.svg',
    pattern: '/illustrations/pattern-berry-branch.svg',
  },
  {
    id: 'bracelet',
    label: '팔찌',
    motif: '/illustrations/motif-umbrella.svg',
    pattern: '/illustrations/pattern-blue-flower.svg',
  },
  {
    id: 'necklace',
    label: '목걸이',
    motif: '/illustrations/motif-sun.svg',
    pattern: '/illustrations/pattern-clover.svg',
  },
]

export function findCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}
