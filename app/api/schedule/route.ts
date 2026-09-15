import { NextRequest, NextResponse } from 'next/server'
import { getQualificationSchedule, ScheduleItem } from '../../lib/qualification-extract'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const qualification = (body.qualification ?? body.자격증명 ?? '정보처리기사').toString().trim()

  let schedule: ScheduleItem[] = []
  let error = null

  try {
    schedule = await getQualificationSchedule(qualification)
  } catch (e) {
    error = String(e)
    schedule = [{
      label: '오류',
      value: `일정 추출 중 오류 발생: ${error}`,
      source: '서비스 내부',
      note: '재시도하거나 직접 공식 홈페이지 확인 권장',
    }]
  }

  return NextResponse.json({
    type: 'schedule',
    schedule,
    qualification,
    error: error || null,
  })
}
