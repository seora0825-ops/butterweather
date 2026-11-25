import { MinusIcon, PlusIcon } from './icons'

/**
 * − 1 +. `min` 이 0 이면 1에서 한 번 더 줄였을 때 0 을 준다 —
 * 장바구니는 그것을 「빼기」로 받는다 (`store/cart.ts`).
 */
export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
}: {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** 화면 낭독기에 들려줄 물건 이름 */
  label: string
}) {
  return (
    <div className="border-ink inline-flex h-12 items-center rounded-full border-2">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`${label} 수량 줄이기`}
        className="disabled:text-line flex size-11 items-center justify-center"
      >
        <MinusIcon />
      </button>
      <span
        aria-live="polite"
        className="min-w-8 text-center text-base font-bold tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`${label} 수량 늘리기`}
        className="disabled:text-line flex size-11 items-center justify-center"
      >
        <PlusIcon />
      </button>
    </div>
  )
}
