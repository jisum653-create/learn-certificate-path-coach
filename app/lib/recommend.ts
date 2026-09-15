// === 참고 데이터 파일 메타 정보 ===
// 실제 파일은 아래 경로에 존재, 서비스 코드에서는 외부 참조용으로만 사용
// ZIP 파일에는 포함하지 않음 (용량·민감정보·갱신성 관점)

import { QUALIFICATION_URLS } from './reference-data';

export const REFERENCE_FILE_PATHS = {
  기술자격종목별: 'C:/Users/m0104/Downloads/한국산업인력공단_국가기술자격_종목별_시험정보_20251231.csv',
  국가자격목록: 'C:/Users/m0104/Downloads/한국산업인력공단_국가자격_종목_목록_정보_20251231.csv',
  공인민간자격: 'C:/Users/m0104/Downloads/한국직업능력연구원_공인민간자격등록현황_20260826.csv',
  공인민간자격자료집: 'C:/Users/m0104/Downloads/붙임_2025년_공인민간자격_정보자료집(탑재용).pdf',
};

// === 자격증 분류 맵 (추천 시 조건 매칭용) ===
export const QUALIFICATION_TAG_MAP: Record<string, string[]> = {
  // IT/컴퓨터
  '정보처리기사': ['IT', '개발', '소프트웨어', '국가기술자격', '큐넷'],
  '정보처리산업기사': ['IT', '개발', '소프트웨어', '국가기술자격', '큐넷'],
  '정보처리기능사': ['IT', '개발', '소프트웨어', '국가기술자격', '큐넷', '입문'],
  '정보보안기사': ['IT', '보안', '정보보안', '국가기술자격', '큐넷'],
  '정보보안산업기사': ['IT', '보안', '정보보안', '국가기술자격', '큐넷'],
  '컴퓨터활용능력 1급': ['사무', 'OA', '엑셀', '상공회의소'],
  '컴퓨터활용능력 2급': ['사무', 'OA', '엑셀', '상공회의소', '입문'],
  '워드프로세서': ['사무', 'OA', '문서', '상공회의소'],
  'ITQ 정보기술자격': ['사무', 'OA', 'KPC', 'ITQ'],
  // 데이터/데이터분석/SQL
  '빅데이터분석기사': ['데이터', '빅데이터', '국가기술자격', '데이터분석'],
  'ADsP (데이터분석 준전문가)': ['데이터', '데이터분석', '준전문가', '데이터분석'],
  'ADP (데이터분석 전문가)': ['데이터', '데이터분석', '전문가', '데이터분석'],
  'SQLD (SQL 개발자)': ['데이터', 'SQL', '데이터베이스', '데이터분석'],
  'SQLP (SQL 전문가)': ['데이터', 'SQL', '데이터베이스', '전문가', '데이터분석'],
  'DAsP (데이터아키텍처 준전문가)': ['데이터', '데이터아키텍처', '준전문가'],
  'DAP (데이터아키텍처 전문가)': ['데이터', '데이터아키텍처', '전문가'],
  // 네트워크/보안
  '네트워크관리사 1급': ['IT', '네트워크', '관리사', 'ICQA'],
  '네트워크관리사 2급': ['IT', '네트워크', '관리사', 'ICQA', '입문'],
  '리눅스마스터 1급': ['IT', '리눅스', '운영체제', 'Linux', 'IHQ'],
  '리눅스마스터 2급': ['IT', '리눅스', '운영체제', 'Linux', 'IHQ', '입문'],
  // 사무/경영/회계
  'ERP정보관리사': ['경영', 'ERP', '사무', 'KPC'],
  '전산회계운용사': ['회계', '세무', '상공회의소', '전산회계'],
  '유통관리사': ['경영', '유통', '상공회의소'],
  '무역영어': ['어학', '무역', '영어', '상공회의소'],
  // 디자인/OA
  'GTQ 그래픽기술자격': ['디자인', '그래픽', 'KPC', '포토샵'],
  'GTQi 그래픽기술자격 일러스트': ['디자인', '일러스트', 'KPC', '일러스트레이터'],
  'GTQid 그래픽기술자격 인디자인': ['디자인', '인디자인', 'KPC', '편집'],
  // 한국사/어학
  '한국사능력검정시험': ['한국사', '역사', '어학', '공기업'],
  'TOEIC': ['어학', '영어', '취업', '토익'],
  'TOEIC Speaking': ['어학', '영어', '스피킹', '토익'],
  // 금융/회계 (금융투자협회, 한국금융연수원, 케이액타)
  '투자자산운용사': ['금융', '투자', '자산운용', '금융투자협회'],
  '금융투자분석사': ['금융', '투자', '분석', '금융투자협회'],
  '재무위험관리사': ['금융', '재무', '위험', '금융투자협회'],
  '신용분석사': ['금융', '신용', '분석', '한국금융연수원'],
  '전산회계 1급': ['회계', '전산', '세무', '케이액타'],
  '전산회계 2급': ['회계', '전산', '세무', '케이액타', '입문'],
  '전산세무 1급': ['세무', '전산', '회계', '케이액타'],
  '전산세무 2급': ['세무', '전산', '회계', '케이액타', '입문'],
};

// === 조건 기반 추천 로직 ===
// 사용자 프로필 조건(진로, 보유자격증, 학습방식, 비용선호, 가용시간, 목표시기, 관심공고)에 따라
// 적합한 자격증을 필터링하고 우선순위를 매김

export interface Profile {
  진로?: string;
  보유자격증?: string[];
  학습방식?: string;
  비용선호?: string;
  가용시간?: string;
  목표시기?: string;
  목표회차?: string;
  관심공고?: string;
  저장동의?: boolean;
  취득완료자격?: string[];
  영어성적?: string;
  유효기간자산?: string;
  메시지?: string;
}

