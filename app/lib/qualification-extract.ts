// === 자격증 추천/일정용 추출 통합 함수 ===
// URL 참조표 + 실제 페이지 추출(cheerio/jina) + CSV 보조 참조

import { extractPage, extractMultipleUrls, ExtractedPage } from './extract';
import { QUALIFICATION_URLS, QUALIFICATION_DETAIL_URLS, REFERENCE_FILES, JOB_REQUIREMENT_PATTERNS } from './reference-data';

// === 데이터 파싱 헬퍼 — 각 필드 독립 검증 ===
// 반환: 각 필드마다 값 + 확인 여부 + 출처. 확인하지 못한 값은 추측하지 않음.
interface ParsedExamInfo {
  examDate: string
  examDateConfirmed: boolean
  examDateSource: string
  applyStart: string
  applyStartConfirmed: boolean
  applyStartSource: string
  applyEnd: string
  applyEndConfirmed: boolean
  applyEndSource: string
  fee: string
  feeConfirmed: boolean
  feeSource: string
  eligibility: string
  eligibilityConfirmed: boolean
  eligibilitySource: string
}

export function parseExamInfoFromText(text: string, qualification: string, sourceUrl: string): ParsedExamInfo {
  const now = new Date()
  const 확인날짜 = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
  const defaultSource = sourceUrl ? `공식 홈페이지 (${sourceUrl})` : '주관기관 공식 홈페이지'

  // ── 시험일 (examDate) ──────────────────────────────────────────────
  // 주의: "2022-04호" 같은 자격번호·등록번호를 시험일로 오인하지 않도록
  // 자격증명/인증번호 패턴("○○ 공인자격 제YYYY-NN호")은 제외
  const certNumberPattern = /\s*공인자격\s*제\s*\d{4}\s*[-–]\s*\d+\s*호/i

  // 날짜 패턴 (시험일로 적절한 맥락에서만 수집)
  const datePatterns = [
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/gi,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/g,
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
    /(\d{4})[-\s](\d{1,2})[-\s](\d{1,2})/g,
  ]

  const foundDates: { dateStr: string; context: string }[] = []
  for (const pattern of datePatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const y = match[1] || match[3] || match[4]
      const m = match[2] || match[1]
      const d = match[3] || match[2]
      if (y && m && d && /^\d+$/.test(y) && /^\d+$/.test(m) && /^\d+$/.test(d)) {
        const dateStr = `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`
        // 날짜 주변 60자 맥락을 저장하여 자격번호 패턴과 구분
        const start = Math.max(0, match.index - 60)
        const end = Math.min(text.length, match.index + match[0].length + 60)
        const context = text.slice(start, end)
        // 자격증명 번호 패턴이면 제외
        if (certNumberPattern.test(context)) continue
        const parsed = new Date(parseInt(String(y)), parseInt(String(m)) - 1, parseInt(String(d)))
        const diffDays = (parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        // 과거 날짜 중 이미 지난 시험 회차도 포함 (공식 발표 이력 확인용)
        if (diffDays >= -180) {
          foundDates.push({ dateStr, context })
        }
      }
    }
  }

  // 중복 제거 + 정렬
  const uniqueDatesMap = new Map<string, string>()
  for (const { dateStr, context } of foundDates) {
    if (!uniqueDatesMap.has(dateStr)) uniqueDatesMap.set(dateStr, context)
  }
  const uniqueDates = [...uniqueDatesMap.keys()].sort()

  let examDate = '공식 일정 미발표 (회차별 공지 필요)'
  let examDateConfirmed = false
  let examDateSource = defaultSource

  if (uniqueDates.length > 0) {
    examDate = uniqueDates.join(', ')
    examDateConfirmed = true
    examDateSource = defaultSource
  }

  // ── 응시료 (fee) ────────────────────────────────────────────────────
  let fee = '미확인 — 공식 응시료 페이지 확인 필요'
  let feeConfirmed = false
  let feeSource = defaultSource

  const feePatterns = [
    /응시료\s*[:\s]*(?:필기\s*[:\s]*)?([\d,]+(?:원|\s*원))/i,
    /fee\s*[:\s]*([\d,]+)/i,
    /응시\s*비용\s*[:\s]*([\d,]+)/i,
    /비용\s*[:\s]*([\d,]+원)/i,
  ]
  for (const pattern of feePatterns) {
    const match = pattern.exec(text)
    if (match) {
      fee = match[1] || match[0]
      feeConfirmed = true
      feeSource = defaultSource
      break
    }
  }

  // ── 접수 시작 (applyStart) ───────────────────────────────────────────
  let applyStart = '미확인'
  let applyStartConfirmed = false
  let applyStartSource = defaultSource

  const applyStartPatterns = [
    /접수\s*(시작|기간|일정|접수일)\s*[:\s]*([\d.]+[^,\n]*)/i,
    /원서\s*접수\s*[:\s]*([\d.]+[^,\n]*)/i,
  ]
  for (const pattern of applyStartPatterns) {
    const match = pattern.exec(text)
    if (match && match[1]) {
      applyStart = match[1].trim()
      // 단순 날짜 형식이거나 기간이 명시되어 있으면 확인으로 간주
      if (/^\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}/.test(applyStart) ||
          /^\d{1,2}[-.]\d{1,2}[-.]\d{2,4}/.test(applyStart) ||
          applyStart.includes('~') || applyStart.includes('부터')) {
        applyStartConfirmed = true
      }
      applyStartSource = defaultSource
      break
    }
  }

  // ── 접수 종료 (applyEnd) ─────────────────────────────────────────────
  let applyEnd = '미확인'
  let applyEndConfirmed = false
  let applyEndSource = defaultSource

  const applyEndPatterns = [
    /접수\s*마감\s*[:\s]*([\d.]+[^,\n]*)/i,
    /접수\s*종료\s*[:\s]*([\d.]+[^,\n]*)/i,
    /접수기간\s*[:\s]*(\d{1,2}[.]\d{1,2}[.]\d{2,4}\s*~\s*\d{1,2}[.]\d{1,2}[.]\d{2,4})/i,
  ]
  for (const pattern of applyEndPatterns) {
    const match = pattern.exec(text)
    if (match && match[1]) {
      const captured = match[1].trim()
      // 기간 형식에서 종료일만 추출
      const endMatch = captured.match(/(\d{1,2}[.]\d{1,2}[.]\d{2,4})\s*$/)
      applyEnd = endMatch ? endMatch[1] : captured
      applyEndConfirmed = true
      applyEndSource = defaultSource
      break
    }
  }

  // 기간이 "시작일 ~ 종료일" 형태로 하나의 매칭에 있으면 분리
  if (!applyEndConfirmed) {
    const rangeMatch = text.match(/접수\s*기간\s*[:\s]*(\d{1,2}[.]\d{1,2}[.]\d{2,4})\s*~\s*(\d{1,2}[.]\d{1,2}[.]\d{2,4})/i)
    if (rangeMatch) {
      applyStart = rangeMatch[1]
      applyEnd = rangeMatch[2]
      applyStartConfirmed = true
      applyEndConfirmed = true
      applyStartSource = defaultSource
      applyEndSource = defaultSource
    }
  }

  // ── 응시자격 (eligibility) ────────────────────────────────────────────
  let eligibility = '미확인 — 공식 응시자격 페이지 확인 필요'
  let eligibilityConfirmed = false
  let eligibilitySource = defaultSource

  const eligibilityPatterns = [
    /응시\s*자격\s*[:\s]*([^\n]{10,300})/i,
    /응시자격\s*[:\s]*([^\n]{10,300})/i,
    /지원\s*자격\s*[:\s]*([^\n]{10,300})/i,
    /자격\s*요건\s*[:\s]*([^\n]{10,300})/i,
    /응시\s*요건\s*[:\s]*([^\n]{10,300})/i,
  ]
  for (const pattern of eligibilityPatterns) {
    const match = pattern.exec(text)
    if (match && match[1] && match[1].length < 500) {
      eligibility = match[1].trim()
      eligibilityConfirmed = true
      eligibilitySource = defaultSource
      break
    }
  }

  return {
    examDate,
    examDateConfirmed,
    examDateSource,
    applyStart,
    applyStartConfirmed,
    applyStartSource,
    applyEnd,
    applyEndConfirmed,
    applyEndSource,
    fee,
    feeConfirmed,
    feeSource,
    eligibility,
    eligibilityConfirmed,
    eligibilitySource,
  }
}

