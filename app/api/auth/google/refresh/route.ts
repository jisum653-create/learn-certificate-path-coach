import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// P1-1: Google Calendar OAuth — 액세스 토큰 자동 갱신 (리프레시 토큰 사용)
// 요청: google_calendar_token httpOnly 쿠키 (OAuth 완료 후 저장된 토큰 JSON)
// 응답:
//   성공: { refreshed: true, email?: string, expiresIn?: number }
//   실패: { refreshed: false, error: string }

export async function POST(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { refreshed: false, error: 'Google Calendar OAuth 환경변수 설정 오류' },
      { status: 503 }
    )
  }

  // 1. 저장된 토큰 쿠키 읽기
  const tokenCookie = req.cookies.get('google_calendar_token')?.value
  if (!tokenCookie) {
    return NextResponse.json({
      refreshed: false,
      error: 'Google Calendar 토큰이 없어요. 먼저 캘린더 연결하기를 진행해 주세요.',
    })
  }

  // 2. 토큰 JSON 파싱
  let tokenPayload: {
    access_token?: string
    refresh_token?: string | null
    token_type?: string
    expiry?: string
    scope?: string
  } | null = null

  try {
    tokenPayload = JSON.parse(tokenCookie)
  } catch {
    return NextResponse.json({
      refreshed: false,
      error: '저장된 토큰 형식이 올바르지 않아요. 캘린더 연결을 다시 해 주세요.',
    })
  }

  // 3. 리프레시 토큰 존재 확인
  if (!tokenPayload?.refresh_token) {
    return NextResponse.json({
      refreshed: false,
      error: '리프레시 토큰이 없어요. 캘린더 연결하기를 다시 진행해 주세요.',
    })
  }

  // 4. 리프레시 토큰으로 새 액세스 토큰 요청
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({
    refresh_token: tokenPayload.refresh_token,
    token_type: tokenPayload.token_type ?? 'Bearer',
  })

  let newTokens: any = null

  try {
    // getAccessToken()은refresh_token으로 새 액세스 토큰을取得 (리프레시 토큰 자체는 유지)
    newTokens = await oauth2Client.getAccessToken()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '토큰 갱신 실패'
    console.error('[Google OAuth] 토큰 갱신 오류:', message)

    const isRefreshFailure =
      message.includes('invalid_grant') ||
      message.includes('Invalid_grant') ||
      message.includes('400') &&
      message.includes('refresh_token')

    return NextResponse.json({
      refreshed: false,
      error: isRefreshFailure
        ? 'Google 계정 연결이 만료됐어요. 캘린더 연결하기를 다시 진행해 주세요. (리프레시 토큰이 만료됨)'
        : 'Google Calendar 연결 갱신 중 오류가 발생했어요: ' + message,
    })
  }

  if (!newTokens?.access_token) {
    return NextResponse.json({
      refreshed: false,
      error: 'Google Calendar 연결 갱신 결과가 불완전해요. 다시 시도해 주세요.',
    })
  }

  // 5. 갱신된 토큰으로 쿠키 업데이트
  const updatedPayload = {
    access_token: newTokens.access_token,
    // 기존 리프레시 토큰 유지 (보통 리프레시 토큰도 같이 갱신되지만,
    // getAccessToken() 호출 시refresh_token 필드가 갱신되지 않을 수 있음 —
    // 안전하게 기존 값 유지, 없으면 null)
    refresh_token: tokenPayload.refresh_token,
    token_type: newTokens.token_type ?? 'Bearer',
    expiry: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : null,
    scope: newTokens.scope ?? tokenPayload.scope ?? '',
  }

  const updatedJson = JSON.stringify(updatedPayload)
  const response = NextResponse.json({
    refreshed: true,
    expiresIn: newTokens.expiry_date ? Math.round((newTokens.expiry_date - Date.now()) / 1000) : null,
  })

  // 기존 토큰 쿠키를 갱신된 값으로 덮어씀 (동일 이름, 동일 path)
  response.cookies.set('google_calendar_token', updatedJson, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1년 (리프레시 토큰 기반 갱신이 계속 가능하므로 긴 만료)
    path: '/',
  })

  // 6. 갱신된 토큰으로 실제 계정 연결 확인 (이메일 반환)
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    // setCredentials는 이미 위에서 했으므로 재사용 가능
    oauth2Client.setCredentials({
      access_token: newTokens.access_token,
      refresh_token: tokenPayload.refresh_token,
      token_type: newTokens.token_type ?? 'Bearer',
    })
    const { data } = await oauth2.userinfo.get()
    response.headers.set('x-google-email', data?.email ?? '')
    return response
  } catch {
    // userinfo 조회 실패해도 토큰 갱신은 성공이므로 기본 응답 반환
    return response
  }
}

// 연결 상태 확인용 GET (프론트에서 현재 토큰 만료 여부 확인용)
// POST /api/auth/google/refresh 실행 전에 프론트가 미리 만료 여부 확인할 때 사용
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ connected: false, error: '환경변수 오류' }, { status: 503 })
  }

  const tokenCookie = req.cookies.get('google_calendar_token')?.value

  if (!tokenCookie) {
    return NextResponse.json({ connected: false, expired: null })
  }

  let tokenPayload: { access_token?: string; refresh_token?: string | null; expiry?: string } | null = null
  try {
    tokenPayload = JSON.parse(tokenCookie)
  } catch {
    return NextResponse.json({ connected: false, expired: null, error: '토큰 형식 오류' })
  }

  if (!tokenPayload?.access_token) {
    return NextResponse.json({ connected: false, expired: null })
  }

  // 만료 확인
  const now = Date.now()
  if (tokenPayload.expiry) {
    const expiryMs = new Date(tokenPayload.expiry).getTime()
    if (expiryMs <= now) {
      // 만료됨 — 리프레시 토큰 있으면 갱신 가능 상태로 표시
      return NextResponse.json({
        connected: false,
        expired: true,
        canRefresh: tokenPayload.refresh_token !== undefined && tokenPayload.refresh_token !== null,
        expiresIn: 0,
      })
    }
    // 만료 임박 여유 시간 (초)
    const remaining = Math.round((expiryMs - now) / 1000)
    // 5분 이내면 곧 만료 예정 — 재연결 또는 갱신 권장 표시
    return NextResponse.json({
      connected: true,
      expired: false,
      expiresIn: remaining,
      soonExpired: remaining < 300,
    })
  }

  // 만료 정보 없으면 연결된 것으로 간주 (expiry_date가 없는 구형 토큰)
  return NextResponse.json({ connected: true, expired: false, expiresIn: null })
}
