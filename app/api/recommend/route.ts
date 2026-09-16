import { NextRequest, NextResponse } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
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
      plan,
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

  // 목표 확정 자격이 있으면 우선 고정
  const goalStandard = intentResult.goalStandard
  let primaryCandidate: RecommendationCandidate
  let alternatives: Array<{ name: string; reason: string }>

  if (goalStandard) {
    const goalCandidate = candidates.find(c => c.자격증명 === goalStandard)
    if (goalCandidate) {
      const biased = applyGoalBias(candidates, goalStandard)
      primaryCandidate = biased.find(c => c.자격증명 === goalStandard) ?? goalCandidate
      alternatives = biased
        .filter(c => c.자격증명 !== goalStandard)
        .slice(0, 3)
        .map(c => ({ name: c.자격증명, reason: c.reasons.slice(0, 2).join('. ') + '.' }))
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
    const biased = applyGoalBias(candidates, null)
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

  const recommendation = {
    primary: {
      name: primaryCandidate.자격증명,
      reason: primaryCandidate.reasons.slice(0,2).join('. ') + '.',
      prepRange,
      caution: primaryCandidate.caution || '',
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
        name: primaryCandidate.자격증명,
        reason: primaryCandidate.reasons.slice(0,2).join('. ') + '.',
        caution: primaryCandidate.caution,
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
      ? `${primaryCandidate.자격증명}을(를) 1순위로 추천해요. ${primaryCandidate.reasons.slice(0,2).join('. ')}. 공식 URL: ${detailInfo?.detail || '참조표 확인 필요'}`
      : '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
  })
}