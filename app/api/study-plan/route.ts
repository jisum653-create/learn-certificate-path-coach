import { NextRequest, NextResponse } from 'next/server'

// P0-4: 학습 계획·체크인·재조정 — Notion 학습 공간 + 오늘 브리핑
// Notion 연동: 사용자 localStorage의 'certCoachNotionToken' + 'certCoachNotionParentPageId' 기반
//   → POST 요청 본문에 토큰·부모 페이지 ID 포함 시 Notion API로 페이지 생성 시도
//   → 실패/미연결 시 텍스트 기반 계획 + 대체 안내 (실패 사실·반영 범위 구분)
// 인터페이스 contract (b조원 협업 가이드라인 2-2, 변경 금지):
//   Request: { profile?, qualification?, examDate?, consent?, notionToken?, notionParentPageId? }
//   Response: { type, plan, message, notionPageUrl?, 대체? }

interface PlanWeek {
  week: number
  focus: string
  hours: string
  done: boolean
}

function calcTotalWeeks(examDateRaw: string): number {
  // "2026년 하반기" 등 넓은 표현은 기본 12주
  const match = examDateRaw.match(/(\d{4})년\s*(\d{1,2})월/) ?? examDateRaw.match(/(\d{4})년/)
  if (!match) return 12
  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) : 12
  // 대략적인 시험월까지 주 수 계산 (오늘 기준)
  const examDate = new Date(year, month - 1, 15) // 월 중순 기준
  const now = new Date()
  const diffDays = Math.max(0, (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const weeks = Math.max(4, Math.ceil(diffDays / 7))
  return weeks
}

function buildPlan({
  qualification,
  examDate,
  totalWeeks,
  profile,
}: {
  qualification: string
  examDate: string
  totalWeeks: number
  profile?: Record<string, unknown>
}): {
  qualification: string
  examDate: string
  totalWeeks: number
  weeks: PlanWeek[]
  briefing: { task: string; deadline: string }
  status: string
} {
  const hours = (profile?.가용시간 as string | undefined) ?? '하루 1~2시간'
  const weeks: PlanWeek[] = Array.from({ length: totalWeeks }, (_, i) => ({
    week: i + 1,
    focus: i < Math.round(totalWeeks * 0.4)
      ? '개념 학습'
      : i < Math.round(totalWeeks * 0.65)
        ? '문제풀이'
        : i < Math.round(totalWeeks * 0.9)
          ? '기출·분석'
          : '모의고사·복습',
    hours,
    done: false,
  }))

  return {
    qualification,
    examDate,
    totalWeeks,
    weeks,
    briefing: { task: '이번 주 개념 학습 진도 확인 + 약한 부분 표시', deadline: '이번 주 일요일' },
    status: '준비중',
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Record<string, unknown> | undefined
  const qualification = (body.qualification as string | undefined) ?? '정보처리기사'
  const examDate = (body.examDate as string | undefined) ?? '2026년 하반기'
  const consent = body.consent === true

  const notionToken = (body.notionToken as string | undefined) ?? ''
  const notionParentPageId = (body.notionParentPageId as string | undefined) ?? ''

  const totalWeeks = calcTotalWeeks(examDate)
  const plan = buildPlan({ qualification, examDate, totalWeeks, profile })

  // Notion 연동: 동의 + 토큰 존재 시 실제 Notion API 호출
  if (consent && notionToken) {
    try {
      // Notion API 호출 — 부모 페이지에 "[자격증명] 학습 공간" 페이지 생성
      const notionPageUrl = await createNotionStudySpace({
        token: notionToken,
        parentPageId: notionParentPageId,
        qualification,
        examDate,
        plan,
      })

      return NextResponse.json({
        type: 'study-plan',
        plan,
        message: `학습 계획을 세웠어요. 시험일까지 총 ${totalWeeks}주, 개념→문제풀이→기출→모의고사 순이에요. 📓 Notion 학습 공간이 만들어졌어요: ${notionPageUrl}`,
        notionPageUrl,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Notion 연동 실패'
      console.error('[Notion] 학습 공간 생성 오류:', message)

      return NextResponse.json({
        type: 'study-plan',
        plan,
        message: `학습 계획을 세웠어요. 시험일까지 총 ${totalWeeks}주, 개념→문제풀이→기출→모의고사 순이에요. (Notion 학습 공간 생성은 실패했어요 — 워크스페이스 파일 대체로 안내드릴게요)`,
        대체: {
          text: `Notion 연동 중 오류가 발생했어요: ${message}\n워크스페이스 파일로 학습 공간을 대체해 드릴게요. 필요하면 나중에 Notion 연결을 다시 시도할 수 있어요.`,
        },
      })
    }
  }

  // 동의 없거나 토큰 없음 → Stub 상태 유지 (텍스트 기반 계획 + 안내)
  return NextResponse.json({
    type: 'study-plan',
    plan,
    message: `학습 계획을 세웠어요. 시험일까지 총 ${totalWeeks}주, 개념→문제풀이→기출→모의고사 순이에요. (실제 연동 시 Notion 학습 공간 생성 + 프로필 기반 맞춤 계획 포함 — Notion 연동은 P1 탭에서 진행할 수 있어요)`,
  })
}

// Notion API 호출 — 부모 페이지에 학습 공간 페이지 생성
// Notion REST API: https://api.notion.com/v1/pages
// 인증: Bearer <통합 토큰>
// 부모 페이지 ID로 페이지 생성, 제목은 "[자격증명] 학습 공간", 시험일·주차별 계획 속성 포함
async function createNotionStudySpace({
  token,
  parentPageId,
  qualification,
  examDate,
  plan,
}: {
  token: string
  parentPageId: string
  qualification: string
  examDate: string
  plan: ReturnType<typeof buildPlan>
}): Promise<string> {
  if (!parentPageId) {
    throw new Error('Notion 부모 페이지 ID가 없어요. Notion에서 학습 공간을 만들 부모 페이지 주소를 확인해 주세요.')
  }

  // Notion 페이지 생성 API 호출
  const notionUrl = 'https://api.notion.com/v1/pages'
  const title = `[${qualification}] 학습 공간`
  const examDateStr = plan.examDate

  // 주차별 계획 내용을 Notion 페이지 본문에 마크다운 형식으로 구성
  const weeksText = plan.weeks
    .map(
      (w) =>
        `**${w.week}주차** — ${w.focus} (${w.hours})\n` +
        ` - 완료 여부: ${w.done ? '완료' : '미완료'}\n`
    )
    .join('\n')

  const properties: Record<string, unknown> = {
    제목: { title: [{ text: { content: title } }] },
    시험일: { rich_text: [{ text: { content: examDateStr } }] },
    상태: { select: { name: plan.status } },
    총주차: { number: plan.totalWeeks },
  }

  // 픽업 텍스트 블록 구성 (Notion 페이지 본문)
  const children: Record<string, unknown>[] = [
    {
      object: 'block',
      type: 'heading_1',
      heading_1: { text: [{ type: 'text', text: { content: title } }] },
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        text: [
          { type: 'text', text: { content: `시험일: ${examDateStr} · 총 ${plan.totalWeeks}주 · 상태: ${plan.status}` } },
        ],
      },
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { text: [{ type: 'text', text: { content: '오늘 브리핑' } }] },
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        text: [
          { type: 'text', text: { content: `할 일: ${plan.briefing.task}\n가장 가까운 마감: ${plan.briefing.deadline}` } },
        ],
      },
    },
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { text: [{ type: 'text', text: { content: '주차별 계획' } }] },
    },
    ...plan.weeks.map((w) => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        text: [
          {
            type: 'text',
            text: {
              content: `${w.week}주차 — ${w.focus} (${w.hours}) · 완료: ${w.done ? '완료' : '미완료'}`,
            },
          },
        ],
      },
    })),
  ]

  const response = await fetch(notionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties,
      children,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    const status = response.status
    let detail = errorText.slice(0, 200)
    if (status === 401) detail = 'Notion 토큰 인증 실패 — 토큰이 유효하지 않거나 만료됐어요.'
    else if (status === 403) detail = 'Notion 권한 부족 — 통합 토큰이 이 페이지에 접근할 수 없어요.'
    else if (status === 404) detail = 'Notion 부모 페이지를 찾을 수 없어요 — 페이지 ID를 확인해 주세요.'
    else if (status >= 500) detail = 'Notion 서버 오류 — 잠시 후 다시 시도해 주세요.'
    throw new Error(detail || `Notion API 오류 (${status}): ${detail}`)
  }

  const data = (await response.json()) as { id?: string; url?: string }
  const pageId = data.id ?? ''
  const pageUrl = data.url ?? `https://www.notion.so/${pageId}`

  return pageUrl
}
