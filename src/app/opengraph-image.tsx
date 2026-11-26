import { ImageResponse } from 'next/og'
import { pretendardExtraBold, tulipDataUri } from '@/lib/shareImage'

/**
 * 카카오톡·인스타그램에 주소를 붙였을 때 뜨는 그림. 상품 상세는 상품
 * 사진을 쓰고(products/[slug]), 나머지 화면은 이것을 쓴다.
 *
 * 화면과 같은 틀 — `cloud` 바탕, 먹선 한 줄, 로고 한 장. 새 색은 없다.
 */
export const alt = '버터웨더 — 나의 하루에 부드럽게 스며드는 작은 온기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const [tulip, font] = await Promise.all([
    tulipDataUri(),
    pretendardExtraBold(),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        background: '#f7f7f7',
        color: '#1a1a1a',
        borderBottom: '12px solid #1a1a1a',
      }}
    >
      {/* 로고 안에 이름이 이미 쓰여 있어 이름을 따로 적지 않는다.
            카카오가 정사각으로 잘라도 로고가 가운데 남는다 */}
      <img src={tulip} width={352} height={420} alt="" />
      {font && (
        <div style={{ fontSize: 40, fontFamily: 'Pretendard' }}>
          나의 하루에 부드럽게 스며드는 작은 온기
        </div>
      )}
    </div>,
    {
      ...size,
      fonts: font
        ? [{ name: 'Pretendard', data: font, weight: 800, style: 'normal' }]
        : [],
    }
  )
}
