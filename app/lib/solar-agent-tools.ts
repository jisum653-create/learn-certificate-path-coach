// === Solar Pro 4 챗봇 에이전트 도구 정의 ===
// 기존 추천/일정/학습계획 함수를 도구로 노출한다.
// Solar가 직접 일정·응시료를 만들지 못하게 하고, 반드시 이 도구 결과만 사용하게 한다.

import { Profile, recommend, RecommendationCandidate } from '../lib/recommend'
import { getQualificationSchedule, ScheduleItem } from '../lib/qualification-extract'
import { QUALIFICATION_URLS, QUALIFICATION_DETAIL_URLS } from '../lib/reference-data'

const SOLAR_API_URL = 'https://api.upstage.ai/v1/chat/completions'
const SOLAR_MODEL = 'solar-pro4'

// ---------- 도구 스키마 ----------
interface ToolSpec {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export const SOLAR_TOOLS: ToolSpec[] = [
  {
    name: '자격증서추천',
    description:
      '사용자 프로필(진로·보유자격증·학습방식·비용선호·가용시간·목표시기·관심공고)을 바탕으로 1순위 + 대안 자격증을 추천한다. 직접 새로운 자격증명을 만들어내지 말고, QUALIFICATION_URLS에 등록된 정식 자격증명만 사용해야 한다.',
    parameters: {
      type: 'object',
      properties: {
        profile: { type: 'object', description: '사용자 프로필 객체 (Profile 타입)' },
        message: { type: 'string', description: '사용자 발화 원문' },
      },
      required: ['profile', 'message'],
    },
  },
  {
    name: '자격증서일정조회',
    description:
      '특정 자격증명의 공식 시험 일정·응시료·응시자격·접수 시작/마감·공식 접수 페이지를 조회한다. 일정·응시료·응시자격을 Solar가 직접 만들어내면 안 되고, 반드시 이 함수의 반환값만 사용해야 한다. 자격증명은 QUALIFICATION_URLS에 있는 정식 명칭이어야 한다(예: "정보처리기사", "SQLD (SQL 개발자)", "컴퓨터활용능력 1급").',
    parameters: {
      type: 'object',
      properties: {
        qualification: { type: 'string', description: 'QUALIFICATION_URLS에 등록된 정식 자격증명' },
      },
      required: ['qualification'],
    },
  },
  {
    name: '학습계획생성',
    description:
      '특정 자격증의 학습 계획(시험일까지 주차별 계획)을 생성한다. 시험 시기 표현이 없으면 기본값(2026년 하반기)을 쓴다. 직접 시험일을 꾸며내지 말고, 사용자가 말한 시기 또는 기본값을 그대로 사용한다.',
    parameters: {
      type: 'object',
      properties: {
        qualification: { type: 'string', description: '학습 계획을 세울 자격증명' },
        examDate: { type: 'string', description: '시험 시기 표현(예: 2026년 3월, 2026년 하반기 등). 없으면 "2026년 하반기"' },
      },
      required: ['qualification', 'examDate'],
    },
  },
]

// ---------- 도구 실행 ----------
export async function executeTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    if (name === '자격증서추천') {
      const profile = args.profile as Profile | undefined
      const message = (args.message as string) || ''
      if (!profile || Object.keys(profile).length === 0) {
        return { ok: false, error: '프로필 정보가 없어서 추천할 수 없어요. 프로필을 먼저 알려주시겠어요?' }
      }
      const candidates = recommend(profile, message)
      if (candidates.length === 0) {
        return { ok: false, error: '현재 프로필 조건으로는 추천할 자격증이 없어요. 진로·관심공고·가용시간 등을 더 알려주시면 다시 추천할게요.' }
      }
      const info = QUALIFICATION_DETAIL_URLS[candidates[0].자격증명]
      const schedule = await getQualificationSchedule(candidates[0].자격증명)
      const examConfirmed = schedule.some((it) => it.confirmed)

      return {
        ok: true,
        result: {
          primary: {
            name: candidates[0].자격증명,
            reason: candidates[0].reasons.slice(0, 2).join('. ') + '.',
            prepRange:
              schedule.length > 0
                ? `접수 ${schedule.find((i) => i.label === '접수 시작')?.value || '미정'} · 시험 ${schedule.find((i) => i.label === '시험일')?.value || '미정'}`
                : '공식 일정 확인 필요',
            caution: candidates[0].caution ?? '',
          },
          alternatives: candidates.slice(1, 3).map((c) => ({
            name: c.자격증명,
            reason: c.reasons.slice(0, 2).join('. ') + '.',
          })),
          examConfirmed,
          scheduleItems: schedule,
          detailUrl: info?.detail ?? null,
          scheduleUrl: info?.schedule ?? null,
          feeInfo: schedule.find((i) => i.label === '응시료')?.value ?? null,
          certificationRequirements: schedule.find((i) => i.label === '응시자격')?.value ?? null,
          usedInfo: [
            `추천 근거: ${candidates[0].reasons.slice(0, 2).join('. ')}`,
            `공식 URL: ${info?.detail ?? '참조표 미등록'}`,
            `일정 출처: ${schedule.length > 0 ? schedule.find((i) => i.label === '확인 날짜')?.value ?? '추출 완료' : '공식 일정 미발표'}`,
          ],
        },
      }
    }

