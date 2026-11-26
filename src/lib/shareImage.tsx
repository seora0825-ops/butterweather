import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * 공유 미리보기·홈 화면 아이콘이 같이 쓰는 재료.
 *
 * 로고 자리는 Header 와 같은 튤립 워드마크 **한 장을 통째로** 놓는다
 * (foundation.md 5-11절). 원본 파일을 읽기만 하고 고치지 않는다.
 */
export async function tulipDataUri() {
  const svg = await readFile(
    join(process.cwd(), 'public/illustrations/motif-tulip-wordmark.svg')
  )
  return `data:image/svg+xml;base64,${svg.toString('base64')}`
}

/**
 * Pretendard ExtraBold. 이미지를 만드는 satori 는 woff2 를 읽지 못해
 * (`public/fonts` 는 woff2 다) **build 때 한 번** woff 를 받아 온다.
 * 못 받으면 null — 그때는 한글 없이 영문만 그린다.
 */
export async function pretendardExtraBold(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff/Pretendard-ExtraBold.woff'
    )
    return res.ok ? await res.arrayBuffer() : null
  } catch {
    return null
  }
}