export interface RecommendationCandidate {
  자격증명: string;
  url: string;
  score: number;
  reasons: string[];
  tags: string[];
  caution?: string;
}

export function recommend(profile: Profile, message?: string): RecommendationCandidate[] {
  const tags = extractTagsFromProfile(profile, message);
  const candidates: RecommendationCandidate[] = [];

  for (const [자격증명, url] of Object.entries(QUALIFICATION_URLS)) {
    const tagList = QUALIFICATION_TAG_MAP[자격증명] || [];
    const score = calculateScore(자격증명, tagList, tags, profile, message);
    if (score > 0) {
      const reasons = getReasons(자격증명, tagList, tags, profile, message);
      candidates.push({
        자격증명,
        url,
        score,
        reasons,
        tags: tagList,
        caution: getCaution(자격증명, profile),
      });
    }
  }

  // 점수 기준 내림차순 정렬, 동점일 경우 태그 매칭 수 기준
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.tags.length - a.tags.length;
  });

  // 상위 5개까지만 반환 (1순위 + 대안 최대 2개)
  return candidates.slice(0, 5);
}

function extractTagsFromProfile(profile: Profile, message?: string): string[] {
  const tags: string[] = [];

  // 진로 기반
  if (profile.진로) {
    const career = profile.진로.toLowerCase();
    if (/it|개발|프로그래밍|소프트웨어|컴퓨터|sw/i.test(career)) tags.push('IT', '개발', '소프트웨어');
    if (/데이터|분석|통계|빅데이터|머신러닝|딥러닝|ai/i.test(career)) tags.push('데이터', '통계', '빅데이터');
    if (/디자인|그래픽|영상|콘텐츠|ui|ux|웹디자인/i.test(career)) tags.push('디자인', '그래픽', '콘텐츠');
    if (/보안|정보보호|정보보안|해킹/i.test(career)) tags.push('보안', '정보보안');
    if (/회계|세무|경영|사무|erp|재무|금융|투자/i.test(career)) tags.push('회계', '세무', '경영', '사무', '금융');
    if (/무역|국제|수출입|물류|유통/i.test(career)) tags.push('무역', '물류', '유통');
    if (/영어|어학|토익|토익스피킹|영어회화/i.test(career)) tags.push('영어', '어학');
    if (/한국사|역사/i.test(career)) tags.push('한국사', '역사');
    if (/네트워크|서버|시스템|인프라|리눅스|클라우드/i.test(career)) tags.push('네트워크', '서버', '인프라', '리눅스');
    if (/보안|정보보호|정보보안|해킹/i.test(career)) tags.push('보안', '정보보안');
  }

  // 보유 자격증 기반 (연계 추천)
  if (profile.보유자격증 && profile.보유자격증.length > 0) {
    for (const cert of profile.보유자격증) {
      const certLower = cert.toLowerCase();
      if (/정보처리/i.test(certLower)) tags.push('IT', '개발', '소프트웨어');
      if (/sql|데이터|빅데이터|데이터분석/i.test(certLower)) tags.push('데이터', 'SQL', '데이터분석');
      if (/컴퓨터활용|컴활|oa|사무/i.test(certLower)) tags.push('사무', 'OA');
      if (/gtq|그래픽|디자인/i.test(certLower)) tags.push('디자인', '그래픽');
      if (/보안|정보보호/i.test(certLower)) tags.push('보안', '정보보안');
      if (/회계|세무|erp|경영/i.test(certLower)) tags.push('회계', '경영', '사무');
      if (/무역|유통/i.test(certLower)) tags.push('무역', '유통');
      if (/토익|영어|어학/i.test(certLower)) tags.push('영어', '어학');
      if (/한국사/i.test(certLower)) tags.push('한국사', '역사');
      if (/네트워크|리눅스|서버|인프라/i.test(certLower)) tags.push('네트워크', '리눅스', '인프라');
    }
  }

  // 학습 방식
  if (profile.학습방식) {
    const style = profile.학습방식.toLowerCase();
    if (/무료|비용|저렴한|최소|절약/i.test(style)) tags.push('무료선호');
    if (/시간|단기|빠른|속성|집중/i.test(style)) tags.push('시간절약');
    if (/온라인|비대면|원격|인터넷/i.test(style)) tags.push('온라인');
    if (/오프라인|학원|대면|실습/i.test(style)) tags.push('오프라인');
    if (/독학|혼자|스스로/i.test(style)) tags.push('독학');
  }

  // 비용 선호
  if (profile.비용선호) {
    const cost = profile.비용선호.toLowerCase();
    if (/무료/i.test(cost)) tags.push('무료선호');
    if (/유료|강의|투자|비용|지원/i.test(cost)) tags.push('유료가능');
    if (/교재|구매/i.test(cost)) tags.push('교재구매');
  }

  // 가용 시간
  if (profile.가용시간) {
    const time = profile.가용시간.toLowerCase();
    if (/하루|1시간|2시간|적은|부족|퇴근|직장인|바쁜/i.test(time)) tags.push('짧은시간');
    if (/3시간|4시간|5시간|많은|여유|학생|전업/i.test(time)) tags.push('충분한시간');
  }

  // 목표 시기
  if (profile.목표시기) {
    const target = profile.목표시기.toLowerCase();
    if (/3개월|단기|급|빠른|soon|즉시/i.test(target)) tags.push('단기');
    if (/6개월|1년|장기|천천히|여유도|i 준비할/i.test(target)) tags.push('장기');
    if (/취업|이직|입사|마감|곧/i.test(target)) tags.push('취업연계');
  }

  // 관심 공고 (채용공고 사이트 반복요건 참고)
  if (profile.관심공고) {
    const post = profile.관심공고.toLowerCase();
    if (/개발|프로그래밍|소프트웨어|it|컴퓨터|sw|백엔드|프론트엔드|풀스택/i.test(post)) {
      tags.push('IT', '개발');
      // 공고 반복요건 기반으로 선호 자격증 추가
      tags.push('국가기술자격');
    }
    if (/데이터|분석|빅데이터|통계|sql|파이썬|python/i.test(post)) {
      tags.push('데이터', 'SQL', '데이터분석');
    }
    if (/디자인|그래픽|ui|ux|영상|콘텐츠| 포토샵|일러스트/i.test(post)) {
      tags.push('디자인', '그래픽');
    }
    if (/보안|정보보호|정보보안|네트워크|서버|시스템/i.test(post)) {
      tags.push('보안', '네트워크', '서버');
    }
    if (/회계|세무|경영|사무|erp|재무|금융|무역|유통/i.test(post)) {
      tags.push('회계', '사무', '경영', '무역', '유통');
    }
  }

  // 메시지(발화) 기반 추가
  if (message) {
    const msg = message.toLowerCase();
    if (/정보처리|itq|컴활|워드|gtq|데이터|sql|빅데이터|adsp|adp|보안|네트워크|리눅스|전산회계|무역|유통|erp|토익|한국사/i.test(msg)) {
      // 메시지에 언급된 자격증 관련 태그 추가
      if (/정보처리/i.test(msg)) tags.push('IT', '개발');
      if (/컴활|컴퓨터활용|워드/i.test(msg)) tags.push('사무', 'OA');
      if (/gtq|그래픽|디자인/i.test(msg)) tags.push('디자인', '그래픽');
      if (/데이터|sql|빅데이터|adsp|adp/i.test(msg)) tags.push('데이터', 'SQL');
      if (/보안|정보보호|정보보안/i.test(msg)) tags.push('보안');
      if (/네트워크|리눅스|서버/i.test(msg)) tags.push('네트워크', '리눅스');
      if (/전산회계|회계|세무|erp|경영|사무/i.test(msg)) tags.push('회계', '사무', '경영');
      if (/무역|유통/i.test(msg)) tags.push('무역', '유통');
      if (/토익|영어|toeic/i.test(msg)) tags.push('영어', '어학');
      if (/한국사/i.test(msg)) tags.push('한국사', '역사');
    }
  }

  return [...new Set(tags)];
}

