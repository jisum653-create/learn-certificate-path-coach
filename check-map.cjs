const { extractCertMentions, classifyCertIntent } = require('./app/lib/qualification-map');

const cases = [
  '컴활 1급을 준비하고 싶어',
  '컴활 1급 준비',
  '컴활 1급',
  '컴활 2급을 준비하고 싶어',
  '컴퓨터활용능력 1급 따려고 해',
  '컴활 1급 합격했어',
  '정보처리기사 준비 시작',
  '정보처리기사',
  'ADP를 준비하고 싶어',
  'ADsP랑 SQLP 중에 뭐가 좋을까',
  '빅데이터분석기사',
  '빅데이터분석기사 시험 일정 알려줘',
  'SQLD 준비하고 싶어',
  'SQLP 준비',
  '정보처리기능사 땄어',
];

for (const text of cases) {
  const mentions = extractCertMentions(text);
  const intent = classifyCertIntent(text);
  console.log(`${text}`);
  console.log(`  mentions: ${mentions.map(m => `${m.standard}("${m.raw}")`).join(', ')}`);
  console.log(`  certIntent: 확정=${intent.확정}, 표준=${intent.표준}, 확정근거=${intent.확정근거}, 힌트=${intent.미지정힌트}`);
  console.log('');
}
