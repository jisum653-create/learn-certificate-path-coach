import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// P1-1: Google Calendar OAuth — 연결 상태 확인 (GET)
// 프론트에서 "Google Calendar가 연결됐는지" 확인할 때 사용
// 응답: { connected: boolean, email?: string, error?: string }

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { connected: false, error: 'Google Calendar OAuth 환경변수 설정 오류' },
      { status: 503 }
    )
  }

  const tokenCookie = req.cookies.get('google_calendar_token')?.value

  if (!tokenCookie) {
    return NextResponse.json({ connected: false })
  }

  let tokenPayload: { access_token?: string; expiry?: string; scope?: string } | null = null
  try {
    tokenPayload = JSON.parse(tokenCookie)
  } catch {
    return NextResponse.json({ connected: false, error: '저장된 토큰 형식이 올바르지 않아요.' })
  }

  if (!tokenPayload?.access_token) {
    return NextResponse.json({ connected: false })
  }

  // 만료 확인 — 만료됐으면 false 반환 (실제 갱신 필요 시 별도 갱신 라우트 필요,
  // 현재 구현은 만료 전 접속 시에만 connected=true)
  if (tokenPayload.expiry) {
    const expiryDate = new Date(tokenPayload.expiry)
    if (expiryDate.getTime() <= Date.now()) {
      return NextResponse.json({ connected: false, expired: true })
    }
  }

  // 액세스 토큰으로 사용자 이메일 확인 (연결된 계정 식별용)
  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({
      access_token: tokenPayload.access_token,
    })

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()
    return NextResponse.json({
      connected: true,
      email: data?.email ?? null,
      scope: tokenPayload.scope ?? null,
    })
  } catch {
    // 토큰은 있지만 API 호출 실패 (만료 또는 권한 문제) — 안전하게 connected=false
    return NextResponse.json({ connected: false, error: '연결 상태 확인 중 오류가 발생했어요.' })
  }
}
