/**
 * 상세의 크기 자 — **한 바퀴 둘레를 자 위에 놓는다.**
 *
 * 화면의 1cm 는 기기마다 달라 「실제 크기」를 약속할 수 없다. 그래서 자의
 * 눈금으로 길이를 읽게 한다. 줄은 비즈 줄처럼 굵은 먹선 하나다.
 *
 * 선 굵기는 화면 폭이 바뀌어도 그대로다(`non-scaling-stroke`) — 나래의
 * 그림처럼 확대해도 선은 굵어지지 않는다(CLAUDE.md 2절).
 */
export default function SizeRuler({ cm }: { cm: number }) {
  // 팔찌는 20cm 자, 목걸이처럼 길면 5cm 단위로 늘린다
  const max = Math.max(20, Math.ceil((cm + 2) / 5) * 5)
  const W = 1000
  const left = 12
  const right = W - 12
  const x = (v: number) => left + ((right - left) * v) / max
  const label = max <= 25 ? 5 : 10

  return (
    <figure className="mt-8">
      <figcaption className="text-[15px] font-semibold">
        둘레 <span className="tabular-nums">{cm}cm</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} 130`}
        role="img"
        aria-label={`한 바퀴 둘레 ${cm}센티미터`}
        className="mt-3 h-auto w-full"
      >
        {/* 줄 — 0 에서 둘레까지 */}
        <line
          x1={x(0)}
          x2={x(cm)}
          y1={22}
          y2={22}
          stroke="currentColor"
          strokeWidth={10}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={left}
          x2={right}
          y1={52}
          y2={52}
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {Array.from({ length: max + 1 }, (_, i) => (
          <line
            key={i}
            x1={x(i)}
            x2={x(i)}
            y1={52}
            y2={i % label === 0 ? 76 : i % 5 === 0 ? 68 : 62}
            stroke="currentColor"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {Array.from({ length: max / label + 1 }, (_, i) => (
          <text
            key={i}
            x={x(i * label)}
            y={122}
            textAnchor={
              i === 0 ? 'start' : i === max / label ? 'end' : 'middle'
            }
            className="fill-current text-[36px] tabular-nums"
          >
            {i * label}
          </text>
        ))}
      </svg>
    </figure>
  )
}
