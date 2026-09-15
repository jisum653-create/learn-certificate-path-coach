// === 참고자료 파일 메타 정보 (외부 파일 경로, ZIP 미포함) ===
// 실제 파일은 아래 경로에 존재, 서비스 코드에서는 외부 참조용으로만 사용

export const REFERENCE_FILES = {
  기술자격종목별: {
    name: '한국산업인력공단_국가기술자격_종목별_시험정보_20251231.csv',
    path: 'C:/Users/m0104/Downloads/한국산업인력공단_국가기술자격_종목별_시험정보_20251231.csv',
    description: '국가기술자격 종목별 개요·취득방법·진로 및 전망·실시기관·수행직무·법령 우대현황 등 (3788행, 488개 종목)',
    lastUpdate: '2025-12-31',
    sizeBytes: 2172897,
  },
  국가자격목록: {
    name: '한국산업인력공단_국가자격_종목_목록_정보_20251231.csv',
    path: 'C:/Users/m0104/Downloads/한국산업인력공단_국가자격_종목_목록_정보_20251231.csv',
    description: '국가자격 종목 목록 (24,570 bytes)',
    lastUpdate: '2025-12-31',
    sizeBytes: 24570,
  },
  공인민간자격: {
    name: '한국직업능력연구원_공인민간자격등록현황_20260826.csv',
    path: 'C:/Users/m0104/Downloads/한국직업능력연구원_공인민간자격등록현황_20260826.csv',
    description: '공인민간자격 등록현황 (11,520 bytes, 2026-08-26 기준)',
    lastUpdate: '2026-08-26',
    sizeBytes: 11520,
  },
  공인민간자격자료집: {
    name: '붙임_2025년_공인민간자격_정보자료집(탑재용).pdf',
    path: 'C:/Users/m0104/Downloads/붙임_2025년_공인민간자격_정보자료집(탑재용).pdf',
    description: '2025년 공인민간자격 정보자료집 (탑재용, 103페이지, 1.9MB)',
    lastUpdate: '2025년',
    sizeBytes: 1982119,
  },
};

// === 외부 참고 사이트 목록 (공고 반복요건 분석용) ===
export const EXTERNAL_REFERENCE_SITES = [
  // 채용공고
  { name: '로켓펀치', url: 'https://www.rocketpunch.com/', category: 'IT/스타트업 채용', purpose: '기업 정보·투자 유치 단계·구성원 프로필 확인' },
  { name: '그룹바이', url: 'https://groupby.kr/', category: '스타트업 채용', purpose: '검증된 스타트업 정보·맞춤형 스카우트 제안' },
  { name: '점핏', url: 'https://jumpit.saramin.co.kr/', category: '개발 직무 채용', purpose: '기술스택별 공고 필터·개발 트렌드 확인' },
  { name: '캐치', url: 'https://m.catch.co.kr/', category: '대기업/중견기업 채용', purpose: '재무제표 기반 기업 분석·합격 스펙/후기' },
  { name: '리멤버', url: 'https://career.rememberapp.co.kr/', category: '경력직 채용', purpose: '전문가 네트워킹·안전 스카우트 제안' },
  { name: '슈퍼루키', url: 'https://www.superookie.com/', category: '외국계/인턴 채용', purpose: '글로벌 기업 인턴·신입 공고' },
  { name: '월드잡 플러스', url: 'https://www.worldjob.or.kr/', category: '해외취업', purpose: '정부 지원 해외 인턴·취업·영문/일문 이력서 첨삭' },
  { name: '코공고', url: 'https://www.cogonggo.co/', category: '뷰티/화장품 채용', purpose: 'K-뷰티 인디·글로벌 뷰티 기업 특화 공고' },
  { name: '서핏', url: 'https://www.surfit.io/', category: '커리어 인사이트', purpose: '직무별 커리어 인사이트·기업 역제안·커리어 매칭' },
  // 무료 강의
  { name: '비전큐', url: 'https://www.v-q.co.kr/', category: '민간 자격증 무료 강의', purpose: '한국직업능력연구원 정식 등록 민간 자격증 200여 개 이상 전액 지원 (심리상담사·방과후 지도사·코딩지도사·병원코디네이터 등)' },
  { name: '국제자격검정원', url: 'https://www.ili.or.kr/', category: '민간 자격증 원격 교육', purpose: '민간 자격증 원격 교육 강의 (방과후지도사·심리상담사·병원코디네이터·바리스타/와인전문가 등)' },
  { name: '부스트코스', url: 'https://www.boostcourse.org/', category: 'IT 실무 무료 강의', purpose: '네이버 실무자 노하우 담긴 실무 프로젝트 중심 무료 강의 (컴퓨터 과학·웹/모바일 개발·데이터 사이언스·디지털 마케팅 등)' },
  { name: '인프런', url: 'https://www.inflearn.com/', category: 'IT 입문 무료 강의', purpose: '국내 최대 IT 입문 플랫폼, 무료 강의 카테고리 제공' },
  // 자격증 협회/자료
  { name: '한국자격증협회', url: 'https://korea-kca.com/', category: '자격증 협회', purpose: '무료 자격증 협회 자료 (민간 자격증 정보)' },
  // 금융/회계 자격증 주관기관
  { name: '금융투자협회 자격시험', url: 'https://license.kofia.or.kr/examInfo/examYearly.do', category: '금융 자격증', purpose: '투자자산운용사·금융투자분석사·재무위험관리사 등 연간 시험 일정' },
  { name: '한국금융연수원 credit', url: 'https://www.kbi.or.kr/platformWeb/Common.do?cmd=goIndex', category: '금융 자격증', purpose: '신용분석사 등 금융 자격증 정보' },
  { name: '한국세무회계자격협회', url: 'https://license.kacta.or.kr/', category: '회계/세무 자격증', purpose: '전산회계 1급·2급, 전산세무 1급·2급 등 자격 정보' },
];

