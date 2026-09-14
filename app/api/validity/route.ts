import { NextRequest, NextResponse } from 'next/server'

// P1-5: 유효기간 자산 관리 — 사용자 원할 때만
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { qualification, 취득일자, 만료일자, userWantsValidity } = body
  const q = (qualification ?? '정보처리기사').toString().trim()

  if (!userWantsValidity) {
    return NextResponse.json({
      type: 'validity',
      status: '원치_않음',
      message: '유효기간 관리는 사용자가 원할 때만 진행해요. 원하지 않으면 이름·등급 중심으로만 확인해요.',
      asset: { name: q, grade: '등급 미확인' },
    })
  }

  return NextResponse.json(유효성검토(q, 취득일자, 만료일자))
}

function 유효성검토(q: string, 취득일자?: string, 만료일자?: string): {
  type: string
  asset: { name: string; 취득일자?: string; 만료일자?: string; 공인유효기간?: string }
  status: string
  message: string
  renewalNote?: string
} {
  const now = new Date()

  if (!취득일자 || !만료일자) {
    return {
      type: 'validity',
      asset: { name: q, 공인유효기간: '공식 규정 확인 필요' },
      status: '확인_필요',
      message: `${q}의 취득/만료 시점이 제공되지 않았어요. 취득일자·만료일자를 알려주면 유효 여부와 갱신 시점을 검토해요.`,
      renewalNote: '유효기간 관리는 사용자가 원할 때만 진행해요.',
    }
  }

  const 취득 = new Date(취득일자)
  const 만료 = new Date(만료일자)
  const 남은일 = Math.ceil((만료.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (남은일 < 0) {
    return {
      type: 'validity',
      asset: { name: q, 취득일자, 만료일자, 공인유효기간: '만료됨' },
      status: '만료',
      message: `${q}는 이미 만료됐어요 (만료: ${만료.toLocaleDateString('ko-KR')}). 갱신 필요 여부를 확인해 보세요.`,
      renewalNote: `갱신이 필요하면 갱신 시험/신청 일정과 비용을 확인하고, 진로 요건 대비 유효 여부를 함께 검토해요.`,
    }
  }
  if (남은일 <= 180) {
    return {
      type: 'validity',
      asset: { name: q, 취득일자, 만료일자, 공인유효기간: `만료까지 ${남은일}일 남음` },
      status: '만료_임박',
      message: `${q}는 만료까지 약 ${남은일}일 남았어요 (${만료.toLocaleDateString('ko-KR')}). 갱신 시점을 검토해 보세요.`,
      renewalNote: `갱신이 필요하면 갱신 시험/신청 일정과 비용을 확인하고, 진로 요건 대비 유효 여부를 함께 검토해요.`,
    }
  }
  return {
    type: 'validity',
    asset: { name: q, 취득일자, 만료일자, 공인유효기간: `유효 (만료: ${만료.toLocaleDateString('ko-KR')})` },
    status: '유효',
    message: `${q}는 현재 유효해요 (만료: ${만료.toLocaleDateString('ko-KR')}). 남은 기간 동안 진로 요건에 맞춰 활용 가능해요.`,
    renewalNote: '특별한 갱신 조치 없이 현재 유효 상태를 유지해요.',
  }
}