function calculateScore(자격증명: string, tagList: string[], profileTags: string[], profile: Profile, message?: string): number {
  let score = 0;

  // 1. 태그 매칭 (자격증의 태그와 프로필 태그의 교집합)
  const matchedTags = tagList.filter(t => profileTags.includes(t));
  score += matchedTags.length * 10;

  // 2. 진로 연계 (자격증이 진로 관련 태그와 연결되면 가산점)
  if (profile.진로) {
    const career = profile.진로.toLowerCase();
    const qualiLower = 자격증명.toLowerCase();

    // 진로 키워드 매칭
    if (/it|개발|소프트웨어|컴퓨터|sw/i.test(career) && /정보처리|기능사|산업기사|SQL/i.test(qualiLower)) score += 15;
    if (/데이터|분석|빅데이터|통계/i.test(career) && /데이터|sql|adsp|adp|빅데이터/i.test(qualiLower)) score += 15;
    if (/디자인|그래픽|영상|콘텐츠|ui|ux/i.test(career) && /gtq|그래픽|일러스트|인디자인/i.test(qualiLower)) score += 15;
    if (/보안|정보보호|정보보안/i.test(career) && /보안|네트워크|리눅스/i.test(qualiLower)) score += 15;
    if (/회계|세무|경영|사무|erp|재무|금융/i.test(career) && /전산회계|전산세무|erp|유통|무역|컴활|워드/i.test(qualiLower)) score += 15;
    if (/무역|국제|수출입|물류|유통/i.test(career) && /무역|유통|erp/i.test(qualiLower)) score += 15;
    if (/영어|어학|토익|토익스피킹/i.test(career) && /토익|스피킹|영어/i.test(qualiLower)) score += 15;
    if (/한국사|역사/i.test(career) && /한국사/i.test(qualiLower)) score += 15;
  }

  // 3. 보유 자격증과의 연계성 (중복 회피, 연계 추천)
  if (profile.보유자격증 && profile.보유자격증.length > 0) {
    for (const 보유 of profile.보유자격증) {
      const 보유Lower = 보유.toLowerCase();
      const qualiLower = 자격증명.toLowerCase();

      // 이미 보유한 자격증과 동일한 계열이면 감점 (중복 추천 방지)
      if (isSameCategory(보유Lower, qualiLower)) {
        score -= 5;
      }

      // 보유 자격과 연계되는 다음 단계 자격이면 가산점
      if (isNextStep(보유Lower, qualiLower)) {
        score += 20;
      }
    }
  }

  // 4. 관심 공고 기반 (공고 반복요건 매칭)
  if (profile.관심공고) {
    const post = profile.관심공고.toLowerCase();
    const qualiLower = 자격증명.toLowerCase();

    // 공고에서 자주 요구되는 자격증인지 확인
    if (isFrequentlyRequiredInJobPost(qualiLower, post)) {
      score += 25;
    }
  }

  // 5. 학습 방식/비용 선호 반영
  if (profile.학습방식) {
    const style = profile.학습방식.toLowerCase();
    if (/무료|비용|절약|최소/i.test(style) && isLowCostCert(자격증명)) {
      score += 5;
    }
    if (/시간|단기|속성|빠른/i.test(style) && isShortTermPrepCert(자격증명)) {
      score += 5;
    }
    if (/온라인|비대면|독학/i.test(style) && isOnlineFriendlyCert(자격증명)) {
      score += 5;
    }
  }

  if (profile.비용선호) {
    const cost = profile.비용선호.toLowerCase();
    if (/무료/i.test(cost) && isLowCostCert(자격증명)) {
      score += 5;
    }
    if (/유료|강의|투자/i.test(cost) && isLectureSupportedCert(자격증명)) {
      score += 5;
    }
  }

  // 6. 가용 시간 반영
  if (profile.가용시간) {
    const time = profile.가용시간.toLowerCase();
    if (/하루|1시간|2시간|적은|부족|퇴근|직장인|바쁜/i.test(time) && isShortPrepCert(자격증명)) {
      score += 5;
    }
    if (/3시간|4시간|5시간|많은|여유|학생|전업/i.test(time) && isLongPrepCert(자격증명)) {
      score += 5;
    }
  }

  // 7. 목표 시기 반영
  if (profile.목표시기) {
    const target = profile.목표시기.toLowerCase();
    if (/3개월|단기|속|빠른|soon/i.test(target) && isFastCert(자격증명)) {
      score += 5;
    }
    if (/6개월|1년|장기|여유/i.test(target) && isLongTermCert(자격증명)) {
      score += 5;
    }
  }

  return Math.max(score, 0);
}

