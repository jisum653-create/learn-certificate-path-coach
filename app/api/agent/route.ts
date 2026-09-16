// === Solar Pro 4 챗봇 에이전트 라우트 ===
// 사용자 발화를 이해해서 필요한 기능(추천/일정/학습계획)을 도구로 선택·실행하고
// 답변 문장과 구조화된 결과(action/qualification/data/profileUpdate)를 함께 반환한다.
// API 키·모델명은 서버 환경변수/상수에서만 다루며 코드·화면에 노출하지 않는다.

import { NextRequest, NextResponse } from 'next/server'
import { Profile, recommend, RecommendationCandidate } from '../../lib/recommend'
import { getQualificationSchedule, ScheduleItem } from '../../lib/qualification-extract'
import { QUALIFICATION_URLS, QUALIFICATION_DETAIL_URLS } from '../../lib/reference-data'
import { SOLAR_TOOLS, executeTool } from '../../lib/solar-agent-tools'

const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY
const UPSTAGE_API_URL = 'https://api.upstage.ai/v1/chat/completions'
const SOLAR_MODEL = 'solar-pro4'

// ===== Solar 호출 =====
type SolarMessage = { role: string; content: string; tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }>; tool_call_id?: string }

async function callSolar(messages: SolarMessage[], tools?: typeof SOLAR_TOOLS) {
  if (!UPSTAGE_API_KEY) {
    throw new Error('UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.')
  }

  const res = await fetch(UPSTAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${UPSTAGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: SOLAR_MODEL,
      messages: messages.map((m) => ({
        role: m.role === 'tool' ? 'tool' : m.role,
        content: m.content,
        ...(m.role === 'assistant' && m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.role === 'tool' && m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
      ...(tools ? { tools } : {}),
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Solar API HTTP ${res.status}: ${res.statusText}${errText ? ' — ' + errText : ''}`)
  }

  const data = (await res.json()) as {
    choices: Array<{
      message?: {
        content?: string
        tool_calls?: Array<{
          id?: string
          type?: string
          function?: { name?: string; arguments?: string }
        }>
      }
    }>
  }

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Solar 응답이 비어 있습니다.')
  }

  return data
}

// ===== 도구 호출 결과 캐시 =====
interface ToolCallRecord {
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  result: { ok: boolean; result?: unknown; error?: string }
}

// ===== Solar 메시지 → 도구 호출 기록 추출 =====
function extractAssistantToolCalls(choice: { message?: { content?: string; tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }> } } | undefined): Array<{ id: string; name: string; args: Record<string, unknown> }> {
  if (!choice?.message?.tool_calls) return []
  const calls: Array<{ id: string; name: string; args: Record<string, unknown> }> = []
  for (const tc of choice.message.tool_calls) {
    if (tc.type !== 'function') continue
    const name = tc.function?.name
    const argsText = tc.function?.arguments
    const id = tc.id || ''
    if (!name || !argsText) continue
    try {
      calls.push({ id, name, args: JSON.parse(argsText) })
    } catch {
      // Solar가 도구 호출을 했지만 arguments가 JSON이 아니면 건너뛴다
    }
  }
  return calls
}

// ===== 답변에서 액션·자격증명 추론 =====
function inferActionFromAnswer(answer: string, toolNamesUsed: string[], originalMessage: string): string {
  if (toolNamesUsed.includes('자격증서일정조회')) return 'schedule'
  if (toolNamesUsed.includes('학습계획생성')) return 'study-plan'
  if (toolNamesUsed.includes('자격증서추천')) return 'recommend'
  const lower = answer.toLowerCase()
  if (/일정|시험일|접수|응시료|시험 일정/i.test(answer)) return 'schedule'
  if (/학습 계획|공부 계획|준비 계획|주차|주차별|학습계획/i.test(answer)) return 'study-plan'
  if (/추천|자격증 추천|뭐부터|어떤 자격증|자격증을 추천/i.test(answer)) return 'recommend'
  return 'reply'
}

function extractQualificationFromAnswer(answer: string): string | null {
  const keys = Object.keys(QUALIFICATION_URLS)
  for (const key of keys) {
    if (answer.includes(key)) return key
  }
  return null
}

function extractProfileUpdateFromAnswer(answer: string, currentProfile: Profile): Record<string, unknown> | null {
  // Solar가 답변에서 profile 갱신을 제안하는 경우를 Parsing
  const lower = answer.toLowerCase()
  const update: Record<string, unknown> = {}

  if (/진로\s*[:\s]+(.+)/i.test(answer) && !currentProfile.진로) {
    const m = answer.match(/진로\s*[:\s]+(.+)/i)
    if (m) update.진로 = m[1].trim()
  }
  if (/학습 방식\s*[:\s]+(.+)/i.test(answer) && !currentProfile.학습방식) {
    const m = answer.match(/학습 방식\s*[:\s]+(.+)/i)
    if (m) update.학습방식 = m[1].trim()
  }
  if (/가용 시간\s*[:\s]+(.+)/i.test(answer) && !currentProfile.가용시간) {
    const m = answer.match(/가용 시간\s*[:\s]+(.+)/i)
    if (m) update.가용시간 = m[1].trim()
  }
  if (Object.keys(update).length === 0) return null
  return update
}

// ===== 규칙 기반 폴백 (API 실패 시) =====
async function fallbackResponse(userMessage: string, profile: Profile | undefined): Promise<{
  message: string
  action: string
  qualification: string | null
  data: Record<string, unknown> | null
  profileUpdate: Record<string, unknown> | null
  error: string
}> {
  const hasProfile = profile && Object.keys(profile).length > 0

  // 1. 일정 질문이면 → 일정 조회
  if (/일정|시험일|접수|응시료/i.test(userMessage)) {
    const qualification = extractQualificationFromAnswer(userMessage) ?? '정보처리기사'
    if (!QUALIFICATION_URLS[qualification]) {
      return {
        message: `자격증명을 정확히 확인해 주세요. 입력하신 "${qualification}"은(는) 공식 목록에 없어요. 그래도 규칙 기반으로 가장 비슷한 정보를 찾아볼게요.`,
        action: 'schedule',
        qualification: null,
        data: { schedule: await getQualificationSchedule('정보처리기사'), note: '규칙 기반 폴백 — 자격증명 확인 필요' },
        profileUpdate: null,
        error: 'UPSTAGE_API_KEY 미설정 또는 Solar API 호출 실패 → 규칙 기반 일정 조회로 대체',
      }
    }
    const schedule = await getQualificationSchedule(qualification)
    return {
      message: `${qualification}의 공식 시험 일정을 규칙 기반으로 조회했어요. Solar 에이전트 호출에 실패해서 자동 조회 결과로 대신해요.`,
      action: 'schedule',
      qualification,
      data: { qualification, schedule },
      profileUpdate: null,
      error: 'UPSTAGE_API_KEY 미설정 또는 Solar API 호출 실패 → 규칙 기반 일정 조회로 대체',
    }
  }

  // 2. 학습 계획 질문이면 → 학습 계획 생성
  if (/학습 계획|공부 계획|준비 계획|주차|주차별/i.test(userMessage)) {
    const qualification = extractQualificationFromAnswer(userMessage) ?? '정보처리기사'
    const examDate = '2026년 하반기'
    const weeks = calcWeeks(examDate)
    const planWeeks: { week: number; focus: string; hours: string; done: boolean }[] = Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      focus: i < Math.round(weeks * 0.4)
        ? '개념 학습'
        : i < Math.round(weeks * 0.65)
          ? '문제풀이'
          : i < Math.round(weeks * 0.9)
            ? '기출·분석'
            : '모의고사·복습',
      hours: '하루 1~2시간',
      done: false,
    }))
    return {
      message: `${qualification}의 학습 계획을 규칙 기반으로 생성했어요. Solar 에이전트 호출에 실패해서 자동 생성 결과로 대신해요.`,
      action: 'study-plan',
      qualification,
      data: { qualification, examDate, totalWeeks: weeks, weeks: planWeeks, briefing: { task: '이번 주 개념 학습 진도 확인', deadline: '이번 주 일요일' }, status: '준비중' },
      profileUpdate: null,
      error: 'UPSTAGE_API_KEY 미설정 또는 Solar API 호출 실패 → 규칙 기반 학습 계획 생성으로 대체',
    }
  }

  // 3. 추천 질문이거나 일반 질문이면 → 규칙 기반 추천
  if (hasProfile) {
    const candidates = recommend(profile, userMessage)
    if (candidates.length > 0) {
      const primary = candidates[0]
      const schedule = await getQualificationSchedule(primary.자격증명)
      const detailInfo = QUALIFICATION_DETAIL_URLS[primary.자격증명]
      const examConfirmed = schedule.some((item) => item.confirmed)
      const prepRange =
        schedule.length > 0
          ? `접수 ${schedule.find((i) => i.label === '접수 시작')?.value || '미정'} · 시험 ${schedule.find((i) => i.label === '시험일')?.value || '미정'}`
          : '공식 일정 확인 필요'
      return {
        message: `AI 에이전트 호출에 실패했어요. 대신 기존 규칙 기반 추천 결과를 드릴게요. ${primary.자격증명}을(를) 1순위로 추천해요. ${primary.reasons.slice(0, 2).join('. ')}.`,
        action: 'recommend',
        qualification: primary.자격증명,
        data: {
          primary: {
            name: primary.자격증명,
            reason: primary.reasons.slice(0, 2).join('. ') + '.',
            prepRange,
            caution: primary.caution || '',
            detailUrl: detailInfo?.detail || null,
            scheduleUrl: detailInfo?.schedule || null,
            examConfirmed,
            scheduleItems: schedule.length > 0 ? schedule : null,
            usedInfo: [
              `프로필: 진로(${profile.진로 || '미설정'}), 보유자격증(${(profile.보유자격증 || []).join(', ') || '없음'})`,
              `공식 URL: ${detailInfo?.detail || '참조표 미등록'}`,
              examConfirmed ? '공식 원문 확인 완료' : '공식 일정 미발표',
            ],
          },
          alternatives: candidates.slice(1, 3).map((c) => ({
            name: c.자격증명,
            reason: c.reasons.slice(0, 2).join('. ') + '.',
          })),
          path: {
            basic: {
              lecture: '공식 강의·학습자료는 자격증 상세 페이지에서 확인',
              examMaterial: '공식 기출문제·자료실 참조',
              textbook: '공식 교재 확인 권장',
              estimatedCost: examConfirmed
                ? schedule.find((i) => i.label === '응시료')?.value || '응시료 미확인'
                : '응시료 미확인 (공식 응시료 페이지 확인 필요)',
              reason: primary.reasons.slice(0, 3).join(' / ') || '',
            },
          },
        },
        profileUpdate: null,
        error: 'UPSTAGE_API_KEY 미설정 또는 Solar API 호출 실패 → 규칙 기반 추천으로 대체',
      }
    }
  }

  // 프로필 없고 추천도 안 되면 질문
  return {
    message: 'AI 에이전트 호출에 실패했어요. 대신 규칙에 따라 답변을 드려요. 자격증 추천을 원하시면 프로필(진로·보유자격증·가용시간 등)을 알려주시거나, 특정 자격증명을 말씀해 주세요.',
    action: 'question',
    qualification: null,
    data: null,
    profileUpdate: null,
    error: 'UPSTAGE_API_KEY 미설정 또는 Solar API 호출 실패 → 규칙 기반 질문 응답으로 대체',
  }
}

function calcWeeks(examDateRaw: string): number {
  const m = examDateRaw.match(/(\d{4})년\s*(\d{1,2})월/) ?? examDateRaw.match(/(\d{4})년/)
  if (!m) return 12
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : 12
  const examDate = new Date(year, month - 1, 15)
  const now = new Date()
  const diffDays = Math.max(0, (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(4, Math.ceil(diffDays / 7))
}

// ===== 메인 핸들러 =====
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  const body = await req.json().catch(() => ({}))
  const userMessage = (body.message as string) || ''
  const profile = body.profile as Profile | undefined

  console.log(`[agent] 요청 수신: message=${userMessage.slice(0, 100)}… profile=${profile ? Object.keys(profile).length : 0}개 필드로 ${Date.now() - startTime}ms`)

  if (!userMessage) {
    return NextResponse.json(
      { type: 'agent', message: '메시지를 입력해 주세요.', action: 'reply', qualification: null, data: null, profileUpdate: null },
      { status: 400 },
    )
  }

  const systemPrompt = `당신은 자격증 패스 코치의 AI 에이전트입니다. 사용자 발화에 따라 아래 도구로 정보를 조회한 뒤, 오직 그 결과만 바탕으로 답변합니다.

사용 가능한 도구(${SOLAR_TOOLS.map((t) => t.name).join(', ')}):
- 자격증서추천: 사용자 프로필 기반 자격증 추천 (1순위 + 대안). QUALIFICATION_URLS에 등록된 정식 자격증명만 사용하세요.
- 자격증서일정조회: 특정 자격증명의 공식 시험 일정·응시료·응시자격·접수기간을 조회. QUALIFICATION_URLS 등록 정식 명칭만 사용. 일정·응시료·응시자격을 직접 만들어내지 마세요.
- 학습계획생성: 특정 자격증명의 학습 계획(시험일 기준 주차별) 생성. 시험 시기를 사용자가 말한 대로 사용하거나 없으면 "2026년 하반기" 사용.

규칙:
1. 일정, 응시료, 시험 정보 등은 반드시 자격증서일정조회 도구 결과만 사용하세요. 직접 날짜·금액·응시자격을 만들어내지 마세요.
2. 자격증 추천은 자격증서추천 결과를, 학습 계획은 학습계획생성 결과를 사용하세요.
3. 자격증명은 QUALIFICATION_URLS에 등록된 정식 명칭(예: "정보처리기사", "SQLD (SQL 개발자)", "컴퓨터활용능력 1급", "ADsP (데이터분석 준전문가)")만 사용하세요. 비슷한 이름으로 지어내지 마세요.
4. 도구 결과에 없는 정보는 "공식 일정 미발표"·"정보 없음"으로 말하고 추측하지 마세요.
5. 사용자 프로필이 없으면 부족한 정보만 짧게 질문하세요(한 번에 1~3개).
6. 모호한 질문이면 확인을 요청할 수 있습니다.
7. 답변은 친절하고 간결하게 한국어로 작성하세요.
8. 상담·권유 느낌이 아니라 필요한 정보를 정리해 주는 코치 톤으로 답하세요.
9. 유료 강의·교재를 추천할 때는 사용자가 비용 선호를 밝힌 경우에만 포함하고, 가격·무료 전환 지점·전체 범위 커버 여부를 함께 언급하세요. 이유 없이 유료부터 제시하지 마세요.
10. 자격증명은 Tools 결과 또는 QUALIFICATION_URLS 등록 목록에서만 사용하세요.`

  try {
    // ---- 1단계: 도구 포함 Solar 호출 ----
    const firstMessages: SolarMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(profile && Object.keys(profile).length > 0
        ? [{ role: 'system', content: `현재 사용자 프로필: ${JSON.stringify(profile)}` }]
        : []),
      { role: 'user', content: userMessage },
    ]

    let solarResponse = await callSolar(firstMessages, SOLAR_TOOLS)
    const firstChoice = solarResponse.choices[0]
    let assistantMessage = firstChoice.message?.content ?? ''
    const usedToolCalls = extractAssistantToolCalls(firstChoice)
    const toolCallRecords: ToolCallRecord[] = []
    const toolMessages: SolarMessage[] = []

    if (usedToolCalls.length > 0) {
      // 도구 호출 기록 저장 + tool 메시지 생성
      toolMessages.push({
        role: 'assistant',
        content: assistantMessage,
        tool_calls: usedToolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.args) },
        })),
      })

      for (const tc of usedToolCalls) {
        const result = await executeTool(tc.name, tc.args)
        toolCallRecords.push({ toolCallId: tc.id, toolName: tc.name, args: tc.args, result })
        toolMessages.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: tc.id })
      }

      // ---- 2단계: 도구 결과 반영 Solar 재호출 ----
      const secondMessages: SolarMessage[] = [
        { role: 'system', content: systemPrompt },
        ...(profile && Object.keys(profile).length > 0
          ? [{ role: 'system', content: `현재 사용자 프로필: ${JSON.stringify(profile)}` }]
          : []),
        { role: 'user', content: userMessage },
        ...toolMessages,
      ]

      solarResponse = await callSolar(secondMessages)
      const secondChoice = solarResponse.choices[0]
      assistantMessage = secondChoice.message?.content ?? ''

      // 2단계에서 추가 도구 호출이 있으면 실행
      const secondToolCalls = extractAssistantToolCalls(secondChoice)
      if (secondToolCalls.length > 0) {
        for (const tc of secondToolCalls) {
          const result = await executeTool(tc.name, tc.args)
          toolCallRecords.push({ toolCallId: tc.id, toolName: tc.name, args: tc.args, result })
          toolMessages.push({ role: 'tool', content: JSON.stringify(result), tool_call_id: tc.id })
        }
      }
    }

    if (!assistantMessage) {
      throw new Error('Solar 최종 응답이 비어 있습니다.')
    }

    const toolNamesUsed = toolCallRecords.map((r) => r.toolName)
    const successToolRecords = toolCallRecords.filter((r) => r.result.ok)

    // 마지막 성공 도구 결과로 data 구성
    let data: Record<string, unknown> | null = null
    let qualification: string | null = null
    let profileUpdate: Record<string, unknown> | null = null

    // 가장 마지막 성공한 도구의 결과를 data로 사용
    const lastSuccess = successToolRecords[successToolRecords.length - 1]
    if (lastSuccess) {
      const resultData = lastSuccess.result.result as Record<string, unknown> | undefined
      if (resultData) {
        data = resultData
        // 도구 결과에서 qualification 추출
        if (lastSuccess.toolName === '자격증서일정조회' && typeof resultData === 'object' && 'qualification' in resultData) {
          qualification = String(resultData.qualification)
        } else if (lastSuccess.toolName === '자격증서추천' && typeof resultData === 'object' && 'primary' in resultData) {
          const primary = resultData.primary as { name?: string } | undefined
          if (primary?.name) qualification = primary.name
        } else if (lastSuccess.toolName === '학습계획생성' && typeof resultData === 'object' && 'qualification' in resultData) {
          qualification = String(resultData.qualification)
        }
      }
    }

    // 답변이 있으면 답변에서도 자격증명 추출 시도
    if (!qualification) {
      qualification = extractQualificationFromAnswer(assistantMessage)
    }

    // 액션 결정
    const action = inferActionFromAnswer(assistantMessage, toolNamesUsed, userMessage)

    // 프로필 갱신 추출 (답변에서 새 정보 제안 시)
    if (profile && Object.keys(profile).length > 0) {
      profileUpdate = extractProfileUpdateFromAnswer(assistantMessage, profile)
    } else if (action === 'recommend' || action === 'schedule' || action === 'study-plan') {
      // 프로필 없는 상태에서 도구가 실행됐다면 프로필 갱신 필요성 검토
      // (추천 도구가 프로필 없음을 오류로 반환한 경우 등 → profileUpdate null 유지)
    }

    console.log(
      `[agent] 완료: action=${action} qualification=${qualification} toolCalls=${toolCallRecords.length} 성공=${successToolRecords.length} ${Date.now() - startTime}ms`,
    )

    return NextResponse.json({
      type: 'agent',
      message: assistantMessage,
      action,
      qualification,
      data,
      profileUpdate,
    })
  } catch (e) {
    console.error('[agent] Solar 호출 오류:', e)

    // ===== API 실패 시 기존 규칙 기반 기능으로 폴백 =====
    const fallback = await fallbackResponse(userMessage, profile)

    console.log(`[agent] 폴백 완료: action=${fallback.action} ${Date.now() - startTime}ms`)

    return NextResponse.json(
      {
        type: 'agent',
        message: fallback.message,
        action: fallback.action,
        qualification: fallback.qualification,
        data: fallback.data,
        profileUpdate: fallback.profileUpdate,
        error: fallback.error,
      },
      fallback.action === 'reply' ? undefined : { status: fallback.action === 'error' ? 500 : undefined },
    )
  }
}
