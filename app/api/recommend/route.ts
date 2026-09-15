import { NextRequest, NextResponse } from 'next/server'
import { recommend, Profile, RecommendationCandidate } from '../../lib/recommend'
import { getQualificationSchedule, ScheduleItem } from '../../lib/qualification-extract'
import { QUALIFICATION_DETAIL_URLS } from '../../lib/reference-data'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Profile | undefined
  const message = (body.message as string) || ''

  // 1. 프로필 없으면 추천 불가
  if (!profile) {
    return NextResponse.json({
      type: 'recommend',
      result: null,
      message: '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
      usedInfo: ['프로필 미설정 — 추천 후보 없음'],
    })
  }

  // 2. 프로필 기반 추천 후보 필터링 + 순위 매김
  const candidates = recommend(profile, message)

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

  return NextResponse.json({
    type: 'recommend',
    result: {
      primary: {
        name: primary.자격증명,
        reason: primary.reasons.slice(0, 2).join('. ') + '.',
        caution: primary.caution,
        detailUrl: detailInfo?.detail || undefined,
        scheduleUrl: detailInfo?.schedule || undefined,
        examConfirmed,
        scheduleItems: scheduleItems.length > 0 ? scheduleItems : undefined,
      },
      alternatives,
      path: learningPath,
      jobGuideline,
      usedInfo: [
        `프로필: 진로(${profile.진로 || '미설정'}), 보유자격증(${(profile.보유자격증 || []).join(', ') || '없음'}), 학습방식(${profile.학습방식 || '미설정'}), 비용선호(${profile.비용선호 || '미설정'}), 가용시간(${profile.가용시간 || '미설정'}), 목표시기(${profile.목표시기 || '미설정'})`,
        `공식 URL 참조표: ${detailInfo?.detail || '참조표 미등록'}`,
        examConfirmed ? 'web_extract(Jina Reader/cheerio)로 공식 원문 확인 완료' : '공식 일정 미발표 — web_extract로 재확인 필요',
        detailInfo ? `공식 상세 페이지: ${detailInfo.detail}` : '',
      ].filter(Boolean),
    },
    message: profile.진로
      ? `${primary.자격증명}을(를) 1순위로 추천해요. ${primary.reasons.slice(0,2).join('. ')}. 공식 URL: ${detailInfo?.detail || '참조표 확인 필요'}`
      : '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
  })
}
