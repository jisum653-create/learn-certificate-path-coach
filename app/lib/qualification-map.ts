// === 사용자 발화 속 자격증명 → 표준명 매핑 + 확정/미확정 판정 ===
// 표준명 키는 QUALIFICATION_URLS / QUALIFICATION_DETAIL_URLS 키와 동일해야 함

// 표준명 → 별칭 목록 (모두 소문자 정규화 기준)
export const CERT_ALIAS_MAP: Record<string, string[]> = {
  '빅데이터분석기사': ['빅데이터분석기사', '빅데이터 기사', '빅데이터기사'],
  'ADP (데이터분석 전문가)': ['adp', '데이터분석 전문가', '데이터 분석 전문가', 'adp(데이터분석 전문가)'],
  'ADsP (데이터분석 준전문가)': ['adsp', '데이터분석 준전문가', '데이터 분석 준전문가', 'adsp(데이터분석 준전문가)', '데이터분석준전문가'],
  'SQLP (SQL 전문가)': ['sqlp', 'sql 전문가', 'sqlp(sql 전문가)', 'sql전문가', 'sql 전문가 자격증'],
  'SQLD (SQL 개발자)': ['sqld', 'sql 개발자', 'sqld(sql 개발자)', 'sql개발자', 'sql 개발자 자격증', 'sql d', 'sqld sql 개발자'],
  '정보처리기사': ['정보처리기사', '정보처리 기사'],
  '정보처리산업기사': ['정보처리산업기사', '정보처리 산업기사'],
  '정보처리기능사': ['정보처리기능사', '정보처리 기능사'],
  '정보보안기사': ['정보보안기사', '정보보안 기사'],
  '정보보안산업기사': ['정보보안산업기사', '정보보안 산업기사'],
  '컴퓨터활용능력 1급': ['컴활 1급', '컴활1급', '컴퓨터활용능력 1급', '컴퓨터활용능력1급', '컴활1급 자격증', '컴활1급 준비', '컴활 1급 준비'],
  '컴퓨터활용능력 2급': ['컴활 2급', '컴활2급', '컴퓨터활용능력 2급', '컴퓨터활용능력2급', '컴활2급 자격증', '컴활2급 준비', '컴활 2급 준비'],
};

// 별칭 → 표준명 역매핑 (발화 매칭용, 소문자 정규화 키)
const REVERSE_ALIAS: Record<string, string> = {};
for (const [표준명, 별칭들] of Object.entries(CERT_ALIAS_MAP)) {
  for (const 별칭 of 별칭들) {
    REVERSE_ALIAS[별칭.toLowerCase()] = 표준명;
  }
}

// ===================== 발화에서 자격증명 추출 =====================

export interface CertMention {
  standard: string; // QUALIFICATION_URLS 키값
  raw: string;      // 발화에서 실제 드러난 원문(일부)
  position: number; // 발화 내 시작 인덱스
}

/**
 * 사용자 발화에서 자격증명 언급을 찾는다.
 * - 먼저 명확한 별칭/표준명 매칭
 * - 이어서 축약 패턴(sqlp, sqld, adsp, adp, 컴활 n급 등) 매칭
 */
