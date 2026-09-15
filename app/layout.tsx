import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '자격증 패스 코치 — 합격 루트 안내',
  description: '자격증 추천·공식 일정 확인·개인화 학습 경로·진도 관리·취득 후 다음 단계까지. 처음 자격증 준비를 시작하는 분을 위한 대화형 코치 서비스입니다.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.variable} style={{ margin: 0, padding: 0, background: '#121212', color: '#ffffff', fontFamily: 'SpotifyMixUI, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, Helvetica Neue, helvetica, arial, Hiragino Sans, Hiragino Kaku Gothic ProN, Meiryo, Malgun Gothic, "Apple SD Gothic Neo", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
