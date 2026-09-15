import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// P1-1: Google Calendar OAuth — 동의 화면으로 리디렉션
// 환경변수: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// 쿠키: google_calendar_token (httpOnly, secure, sameSite=Lax) — 액세스+리프레시 토큰 저장
// 쿠키: google_calendar_state (httpOnly, secure, sameSite=Lax) — state 파라미터 저장 (CSRF 방지)

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  // 환경변수 누락 시 조기 실패
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error: 'Google Calendar OAuth 환경변수가 설정되지 않았어요. 관리자에게 문의해 주세요.',
        detail: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI가 모두 필요합니다.',
      },
      { status: 503 }
    )
  }

  // 상태 파라미터 생성 (CSRF 방지) — 16바이트 랜덤, 16진수
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('hex')
  const stateCookie = req.cookies.get('google_calendar_state')?.value
  // 이미 state가 있으면 재사용 (연속 요청 시 일관성)
  const effectiveState = stateCookie || state

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
  ]

  // Google OAuth 동의 화면 URL 생성
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  oauthUrl.searchParams.set('client_id', clientId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('scope', scopes.join(' '))
  oauthUrl.searchParams.set('access_type', 'offline') // 리프레시 토큰 얻기 위해 필요
  oauthUrl.searchParams.set('prompt', 'consent') // 매 세션마다 동의 화면 표시 — 명확한 흐름 위해
  oauthUrl.searchParams.set('state', effectiveState)
  oauthUrl.searchParams.set('ux_mode', 'redirect') // 기본 리디렉션 모드

  const response = NextResponse.redirect(oauthUrl.toString(), 302)

  // state를 httpOnly 쿠키에 저장 ( 콜백에서 검증용 )
  // 쿠키는 같은 site에서만 접근 가능하므로 CSRF 방어에 유효
  response.cookies.set('google_calendar_state', effectiveState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10분 — OAuth 흐름 안에 쓰임
    path: '/',
  })

  return response
}
