import Image from 'next/image'
import Link from 'next/link'
import { button } from '@/components/shop/button'

export default function ShopNotFound() {
  return (
    <main
      id="main"
      className="flex flex-col items-center gap-6 px-4 py-16 text-center"
    >
      <Image
        src="/illustrations/motif-cloud-rainbow.svg"
        alt=""
        width={234}
        height={279}
        unoptimized
        className="w-44"
      />
      <h1 className="text-2xl font-extrabold tracking-tight">
        찾을 수 없는 화면입니다
      </h1>
      <p className="text-base">상품이 내려갔거나 주소가 바뀌었습니다.</p>
      <Link href="/" className={button({ tone: 'primary' })}>
        상품 보러 가기
      </Link>
    </main>
  )
}
