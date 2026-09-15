// === 자격증 추천/일정용 추출 통합 함수 ===
// URL 참조표 + 실제 페이지 추출(cheerio/jina) + CSV 보조 참조

import { extractPage, extractMultipleUrls, ExtractedPage } from './extract';
import { QUALIFICATION_URLS, REFERENCE_FILES, JOB_REQUIREMENT_PATTERNS } from './reference-data';

// === 데이터 파싱 헬퍼 ===
function parseExamInfoFromText(text: string, qualification: string): { examDate: string; applyStart: string; applyEnd: string; fee: string; eligibility: string; source: string; confirmed: boolean } {
  const now = new Date();
  const 확인날짜 = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // 텍스트에서 날짜 패턴 찾기 (YYYY.MM.DD, YYYY년 MM월 DD일, MM/DD 등)
  const datePatterns = [
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/gi,
    /(\d{4})\.(\d{1,2})\.(\d{1,2})/g,
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
    /(\d{4})[-\s](\d{1,2})[-\s](\d{1,2})/g,
  ];

  const foundDates: string[] = [];
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const y = match[1] || match[3] || match[4];
      const m = match[2] || match[1];
      const d = match[3] || match[2];
      if (y && m && d && /^\d+$/.test(y) && /^\d+$/.test(m) && /^\d+$/.test(d)) {
        const dateStr = `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        // 미래 날짜 또는 올해 날짜만 필터링
        const parsed = new Date(parseInt(String(y)), parseInt(String(m)) - 1, parseInt(String(d)));
        const diffDays = (parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays >= -30) { // 지난 30일 이내 포함 (접수 중/임박 포함)
          foundDates.push(dateStr);
        }
      }
    }
  }

  // 중복 제거 + 정렬
  const uniqueDates = [...new Set(foundDates)].sort();

  // 응시료 찾기
  let fee = '미확인 — 공식 응시료 페이지 확인 필요';
  const feePatterns = [
    /응시료\s*[:\s]*(?:필기\s*[:\s]*)?([\d,]+(?:원|\s*원))/i,
    /fee\s*[:\s]*([\d,]+)/i,
    /응시\s*비용\s*[:\s]*([\d,]+)/i,
    /비용\s*[:\s]*([\d,]+원)/i,
  ];
  for (const pattern of feePatterns) {
    const match = pattern.exec(text);
    if (match) {
      fee = match[1] || match[0];
      break;
    }
  }

  // 접수 기간 찾기
  let applyStart = '미확인';
  let applyEnd = '미확인';
  const applyPatterns = [
    /접수\s*(시작|기간|일정|접수일)\s*[:\s]*([\d.]+[^,\n]*)/i,
    /원서\s*접수\s*[:\s]*([\d.]+[^,\n]*)/i,
    /접수\s*기간\s*[:\s]*(\d{1,2}[.]\d{1,2}[.]\d{2,4}\s*~\s*\d{1,2}[.]\d{1,2}[.]\d{2,4})/i,
  ];
  for (const pattern of applyPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      applyStart = match[1].trim();
      break;
    }
  }

  // 응시자격 찾기
  let eligibility = '미확인 — 공식 응시자격 페이지 확인 필요';
  const eligibilityPatterns = [
    /응시\s*자격\s*[:\s]*([^\n]{10,200})/i,
    /응시자격\s*[:\s]*([^\n]{10,200})/i,
    /지원\s*자격\s*[:\s]*([^\n]{10,200})/i,
    /자격\s*요건\s*[:\s]*([^\n]{10,200})/i,
  ];
  for (const pattern of eligibilityPatterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].length < 300) {
      eligibility = match[1].trim();
      break;
    }
  }

  // 공식 링크 찾기
  let sourceUrl = QUALIFICATION_URLS[qualification] || '';
  let source = sourceUrl ? `공식 홈페이지 (${sourceUrl})` : '주관기관 공식 홈페이지';

  // 공식 URL이 있으면 그걸 소스로
  if (sourceUrl) {
    source = `공식 홈페이지 ${sourceUrl}`;
  }

  const confirmed = foundDates.length > 0 || fee !== '미확인 — 공식 응시료 페이지 확인 필요' || eligibility !== '미확인 — 공식 응시자격 페이지 확인 필요';

  return {
    examDate: uniqueDates.length > 0 ? uniqueDates.join(', ') : '공식 일정 미발표 (회차별 공지 필요)',
    applyStart,
    applyEnd,
    fee,
    eligibility,
    source,
    confirmed,
  };
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
  const url = QUALIFICATION_URLS[qualification] || ''
  const source = url ? `공식 홈페이지 (${url})` : '주관기관 공식 홈페이지';
  const now = new Date();
  const 확인날짜 = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  // 공식 URL이 없으면 기본 템플릿
  if (!url) {
    return [
      { label: '접수 시작', value: '미확인 — 공식 일정 미발표', source: '주관기관 공식 홈페이지', note: 'web_extract로 주관기관 일정 공지 원문 확인 필요' },
      { label: '시험일', value: '공식 일정 미발표', source: '주관기관 공식 홈페이지', note: '웹리서치+web_extract로 공식 일정 확인 필요' },
      { label: '응시료', value: '미확인 — 공식 응시료 확인 필요', source: '주관기관 공식 홈페이지', note: 'web_extract로 응시료 페이지 확인 필요' },
      { label: '응시자격', value: '미확인 — 공식 응시자격 확인 필요', source: '주관기관 공식 홈페이지', note: 'web_extract로 응시자격 안내 확인 필요' },
      { label: '공식 접수 페이지', value: '주관기관 공식 웹사이트', source: '주관기관 공식 홈페이지' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ];
  }

  // 실제 URL에서 추출 시도
  try {
    const extracted = await extractPage(url);

    if (extracted.method === 'none' || !extracted.content) {
      // 추출 실패 시 보조 참조
      return [
        { label: '접수 시작', value: '미확인 — 공식 일정 미발표 (웹추출 실패)', source: `${url}`, note: 'web_extract로 원문 재확인 필요, 참고자료(CSV) 보조 가능' },
        { label: '시험일', value: '공식 일정 미발표', source: `${url}`, note: '웹리서치+웹추출로 공식 일정 확인 필요' },
        { label: '응시료', value: '미확인 — 공식 응시료 확인 필요', source: `${url}`, note: '웹추출로 응시료 페이지 확인 필요, 참고자료(CSV) 보조 가능' },
        { label: '응시자격', value: '미확인 — 공식 응시자격 확인 필요', source: `${url}`, note: '웹추출로 응시자격 안내 확인 필요' },
        { label: '공식 접수 페이지', value: url, source: '주관기관 공식 웹사이트', note: '직접 접속 확인 권장' },
        { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
      ];
    }

    // 추출한 텍스트에서 정보 파싱
    const info = parseExamInfoFromText(extracted.content, qualification);

    return [
      { label: '접수 시작', value: info.applyStart, source, note: info.confirmed ? 'web_extract로 공식 원문 확인 완료' : '공식 일정 미발표/미확인, web_extract로 재확인 필요', confirmed: info.confirmed },
      { label: '시험일', value: info.examDate, source, note: info.examDate !== '공식 일정 미발표 (회차별 공지 필요)' ? 'web_extract로 공식 일정 확인됨' : '공식 일정 미발표, 회차별 공지 확인 필요', confirmed: info.confirmed },
      { label: '응시료', value: info.fee, source, note: info.confirmed ? 'web_extract로 응시료 확인 완료' : '공식 응시료 페이지 확인 필요', confirmed: info.confirmed },
      { label: '응시자격', value: info.eligibility, source, note: info.confirmed ? 'web_extract로 응시자격 확인 완료' : '공식 응시자격 페이지 확인 필요', confirmed: info.confirmed },
      { label: '공식 접수 페이지', value: url, source: '주관기관 공식 웹사이트', note: '직접 접속하여 원서접수·일정 확인 권장' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각', note: 'PRD 데이터 규칙: 출처·기준 시각 표기' },
    ];
  } catch (err) {
    console.error(`[getQualificationSchedule] ${qualification} 추출 오류:`, err);
    return [
      { label: '접수 시작', value: '미확인 — 추출 오류', source: url, note: `웹추출 중 오류 발생: ${err}` },
      { label: '시험일', value: '공식 일정 미발표', source: url, note: '오류로 인한 확인 불가, 재시도 권장' },
      { label: '응시료', value: '미확인', source: url, note: '추출 오류로 확인 불가' },
      { label: '응시자격', value: '미확인', source: url, note: '추출 오류로 확인 불가' },
      { label: '공식 접수 페이지', value: url, source: '주관기관 공식 웹사이트' },
      { label: '확인 날짜', value: 확인날짜, source: '서비스 내부 확인 시각' },
    ];
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