// === 헬퍼 함수들 ===

function isSameCategory(보유Lower: string, qualiLower: string): boolean {
  const pairs: [string, string][] = [
    ['정보처리', '정보처리'],
    ['sql', 'sql'],
    ['데이터', '데이터'],
    ['빅데이터', '빅데이터'],
    ['컴퓨터활용', '컴퓨터활용'],
    ['컴활', '컴활'],
    ['oa', 'oa'],
    ['워드', '워드'],
    ['gtq', 'gtq'],
    ['그래픽', '그래픽'],
    ['디자인', '디자인'],
    ['보안', '보안'],
    ['정보보안', '정보보안'],
    ['네트워크', '네트워크'],
    ['리눅스', '리눅스'],
    ['서버', '서버'],
    ['인프라', '인프라'],
    ['회계', '회계'],
    ['세무', '세무'],
    ['erp', 'erp'],
    ['경영', '경영'],
    ['사무', '사무'],
    ['무역', '무역'],
    ['유통', '유통'],
    ['영어', '영어'],
    ['토익', '토익'],
    ['어학', '어학'],
    ['한국사', '한국사'],
    ['금융', '금융'],
    ['투자', '투자'],
    ['세무', '세무'],
    ['신용', '신용'],
  ];

  for (const [a, b] of pairs) {
    if (보유Lower.includes(a) && qualiLower.includes(b)) return true;
  }
  return false;
}

function isNextStep(보유Lower: string, qualiLower: string): boolean {
  // 보유 자격에서 다음 단계로 이어지는 자격들
  const nextSteps: Record<string, string[]> = {
    '정보처리기능사': ['정보처리산업기사', '정보처리기사', 'sql', '데이터', '빅데이터'],
    '정보처리산업기사': ['정보처리기사', 'sql', '데이터', '빅데이터', '정보보안'],
    '정보처리기사': ['sql', '데이터', '빅데이터', '정보보안', '네트워크'],
    'sqldeveloper': ['데이터분석', '빅데이터', 'adsp', 'adp'],
    '데이터분석': ['빅데이터', '정보보안', 'IT'],
    '컴퓨터활용능력2급': ['컴퓨터활용능력1급', '워드프로세서', 'erp'],
    '컴퓨터활용능력1급': ['erp정보관리사', '전산회계', '전산세무'],
    '워드프로세서': ['컴퓨터활용능력', 'erp정보관리사'],
    'erp정보관리사': ['전산회계', '전산세무'],
    'gtq': ['gtqi', 'gtqid', '디자인'],
    'gtqi': ['gtqid', '디자인'],
    '무역영어': ['유통관리사', 'erp'],
    '유통관리사': ['erp정보관리사', '전산회계'],
    '토익': ['토익스피킹', '영어'],
    '한국사': ['공기업', '취업'],
    '정보보안산업기사': ['정보보안기사', '네트워크관리사', '리눅스마스터'],
    '정보보안기사': ['네트워크관리사', '리눅스마스터', 'it'],
    '네트워크관리사2급': ['네트워크관리사1급', '리눅스마스터'],
    '네트워크관리사1급': ['리눅스마스터', '정보보안'],
    '리눅스마스터2급': ['리눅스마스터1급', '네트워크관리사'],
    '리눅스마스터1급': ['정보보안기사', '네트워크관리사1급'],
    '전산회계2급': ['전산회계1급', '전산세무2급', 'erp정보관리사'],
    '전산회계1급': ['전산세무2급', '전산세무1급', 'erp정보관리사'],
    '전산세무2급': ['전산세무1급', '전산회계1급'],
    '전산세무1급': ['erp정보관리사', '회계'],
    'adsp': ['adp', '빅데이터분석기사', 'sqlp'],
    'adp': ['빅데이터분석기사', 'sqlp', '데이터아키텍처'],
    '빅데이터분석기사': ['데이터아키텍처', 'sqlp', 'dap'],
    'sql d': ['sqlp', 'adp', '빅데이터분석기사'],
    'dap': ['데이터아키텍처 전문가'],
    'dasp': ['dap'],
  };

  for (const [보유키, 다음단계들] of Object.entries(nextSteps)) {
    if (보유Lower.includes(보유키)) {
      for (const 다음 of 다음단계들) {
        if (qualiLower.includes(다음)) return true;
      }
    }
  }
  return false;
}