// === 공고 반복요건 패턴 (채용공고 사이트 분석 기반, 추후 실제 공고로 대체 예정) ===
// 각 직무별로 자주 요구되는 기술 스택, 선호 자격증, 추천 공고 사이트 정리
export const JOB_REQUIREMENT_PATTERNS: Record<string, { role: string; skills: string[]; preferredCerts: string[]; jobSites: string[] }> = {
  '백엔드 개발': {
    role: '백엔드 개발자',
    skills: ['Java', 'Spring', 'Python', 'Node.js', 'MySQL', 'Redis'],
    preferredCerts: ['정보처리기사', 'SQLD (SQL 개발자)'],
    jobSites: ['점핏', '로켓펀치', '그룹바이'],
  },
  '프론트엔드 개발': {
    role: '프론트엔드 개발자',
    skills: ['JavaScript', 'React', 'Vue.js', 'HTML/CSS'],
    preferredCerts: ['정보처리기능사', '컴퓨터활용능력 2급'],
    jobSites: ['점핏', '로켓펀치', '서핏'],
  },
  '데이터 분석': {
    role: '데이터 분석가',
    skills: ['Python', 'SQL', 'pandas', 'Tableau', '통계'],
    preferredCerts: ['SQLD (SQL 개발자)', 'ADsP (데이터분석 준전문가)', 'ADP (데이터분석 전문가)', '빅데이터분석기사'],
    jobSites: ['서핏', '점핏', '로켓펀치'],
  },
  'IT 보안': {
    role: '정보보안 담당',
    skills: ['네트워크', '보안 솔루션', '취약점 진단', 'Linux'],
    preferredCerts: ['정보보안기사', '리눅스마스터 1급', '네트워크관리사 1급'],
    jobSites: ['점핏', '로켓펀치'],
  },
  '사무/경영지원': {
    role: '사무·경영지원',
    skills: ['Excel', 'Word', 'PowerPoint', 'ERP'],
    preferredCerts: ['컴퓨터활용능력 1급', '워드프로세서', 'ERP정보관리사', '전산회계 1급'],
    jobSites: ['캐치', '리멤버'],
  },
  '디자인': {
    role: '그래픽/웹 디자이너',
    skills: ['Photoshop', 'Illustrator', 'Figma', 'UI/UX'],
    preferredCerts: ['GTQ 그래픽기술자격', 'GTQi 그래픽기술자격 일러스트'],
    jobSites: ['코공고', '서핏'],
  },
};

// === 자격증 대표 URL (추천·조회용) ===
export const QUALIFICATION_URLS: Record<string, string> = {
  '빅데이터분석기사': 'https://www.dataq.or.kr/www/sub/a_07.do',
  'ADP (데이터분석 전문가)': 'https://www.dataq.or.kr/www/sub/a_05.do',
  'ADsP (데이터분석 준전문가)': 'https://www.dataq.or.kr/www/sub/a_06.do',
  'SQLP (SQL 전문가)': 'https://www.dataq.or.kr/www/sub/a_03.do',
  'SQLD (SQL 개발자)': 'https://www.dataq.or.kr/www/sub/a_04.do',
  'DAP (데이터아키텍처 전문가)': 'https://www.dataq.or.kr/www/sub/a_01.do',
  'DAsP (데이터아키텍처 준전문가)': 'https://www.dataq.or.kr/www/sub/a_02.do',
  '한국사능력검정시험': 'https://www.historyexam.go.kr/pageLink.do?link=examInfo',
  'TOEIC': 'https://exam.toeic.co.kr/common/template/viewContents.php?contentsCode=19',
  '정보처리기사': 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1320&jmInfoDivCcd=B0',
  '정보처리산업기사': 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1321&jmInfoDivCcd=B0',
  '정보처리기능사': 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1322&jmInfoDivCcd=B0',
  '정보보안기사': 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1324&jmInfoDivCcd=B0',
  '정보보안산업기사': 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1325&jmInfoDivCcd=B0',
  '컴퓨터활용능력 1급': 'https://license.korcham.net/co/examguide.do?mm=21&cd=0103',
  '컴퓨터활용능력 2급': 'https://license.korcham.net/co/examguide.do?mm=21&cd=0103',
  '워드프로세서': 'https://license.korcham.net/co/examguide.do?mm=21&cd=0102',
  'ITQ 정보기술자격': 'https://license.kpc.or.kr/',
  '네트워크관리사 1급': 'https://www.icqa.or.kr/',
  '네트워크관리사 2급': 'https://www.icqa.or.kr/',
  '리눅스마스터 1급': 'https://www.ihq.or.kr/',
  '리눅스마스터 2급': 'https://www.ihq.or.kr/',
  'ERP정보관리사': 'https://license.kpc.or.kr/',
  '전산회계운용사': 'https://license.korcham.net/',
  '유통관리사': 'https://license.korcham.net/',
  '무역영어': 'https://license.korcham.net/',
  'GTQ 그래픽기술자격': 'https://license.kpc.or.kr/',
  'GTQi 그래픽기술자격 일러스트': 'https://license.kpc.or.kr/',
  'GTQid 그래픽기술자격 인디자인': 'https://license.kpc.or.kr/',
  '투자자산운용사': 'https://license.kofia.or.kr/examInfo/examYearly.do',
  '금융투자분석사': 'https://license.kofia.or.kr/examInfo/examYearly.do',
  '재무위험관리사': 'https://license.kofia.or.kr/examInfo/examYearly.do',
  '신용분석사': 'https://www.kbi.or.kr/platformWeb/Common.do?cmd=goIndex',
  '전산회계 1급': 'https://license.kacta.or.kr/',
  '전산회계 2급': 'https://license.kacta.or.kr/',
  '전산세무 1급': 'https://license.kacta.or.kr/',
  '전산세무 2급': 'https://license.kacta.or.kr/',
};

