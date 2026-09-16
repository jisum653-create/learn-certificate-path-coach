import { NextRequest, NextResponse } from 'next/server'
import { recommend, Profile, RecommendationCandidate } from '../../lib/recommend'
import { getQualificationSchedule, ScheduleItem } from '../../lib/qualification-extract'
import { QUALIFICATION_DETAIL_URLS, QUALIFICATION_URLS } from '../../lib/reference-data'
import { webResearch, buildResearchContext } from '../../lib/service-search'
import { classifyIntent } from '../../lib/intent'

/**
 * 프로필·메시지 기반으로 웹 리서치 검색 쿼리 생성
 * - 진로/관심공고 기반: 직무+자격증 관련 검색
 * - 보유자격증 기반: 연계/다음 단계 검색
 * - 메시지에서 특정 자격증 언급 시: 해당 자격증 정보 검색
 */
function buildWebResearchQuery(profile: Profile, message: string): string | null {
  const parts: string[] = []

  // 진로 기반 검색
  if (profile.진로) {
    parts.push(`${profile.진로} 자격증 추천 2026`)
  }

  // 관심 공고 기반 검색
  if (profile.관심공고) {
    parts.push(`${profile.관심공고} 채용 자격증 우대 2026`)
  }

  // 보유 자격증 기반 연계 검색
  if (profile.보유자격증 && profile.보유자격증.length > 0) {
    const lastCert = profile.보유자격증[profile.보유자격증.length - 1]
    parts.push(`${lastCert} 다음 단계 자격증 ${profile.진로 || '취업'}`)
  }

  // 메시지에서 특정 자격증 언급 시 해당 자격증 검색
  if (message) {
    const certMatch = message.match(/(정보처리기사|정보처리산업기사|정보처리기능사|정보보안기사|정보보안산업기사|SQLD|ADsP|ADP|빅데이터분석기사|컴퓨터활용능력|GTQ|리눅스마스터|네트워크관리사|ERP정보관리사|투자자산운용사|금융투자분석사|재무위험관리사|TOEIC|한국사능력검정시험|ITQ|무역영어|유통관리사|전산회계|전산세무)/)
    if (certMatch) {
      parts.push(`${certMatch[1]} 자격증 정보 시험일정 2026`)
    }
  }

  return parts.length > 0 ? parts[0] : null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Profile | undefined
  const message = (body.message as string) || ''

  const intentResult = classifyIntent(message, profile || {})

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

  // 1. 프로필 없으면 추천 불가
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
      plan,
      message: ` ${q} 학습 계획을 세웠어요.`,
    })
  }

  // 프로필 반영/보완
  if (intentResult.intent === 'profile') {
    const update: Partial<Profile> = { 메시지: '프로필 조건 반영 요청' }
    if (intentResult.certMentions.length > 0) {
      update.메시지 = `프로필 반영 요청 (언급 자격증: ${intentResult.certMentions.map(m => m.standard).join(', ')})`
    }
    return NextResponse.json({
      type: 'profile',
      profileUpdate: update,
      message: '프로필 조건을 반영했어요. 필요하면 자격증 추천도 다시 볼 수 있어요.',
    })
  }

  // 2. 웹 리서치 — 네이버 뉴스 검색 + Jina Reader URL 방문
  let researchOutput = null
  let researchContext = ''
  try {
    const query = buildWebResearchQuery(profile, message)
    // 추천 후보 중 상위 3개의 공식 URL 목록 (웹 리서치 방문 대상)
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

  // 3. 프로필 기반 추천 후보 필터링 + 순위 매김
  const candidates = recommend(profile, message)

  // 디버깅: 후보 산정 근거 로그
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
  console.log('[recommend/DEBUG] 후보 수:', candidates.length)
  if (candidates.length > 0) {
    console.log('[recommend/DEBUG] 상위 후보:', candidates.slice(0,5).map(c => ({ name: c.자격증명, score: c.score, reasons: c.reasons.slice(0,2) })))
  } else {
    console.log('[recommend/DEBUG] QUALIFICATION_URLS 키 수:', Object.keys(QUALIFICATION_URLS).length)
    console.log('[recommend/DEBUG] QUALIFICATION_URLS keys:', Object.keys(QUALIFICATION_URLS).slice(0,10))
  }

  if (candidates.length === 0) {
    return NextResponse.json({
      type: 'recommend',
      result: null,
      message: '프로필 조건으로는 추천할 자격증이 없어요. 진로·관심공고·가용시간 등을 더 알려주시면 다시 추천할게요.',
      usedInfo: ['프로필 조건 불일치 — 추천 후보 없음'],
    })
  }

  // 3. 1순위 + 대안
  const primaryCandidate = candidates[0]
  const primary: RecommendationCandidate = {
    ...primaryCandidate,
  }
  const alternatives = candidates.slice(1, 4).map(c => ({
    name: c.자격증명,
    reason: c.reasons.slice(0, 2).join('. ') + '.',
  }))

  // 3. 공식 정보 검증 (schedule 데이터 병합)
  let scheduleItems: ScheduleItem[] = []
  let examConfirmed = false
  try {
    scheduleItems = await getQualificationSchedule(primary.자격증명)
    examConfirmed = scheduleItems.some(item => item.confirmed)
  } catch (e) {
    console.error('[recommend] 일정 추출 오류:', e)
  }

  // 4. 학습 경로 (현재는 기본 텍스트 반환 — 추후 확장)
  const learningPath = {
    primary: primary.자격증명,
    note: primary.reasons.slice(0, 3).join(' / '),
  }

  // 5. 취업 가이드라인 (관심 공고/목표 직무 있을 때만)
  const jobGuideline = (profile.관심공고 || profile.진로)
    ? {
        qualification: primary.자격증명,
        note: `관심 공고·진로 기반 추천: ${primary.자격증명}`,
      }
    : null

  // 6. 공식 URL 정보
  const detailInfo = QUALIFICATION_DETAIL_URLS[primary.자격증명]

  // 5b. 프론트 dashboard용 추천 결과 (RecResult 호환)
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

  const recommendation = {
    primary: {
      name: primary.자격증명,
      reason: primary.reasons.slice(0,2).join('. ') + '.',
      prepRange,
      caution: primary.caution || '',
    },
    alternatives,
    path: {
      basic: {
        lecture: '공식 강의·학습자료는 자격증 상세 페이지에서 확인',
        examMaterial: '공식 기출문제·자료실 참조',
        textbook: '공식 교재 확인 권장',
        estimatedCost: examConfirmed
          ? (scheduleItems.find(i => i.label === '응시료')?.value || '응시료 미확인')
          : '응시료 미확인 (공식 응시료 페이지 확인 필요)',
        reason: learningPath.note,
      },
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
        name: primary.자격증명,
        reason: primary.reasons.slice(0,2).join('. ') + '.',
        caution: primary.caution,
        detailUrl: detailInfo?.detail || undefined,
        scheduleUrl: detailInfo?.schedule || undefined,
        examConfirmed,
        scheduleItems: scheduleItems.length > 0 ? scheduleItems : undefined,
      },
      alternatives,
      path: learningPath,
      jobGuideline,
      usedInfo: usedInfoList,
      researchContext: researchContext || undefined,
    },
    recommendation,
    message: profile.진로
      ? `${primary.자격증명}을(를) 1순위로 추천해요. ${primary.reasons.slice(0,2).join('. ')}. 공식 URL: ${detailInfo?.detail || '참조표 확인 필요'}`
      : '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
  })
}

function buildPlanFromQualification(q: string, items: ScheduleItem[], profile: Profile): any {
  return {
    qualification: q,
    schedule: items,
    studyPlan: {
      totalWeeks: 12,
      note: '공식 시험 일정 확인 후 세부 계획 확정',
    },
  }
}