    if (name === '자격증서일정조회') {
      const qualification = (args.qualification as string) || ''
      if (!qualification) {
        return { ok: false, error: '자격증명을 알려주세요.' }
      }
      if (!QUALIFICATION_URLS[qualification]) {
        return { ok: false, error: `공식 자격증 목록에 "${qualification}"이(가) 없어요. 자격증명을 정확히 확인해 주세요.` }
      }
      const schedule = await getQualificationSchedule(qualification)
      return { ok: true, result: { qualification, schedule } }
    }

    if (name === '학습계획생성') {
      const qualification = (args.qualification as string) || ''
      const examDate = (args.examDate as string) || '2026년 하반기'
      if (!qualification) {
        return { ok: false, error: '학습 계획을 세울 자격증명을 알려주세요.' }
      }
      const totalWeeks = calcTotalWeeks(examDate)
      const weeks: PlanWeek[] = Array.from({ length: totalWeeks }, (_, i) => ({
        week: i + 1,
        focus: focusForWeek(i, totalWeeks),
        hours: '하루 1~2시간',
        done: false,
      }))
      return {
        ok: true,
        result: {
          qualification,
          examDate,
          totalWeeks,
          weeks,
          briefing: { task: '이번 주 개념 학습 진도 확인', deadline: '이번 주 일요일' },
          status: '준비중',
        },
      }
    }

    return { ok: false, error: `알 수 없는 도구: ${name}` }
  } catch (err) {
    return { ok: false, error: `도구 실행 오류: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// ---------- 헬퍼 ----------
interface PlanWeek {
  week: number
  focus: string
  hours: string
  done: boolean
}

function calcTotalWeeks(examDateRaw: string): number {
  const m = examDateRaw.match(/(\d{4})년\s*(\d{1,2})월/) ?? examDateRaw.match(/(\d{4})년/)
  if (!m) return 12
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : 12
  const examDate = new Date(year, month - 1, 15)
  const now = new Date()
  const diffDays = Math.max(0, (examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(4, Math.ceil(diffDays / 7))
}

function focusForWeek(idx: number, total: number): string {
  const r = idx / total
  if (r < 0.4) return '개념 학습'
  if (r < 0.65) return '문제풀이'
  if (r < 0.9) return '기출·분석'
  return '모의고사·복습'
}

// ---------- Solar 응답에서 도구 호출 파싱 ----------
interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

function parseToolCalls(choice: { tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }> } | undefined): ToolCall[] {
  const calls: ToolCall[] = []
  const tc = choice?.tool_calls
  if (!tc) return calls
  for (const item of tc) {
    const name = item.function?.name
    const argsText = item.function?.arguments
    const id = item.id || ''
    if (!name || !argsText) continue
    try {
      const args = JSON.parse(argsText)
      calls.push({ id, name, args })
    } catch {
      // Solar가 JSON이 아닌 문자열을 줄 수도 있으니 안전하게 건너뜀
    }
  }
  return calls
}
