import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// P1-1: Google Calendar OAuth 콜백 — 인가 코드를 토큰으로 교환 + httpOnly 쿠키 저장
// 환경변수: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// 쿠키:
//   google_calendar_state (httpOnly) — CSRF state 검증용
//   google_calendar_token (httpOnly) — 액세스+리프레시 토큰 저장 (JSON)

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: 'Google Calendar OAuth 환경변수 설정 오류', detail: '관리자에게 문의해 주세요.' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // 1. Google에서 반환된 에러 처리 (사용자가 동의 거부 등)
  if (error) {
    const errorDesc = searchParams.get('error_description') || searchParams.get('error') || '알 수 없는 OAuth 오류'
    return NextResponse.redirect(
      `${req.nextUrl.origin}/?auth_error=${encodeURIComponent(errorDesc)}`,
      302
    )
  }

  // 2. code 누락 시 에러
  if (!code) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/?auth_error=${encodeURIComponent('인가 코드가 없어요. 다시 시도해 주세요.')}`,
      302
    )
  }

  // 3. state 검증 (CSRF 방어)
  const stateCookie = req.cookies.get('google_calendar_state')?.value
  if (!state || state !== stateCookie) {
    // state 불일치 — 쿠키 정리 후 에러 리디렉션
    const response = NextResponse.redirect(
      `${req.nextUrl.origin}/?auth_error=${encodeURIComponent('보안 검증에 실패했어요. 다시 시도해 주세요.')}`,
      302
    )
    response.cookies.delete('google_calendar_state')
    response.cookies.delete('google_calendar_token')
    return response
  }

  // 4. 인가 코드를 액세스+리프레시 토큰으로 교환
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  let tokens: any = null

  try {
    tokens = await oauth2Client.getToken(code)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '토큰 교환 실패'
    console.error('[Google OAuth] 토큰 교환 오류:', message)
    return NextResponse.redirect(
      `${req.nextUrl.origin}/?auth_error=${encodeURIComponent('Google 계정 연결이 실패했어요. 다시 시도해 주세요.')}`,
      302
    )
  }

  if (!tokens || !tokens.access_token) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/?auth_error=${encodeURIComponent('Google 계정 연결 정보가 불완전해요. 다시 시도해 주세요.')}`,
      302
    )
  }

  // 5. 토큰을 httpOnly 쿠키에 저장 (JSON 직렬화)
  const tokenPayload = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    token_type: tokens.token_type ?? 'Bearer',
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    scope: tokens.scope ?? '',
  }

  const tokenJson = JSON.stringify(tokenPayload)
  const response = NextResponse.redirect(`${req.nextUrl.origin}/`, 302)

  // 기존 state 쿠키 정리
  response.cookies.delete('google_calendar_state')

  // 토큰 쿠키 설정
  response.cookies.set('google_calendar_token', tokenJson, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1년 (리프레시 토큰으로 갱신 가능하므로 긴 만료)
    path: '/',
  })

  return response
}
