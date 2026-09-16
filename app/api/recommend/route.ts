import { NextRequest, NextResponse } from 'next/server'
import { recommend, Profile, RecommendationCandidate } from '../../lib/recommend'
import { getQualificationSchedule, ScheduleItem } from '../../lib/qualification-extract'
import { QUALIFICATION_DETAIL_URLS, QUALIFICATION_URLS } from '../../lib/reference-data'
import { webResearch, buildResearchContext } from '../../lib/service-search'
import { extractCertMentions } from '../../lib/qualification-map'
import { classifyIntent } from '../../lib/intent'
import { applyGoalBias } from '../../lib/qualification-map'

/** 프로필·메시지 기반으로 웹 리서치 검색 쿼리 생성 */
function buildWebResearchQuery(profile: Profile, message: string): string | null {
  const parts: string[] = []

  if (profile.진로) {
    parts.push(`${profile.진로} 자격증 추천 2026`)
  }
  if (profile.관심공고) {
    parts.push(`${profile.관심공고} 채용 자격증 우대 2026`)
  }
  if (profile.보유자격증 && profile.보유자격증.length > 0) {
    const lastCert = profile.보유자격증[profile.보유자격증.length - 1]
    parts.push(`${lastCert} 다음 단계 자격증 ${profile.진로 || '취업'}`)
  }
  if (message) {
    const mentions = extractCertMentions(message)
    if (mentions.length > 0) {
      parts.push(`${mentions[0].standard} 자격증 정보 시험일정 2026`)
    }
  }

  return parts.length > 0 ? parts[0] : null
}

function buildPlanFromQualification(
  qualification: string,
  scheduleItems: ScheduleItem[],
  profile: Profile,
): Record<string, unknown> | null {
  const examDateItem = scheduleItems.find(i => i.label.includes('시험일') || i.label.includes('시험일정') || i.label.includes('시험 날짜'))
  const applyStartItem = scheduleItems.find(i => i.label.includes('접수 시작') || i.label.includes('접수기간 시작'))
  const applyEndItem = scheduleItems.find(i => i.label.includes('접수 종료') || i.label.includes('접수기간 마감') || i.label.includes('접수 마감'))

  const examDate = examDateItem?.value || ''
  const applyStart = applyStartItem?.value || ''
  const applyEnd = applyEndItem?.value || ''

  if (!examDate || examDate.includes('미발표') || examDate.includes('미확인')) {
    return {
      qualification,
      examDate: examDate || '공식 일정 미발표',
      applyStart,
      applyEnd,
      note: '공식 시험일 미확정 — 일정 발표 후 학습 계획을 확정할 수 있어요.',
      prepRange: '공식 일정 확인 필요',
      weekly: [],
    }
  }

  // 간단한 주차 계획 생성 (파싱 가능한 YYYY.MM.DD 기준)
  const start = parseDate(applyStart) ?? parseDate(examDate)
  if (!start) {
    return {
      qualification,
      examDate,
      applyStart,
      applyEnd,
      note: '접수 시작일을 알 수 없어 주차 계획을 대략적으로만 제시해요.',
      prepRange: `시험 ${examDate}`,
      weekly: [],
    }
  }

  const weeks = computeWeeks(start, parseDate(examDate))
  const weekly = weeks.map((w, idx) => ({
    week: idx + 1,
    range: w.label,
    focus: weekFocus(idx, qualification, profile),
    end: w.end,
  }))

  return {
    qualification,
    examDate,
    applyStart,
    applyEnd,
    prepRange: `접수 ${applyStart || '미정'} ~ 시험 ${examDate}`,
    note: `목표: ${qualification}. 시험 ${examDate} 기준 주차 계획.`,
    weekly,
  }
}

function parseDate(str: string): Date | null {
  if (!str) return null
  const m = str.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) ? null : d
}