function isFrequentlyRequiredInJobPost(qualiLower: string, postLower: string): boolean {
  // 채용공고 사이트에서 자주 요구되는 자격증 패턴
  const frequentPatterns: Record<string, string[]> = {
    '정보처리': ['개발', '프로그래밍', '소프트웨어', 'it', '컴퓨터', 'sw', '시스템'],
    '정보처리기능사': ['개발', '프로그래밍', 'it', '컴퓨터', 'sw'],
    '정보처리산업기사': ['개발', '프로그래밍', 'it', '컴퓨터', 'sw'],
    '정보처리기사': ['개발', '프로그래밍', '소프트웨어', 'it', '컴퓨터', 'sw', '시스템', 'engineer'],
    'sql d': ['데이터', '분석', 'sql', '데이터베이스', '백엔드'],
    'sqlp': ['데이터', '분석', 'sql', '데이터베이스', '백엔드', '전문가'],
    '데이터분석': ['데이터', '분석', '통계', '빅데이터', '머신러닝'],
    'adsp': ['데이터', '분석', '통계', '빅데이터', '준전문가'],
    'adp': ['데이터', '분석', '통계', '빅데이터', '전문가'],
    '빅데이터': ['데이터', '분석', '빅데이터', '통계', '머신러닝', 'ai'],
    'gtq': ['디자인', '그래픽', '포토샵', '콘텐츠', ' 영상편집'],
    'gtqi': ['디자인', '그래픽', '일러스트', '콘텐츠'],
    'gtqid': ['디자인', '그래픽', '인디자인', '편집', '출판'],
    '컴퓨터활용능력': ['사무', 'oa', '엑셀', '문서', '행정', '경영지원'],
    '워드프로세서': ['사무', 'oa', '문서', '행정', '경영지원'],
    'erp정보관리사': ['erp', '경영', '사무', '물류', '생산', '관리'],
    '전산회계': ['회계', '세무', '경리', '재무', 'erp'],
    '전산세무': ['세무', '회계', '경리', '재무'],
    '유통관리사': ['유통', '물류', '판매', '유통관리', '경영'],
    '무역영어': ['무역', '국제', '수출입', '물류', '어학', '영어'],
    '정보보안': ['보안', '정보보호', '정보보안', '보안관제', '취약점'],
    '네트워크관리사': ['네트워크', '서버', '인프라', '운영', '관리'],
    '리눅스마스터': ['linux', '리눅스', '서버', '인프라', '운영', '관리'],
    '토익': ['영어', 'toeic', '어학', '취업', '기본'],
    '토익스피킹': ['영어', 'toeic', '스피킹', '어학', '취업'],
    '한국사능력검정': ['한국사', '역사', '공기업', '공무원', '취업'],
    '투자자산운용사': ['금융', '투자', '자산운용', '증권사', '투자'],
    '금융투자분석사': ['금융', '투자', '분석', '리서치', '증권사'],
    '재무위험관리사': ['금융', '재무', '리스크', '위험관리', '은행'],
    '신용분석사': ['금융', '신용', '분석', '여신', '은행'],
  };

  for (const [key, patterns] of Object.entries(frequentPatterns)) {
    if (qualiLower.includes(key)) {
      for (const pattern of patterns) {
        if (postLower.includes(pattern)) return true;
      }
    }
  }
  return false;
}

function isLowCostCert(자격증명: string): boolean {
  const lowCostList = [
    '정보처리기능사', '컴퓨터활용능력 2급', '워드프로세서', 'itq 정보기술자격',
    '네트워크관리사 2급', '리눅스마스터 2급', '무역영어',
    '한국사능력검정시험', '토익', '토익스피킹', '전산회계 2급', '전산세무 2급',
  ];
  return lowCostList.some(c => 자격증명.includes(c));
}

function isShortTermPrepCert(자격증명: string): boolean {
  const shortTermList = [
    '정보처리기능사', '컴퓨터활용능력 2급', '워드프로세서', 'itq 정보기술자격',
    '무역영어', '전산회계 2급', '전산세무 2급', 'gtq 그래픽기술자격',
    '네트워크관리사 2급', '리눅스마스터 2급', '토익', '토익스피킹',
  ];
  return shortTermList.some(c => 자격증명.includes(c));
}

function isOnlineFriendlyCert(자격증명: string): boolean {
  const onlineList = [
    '정보처리기능사', '정보처리산업기사', '정보처리기사',
    '컴퓨터활용능력 1급', '컴퓨터활용능력 2급', '워드프로세서', 'itq 정보기술자격',
    'sql d (sql 개발자)', 'adsp (데이터분석 준전문가)', 'adp (데이터분석 전문가)',
    '빅데이터분석기사', '네트워크관리사 1급', '네트워크관리사 2급', '리눅스마스터 1급', '리눅스마스터 2급',
    '무역영어', 'gtq 그래픽기술자격', 'gtqi 그래픽기술자격 일러스트', 'gtqid 그래픽기술자격 인디자인',
    '토익', '토익스피킹', '한국사능력검정시험', '전산회계 1급', '전산회계 2급', '전산세무 1급', '전산세무 2급',
  ];
  return onlineList.some(c => 자격증명.includes(c));
}

function isLectureSupportedCert(자격증명: string): boolean {
  // 유료 강의가 잘 갖춰진 자격들
  const lectureList = [
    '정보처리기사', '정보처리산업기사', '정보처리기능사',
    '정보보안기사', '정보보안산업기사',
    '컴퓨터활용능력 1급', '컴퓨터활용능력 2급', '워드프로세서', 'itq 정보기술자격',
    ' sql d (sql 개발자)', 'adsp (데이터분석 준전문가)', 'adp (데이터분석 전문가)',
    '빅데이터분석기사', '네트워크관리사 1급', '네트워크관리사 2급',
    '리눅스마스터 1급', '리눅스마스터 2급',
    'erp정보관리사', '전산회계 1급', '전산회계 2급', '전산세무 1급', '전산세무 2급',
    '유통관리사', '무역영어',
    'gtq 그래픽기술자격', 'gtqi 그래픽기술자격 일러스트', 'gtqid 그래픽기술자격 인디자인',
    '토익', '토익스피킹', '한국사능력검정시험',
    '투자자산운용사', '금융투자분석사', '재무위험관리사', '신용분석사',
  ];
  return lectureList.some(c => 자격증명.includes(c));
}

function isShortPrepCert(자격증명: string): boolean {
  return isShortTermPrepCert(자격증명);
}

