import { NextRequest, NextResponse } from 'next/server'

// P0-4: 학습 계획·체크인·재조정 — Notion 학습 공간 + 오늘 브리핑

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const profile = body.profile as Record<string, unknown> | undefined
  const qualification = (body.qualification as string | undefined) ?? '정보처리기사'
  const examDate = (body.examDate as string | undefined) ?? '2026년 하반기'

  const now = new Date()
  const totalWeeks = 12 // 실제 연동 시 시험일까지 계산

  return NextResponse.json({
    type: 'study-plan',
    plan: {
      qualification,
      examDate,
      totalWeeks,
      weeks: Array.from({ length: totalWeeks }, (_, i) => ({
        week: i + 1,
        focus: i < 5 ? '개념 학습' : i < 8 ? '문제풀이' : i < 11 ? '기출·분석' : '모의고사·복습',
        hours: profile?.가용시간 ? `${profile.가용시간} 기준` : '하루 1~2시간',
        done: false,
      })),
      briefing: { task: '이번 주 개념 학습 진도 확인 + 약한 부분 표시', deadline: '이번 주 일요일' },
      status: '준비중',
    },
    message: `학습 계획을 세웠어요. 시험일까지 총 ${totalWeeks}주, 개념→문제풀이→기출→모의고사 순이에요. (실제 연동 시 Notion 학습 공간 생성 + 프로필 기반 맞춤 계획 포함)`,
  })
}