function computeWeeks(start: Date, target: Date | null): Array<{ label: string; start: string; end: string }> {
  if (!target) {
    return [{ label: '준비 기간', start: fmt(start), end: '미정' }]
  }
  const weeks: Array<{ label: string; start: string; end: string }> = []
  let cur = new Date(start)
  let idx = 0
  while (cur < target) {
    const weekStart = new Date(cur)
    const weekEnd = new Date(cur)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > target) weekEnd.setTime(target.getTime())
    weeks.push({
      label: `주차 ${idx + 1}`,
      start: fmt(weekStart),
      end: fmt(weekEnd),
    })
    cur.setDate(cur.getDate() + 7)
    idx += 1
    if (idx > 24) break
  }
  return weeks
}

function fmt(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function weekFocus(idx: number, qualification: string, profile: Profile): string {
  const q = qualification.toLowerCase()
  if (idx === 0) return '진도 파악 + 전체 범위 훑기, 교재·강의 선정'
  if (idx === 1) return '핵심 개념 1차 정리 + 기본 문제 풀이 시작'
  if (idx === 2) return '기출·유형 익히기, 약한 파트 집중'
  if (idx === 3) return '기출 반복 + 시간 배분 연습'
  if (idx === 4) return '모의고사·마무리 + 오답 정리'
  return '취약 파트 보충 + 기출 반복'
}

// === 학습 자료 경로 ===
function buildLearningResources(
  qualification: string,
  profile: Profile,
  scheduleItems: ScheduleItem[],
): { basic: { lecture: string; examMaterial: string; textbook: string; estimatedCost: string; reason: string; lectureNote?: string; examMaterialNote?: string }, alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } | null } {
  const costPref = (profile.비용선호 || '').toLowerCase()
  const allowPaid = /유료|강의|투자|비용|지원/i.test(costPref)
  const preferFree = /무료/i.test(costPref)
  const buyTextbook = /교재|구매/i.test(costPref)

  const examFee = scheduleItems.find(i => i.label === '응시료')?.value || ''
  const examFeeConfirmed = scheduleItems.some(i => i.label === '응시료' && i.confirmed)
  const estimatedCost = examFeeConfirmed && examFee
    ? examFee
    : '응시료 미확인 (공식 응시료 페이지 확인 필요)'

  if (qualification === '정보처리기사') {
    const basic = {
      lecture: '큐넷 공식 직무내용·출제기준 확인 후, 무료 강의는 인프런·유튜브에서 정보처리기사 필기+실기 전체 범위 커버 강의 탐색',
      examMaterial: '큐넷 기출문제 자료실 및 전자문제집(CBT) 활용 — 정보처리기사 필기·실기 기출문제 반복',
      textbook: '구매 허용 시 시나공 정보처리기사 또는 수제비 정보처리기사 중 최신 회차 대응 교재 1권',
      estimatedCost,
      reason: '국가기술자격 큐넷 시행 — 공식 출제기준·기출 중심 준비가 핵심',
      lectureNote: '무료 강의는 강사·커리큘럼별로 전체 범위 커버 여부가 다르므로, 목차 대비 시험 과목 비중을 직접 확인',
      examMaterialNote: '큐넷 공식 기출이 우선, 사설 기출은 공식범위와 다를 수 있어 교차 확인',
    }
    const alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } = {
      lecture: '유료 허용 시 인프런·패스트캠퍼스 정보처리기사 강의 중 전체 범위 커버+기출 해설 포함 강의 검토 (가격·무료 전환 지점 확인)',
      examMaterial: '무료로 충분: 큐넷 기출+CBT 반복이 기본, 추가 문제집은 구매 허용 시에만',
      textbook: '구매 비허용 시 공식 출제기준 PDF+기출만으로 진행, 구매 허용 시 시나공/수제비 중 1권',
      reason: '무료 우선: 공식 기출+출제기준만으로도 준비 가능, 유료 강의는 시간 절약 필요 시에만',
    }
    return { basic, alternative }
  }

  if (qualification === '빅데이터분석기사') {
    const basic = {
      lecture: '데이터자격검정 공식 안내페이지(www.dataq.or.kr) 자격소개 확인 후, 무료 강의는 유튜버·인프런에서 빅데이터분석기사 필기 전체 범위 커버 강의 탐색',
      examMaterial: '데이터자격검정 공식 기출문제·자료실 및 전자문제집(CBT) 활용 — 빅데이터분석기사 필기 과목(빅데이터 분석 기획·탐색·모델링·결과해석)별 반복',
      textbook: '구매 허용 시 빅데이터분석기사 전용 교재 1권 (과목별 구성·최신 회차 반영 여부 확인)',
      estimatedCost,
      reason: '데이터자격검정 주관 — 공식 출제범위·기출 중심 준비가 핵심',
      lectureNote: '데이터분석 계열은 파이썬·SQL·통계 기초가 함께 필요하므로, 자격증 강의만으로 부족할 수 있어 기초 학습이 병행돼야 함',
      examMaterialNote: '공식 기출이 우선, 사설 대비서는 공식 출제범위와 과목 구분이 일치하는지 확인',
    }
    const alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } = {
      lecture: '유료 허용 시 데이터분석·빅데이터 강의 중 자격증 범위와 실무 기초를 함께 다루는 강의 검토 (가격·범위 cover 여부 확인)',
      examMaterial: '무료로 충분: 공식 기출+CBT 반복이 기본, 추가 문제집은 구매 허용 시에만',
      textbook: '구매 비허용 시 공식 자격소개+기출만으로 진행, 구매 허용 시 빅데이터분석기사 전용 교재 1권',
      reason: '무료 우선: 공식 자격소개+기출으로도 준비 가능하나, 데이터분석 기초가 약하면 별도 기초 학습이 필요',
    }
    return { basic, alternative }
  }

  if (qualification === 'ADP (데이터분석 전문가)') {
    const basic = {
      lecture: '데이터자격검정 공식 안내페이지에서 ADP 자격소개 확인 후, 데이터분석 실무·통계·머신러닝 기초 강의와 병행하여 준비',
      examMaterial: '데이터자격검정 공식 자료·기출 및 데이터분석 실무 사례 기반 문제 대비',
      textbook: '구매 허용 시 데이터분석·통계·머신러닝 기초서와 ADP 대비서 병행',
      estimatedCost,
      reason: '상위 자격 — 데이터분석 실무·통계 기초가 함께 필요, 실무 경험이 있을수록 유리',
      lectureNote: 'ADP는 실무형 문제로 알려져 있어 단순 기출 반복보다 데이터분석 개념·실무 맥락 이해가 필요',
    }
    const alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } = {
      lecture: '유료 허용 시 데이터분석·통계·머신러닝 종합 강의 중 ADP 수준의 깊이까지 다루는 강의 검토',
      examMaterial: '무료로 충분: 공식 자료+실무 사례 탐색이 기본, 기출만으로 커버되기 어려운 부분이 있음',
      textbook: '구매 비허용 시 공식 자격소개+데이터분석 기초 자료만으로 진행, 구매 허용 시 ADP 대비서+기초서',
      reason: '무료 우선: 실무·통계 기초가 전제되므로, 기초가 약하면 ADP보다 ADsP·SQLD부터 검토',
    }
    return { basic, alternative }
  }

  if (qualification === 'SQLD (SQL 개발자)') {
    const basic = {
      lecture: '데이터자격검정 공식 안내페이지에서 SQLD 자격소개 확인 후, SQL 기본 문법·집계· 조인 강의와 병행',
      examMaterial: '데이터자격검정 공식 자료·SQL 실습 환경 기반 문제 풀이',
      textbook: '구매 허용 시 SQLD 대비서 1권 (SQL 기본~중급 범위 확인)',
      estimatedCost,
      reason: 'SQL 활용 역량 검증 — 실무 SQL 작성과 연계해서 준비하면 효과적',
    }
    const alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } = {
      lecture: '유료 허용 시 SQL 강의 중 SQLD 범위까지 다루는 강의 검토 (가격·범위 확인)',
      examMaterial: '무료로 충분: SQL 실습 환경+공식 자료만으로도 준비 가능',
      textbook: '구매 비허용 시 공식 자격소개+SQL 실습으로 진행, 구매 허용 시 SQLD 대비서',
      reason: '무료 우선: SQL은 실습 환경이 핵심, 교재는 보조',
    }
    return { basic, alternative }
  }

  // 그 외: 공식 URL 기반 기본 경로
  const detailUrl = QUALIFICATION_DETAIL_URLS[qualification]?.detail || ''
  const basic = {
    lecture: `공식 자격소개 페이지(${detailUrl || '공식 홈페이지'})에서 자격 개요·취득방법 확인 후, 무료 강의는 해당 주관기관·유튜브·인프런 등에서 전체 범위 커버 강의 탐색`,
    examMaterial: `주관기관 공식 자료실·기출·CBT 활용 (공식 URL: ${detailUrl || '공식 홈페이지'})`,
    textbook: buyTextbook
      ? '구매 허용 시 해당 자격증 전용 교재 1권 (최신 회차·공식 출제범위 반영 여부 확인)'
      : '공식 자격소개+공식 자료로 진행, 필요 시 구매 허용으로 전환',
    estimatedCost,
    reason: `공식 URL 기준 기본 경로 — ${detailUrl ? '공식 홈페이지에서 자격 개요·일정·자료를 먼저 확인' : '공식 참조표 등록 필요'}`,
  }
  const alternative: { lecture: string; examMaterial: string; textbook: string; reason: string } = {
    lecture: allowPaid
      ? `유료 허용 시 해당 자격증 강의 중 전체 범위 커버+후기 검증이 되는 강의 검토 (가격·무료 전환 지점·범위 cover 여부 확인)`
      : `무료 우선 — 공식 자료+무료 강의로 진행, 유료는 시간 절약 필요 시에만 검토`,
    examMaterial: `무료로 충분: 공식 자료·기출·CBT가 기본, 추가 문제집은 구매 허용 시에만`,
    textbook: buyTextbook
      ? '구매 허용 시 해당 자격증 전용 교재 1권'
      : '구매 비허용 시 공식 자료 중심으로 진행',
    reason: preferFree
      ? '무료 선호 조건에 맞춰 공식 자료·무료 강의 중심'
      : allowPaid
        ? '유료 강의 허용 시 강의 포함 검토, 그래도 공식 자료 우선'
        : '기본 경로 중심, 필요 시 비용 선호 변경으로 대안 확대',
  }
  return { basic, alternative }
}

