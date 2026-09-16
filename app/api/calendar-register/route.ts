import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

// P1-1: Google Calendar — 사용자 동의 후 확정 일정을 실제 캘린더에 등록
// 요청 body:
//   { qualification?: string, examDate?: string, eventTime?: string,
//     eventEndTime?: string, consent?: boolean, reminder?: boolean }
// 인증: google_calendar_token httpOnly 쿠키 (OAuth 완료 후 저장됨)
// 응답:
//   동의 o + 연결 o → { status: 'registered', event: { ... } }
//   동의 o + 연결 x → { status: 'unavailable', message: '...' }
//   동의 x → { status: 'consent_needed' }

const DEFAULT_EXAM_DATE = '2026년 하반기 (공식 일정 확인 필요)'
const DEFAULT_LOCATION = '시험장 (공식 발표 시 확정)'
const DEFAULT_DESCRIPTION = '자격증 패스 코치가 확인한 공식 확정 일정이에요.\n문의: 시험 주관기관 공식 홈페이지'

function buildEvent({
  qualification,
  examDate,
  eventTime,
  eventEndTime,
}: {
  qualification: string
  examDate: string
  eventTime?: string
  eventEndTime?: string
}) {
  // 시험일 파싱: "YYYY년 MM월 DD일" 또는 "YYYY-MM-DD" 또는 "YYYY.MM.DD" 형식
  const parseExamDate = (raw: string): { year: number; month: number; day: number } | null => {
    if (!raw || raw === '공식 일정 확인 필요' || raw === DEFAULT_EXAM_DATE) return null
    let m: RegExpMatchArray | null
    if ((m = raw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/))) {
      return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
    }
    if ((m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
      return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
    }
    if ((m = raw.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/))) {
      return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
    }
    return null
  }

  const parsed = parseExamDate(examDate)
  // 시험 당일 시간 지정 가능하면 ISO 시간 사용, 없으면 파싱된 시험일 09:00-12:00
  const baseDate = parsed
    ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`
    : DEFAULT_EXAM_DATE.slice(0, 10)

  const startTime = eventTime ?? `${baseDate}T09:00:00+09:00`
  const endTime = eventEndTime ?? `${baseDate}T12:00:00+09:00`

  return {
    summary: `📝 [${qualification}] 시험일`,
    description: DEFAULT_DESCRIPTION,
    location: DEFAULT_LOCATION,
    start: {
      dateTime: startTime,
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: endTime,
      timeZone: 'Asia/Seoul',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 시험 1일 전 이메일 알림
        { method: 'popup', minutes: 60 }, // 시험 1시간 전 팝업 알림
      ],
    },
  }
}

function validateTimeWindow(examDate: string): string {
  // 극단적으로 과거 또는 먼 미래이면 경고
  if (examDate && examDate !== DEFAULT_EXAM_DATE) {
    // 간단한 연도 확인만 — 정확한 파싱은 미필요
    const match = examDate.match(/(\d{4})년/)
    if (match) {
      const year = Number(match[1])
      if (year < 2020 || year > 2030) {
        return '시험일 연도가 비정상적이에요. 캘린더에 등록하기 전에 공식 일정을 확인하세요.'
      }
    }
  }
  return ''
}

export async function POST(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { status: 'unavailable', message: 'Google Calendar OAuth 환경변수 설정 오류' },
      { status: 503 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const qualification = (body.qualification ?? body.자격증명 ?? '정보처리기사').toString().trim()
  const examDate = body.examDate?.toString() || DEFAULT_EXAM_DATE
  const consent = body.consent === true
  const reminder = body.reminder !== false

  if (!consent) {
    return NextResponse.json({
      status: 'consent_needed',
      message: '캘린더 등록 동의가 필요해요. 동의하면 확정 일정이 캘린더에 등록돼요.',
      preview: [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }],
    })
  }

  // 토큰 쿠키 확인
  const tokenCookie = req.cookies.get('google_calendar_token')?.value
  if (!tokenCookie) {
    return NextResponse.json({
      status: 'unavailable',
      message: 'Google Calendar 계정이 연결되지 않았어요. 먼저 캘린더 연결하기를 진행해 주세요.',
      preview: [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }],
    })
  }

  let tokenPayload: { access_token?: string; refresh_token?: string | null; token_type?: string; expiry?: string } | null = null
  try {
    tokenPayload = JSON.parse(tokenCookie)
  } catch {
    return NextResponse.json({
      status: 'unavailable',
      message: '저장된 연결 정보가 올바르지 않아요. 캘린더 연결을 다시 해 주세요.',
    })
  }

  if (!tokenPayload?.access_token) {
    return NextResponse.json({
      status: 'unavailable',
      message: 'Google Calendar 계정이 연결되지 않았어요. 먼저 캘린더 연결하기를 진행해 주세요.',
    })
  }

  // 시간 관련 입력 파싱
  const examTime = body.eventTime?.toString()
  const examEndTime = body.eventEndTime?.toString()

  const timeWarning = validateTimeWindow(examDate)
  if (timeWarning) {
    return NextResponse.json({
      status: 'validation_error',
      message: timeWarning,
      preview: [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }],
    })
  }

  const event = buildEvent({ qualification, examDate, eventTime: examTime, eventEndTime: examEndTime })

  // Google Calendar API 호출
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({
    access_token: tokenPayload.access_token,
    refresh_token: tokenPayload.refresh_token ?? undefined,
    token_type: tokenPayload.token_type ?? 'Bearer',
  })

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarId = 'primary' // 사용자의 기본 캘린더

    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'all', // 초대 대상자(이벤트 생성자인 본인)에게 이메일 알림 발송
    })

    return NextResponse.json({
      status: 'registered',
      message: `「${qualification}」 시험일이 캘린더에 등록됐어요. 시험 1일 전 이메일 알림이 발송돼요.`,
      event: {
        id: data.id,
        htmlLink: data.htmlLink ?? null,
        summary: data.summary,
        start: data.start?.dateTime ?? data.start?.date,
        end: data.end?.dateTime ?? data.end?.date,
      },
      preview: [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }],
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Calendar 등록 실패'

    // 토큰 만료로 인한 실패인 경우 — 클라이언트에서 재연결 유도
    const isTokenError =
      message.includes('401') ||
      message.includes('403') ||
      message.includes('invalid_grant') ||
      message.includes('Invalid Credentials')

    return NextResponse.json({
      status: isTokenError ? 'token_expired' : 'register_failed',
      message:
        isTokenError
          ? 'Google Calendar 연결이 만료됐어요. 캘린더 연결하기를 다시 진행해 주세요.'
          : `캘린더 등록 중 오류가 발생했어요: ${message}`,
      preview: [{ title: `[${qualification}] 시험일`, date: examDate, note: '공식 확정 일정만 등록 대상' }],
    })
  }
}

// 연결 상태 확인용 GET (프론트 커넥터 상태 표시에 사용)
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json({ connectorReady: false, error: '환경변수 오류' }, { status: 503 })
  }

  const tokenCookie = req.cookies.get('google_calendar_token')?.value

  if (!tokenCookie) {
    return NextResponse.json({ connectorReady: false })
  }

  let tokenPayload: { access_token?: string; expiry?: string; scope?: string } | null = null
  try {
    tokenPayload = JSON.parse(tokenCookie)
  } catch {
    return NextResponse.json({ connectorReady: false, error: '토큰 형식 오류' })
  }

  if (!tokenPayload?.access_token) {
    return NextResponse.json({ connectorReady: false })
  }

  // 만료 확인
  if (tokenPayload.expiry) {
    const expiryDate = new Date(tokenPayload.expiry)
    if (expiryDate.getTime() <= Date.now()) {
      return NextResponse.json({ connectorReady: false, expired: true })
    }
  }

  // API 호출로 실제 연결 상태 확인
  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({
      access_token: tokenPayload.access_token,
    })

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()

    return NextResponse.json({
      connectorReady: true,
      email: data?.email ?? null,
      scope: tokenPayload.scope ?? null,
    })
  } catch {
    return NextResponse.json({ connectorReady: false, error: '연결 확인 실패' })
  }
}
