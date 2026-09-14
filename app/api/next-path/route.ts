import { NextRequest, NextResponse } from 'next/server'

// P1-2: 취득 후 다음 경로 + 보유 자격증 갱신
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { profile, qualification, consent } = body
  const p = profile ?? {}
  const qual = (qualification ?? '정보처리기사').toString().trim()

  const 취득발화 = /취득했어|취득했|땄어|땄|합격했어|합격했|합격이다|합격/i.test(qual)
  if (취득발화) {
    const 취득완료 = (p.취득완료자격 as string[] | undefined) ?? []
    const 갱신동의 = consent === true
    const updated = 갱신동의 ? Array.from(new Set([...취득완료, qual])) : 취득완료
    return NextResponse.json({
      type: 'nextpath',
      nextPath: buildNextPath(p, qual, 갱신동의 ? updated : 취득완료),
      profileUpdate: { 취득완료자격: updated },
    })
  }

  return NextResponse.json({
    type: 'nextpath',
    nextPath: {
      primary: { name: '먼저 취득한 자격증명을 알려주세요', reason: '취득 완료 정보를 받아야 다음 경로를 제안할 수 있어요.' },
      alternatives: [],
      note: '취득한 자격증명을 알려주면 그 자격증을 기준으로 중복·충돌을 확인하고 다음 경로를 제안해요.',
    },
    profileUpdate: {},
  })
}

function buildNextPath(p: Record<string, unknown>, newQual: string, updated: string[]): {
  primary: { name: string; reason: string; prepRange: string; caution: string }
  alternatives: { name: string; reason: string }[]
  note: string
} {
  if (updated.some(q => /정보처리/i.test(q))) {
    return {
      primary: {
        name: 'SQLD',
        reason: '정보처리기사로 IT 기본기를 갖춘 뒤 데이터·DB 실무로 연결하기 좋은 다음 자격.',
        prepRange: '하루 1~2시간 기준 약 2~3개월',
        caution: '데이터 직무 관심이 실제 있을 때만 추천 — 아니면 프로젝트·실무부터 먼저 고려.',
      },
      alternatives: [
        { name: '컴퓨터활용능력 1급', reason: '사무·제안 실무에서 엑셀 능력이 필요한 경우 보조 활용.' },
        { name: '전산회계 1급', reason: 'IT+회계 융합 방향(erp 등)으로 관심이 있다면 대안 가능.' },
      ],
      note: '보유 자격증 갱신(동의 후) 후 중복 후보는 하향하고, 새로운 직무 가치를 더하는 방향으로 1순위+대안을 제시해요. 추가 자격증보다 프로젝트·실무·포트폴리오가 우선인 시점이면 솔직히 말해요.',
    }
  }
  return {
    primary: {
      name: '추천 검토 필요',
      reason: '취득한 자격증 기반으로 다음 경로를 검토 중이에요.',
      prepRange: '',
      caution: '',
    },
    alternatives: [],
    note: '취득한 자격증 정보를 바탕으로 중복·충돌을 확인하고 다음 경로를 제안해요.',
  }
}
