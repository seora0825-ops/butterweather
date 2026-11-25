import Image from 'next/image'
import Link from 'next/link'
import { button } from './button'

export default function EmptyState({
  motif,
  message,
}: {
  motif: 'watering-can' | 'blue-flower'
  message: string
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <Image
        src={`/illustrations/motif-${motif}.svg`}
        alt=""
        unoptimized
        width={120}
        height={144}
        className="h-auto"
      />
      <p>{message}</p>
      <Link href="/" className={button({ tone: 'primary' })}>
        상품 보러 가기
      </Link>
    </div>
  )
}
