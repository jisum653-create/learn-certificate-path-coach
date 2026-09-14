import { NextRequest, NextResponse } from 'next/server'

// P1-3: 프로필 조건 변경 반영 — 새 정보만 갱신, 이미 확인된 값은 함부로 바꾸지 않음
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { profile } = body
  const p = profile ?? {}
  const updated: Record<string, unknown> = {}
  const fields = [
    '진로', '보유자격증', '학습방식', '비용선호', '예산',
    '가용시간', '목표시기', '목표회차', '관심공고',
    '취득완료자격', '영어성적', '유효기간자산',
  ] as const
  for (const f of fields) {
    if (p[f] !== undefined && p[f] !== null) {
      (updated as Record<string, unknown>)[f] = p[f]
    }
  }
  return NextResponse.json({
    type: 'profile',
    profileUpdate: updated,
    message: '프로필 조건이 반영됐어요. 변경된 조건에 따라 기존 추천·계획이 재계산돼요.',
  })
}