// === 자격증별 공식 상세 URL (official-certificate-source-links.md 기반) ===
// 비로그인 상태에서 볼 수 있는 공식 페이지 중심
// 로그인 필요 페이지(원서접수, 성적조회, 마이페이지 등)는 제외
export const QUALIFICATION_DETAIL_URLS: Record<string, { detail: string; schedule?: string; eligibility?: string; fee?: string; examInfo?: string }> = {
  // 데이터자격검정 - 공통 링크
  '빅데이터분석기사': { detail: 'https://www.dataq.or.kr/www/sub/a_07.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'ADP (데이터분석 전문가)': { detail: 'https://www.dataq.or.kr/www/sub/a_05.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'ADsP (데이터분석 준전문가)': { detail: 'https://www.dataq.or.kr/www/sub/a_06.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'SQLP (SQL 전문가)': { detail: 'https://www.dataq.or.kr/www/sub/a_03.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'SQLD (SQL 개발자)': { detail: 'https://www.dataq.or.kr/www/sub/a_04.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'DAP (데이터아키텍처 전문가)': { detail: 'https://www.dataq.or.kr/www/sub/a_01.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  'DAsP (데이터아키텍처 준전문가)': { detail: 'https://www.dataq.or.kr/www/sub/a_02.do', schedule: 'https://www.dataq.or.kr/www/accept/schedule.do', eligibility: 'https://www.dataq.or.kr/www/sub/a_08.do', fee: 'https://www.dataq.or.kr/www/sub/a_ioci.do' },
  // 한국사능력검정시험
  '한국사능력검정시험': { detail: 'https://www.historyexam.go.kr/pageLink.do?link=examInfo', schedule: 'https://www.historyexam.go.kr/pageLink.do?link=examSchedule', examInfo: 'https://www.historyexam.go.kr/pageLink.do?link=apyexmInfo', eligibility: 'https://www.historyexam.go.kr/pageLink.do?link=rceptInfo' },
  // TOEIC
  'TOEIC': { detail: 'https://exam.toeic.co.kr/common/template/viewContents.php?contentsCode=19', schedule: 'https://exam.toeic.co.kr/receipt/examSchList.php', examInfo: 'https://exam.toeic.co.kr/common/template/viewContents.php?contentsCode=36' },
  // 정보처리기사
  '정보처리기사': { detail: 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s01&jmCd=1320&jmInfoDivCcd=B0', schedule: 'https://www.q-net.or.kr/crf005.do?gSite=Q&id=crf00503s02&jmCd=1320&jmInfoDivCcd=B0', eligibility: 'https://www.q-net.or.kr/crf006.do?id=crf00603&gSite=Q', fee: 'https://www.q-net.or.kr/rcv001.do?id=rcv00103&gSite=Q' },
  // 컴퓨터활용능력
  '컴퓨터활용능력 1급': { detail: 'https://license.korcham.net/co/examguide.do?mm=21&cd=0103', schedule: 'https://license.korcham.net/co/examguide03.do?cd=0103&mm=21', examInfo: 'https://license.korcham.net/co/examguide04.do?cd=0103&mm=21' },
  '컴퓨터활용능력 2급': { detail: 'https://license.korcham.net/co/examguide.do?mm=21&cd=0103', schedule: 'https://license.korcham.net/co/examguide03.do?cd=0103&mm=21', examInfo: 'https://license.korcham.net/co/examguide04.do?cd=0103&mm=21' },
};