function isLongPrepCert(자격증명: string): boolean {
  const longList = [
    '정보처리기사', '정보처리산업기사', '정보보안기사', '정보보안산업기사',
    '빅데이터분석기사', 'adp (데이터분석 전문가)', 'sqlp (sql 전문가)',
    'dap (데이터아키텍처 전문가)', 'erp정보관리사',
    '전산회계 1급', '전산세무 1급', 'GTQ 그래픽기술자격', 'GTQi 그래픽기술자격 일러스트',
    'GTQid 그래픽기술자격 인디자인', '투자자산운용사', '금융투자분석사',
    '재무위험관리사', '신용분석사',
  ];
  return longList.some(c => 자격증명.includes(c));
}

function isFastCert(자격증명: string): boolean {
  return isShortTermPrepCert(자격증명);
}

function isLongTermCert(자격증명: string): boolean {
  return isLongPrepCert(자격증명);
}

function getReasons(자격증명: string, tagList: string[], profileTags: string[], profile: Profile, message?: string): string[] {
  const reasons: string[] = [];

  // 태그 매칭 이유
  const matchedTags = tagList.filter(t => profileTags.includes(t));
  if (matchedTags.length > 0) {
    reasons.push(`사용자 조건 태그 "${matchedTags.join(', ')}"와 매칭됨`);
  }

  // 진로 연계 이유
  if (profile.진로) {
    const career = profile.진로.toLowerCase();
    const qualiLower = 자격증명.toLowerCase();

    if (/it|개발|소프트웨어|컴퓨터|sw/i.test(career) && /정보처리|기능사|산업기사|sql/i.test(qualiLower)) {
      reasons.push(`진로(IT/개발)와 연계: ${자격증명}은 IT/개발 분야 취업·실무 기초 역량 검증에 활용`);
    }
    if (/데이터|분석|빅데이터|통계/i.test(career) && /데이터|sql|adsp|adp|빅데이터/i.test(qualiLower)) {
      reasons.push(`진로(데이터/분석)와 연계: ${자격증명}은 데이터 분석·활용 역량 검증에 활용`);
    }
    if (/디자인|그래픽|영상|콘텐츠|ui|ux/i.test(career) && /gtq|그래픽|일러스트|인디자인/i.test(qualiLower)) {
      reasons.push(`진로(디자인/콘텐츠)와 연계: ${자격증명}은 디자인·콘텐츠 제작 실무 역량 검증에 활용`);
    }
    if (/보안|정보보호|정보보안/i.test(career) && /보안|네트워크|리눅스/i.test(qualiLower)) {
      reasons.push(`진로(보안)와 연계: ${자격증명}은 정보보안·네트워크·시스템 보안 실무 역량 검증에 활용`);
    }
    if (/회계|세무|경영|사무|erp|재무|금융/i.test(career) && /전산회계|전산세무|erp|유통|무역|컴활|워드/i.test(qualiLower)) {
      reasons.push(`진로(회계/경영/사무)와 연계: ${자격증명}은 사무·회계·경영 실무 역량 검증에 활용`);
    }
    if (/무역|국제|수출입|물류|유통/i.test(career) && /무역|유통|erp/i.test(qualiLower)) {
      reasons.push(`진로(무역/유통)와 연계: ${자격증명}은 무역·유통·물류 실무 역량 검증에 활용`);
    }
    if (/영어|어학|토익|토익스피킹/i.test(career) && /토익|스피킹|영어/i.test(qualiLower)) {
      reasons.push(`진로(영어/어학)와 연계: ${자격증명}은 영어 활용 역량 검증에 활용`);
    }
    if (/한국사|역사/i.test(career) && /한국사/i.test(qualiLower)) {
      reasons.push(`진로(한국사/역사)와 연계: ${자격증명}은 한국사 이해도 검증에 활용 (공기업·공무원 가점/필수)`);
    }
  }

  // 보유 자격증과의 연계성
  if (profile.보유자격증 && profile.보유자격증.length > 0) {
    for (const 보유 of profile.보유자격증) {
      const 보유Lower = 보유.toLowerCase();
      const qualiLower = 자격증명.toLowerCase();

      if (isNextStep(보유Lower, qualiLower)) {
        reasons.push(`보유 자격 "${보유}"의 다음 단계 자격으로 연계 추천`);
      }
      if (isSameCategory(보유Lower, qualiLower)) {
        reasons.push(`이미 보유 중인 "${보유}"과 유사 계열이므로 중복 주의`);
      }
    }
  }

  // 관심 공고 기반
  if (profile.관심공고) {
    const post = profile.관심공고.toLowerCase();
    if (isFrequentlyRequiredInJobPost(자격증명.toLowerCase(), post)) {
      reasons.push(`관심 공고에서 자주 요구되는 자격증으로 확인됨 (채용공고 반복요건 기반)`);
    }
  }

  // 학습 방식/비용 선호
  if (profile.학습방식) {
    const style = profile.학습방식.toLowerCase();
    if (/무료|비용|절약|최소/i.test(style) && isLowCostCert(자격증명)) {
      reasons.push(`비용 부담이 낮은 자격증 (무료 자료·기출문제 풍부, 저비용 준비 가능)`);
    }
    if (/시간|단기|속성|빠른/i.test(style) && isShortTermPrepCert(자격증명)) {
      reasons.push(`단기 준비에 적합한 자격증 (비교적 짧은 준비 기간)`);
    }
    if (/온라인|비대면|독학/i.test(style) && isOnlineFriendlyCert(자격증명)) {
      reasons.push(`온라인·독학으로 준비하기 적합한 자격증 (온라인 강의·무료 자료·기출문제 풍부)`);
    }
  }

  if (profile.비용선호) {
    const cost = profile.비용선호.toLowerCase();
    if (/무료/i.test(cost) && isLowCostCert(자격증명)) {
      reasons.push(`무료 선호 조건에 적합 (저비용 준비 가능, 무료 강의·자료 활용 가능)`);
    }
    if (/유료|강의|투자/i.test(cost) && isLectureSupportedCert(자격증명)) {
      reasons.push(`유료 강의 인프라가 잘 갖춰진 자격증 (인프런·부스트코스·유튜브 등 유료/무료 강의 선택 가능, 유료 강의는 가격·무료 전환 지점·전체 범위 cover 여부 확인 후 추천)`);
    }
    if (/교재|구매/i.test(cost)) {
      reasons.push(`교재 구매 선호 조건에 적합 (공식 교재·기출문제집 구매로 체계적 준비 가능)`);
    }
  }

  // 가용 시간
  if (profile.가용시간) {
    const time = profile.가용시간.toLowerCase();
    if (/하루|1시간|2시간|적은|부족|퇴근|직장인|바쁜/i.test(time) && isShortPrepCert(자격증명)) {
      reasons.push(`하루 1~2시간 등 적은 가용 시간에도 준비 가능한 자격증 (비교적 짧은 준비 기간)`);
    }
    if (/3시간|4시간|5시간|많은|여유|학생|전업/i.test(time) && isLongPrepCert(자격증명)) {
      reasons.push(`충분한 가용 시간을 활용한 심층 준비에 적합한 자격증`);
    }
  }

  // 목표 시기
  if (profile.목표시기) {
    const target = profile.목표시기.toLowerCase();
    if (/3개월|단기|속|빠른|soon/i.test(target) && isFastCert(자격증명)) {
      reasons.push(`단기 목표(3개월 내외)에 적합한 자격증`);
    }
    if (/6개월|1년|장기|여유/i.test(target) && isLongTermCert(자격증명)) {
      reasons.push(`장기 목표(6개월 이상)에 적합한 자격증 (충분한 준비 기간 확보 가능)`);
    }
  }

  // 메시지 기반
  if (message) {
    const msg = message.toLowerCase();
    if (/무료|비용|저렴|최소/i.test(msg) && isLowCostCert(자격증명)) {
      if (!reasons.includes(`비용 부담이 낮은 자격증`)) {
        reasons.push(`사용자 메시지(비용 관심)에 부합하는 저비용 자격증`);
      }
    }
    if (/시간|단기|빠른|속성/i.test(msg) && isShortTermPrepCert(자격증명)) {
      if (!reasons.includes(`단기 준비에 적합`)) {
        reasons.push(`사용자 메시지(시간/단기 관심)에 부합하는 단기 준비 가능 자격증`);
      }
    }
    if (/온라인|비대면|독학|혼자/i.test(msg) && isOnlineFriendlyCert(자격증명)) {
      if (!reasons.includes(`온라인·독학으로 준비하기 적합`)) {
        reasons.push(`사용자 메시지(온라인/독학 관심)에 부합하는 온라인·독학 친화적 자격증`);
      }
    }
  }

  // 기본 이유 (태그/진로/보유/공고 등으로 이유가 없으면 기본 설명 추가)
  if (reasons.length === 0) {
    reasons.push(`사용자 조건과 자격증 특성 간 기본 매칭`);
  }

  // 중복 제거
  return [...new Set(reasons)];
}

