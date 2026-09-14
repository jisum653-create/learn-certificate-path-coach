
// P0-1: 사용자 조건 기반 1순위+대안 추천
// P0-3: 개인화 학습 경로 (유료 강의 가이드라인 포함)
// P1-6: 취업 가이드라인 (조건부 — 관심 공고·목표 직무 있을 때만)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Record<string, unknown> | undefined
  const message = (body.message as string | undefined) ?? ''

  return NextResponse.json({
    type: 'recommend',
    result: {
      primary: { name: '정보처리기사', reason: '프로필 기반 1순위 후보 (실제 연동 시 web_extract로 검증)', prepRange: '하루 1~2시간 기준 약 3~4개월', caution: '실제 추천은 프로필 기반 재계산 필요' },
      alternatives: [{ name: 'SQLD', reason: '데이터·DB 실무 연결 대안 (실제 연동 시 추천 로직 기반)' }],
      path: {
        basic: {
          lecture: '무료 강의 후보 (실제 연동 시 강의 검증 블록 산출)',
          examMaterial: '공식 기출·자료 (실제 연동 시 web_extract로 확인)',
          textbook: '기본 교재 1권 (실제 연동 시 교재 검증 블록 산출)',
          estimatedCost: '응시료 + 교재 비용 (실제 연동 시 총비용 산출)',
          paidLecture: '유료 허용 시 유료 후보 포함 (실제 연동 시 유료 가이드라인 적용)',
          caution: '유료 강의는 가격·무료 전환 지점·전체 범위 cover 여부 표시, 무료 대안 함께 제시',
        },
      },
      usedInfo: ['프로필: 진로, 보유자격증, 학습방식, 비용선호, 가용시간, 목표시기'],
    },
    message: profile ? '프로필을 바탕으로 1순위 자격증과 대안을 추천했어요. (실제 연동 시 web_extract로 공식 정보 검증 포함)' : '프로필 정보를 알려주시면 조건에 맞는 1순위+대안 자격증을 추천해요.',
  })
}

