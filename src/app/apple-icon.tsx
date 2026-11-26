import { ImageResponse } from 'next/og'
import { tulipDataUri } from '@/lib/shareImage'

/** 휴대폰 홈 화면에 추가했을 때의 아이콘. 탭의 작은 아이콘은 layout 의 SVG */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const tulip = await tulipDataUri()
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7f7f7',
      }}
    >
      <img src={tulip} width={151} height={180} alt="" />
    </div>,
    size
  )
}
