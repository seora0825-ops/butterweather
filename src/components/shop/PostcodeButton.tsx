'use client'

import { useState } from 'react'
import { button } from './button'

/**
 * 우편번호 찾기. **카카오(옛 다음) 우편번호 서비스**를 띄운다. API 키가 없다
 * (https://postcode.map.kakao.com/guide). 옛 저장소의 것을 옮겼다.
 *
 * ⚠️ 이름이 `daum.Postcode` 가 아니라 **`kakao.Postcode`** 다. 인터넷 예제는
 * 대부분 옛 이름이다.
 *
 * **스크립트를 미리 싣지 않는다.** 누를 때 한 번만 받는다.
 */
const SRC =
  'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

type PostcodeResult = {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
  userSelectedType: 'R' | 'J'
}

declare global {
  interface Window {
    kakao?: {
      Postcode: new (options: {
        oncomplete: (data: PostcodeResult) => void
      }) => { open: () => void }
    }
  }
}

function loadScript(): Promise<void> {
  if (window.kakao?.Postcode) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      // 실패한 것을 남겨 두면 다시 눌러도 받지 않는다
      el.remove()
      reject(new Error('postcode'))
    }
    document.head.appendChild(el)
  })
}

export default function PostcodeButton({
  onSelect,
}: {
  onSelect: (value: { zipcode: string; address: string }) => void
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function open() {
    setBusy(true)
    setFailed(false)
    try {
      await loadScript()
      new window.kakao!.Postcode({
        oncomplete: (data) => {
          // 손님이 고른 쪽(도로명·지번)을 그대로 쓴다
          const base =
            data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress
          onSelect({
            zipcode: data.zonecode,
            address: data.buildingName
              ? `${base} (${data.buildingName})`
              : base,
          })
        },
      }).open()
    } catch {
      // 못 받았으면 손으로 쓰면 된다. 주소 칸은 잠겨 있지 않다
      setFailed(true)
    }
    setBusy(false)
  }

  return (
    <div>
      <button type="button" onClick={open} disabled={busy} className={button()}>
        {busy ? '여는 중…' : '우편번호 찾기'}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-[15px]">
          우편번호 찾기를 열지 못했습니다. 주소를 직접 입력해 주세요.
        </p>
      )}
    </div>
  )
}
