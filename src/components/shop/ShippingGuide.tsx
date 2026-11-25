import { FREE_SHIPPING_OVER_KRW, SHIPPING_FEE_KRW } from '@/lib/shipping'
import { ChevronIcon } from './icons'

/**
 * 배송·교환 안내. **지어낸 값이 아니다** — 옛 상세 화면(`ProductTabs`)에
 * 걸려 있던 것을 옮겼고, 약관(`/terms`)과 같은 말을 한다. 배송비 숫자는
 * `lib/shipping.ts` 에서만 읽는다.
 */
const BLOCKS = [
  {
    title: '배송',
    rows: [
      ['방법', '택배'],
      [
        '배송비',
        `${SHIPPING_FEE_KRW.toLocaleString('ko-KR')}원 (${FREE_SHIPPING_OVER_KRW.toLocaleString('ko-KR')}원 이상 무료)`,
      ],
      ['기간', '결제 확인 후 2~5일 이내 출고'],
    ],
  },
  {
    title: '교환·반품',
    rows: [
      ['신청 기간', '상품 수령 후 7일 이내'],
      ['배송비', '단순 변심 시 왕복 배송비 고객 부담'],
      ['불가 사유', '착용·사용 흔적이 있거나 포장이 훼손된 경우'],
    ],
  },
]

export default function ShippingGuide() {
  return (
    <div className="border-ink mt-10 border-t-2">
      {BLOCKS.map((block) => (
        <details key={block.title} className="group border-ink border-b-2">
          <summary className="flex min-h-14 list-none items-center justify-between text-base font-bold [&::-webkit-details-marker]:hidden">
            {block.title}
            <span className="transition-transform duration-200 group-open:rotate-180">
              <ChevronIcon />
            </span>
          </summary>
          <dl className="pb-5">
            {block.rows.map(([k, v]) => (
              <div key={k} className="flex gap-4 py-1.5 text-[15px]">
                <dt className="text-ink-muted w-20 shrink-0">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            {block.title === '교환·반품' && (
              <p className="text-ink-muted pt-2 text-[15px] leading-relaxed">
                핸드메이드 특성상 색상·크기에 미세한 차이가 있을 수 있으며, 이는
                교환·반품 사유에 해당하지 않습니다.
              </p>
            )}
          </dl>
        </details>
      ))}
    </div>
  )
}