function getCaution(자격증명: string, profile: Profile): string {
  const cautions: Record<string, string> = {
    '정보처리기사': 'IT/개발 직무가 실제 관심·진로와 맞을 때만 추천. 단순 스펙 목적이면 프로젝트·실무 경험 병행 권장.',
    '정보처리산업기사': '정보처리기사보다 낮은 단계. 실무 기초 확인용. 진로와 무관하게 취득하면 활용도 낮을 수 있음.',
    '정보처리기능사': 'IT 입문용 기초 자격. 실무 역량과 직접 연결되진 않으므로, 실제 프로그래밍 학습과 병행 권장.',
    '정보보안기사': 'IT 보안 직무가 실제 진로와 맞을 때만 추천. 실무 보안 도구·네트워크·시스템 운영 경험 병행 권장.',
    '정보보안산업기사': '정보보안기사보다 낮은 단계. 실무 기초 확인용. 보안 직무 관심 없을 시 활용도 낮음.',
    '컴퓨터활용능력 1급': '사무·경영지원 직무가 실제 진로와 맞을 때 추천. 엑셀 실무 프로젝트 병행 시 취업 시 더 강점.',
    '컴퓨터활용능력 2급': '기초 OA 역량 확인용. 실무 역량과 직접 연결되진 않으므로, 실제 엑셀 활용 학습과 병행 권장.',
    '워드프로세서': '기초 문서 작성 능력 확인용. 실무 역량과 직접 연결되진 않으므로, 실제 문서 작성 실무와 병행 권장.',
    'itq 정보기술자격': 'OA·ITQ 기초 역량 확인용. 실무 활용은 제한적이므로, 실제 엑셀·문서 작성 실무와 병행 권장.',
    '빅데이터분석기사': '데이터 분석·빅데이터 직무가 실제 진로와 맞을 때만 추천. 실무 데이터 분석 프로젝트 병행 권장.',
    'adsp (데이터분석 준전문가)': '데이터 분석 입문용. 실제 데이터 분석 실무와 병행하지 않으면 활용도 낮을 수 있음.',
    'adp (데이터분석 전문가)': '데이터 분석 실무자용. 실제 데이터 분석 프로젝트가 있어야 효과적. 입문자는 ADSP부터 권장.',
    'sql d (sql 개발자)': '데이터 분석·백엔드 개발 등 SQL 활용 직무와 연계될 때만 추천. 단순 SQL 지식만으로는 실무 활용 제한적.',
    'sqlp (sql 전문가)': 'SQL 전문가용. 실제 SQL 개발·튜닝 경험이 있어야 효과적. 입문자는 SQLD부터 권장.',
    'dasp (데이터아키텍처 준전문가)': '데이터 아키텍처 입문용. 실무 데이터 모델링 경험이 있어야 효과적.',
    'dap (데이터아키텍처 전문가)': '데이터 아키텍처 전문가용. 실무 데이터 아키텍처 설계 경험이 있어야 효과적.',
    '네트워크관리사 1급': '네트워크 직무가 실제 진로와 맞을 때만 추천. 실무 네트워크 구성·운영 경험 병행 권장.',
    '네트워크관리사 2급': '네트워크 기초 확인용. 실무 역량과 직접 연결되진 않으므로, 실제 네트워크 학습과 병행 권장.',
    '리눅스마스터 1급': '리눅스·서버 운영 직무와 연계될 때만 추천. 실무 리눅스 운영 경험 병행 권장.',
    '리눅스마스터 2급': '리눅스 기초 확인용. 실무 활용은 제한적이므로, 실제 리눅스 학습과 병행 권장.',
    'erp정보관리사': '경영·물류·생산 관리 직무가 실제 진로와 맞을 때만 추천. 실무 ERP 사용 경험 병행 권장.',
    '전산회계운용사': '회계·사무 직무가 실제 진로와 맞을 때만 추천. 실무 회계 프로그램 사용 경험 병행 권장.',
    '유통관리사': '유통·물류·경영 직무가 실제 진로와 맞을 때만 추천. 실무 유통·물류 경험 병행 권장.',
    '무역영어': '무역·국제 업무 직무가 실제 진로와 맞을 때만 추천. 실무 영어·무역 실무와 병행 권장.',
    'gtq 그래픽기술자격': '디자인·콘텐츠 제작 직무가 실제 진로와 맞을 때만 추천. 포트폴리오용 실제 디자인 작업 병행 권장.',
    'gtqi 그래픽기술자격 일러스트': '디자인·일러스트 직무가 실제 진로와 맞을 때만 추천. 포트폴리오용 실제 일러스트 작업 병행 권장.',
    'gtqid 그래픽기술자격 인디자인': '편집·출판 디자인 직무가 실제 진로와 맞을 때만 추천. 포트폴리오용 실제 편집 작업 병행 권장.',
    '한국사능력검정시험': '공기업·공무원 채용 가점/필수로 필요할 때만 추천. 실제 역사 관심·이해와 별개로 취업 스펙용으로만 접근하면 동기 부족 가능성 있음.',
    '토익': '영어 활용 직무나 채용 기본 스펙으로 필요할 때만 추천. 실무 영어(말하기·쓰기) 강화도 병행 권장.',
    '토익스피킹': '영어 말하기 역량이 실제 필요하거나 해외 업무·영어 면접 대비 시에 추천. 단순 점수 취득보다 실제 소통 역량 강화 병행 권장.',
    '투자자산운용사': '금융 투자 직무가 실제 진로와 맞을 때만 추천. 실무 투자 분석·운용 경험 병행 권장.',
    '금융투자분석사': '금융 투자 분석·리서치 직무가 실제 진로와 맞을 때만 추천. 실무 분석 경험 병행 권장.',
    '재무위험관리사': '금융 리스크 관리 직무가 실제 진로와 맞을 때만 추천. 실무 리스크 분석 경험 병행 권장.',
    '신용분석사': '금융 신용 분석·여신 직무가 실제 진로와 맞을 때만 추천. 실무 신용 분석 경험 병행 권장.',
    '전산회계 1급': '회계·경리 직무가 실제 진로와 맞을 때만 추천. 실무 회계 프로그램 사용 경험 병행 권장.',
    '전산회계 2급': '회계 입문용. 실무 역량과 직접 연결되진 않으므로, 실제 회계 실무 학습과 병행 권장.',
    '전산세무 1급': '세무·회계 실무 직무가 실제 진로와 맞을 때만 추천. 실무 세무 신고 경험 병행 권장.',
    '전산세무 2급': '세무 입문용. 실무 역량과 직접 연결되진 않으므로, 실제 세무 실무 학습과 병행 권장.',
  };

  return cautions[자격증명] || '사용자 조건과 실제 진로·직무 연계성을 확인하고, 단순 스펙 취득보다는 실무 역량 향상과 병행 recommended.';
}