// === 자격증별 공식 일정 추출 ===
export interface ScheduleItem {
  label: string;
  value: string;
  source: string;
  note?: string;
  confirmed?: boolean;
}

export async function getQualificationSchedule(qualification: string): Promise<ScheduleItem[]> {
  const detailUrls = QUALIFICATION_DETAIL_URLS[qualification]
  const scheduleUrl = detailUrls?.schedule
  const introUrl = QUALIFICATION_URLS[qualification] || ''
  const sourceBase = scheduleUrl || introUrl ? `공식 홈페이지 (${scheduleUrl || introUrl})` : '주관기관 공식 홈페이지'
  const now = new Date()
  const 확인날짜 = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  // 공식 URL이 전혀 없으면 기본 템플릿
  if (!scheduleUrl && !introUrl) {
    return [
      { label: '접수 시작', value: '미확인 — 공식 일정 미발표', source: '주관기관 공식 홈페이지', note: 'web_extract로 주관기관 일정 공지 원문 확인 필요' },
      { label: '시험일', value: '공식 일정 미발표', source: '주관기관 공식 홈페이지', note: '웹리서치+web_extract로 공식 일정 확인 필요' },
      { label: '응시료', value: '미확인 — 공식 응시료 확인 필요', source: '주관기관 공식 홈페이지', note: 'web_extract로 응시료 페이지 확인 필요' },
      { label: '응시자격', value: '미확인 — 공식 응시자격 확인 필요', source: '주관기관 공식 홈페이지', note: 'web_extract로 응시자격 안내 확인 필요' },
      { label: '공식 접수 페이지', value: '주관기관 공식 웹사이트', source: '주관기관 공식 홈페이지' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ]
  }

  // 실제 URL에서 추출 시도 — 일정 페이지를 우선 방문
  try {
    // 1순위: 실제 일정 페이지 (QUALIFICATION_DETAIL_URLS.schedule)
    const extracted = scheduleUrl
      ? await extractPage(scheduleUrl)
      : await extractPage(introUrl)

    if (extracted.method === 'none' || !extracted.content) {
      // 추출 실패 시 보조 참조
      const failUrl = scheduleUrl || introUrl
      return [
        { label: '접수 시작', value: '미확인 — 공식 일정 미발표 (웹추출 실패)', source: `${failUrl}`, note: 'web_extract로 원문 재확인 필요, 참고자료(CSV) 보조 가능' },
        { label: '시험일', value: '공식 일정 미발표', source: `${failUrl}`, note: '웹리서치+웹추출로 공식 일정 확인 필요' },
        { label: '응시료', value: '미확인 — 공식 응시료 확인 필요', source: `${failUrl}`, note: '웹추출로 응시료 페이지 확인 필요, 참고자료(CSV) 보조 가능' },
        { label: '응시자격', value: '미확인 — 공식 응시자격 확인 필요', source: `${failUrl}`, note: '웹추출로 응시자격 안내 확인 필요' },
        { label: '공식 접수 페이지', value: introUrl, source: '주관기관 공식 웹사이트', note: '직접 접속 확인 권장' },
        { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
      ]
    }

    // 추출한 텍스트에서 정보 파싱 — 실제 방문한 페이지 URL을 소스로 전달
    const info = parseExamInfoFromText(extracted.content, qualification, scheduleUrl || introUrl)

    return [
      { label: '접수 시작', value: info.applyStart, source: info.applyStartSource, note: info.applyStartConfirmed ? 'web_extract로 공식 원문 확인 완료' : '공식 일정 미발표/미확인, web_extract로 재확인 필요', confirmed: info.applyStartConfirmed },
      { label: '시험일', value: info.examDate, source: info.examDateSource, note: info.examDateConfirmed ? 'web_extract로 공식 일정 확인됨' : '공식 일정 미발표, 회차별 공지 확인 필요', confirmed: info.examDateConfirmed },
      { label: '응시료', value: info.fee, source: info.feeSource, note: info.feeConfirmed ? 'web_extract로 응시료 확인 완료' : '공식 응시료 페이지 확인 필요', confirmed: info.feeConfirmed },
      { label: '응시자격', value: info.eligibility, source: info.eligibilitySource, note: info.eligibilityConfirmed ? 'web_extract로 응시자격 확인 완료' : '공식 응시자격 페이지 확인 필요', confirmed: info.eligibilityConfirmed },
      { label: '공식 접수 페이지', value: introUrl, source: '주관기관 공식 웹사이트', note: '직접 접속하여 원서접수·일정 확인 권장' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ]
  } catch (err) {
    console.error(`[getQualificationSchedule] ${qualification} 추출 오류:`, err)
    return [
      { label: '접수 시작', value: '미확인 — 추출 오류', source: scheduleUrl || introUrl, note: `웹추출 중 오류 발생: ${err}` },
      { label: '시험일', value: '공식 일정 미발표', source: scheduleUrl || introUrl, note: '오류로 인한 확인 불가, 재시도 권장' },
      { label: '응시료', value: '미확인', source: scheduleUrl || introUrl, note: '추출 오류로 확인 불가' },
      { label: '응시자격', value: '미확인', source: scheduleUrl || introUrl, note: '추출 오류로 확인 불가' },
      { label: '공식 접수 페이지', value: introUrl, source: '주관기관 공식 웹사이트' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ]
  }
}

// === CSV 파일 내용 참조 (외부 파일, 웹추출 실패 시 보조) ===
export async function readCsvReference(qualification: string): Promise<{ overview?: string; method?: string; career?: string; notes?: string }> {
  // CSV 파일은 외부 참조용으로만, 서비스 코드에서는 파일 존재 시 내용 읽어서 보조 정보로 활용
  // 실제 구현에서는 서버 측에서 fs로 읽거나, 빌드 시 JSON으로 변환해서 내장
  // 여기선 구조만 정의

  const prefix = '한국산업인력공단_국가기술자격_종목별_시험정보_20251231.csv';

  // Node.js 환경에서만 fs 접근 가능 (서버 컴포넌트)
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    try {
      const fs = require('fs');
      const csvPath = REFERENCE_FILES.기술자격종목별.path;

      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, 'utf-8');
        const rows: string[][] = content.split('\n').map((line: string) => line.split(',').map((cell: string) => cell.replace(/^"|"$/g, '').trim()));

        // CSV 헤더: 종목명, 항목, 내용
        const data: Record<string, Record<string, string>> = {};
        for (const row of rows) {
          if (row.length >= 3 && row[0] && row[1] && row[2]) {
            const name = row[0];
            const key = row[1];
            const val = row[2];
            if (!data[name]) data[name] = {};
            data[name][key] = val;
          }
        }

        const qualData = data[qualification];
        if (qualData) {
          return {
            overview: qualData['개요'] || undefined,
            method: qualData['취득방법'] || undefined,
            career: qualData['진로 및 전망'] || undefined,
            notes: qualData['수행직무'] || undefined,
          };
        }
      }
    } catch (err) {
      // CSV 읽기 실패 시 빈 객체 반환 (운영 환경에서는 파일 접근 제한될 수 있음)
      console.warn(`[readCsvReference] ${qualification} CSV 참조 오류:`, err);
    }
  }

  return {};
}

// === 추천 시 참고 링크 목록 ===
export function getReferenceLinksForQualification(qualification: string): string[] {
  const url = QUALIFICATION_URLS[qualification];
  if (url) return [url];

  // URL이 없으면 관련 태그 기반으로 추천 링크 찾기
  const tags = QUALIFICATION_URLS[qualification] ? [] : [];

  // 기본: 큐넷, 상공회의소, dataq 등 주요 사이트 링크
  return [
    'https://www.q-net.or.kr/',
    'https://license.korcham.net/',
    'https://www.dataq.or.kr/',
    'https://license.kpc.or.kr/',
  ];
}