// === 오늘 브리핑 ===
// 프론트에서 오늘 브리핑 카드용으로 쓰는 고정 응답
export interface TodayBriefing {
  week: number
  range: string
  todayFocus: string
  tasks: Array<{ task: string; kind: string }>
  nearestDeadline: string
  delayAlert: string
}

function buildTodayBriefing(
  weekly: Array<{ week: number; range: string; focus: string; end?: string }>,
  qualification: string,
  profile: Profile,
): TodayBriefing | null {
  if (!weekly || weekly.length === 0) return null

  const today = new Date()
  const weekOfYear = getWeekNumber(today)
  const idx = Math.min(weekOfYear % weekly.length, weekly.length - 1)
  const current = weekly[idx]

  const tasks: Array<{ task: string; kind: string }> = [
    { task: current.focus, kind: '오늘 할 일' },
    { task: '직전 주차 복습 + 약한 파트 보충', kind: '복습' },
  ]
  if (profile.학습방식 && /문제풀이|실전/i.test(profile.학습방식)) {
    tasks.splice(1, 0, { task: '기출 1회분 시간 재고 풀기', kind: '실전 연습' })
  }

  return {
    week: current.week,
    range: current.range,
    todayFocus: current.focus,
    tasks,
    nearestDeadline: `시험 ${qualification} (${weekly[weekly.length - 1]?.end || '미정'})`,
    delayAlert: '지연 3일 이상 또는 주당 가용시간 50% 초과 시 재계획이 필요해요.',
  }
}

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  return Math.ceil((diff + start.getDay() + 1) / 7)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Profile | undefined
  const message = (body.message as string) || ''

  const intentResult = classifyIntent(message, profile || {})

  // ---------- 의도별 조기 반환 ----------

  // 초기화
  if (intentResult.intent === 'reset') {
    return NextResponse.json({
      type: 'result',
      result: { kind: 'reset' },
      message: intentResult.message,
      profileUpdate: { 메시지: '초기화 요청' },
    })
  }

  // 대화 기록 삭제
  if (intentResult.intent === 'delete') {
    return NextResponse.json({
      type: 'result',
      result: { kind: 'delete' },
      message: intentResult.message,
    })
  }

  // 그 외 답변만 필요한 의도(잡담/안내) — 프로필 없어도 가능
  if (intentResult.intent === 'reply') {
    return NextResponse.json({
      type: 'reply',
      message: intentResult.message,
    })
  }

  // 프로필 없으면 추천·일정·계획은 진행 불가 (프로필 관련 의도 제외)
  if (!profile) {
    return NextResponse.json({
      type: 'recommend',
      result: null,
      message: '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
      usedInfo: ['프로필 미설정 — 추천 후보 없음'],
    })
  }

  // 합격/취득 결과
  if (intentResult.intent === 'passed') {
    const target = intentResult.goalStandard
      ?? intentResult.certMentions.length > 0
        ? intentResult.certMentions[0].standard
        : null

    const update: Partial<Profile> = {
      메시지: '합격/취득 결과 반영',
      취득완료자격: [...(profile.취득완료자격 || []), ...(target ? [target] : [])],
    }
    if (target && !(profile.보유자격증 || []).includes(target)) {
      update.보유자격증 = [...(profile.보유자격증 || []), target]
    }

    return NextResponse.json({
      type: 'result',
      result: {
        kind: 'passed',
        qualification: target,
        message: target
          ? `${target} 합격/취득을 반영했어요. 필요하면 다음 자격증도 함께 볼게요.`
          : '합격/취득한 자격증명을 함께 말해 주면 반영할게요.',
      },
      profileUpdate: update,
    })
  }

  // 목표 변경
  if (intentResult.intent === 'change-goal') {
    const target = intentResult.goalStandard
      ?? intentResult.certMentions.length > 0
        ? intentResult.certMentions[0].standard
        : null

    return NextResponse.json({
      type: 'result',
      result: {
        kind: 'changed',
        qualification: target,
        message: target
          ? `목표 자격증을 ${target}으로 바꿔서 다시 살펴볼게요. 필요하면 학습 계획도 함께 볼 수 있어요.`
          : '바꾸고 싶은 자격증명을 말해 주세요.',
      },
      profileUpdate: {
        메시지: '목표 변경 요청',
        목표자격: target,
      },
    })
  }

  // 시험 일정
  if (intentResult.intent === 'schedule') {
    const q = intentResult.goalStandard
      ?? intentResult.certMentions.length > 0
        ? intentResult.certMentions[0].standard
        : null

    if (!q) {
      return NextResponse.json({
        type: 'reply',
        message: '어떤 자격증의 시험 일정을 알려드릴까요? (예: 빅데이터분석기사 시험 일정 알려줘)',
      })
    }

    let items: ScheduleItem[]
    try {
      items = await getQualificationSchedule(q)
    } catch {
      items = [
        { label: '접수 시작', value: '미확인 — 추출 오류', source: QUALIFICATION_URLS[q] || '', note: '공식 일정 재확인 필요' },
        { label: '시험일', value: '미확인 — 추출 오류', source: QUALIFICATION_URLS[q] || '', note: '공식 일정 재확인 필요' },
        { label: '응시료', value: '미확인', source: QUALIFICATION_URLS[q] || '' },
        { label: '공식 접수 페이지', value: QUALIFICATION_URLS[q] || '', source: '주관기관 공식 웹사이트' },
      ]
    }

    return NextResponse.json({
      type: 'schedule',
      schedule: {
        qualification: q,
        items,
        sourceNote: items.length > 0 ? `출처: ${items.find(i => i.source)?.source || '공식 홈페이지'}` : '',
      },
      message: ` ${q} 시험 일정을 가져왔어요.`,
    })
  }

  // 학습 계획
  if (intentResult.intent === 'plan') {
    const q = intentResult.goalStandard
      ?? intentResult.certMentions.length > 0
        ? intentResult.certMentions[0].standard
        : null

    if (!q) {
      return NextResponse.json({
        type: 'reply',
        message: '학습 계획을 세울 자격증명을 함께 말해 주세요. (예: 빅데이터분석기사 준비 시작할래)',
      })
    }

    let items: ScheduleItem[]
    try {
      items = await getQualificationSchedule(q)
    } catch {
      items = []
    }

    const plan = buildPlanFromQualification(q, items, profile)

    return NextResponse.json({
      type: 'plan',
      plan: plan
        ? {
            ...plan,
            todayBriefing: (plan as { todayBriefing?: unknown }).todayBriefing ?? null,
          }
        : null,
      message: ` ${q} 학습 계획을 세웠어요.`,
    })
  }

  // 프로필 반영/보완
  if (intentResult.intent === 'profile') {
    const update: Partial<Profile> = { 메시지: '프로필 조건 반영 요청' }
    // 메시지에서 추가 정보 추출은 가볍게만: 자격증명 언급 시 힌트로만 남김
    if (intentResult.certMentions.length > 0) {
      update.메시지 = `프로필 반영 요청 (언급 자격증: ${intentResult.certMentions.map(m => m.standard).join(', ')})`
    }
    return NextResponse.json({
      type: 'profile',
      profileUpdate: update,
      message: '프로필 조건을 반영했어요. 필요하면 자격증 추천도 다시 볼 수 있어요.',
    })
  }

  // ---------- 추천 파이프라인 (recommend-*) ----------

  // 웹 리서치
  let researchOutput = null
  let researchContext = ''
  try {
    const query = buildWebResearchQuery(profile, message)
    const candidates = recommend(profile, message)
    const officialUrls = candidates.slice(0, 3).map(c => c.url).filter(Boolean)
    if (query || officialUrls.length > 0) {
      researchOutput = await webResearch(query || '자격증 추천', 3, officialUrls.length > 0 ? officialUrls : undefined)
      researchContext = buildResearchContext(researchOutput)
    }
  } catch (e) {
    console.warn('[recommend] 웹 리서치 중 오류:', e)
    researchOutput = {
      query: '',
      search: { query: '', extractedUrls: [], rawText: '', extractedAt: new Date().toISOString(), source: 'jina', error: String(e) },
      pages: [],
      extractedAt: new Date().toISOString(),
    }
    researchContext = `⚠ 웹 리서치 중 오류 발생: ${e}`
  }

  // 후보 산정
  let candidates: RecommendationCandidate[] = []
  try {
    candidates = recommend(profile, message)
  } catch (e) {
    console.error('[recommend] 후보 산정 오류:', e)
    candidates = []
  }

  console.log('[recommend/DEBUG] 프로필:', JSON.stringify({
    진로: profile.진로,
    보유자격증: profile.보유자격증,
    학습방식: profile.학습방식,
    비용선호: profile.비용선호,
    가용시간: profile.가용시간,
    목표시기: profile.목표시기,
    관심공고: profile.관심공고,
  }))
  console.log('[recommend/DEBUG] body 전체:', JSON.stringify(body))
  console.log('[recommend/DEBUG] 의도:', intentResult.intent, '목표확정:', intentResult.goalStandard, 'mention 수:', intentResult.certMentions.length)
  console.log('[recommend/DEBUG] 후보 수:', candidates.length)
  if (candidates.length > 0) {
    console.log('[recommend/DEBUG] 상위 후보:', candidates.slice(0,5).map(c => ({ name: c.자격증명, score: c.score, reasons: c.reasons.slice(0,2) })))
  } else {
    console.log('[recommend/DEBUG] QUALIFICATION_URLS keys:', Object.keys(QUALIFICATION_URLS).slice(0,10))
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      type: 'recommend',
      result: null,
      message: '프로필 조건으로는 추천할 자격증이 없어요. 진로·관심공고·가용시간 등을 더 알려주시면 다시 추천할게요.',
      usedInfo: ['프로필 조건 불일치 — 추천 후보 없음'],
      suggestion: '추천을 다시 받으려면 아래 정보가 도움이 돼요.\n- 진로/관심 직무 (예: IT 개발, 사무·행정, 디자인, 회계, 데이터 분석)\n- 관심 있는 채용 공고 유형이나 기업 (예: 개발자 신입, 공공기관 행정직)\n- 하루/주 가용 시간 (예: 하루 2시간, 주 10시간)\n- 목표 시기 (예: 3개월 내, 올해 안)\n- 학습 방식 선호 (예: 독학, 온라인 강의, 학원)\n- 예산 범위 (예: 10만원 이하, 30만원 정도)\n\n프로필 탭(오른쪽 대시보드)에서 직접 값을 작성하거나, 채팅창에 위 정보를 알려주시면 다시 추천해요.',
    })
  }

  // 목표 확정 자격이 있으면 우선 고정
  const goalStandard = intentResult.goalStandard
  let primaryCandidate: RecommendationCandidate
  let alternatives: Array<{ name: string; reason: string }>

  if (goalStandard) {
    const goalCandidate = candidates.find(c => c.자격증명 === goalStandard)
    if (goalCandidate) {
      const biased = applyGoalBias(candidates, goalStandard) as RecommendationCandidate[]
      primaryCandidate = biased.find(c => c.자격증명 === goalStandard) ?? goalCandidate
      alternatives = biased
        .filter((c) => c.자격증명 !== goalStandard)
        .slice(0, 3)
        .map((c) => ({ name: c.자격증명, reason: c.reasons.slice(0, 2).join('. ') + '.' }))
    } else {
      // 사용자가 명시한 목표 자격이 후보군에 없으면 우선 삽입
      const reasons = [`목표 자격증으로 사용자가 명시: ${goalStandard}`]
      const caution = ''
      primaryCandidate = {
        자격증명: goalStandard,
        url: QUALIFICATION_URLS[goalStandard] || '',
        score: 1000,
        reasons,
        tags: [],
        caution,
      }
      alternatives = candidates
        .filter(c => c.자격증명 !== goalStandard)
        .slice(0, 3)
        .map(c => ({ name: c.자격증명, reason: c.reasons.slice(0, 2).join('. ') + '.' }))
    }
  } else {
    const biased = applyGoalBias(candidates, null) as RecommendationCandidate[]
    primaryCandidate = biased[0]
    alternatives = biased.slice(1, 4).map(c => ({ name: c.자격증명, reason: c.reasons.slice(0, 2).join('. ') + '.' }))
  }

  // 공식 정보 검증
  let scheduleItems: ScheduleItem[] = []
  let examConfirmed = false
  try {
    scheduleItems = await getQualificationSchedule(primaryCandidate.자격증명)
    examConfirmed = scheduleItems.some(item => item.confirmed)
  } catch (e) {
    console.error('[recommend] 일정 추출 오류:', e)
  }

  // 학습 경로
  const learningPath = {
    primary: primaryCandidate.자격증명,
    note: primaryCandidate.reasons.slice(0, 3).join(' / '),
  }

  // 취업 가이드라인
  const jobGuideline = (profile.관심공고 || profile.진로)
    ? {
        qualification: primaryCandidate.자격증명,
        note: `관심 공고·진로 기반 추천: ${primaryCandidate.자격증명}`,
      }
    : null

  const detailInfo = QUALIFICATION_DETAIL_URLS[primaryCandidate.자격증명]

  const usedInfoList = [
    `프로필: 진로(${profile.진로 || '미설정'}), 보유자격증(${(profile.보유자격증 || []).join(', ') || '없음'}), 학습방식(${profile.학습방식 || '미설정'}), 비용선호(${profile.비용선호 || '미설정'}), 가용시간(${profile.가용시간 || '미설정'}), 목표시기(${profile.목표시기 || '미설정'})`,
    `공식 URL 참조표: ${detailInfo?.detail || '참조표 미등록'}`,
    examConfirmed ? 'web_extract(Jina Reader/cheerio)로 공식 원문 확인 완료' : '공식 일정 미발표 — web_extract로 재확인 필요',
    detailInfo ? `공식 상세 페이지: ${detailInfo.detail}` : '',
    researchOutput && researchOutput.search?.error
      ? `⚠ 웹 리서치 경고: ${researchOutput.search.error}`
      : researchOutput
        ? `웹 리서치 수행: ${researchOutput.query} (출처: ${researchOutput.search?.source || '없음'}, 추출 페이지: ${researchOutput.pages?.length || 0})`
        : '웹 리서치 미수행 (검색 쿼리 없음)',
  ].filter(Boolean);

  const prepRange = scheduleItems.length > 0
    ? `접수 ${scheduleItems.find(i => i.label === '접수 시작')?.value || '미정'} · 시험 ${scheduleItems.find(i => i.label === '시험일')?.value || '미정'}`
    : '공식 일정 확인 필요';

  const learningResources = buildLearningResources(primaryCandidate.자격증명, profile, scheduleItems)

  const recommendation = {
    primary: {
      name: primaryCandidate.자격증명,
      reason: primaryCandidate.reasons.slice(0,2).join('. ') + '.',
      prepRange,
      caution: primaryCandidate.caution || '',
    },
    alternatives,
    path: {
      basic: learningResources.basic,
      alternative: learningResources.alternative,
    },
    usedInfo: usedInfoList,
    guideline: jobGuideline
      ? {
          jobSummary: jobGuideline.note || '',
          requiredSkills: '',
          certConnection: `${jobGuideline.qualification} 자격과 관심 직무·공고 연결`,
          portfolio: '',
          referencePosts: '',
        }
      : undefined,
  };

  return NextResponse.json({
    type: 'recommend',
    result: {
      primary: {
        name: primaryCandidate.자격증명,
        reason: primaryCandidate.reasons.slice(0,2).join('. ') + '.',
        caution: primaryCandidate.caution,
        detailUrl: detailInfo?.detail || undefined,
        scheduleUrl: detailInfo?.schedule || undefined,
        examConfirmed,
        scheduleItems: scheduleItems.length > 0 ? scheduleItems : undefined,
      },
      alternatives,
      path: {
        basic: learningResources.basic,
        alternative: learningResources.alternative,
      },
      todayBriefing: buildTodayBriefing(
        (learningPath as { weekly?: Array<{ week: number; range: string; focus: string }> }).weekly || [],
        primaryCandidate.자격증명,
        profile,
      ),
      jobGuideline,
      usedInfo: usedInfoList,
      researchContext: researchContext || undefined,
    },
    recommendation,
    message: profile.진로
      ? `${primaryCandidate.자격증명}을(를) 1순위로 추천해요. ${primaryCandidate.reasons.slice(0,2).join('. ')}. 공식 URL: ${detailInfo?.detail || '참조표 확인 필요'}`
      : '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
  })
}
