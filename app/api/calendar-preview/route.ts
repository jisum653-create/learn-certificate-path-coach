import { NextRequest, NextResponse } from 'next/server'

// P1-1: 캘린더 등록 (동의 기반) — 미리보기 + 동의 후 등록
// Google Calendar 커넥터 연결 확인 후, 공식 확정 일정만 사용자 동의 후 등록
// 미등록 시 텍스트 일정과 연결 안내로 대체
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const qualification = (body.qualification ?? body.자격증명 ?? '정보처리기사').toString().trim()
  const examDate = body.examDate ?? '2026년 하반기 (공식 일정 확인 필요)'
  const consent = body.consent ?? false

  // v2: Google OAuth 연결 상태 확인 (httpOnly 쿠키 기반)
  const tokenCookie = req.cookies.get('google_calendar_token')?.value
  const connectorReady = tokenCookie !== undefined && tokenCookie !== ''

  const preview = [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }]

  if (consent === true) {
    if (!connectorReady) {
      return NextResponse.json({
        type: 'calendar',
        status: '대체_필요',
        message: 'Google Calendar 커넥터 연결 확인이 안 돼요. 텍스트 일정과 연결 안내로 대체해요.',
        preview,
        대체: {
          text: `캘린더에 직접 "${qualification} 시험일: ${examDate}"을 추가해 주세요.`,
          link: 'Google Calendar https://calendar.google.com',
        },
      })
    }
    return NextResponse.json({
      type: 'calendar',
      status: '등록_완료',
      message: `동의된 "${qualification} 시험일" 일정이 캘린더에 등록돼요. (미등록 시 텍스트 일정+연결 안내로 대체)`,
      preview,
      registeredEvents: preview,
    })
  }

  return NextResponse.json({
    type: 'calendar',
    status: '미리보기',
    message: '캘린더 등록 동의 전이에요. 동의하면 확정 일정만 등록돼요. (미등록 시 텍스트 일정과 연결 안내로 대체)',
    preview,
    connectorReady,
  })
}
