import type { NextConfig } from 'next'
import path from 'path'

/**
 * Supabase Storage 호스트를 **환경변수에서 읽는다.**
 *
 * 옛 저장소는 프로젝트 주소를 여기 박아두었다. 프로젝트가 바뀌면 이 파일을
 * 잊고 안 고쳐서 사진이 전부 깨진다 — 실제로 M0 때 옛 프로젝트 주소가
 * 남아 있었다(roadmap M0). `.env.local` 과 Vercel 이 이미 들고 있는 값을
 * 다시 쓰면 한 곳만 바꾸면 된다.
 */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  // 프로젝트 루트를 이 폴더로 못박는다.
  // (홈 디렉토리에 떠돌이 lockfile이 있어서 Next.js가 루트를 헷갈리던 경고 해결)
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Supabase Storage의 이미지를 next/image로 띄우려면 호스트를 허용해야 한다.
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
}

export default nextConfig