export function getQuickRecommendation(profile: Profile, message?: string): { primary: string; primaryUrl: string; primaryReason: string; alternatives: { name: string; url: string; reason: string }[] } {
  const candidates = recommend(profile, message);

  if (candidates.length === 0) {
    return {
      primary: '정보처리기사',
      primaryUrl: QUALIFICATION_URLS['정보처리기사'] || 'https://www.q-net.or.kr/',
      primaryReason: 'IT/개발 분야 취업·이직의 기본 자격. 관심 진로·보유 자격·목표 시기에 따라 다른 자격증이 더 적합할 수 있어요.',
      alternatives: [
        { name: 'SQLD (SQL 개발자)', url: QUALIFICATION_URLS['SQLD (SQL 개발자)'] || 'https://www.dataq.or.kr/', reason: '데이터 분석·백엔드 개발에서 SQL 활용 역량 입증. 데이터 직무 지원 시 강점.' },
        { name: '컴퓨터활용능력 1급', url: QUALIFICATION_URLS['컴퓨터활용능력 1급'] || 'https://license.korcham.net/', reason: '사무·경영지원 직무에서 엑셀 등 OA 실무 역량 입증. 대부분의 사무직 채용에서 기본 스펙으로 활용.' },
      ],
    };
  }

  const primary = candidates[0];
  const alternatives = candidates.slice(1, 3).map(c => ({
    name: c.자격증명,
    url: c.url,
    reason: c.reasons.slice(0, 2).join('. ') + '.',
  }));

  return {
    primary: primary.자격증명,
    primaryUrl: primary.url,
    primaryReason: primary.reasons.slice(0, 2).join('. ') + '.',
    alternatives,
  };
}
