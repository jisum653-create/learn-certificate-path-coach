const { classifyIntent } = require('./app/lib/intent');
const { extractCertMentions } = require('./app/lib/qualification-map');

const profile = {
  진로: '데이터 분석',
  보유자격증: [],
  학습방식: '문제풀이형',
  비용선호: '완전 무료',
  가용시간: '하루 2시간',
  목표시기: '2026년 하반기',
  관심공고: '',
};

const cases = [
  '빅데이터분석기사 시험 일정 알려줘',
  '빅데이터분석기사 준비 시작할래',
  'ADP를 준비하고 싶어',
  '정보처리기사를 준비하고 싶어',
  '컴활 1급을 준비하고 싶어',
  'SQLD 준비하고 싶어',
  'SQLP 준비할래',
  '빅데이터분석기사를 준비하고 싶어',
  '목표 자격증을 바꾸고 싶어',
  '합격했어',
  '정보처리기능사 땄어',
  '컴활 1급 합격했어',
  '추천해줘',
  '뭐가 좋을까',
  '처음부터 다시 시작할게',
  '대화 기록 지워줘',
  '내 프로필 좀 반영해줘',
  '학습 계획 세워줘',
  '빅데이터분석기사 일정 말고 추천 먼저 해줘',
  'ADsP랑 SQLP 중에 뭐가 좋을까',
  '그냥 개발자 준비하는데 뭐 따면 좋을지',
  'SQLD 시험 일정 알려줘',
  '정보처리기사 준비하려는데 학습 계획 만들어줘',
  '시험은 언제야',
  '일정 보여줘',
  '자격증 일정 알려줘',
  '준비 계획 세워줘',
];

const lines = cases.map(text => {
  const r = classifyIntent(text, profile);
  const mentions = extractCertMentions(text).map(m => m.standard);
  return { text, intent: r.intent, goal: r.goalStandard, mentions, confirmed: r.certConfirmed };
});

lines.forEach(l => {
  console.log(`${l.text} → ${l.intent} (goal=${l.goal}, mentions=[${l.mentions}], confirmed=${l.confirmed})`);
});
