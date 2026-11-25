/** 선 굵기 2, 둥근 끝. 일러스트 윤곽선과 같은 성격으로 맞춘다 */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function BagIcon() {
  return (
    <Svg>
      <path d="M5 8h14l1 12H4L5 8Z" />
      <path d="M9 10.5V7a3 3 0 0 1 6 0v3.5" />
    </Svg>
  )
}

export function PersonIcon() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-4 3.7-6 7.5-6s6.7 2 7.5 6" />
    </Svg>
  )
}

export function PlusIcon() {
  return (
    <Svg>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon() {
  return (
    <Svg>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function ChevronIcon() {
  return (
    <Svg>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}