export function extractCertMentions(text: string): CertMention[] {
  const lower = text.toLowerCase();
  const results: CertMention[] = [];

  // 1) 별칭/표준명 직접 매칭 (긴 것부터 우선)
  const aliases = Object.entries(CERT_ALIAS_MAP)
    .map(([표준, 별칭들]) => 별칭들.map((별칭) => ({ 별칭: 별칭.toLowerCase(), 표준 })))
    .flat()
    .sort((a, b) => b.별칭.length - a.별칭.length); // 긴 별칭 우선

  for (const { 별칭, 표준 } of aliases) {
    let idx = 0;
    while (true) {
      const pos = lower.indexOf(별칭, idx);
      if (pos === -1) break;
      // 이미 포함된 더 긴 매칭이 있으면 스킵
      if (results.some((r) => pos >= r.position && pos < r.position + r.raw.length)) {
        idx = pos + 별칭.length;
        continue;
      }
      results.push({
        standard: 표준,
        raw: text.slice(pos, pos + 별칭.length),
        position: pos,
      });
      idx = pos + 별칭.length;
    }
  }

  // 2) 축약 패턴 매칭 (이미 잡힌 것과 겹치면 스킵)
  const patterns: Array<{ regex: RegExp; 표준: string }> = [
    { regex: /\bsqlp\b/gi, 표준: 'SQLP (SQL 전문가)' },
    { regex: /\bsql\s*d\b|\bsqld\b/gi, 표준: 'SQLD (SQL 개발자)' },
    { regex: /\badsp\b/gi, 표준: 'ADsP (데이터분석 준전문가)' },
    { regex: /\badp\b/gi, 표준: 'ADP (데이터분석 전문가)' },
    { regex: /\b빅데이터\s*기사\b|\b빅데이터분석기사\b/gi, 표준: '빅데이터분석기사' },
    { regex: /\b정보처리\s*기사\b|\b정보처리기사\b/gi, 표준: '정보처리기사' },
    { regex: /\b정보처리\s*산업기사\b|\b정보처리산업기사\b/gi, 표준: '정보처리산업기사' },
    { regex: /\b정보처리\s*기능사\b|\b정보처리기능사\b/gi, 표준: '정보처리기능사' },
    { regex: /\b정보보안\s*기사\b|\b정보보안기사\b/gi, 표준: '정보보안기사' },
    { regex: /\b정보보안\s*산업기사\b|\b정보보안산업기사\b/gi, 표준: '정보보안산업기사' },
    { regex: /\b컴활\s*1급\b|\b컴퓨터활용능력\s*1급\b/gi, 표준: '컴퓨터활용능력 1급' },
    { regex: /\b컴활\s*2급\b|\b컴퓨터활용능력\s*2급\b/gi, 표준: '컴퓨터활용능력 2급' },
  ];

  const seen = new Set<string>();
  for (const { regex, 표준 } of patterns) {
    let m: RegExpExecArray | null;
    // regex가 gi면 lastIndex 기반 반복이 가능하지만, 일관성을 위해 수동 반복
    regex.lastIndex = 0;
    while ((m = regex.exec(lower)) !== null) {
      const pos = m.index;
      // 숫자 등급을 포함한 변형이 아니면 이미 매칭된 범위와 겹치는지 검사
      if (results.some((r) => pos >= r.position && pos < r.position + r.raw.toLowerCase().length)) {
        continue;
      }
      // sql d는 sqld와 겹칠 수 있으니, sqld가 이미 잡혔으면 스킵
      const key = `${표준}:${pos}:${lower.slice(pos, pos + m[0].length)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        standard: 표준,
        raw: text.slice(pos, pos + m[0].length),
        position: pos,
      });
    }
  }

  // 위치순 정렬
  results.sort((a, b) => a.position - b.position);
  return results;
}

// ===================== 목표 확정 여부 판정 =====================

/**
 * 발화가 "이 자격증을 준비하겠다/시작하겠다/따겠다"처럼
 * 특정 자격증을 목표로 확정했는지 판정한다.
 *
 * "추천해줘 / 뭐가 좋을까 / 알려줘"처럼 아직 정하지 않은 경우와 구분한다.
 */
export type CertIntent = {
  확정: boolean;                  // 목표 자격증 확정 여부
  표준: string | null;           // 확정된 표준명 (확정 시)
  확정근거: string | null;       // 확정 판시 근거 문구
  미지정힌트: string | null;     // 미확정 시 사용자가 남긴 힌트(예: "데이터 쪽")
};

export function classifyCertIntent(text: string): CertIntent {
  const lower = text.toLowerCase();

  const mentions = extractCertMentions(text);
  if (mentions.length === 0) {
    return { 확정: false, 표준: null, 확정근거: null, 미지정힌트: extractHint(lower) };
  }

  // 발화 전체에서 자격증명 언급 뒤에 확정/수행 동사가 붙는지 확인
  // 예: "~를 준비하고 싶어", "~ 준비할래", "~ 따려고 해", "~ 합격했어", "~ 시험 일정 알려줘"
  const 확정패턴 = [
    /(?:\b preparation|준비|준비할|준비할래|준비하려고|시작|시작할|시작할래|따겠|따려고|취득|취득할|취득했어|땄|합격|합격했어|합격했다|공부|공부할|공부할래|볼래|볼준비|시험\s*(?:볼|치|볼래|칠래)|공부\s*시작)/i,
    /(?:준비|시작|따|취득|합격|공부|볼|치)/i,
  ];

  // 자격증명 언급 위치 이후의 서술어를 확인
  const 본문 = text;
  for (const m of mentions) {
    const 이후 = 본문.slice(m.position + m.raw.length);
    const 직후 = 이후.slice(0, 60);
    if (확정동사(직후)) {
      return {
        확정: true,
        표준: m.standard,
        확정근거: `${m.raw} + ${직후.slice(0, 30).trim()}`,
        미지정힌트: null,
      };
    }
  }

  // 자격증명 언급은 있지만 확정 동사가 약하면 미확정/질의로 본다
  // 예: "빅데이터분석기사로 뭐가 좋을까", " ADP랑 SQLP 중에"
  if (mentions.length > 0) {
    // 여러 자격증이 함께 나오면 비교/질의로 처리
    if (mentions.length >= 2) {
      return {
        확정: false,
        표준: null,
        확정근거: null,
        미지정힌트: mentions.map((m) => m.standard).join(' / ') + ' 비교/질의',
      };
    }
    // 단일 언급이지만 확정 동사 없음 → 목표로 "언급"만 된 상태로 본다
    return {
      확정: false,
      표준: mentions[0].standard, // 힌트로 남기되 확정은 아님
      확정근거: null,
      미지정힌트: mentions[0].standard + ' 언급(미확정)',
    };
  }

  return { 확정: false, 표준: null, 확정근거: null, 미지정힌트: extractHint(lower) };
}

function 확정동사(snippet: string): boolean {
  if (!snippet) return false;
  const 패턴을종합하면 = [
    /준비/i, /시작/i, /따|^[겠]+|겠|려고|따려고|취득/i, /합격/i, /공부/i,
    /(?:볼|칠)\s*(?:준비|예정|생각|계획)/i,
    /준비할래|시작할래|공부할래|딸래|합격했어|땄어|취득했어/i,
  ];
  return 패턴을종합하면.some((r) => r.test(snippet));
}

function extractHint(lower: string): string | null {
  if (/\b데이터\b/.test(lower)) return '데이터 계열 관심';
  if (/\bsql\b/.test(lower)) return 'SQL 계열 관심';
  if (/\bit|개발|프로그래밍|소프트웨어|컴퓨터\b/.test(lower)) return 'IT/개발 계열 관심';
  if (/\b사무|oa|엑셀|경영지원|회계|세무\b/.test(lower)) return '사무/OA/회계 계열 관심';
  if (/\b디자인|그래픽|포토샵|일러스트\b/.test(lower)) return '디자인 계열 관심';
  if (/\b보안|정보보호|해킹\b/.test(lower)) return '보안 계열 관심';
  if (/\b네트워크|서버|리눅스|인프라\b/.test(lower)) return '네트워크/인프라 계열 관심';
  if (/\b토익|toeic|영어|어학\b/.test(lower)) return '어학(TOEIC 등) 관심';
  if (/\b한국사\b/.test(lower)) return '한국사능력검정시험 관심';
  if (/\b금융|투자|자산운용|증권\b/.test(lower)) return '금융/투자 계열 관심';
  if (/\b무역|유통|물류\b/.test(lower)) return '무역/유통 계열 관심';
  return null;
}

// ===================== 추천 시 목표 가중치 반영 =====================

/**
 * 프로필 기반 추천에서, 사용자가 확정한 목표 자격증이 있으면
 * 해당 자격증을 최우선 고정 대상으로 삼는다.
 *
 * 사용 예:
 *   - classifyCertIntent로 확정 자격을 얻었으면 recommend() 호출 전에
 *     목표 자격을 명시하여 점수 보정을 적용한다.
 */
export function applyGoalBias(
  candidates: Array<{ 자격증명: string; score: number; reasons: string[]; tags: string[]; url?: string }>,
  goalStandard: string | null,
): Array<{ 자격증명: string; score: number; reasons: string[]; tags: string[]; url?: string }> {
  if (!goalStandard) return candidates;

  const mapped = candidates.map((c) => {
    const isGoal = c.자격증명 === goalStandard;
    const baseScore = c.score;
    // 목표 자격증은 강하게 우선 (동점/근접 시 꺾이지 않도록 큰 가산)
    const biasedScore = isGoal ? baseScore + 1000 : baseScore;
    const reasons = isGoal
      ? [`목표 자격증: ${c.자격증명}`, ...c.reasons]
      : c.reasons;
    return { ...c, score: biasedScore, reasons, url: c.url };
  });

  return mapped;
}
