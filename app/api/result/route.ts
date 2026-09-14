import { NextRequest, NextResponse } from 'next/server'

// P1-4: 합격/불합격 결과 반영
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { qualification, result, profile } = body
  const qual = (qualification ?? '정보처리기사').toString().trim()
  const r = result ?? '합격'
  const p = profile ?? {}

  if (r === '합격') {
    const 취득완료 = (p.취득완료자격 as string[] | undefined) ?? []
    const updated = Array.from(new Set([...취득완료, qual]))
    return NextResponse.json({
      type: 'result',
      message: `${qual} 합격을 축하드려요. 보유 자격증에 추가하고, 다음 자격증 후보를 제안할게요.`,
      profileUpdate: { 취득완료자격: updated, 상태: '합격' },
      nextRecommendation: nextForPassed(qual, updated),
    })
  }

  return NextResponse.json({
    type: 'result',
    message: `${qual} 불합격 결과를 확인했어요. 진행률에서 완료율 가장 낮았던 단계부터 다시 살펴보면 돼요. 다음 회차 공식 일정을 확인한 뒤, 그 단계 비중을 올린 계획을 제안할게요. (위로보다 다음 계획을 먼저 제안)`,
    profileUpdate: { 상태: '불합격', 재도전자격: qual },
    replanNote: '완요율 최저 단계 비중 상향 계획을 제안해요.',
  })
}

function nextForPassed(qual: string, updated: string[]): { primary: { name: string; reason: string }; alternatives: { name: string; reason: string }[] } {
  if (updated.some(x => /정보처리/i.test(x))) {
    return {
      primary: { name: 'SQLD', reason: 'IT 기본기를 갖춘 뒤 데이터·DB 실무로 연결하기 좋은 다음 자격.' },
      alternatives: [
        { name: '컴퓨터활용능력 1급', reason: '사무·제안 실무에서 엑셀 능력이 필요한 경우 보조 활용.' },
        { name: '전산회계 1급', reason: 'IT+회계 융합 방향(erp 등)으로 관심이 있다면 대안 가능.' },
      ],
    }
  }
  return {
    primary: { name: '추천 검토 필요', reason: '취득한 자격증 기반으로 다음 자격증 후보를 검토 중이에요.' },
    alternatives: [],
  }
}
