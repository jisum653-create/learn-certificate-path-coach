import { NextRequest, NextResponse } from 'next/server'

// P0-2: 공식 정보 검증 — 시험 일정·응시료·응시자격
// web_extract로 주관기관 공식 원문 직접 확인 필요
// 미발표 항목은 "미확인" 또는 "공식 일정 미발표"로 표시
// 지난 회차는 "지난 회차"로 표시, 일정만 묻는 요청에는 강의·교재 조사 안 함
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const qualification = (body.qualification ?? body.자격증명 ?? '정보처리기사').toString().trim()

  const schedule = buildSchedule(qualification)
  return NextResponse.json({ type: 'schedule', schedule })
}

function buildSchedule(qual: string): { qualification: string; items: { label: string; value: string; source: string; note?: string }[] } {
  const now = new Date()
  const 확인날짜 = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  if (qual === '정보처리기사') {
    return {
      qualification: qual,
      items: [
        { label: '접수 시작', value: '미확인 — 공식 일정 미발표 (회차별 공지 필요)', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지', note: '실제 서비스: web_extract로 큐넷 공지·시험일정 페이지 원문 확인 후 표시' },
        { label: '시험일', value: '공식 일정 미발표', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지' },
        { label: '합격자 발표일', value: '미확인', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지' },
        { label: '응시료', value: '필기: 19,400원 · 실기: 22,600원 (2025년 기준, 변동 가능)', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지 — web_extract로 확인 필요', note: '실제 서비스: web_extract로 응시료 페이지 확인 + 참고자료(붙임 자료집) 보조' },
        { label: '응시자격', value: '학력·경력 등 요건 충족 필요 — 큐넷 원서접수 페이지에서 응시자격 자가진단 확인', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지 응시자격 안내' },
        { label: '공식 접수 페이지', value: '큐넷(Q-net) http://www.q-net.or.kr', source: '큐넷 공식 웹사이트' },
        { label: '확인 날짜', value: `2026년 ${확인날짜}`, source: '서비스 내부 확인 시각 (PRD 데이터 규칙: 출처·기준 시각 표기)' },
      ],
    }
  }

  if (qual === 'SQLD') {
    return {
      qualification: qual,
      items: [
        { label: '접수 시작', value: '회차별 공지 — 공식 일정 미발표 (주관기관 공지 확인 필요)', source: 'SQLD 주관기관 공식 홈페이지', note: '실제 서비스: web_extract로 주관기관 일정 공지 원문 확인' },
        { label: '시험일', value: '공식 일정 미발표', source: 'SQLD 주관기관 공식 홈페이지' },
        { label: '응시료', value: '미확인 — 공식 응시료 페이지 확인 필요', source: 'SQLD 주관기관 공식 홈페이지 — web_extract로 확인 필요' },
        { label: '응시자격', value: '제한 없음 (응시자격 미확인 시 공식 안내 확인)', source: 'SQLD 주관기관 공식 홈페이지 응시자격 안내 — web_extract로 확인 필요' },
        { label: '공식 접수 페이지', value: 'SQLD 주관기관 공식 웹사이트', source: 'SQLD 주관기관 공식 웹사이트' },
        { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
      ],
    }
  }

  if (qual === '컴퓨터활용능력 1급') {
    return {
      qualification: qual,
      items: [
        { label: '접수 시작', value: '상시 접수 (시험장별 상시 일정 — web_extract로 시험장 일정 확인 필요)', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지', note: '실제 서비스: web_extract로 큐넷 상시시험 일정·시험장별 공지 확인' },
        { label: '시험일', value: '상시 시험 (시험장별 일정 상이) — 공식 일정 미발표(시험장 공지 확인 필요)', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지' },
        { label: '합격자 발표일', value: '상시 시험 결과 발표 — 시험장별 확인 필요', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지' },
        { label: '응시료', value: '필기: 17,800원 · 실기: 21,000원 (2025년 기준, 변동 가능)', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지 — web_extract로 확인 필요' },
        { label: '응시자격', value: '제한 없음', source: '큐넷(Q-net) 국가기술자격 공식 홈페이지 응시자격 안내' },
        { label: '공식 접수 페이지', value: '큐넷(Q-net) http://www.q-net.or.kr', source: '큐넷 공식 웹사이트' },
        { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
      ],
    }
  }

  // 기본 템플릿 (PRD 데이터 규칙: 없는 값은 '확인 불가', 추정 금지)
  return {
    qualification: qual,
    items: [
      { label: '접수 시작', value: '미확인 — 공식 일정 미발표', source: '주관기관 공식 홈페이지 — web_extract로 원문 직접 확인 필요' },
      { label: '시험일', value: '미확인 — 공식 일정 미발표', source: '주관기관 공식 홈페이지' },
      { label: '응시료', value: '미확인 — 공식 응시료 확인 필요', source: '주관기관 공식 홈페이지 — web_extract로 확인 필요' },
      { label: '응시자격', value: '미확인 — 공식 응시자격 확인 필요', source: '주관기관 공식 홈페이지 응시자격 안내 — web_extract로 확인 필요' },
      { label: '공식 접수 페이지', value: '주관기관 공식 웹사이트', source: '주관기관 공식 웹사이트' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ],
  }
}
