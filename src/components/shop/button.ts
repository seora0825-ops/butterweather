import { cva } from 'class-variance-authority'

/**
 * 버튼과 버튼처럼 생긴 link 가 같이 쓰는 모양.
 *
 * 굵은 먹선과 둥근 끝은 이나래 일러스트의 윤곽선에서 왔다. `primary` 는
 * **한 화면에 하나**다 — butter 는 그 자리의 색이다.
 */
export const button = cva(
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-ink px-6 text-base font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-ink-muted aria-disabled:cursor-not-allowed aria-disabled:border-line aria-disabled:bg-transparent aria-disabled:text-ink-muted',
  {
    variants: {
      tone: {
        primary: 'bg-butter text-ink hover:bg-ink hover:text-cloud',
        solid: 'bg-ink text-cloud hover:bg-cloud hover:text-ink',
        outline: 'bg-transparent text-ink hover:bg-ink hover:text-cloud',
      },
      size: {
        md: '',
        sm: 'min-h-11 px-4 text-[15px]',
        full: 'w-full',
      },
    },
    defaultVariants: { tone: 'outline', size: 'md' },
  }
)
