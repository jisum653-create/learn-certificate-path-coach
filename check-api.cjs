#!/usr/bin/env node
// 문제 케이스 7개 /api/recommend POST 검증

const cases = [
  { name: '빅데이터분석기사 시험 일정 알려줘', expected: 'schedule' },
  { name: '빅데이터분석기사 준비 시작할래', expected: 'plan' },
  { name: '목표 자격증을 바꾸고 싶어', expected: 'change-goal' },
  { name: '합격했어', expected: 'passed' },
  { name: 'ADP를 준비하고 싶어', expected: 'recommend-confirmed', goal: 'ADP (데이터분석 전문가)' },
  { name: '정보처리기사를 준비하고 싶어', expected: 'recommend-confirmed', goal: '정보처리기사' },
  { name: '컴활 1급을 준비하고 싶어', expected: 'recommend-confirmed', goal: '컴퓨터활용능력 1급' },
];

const base = process.argv[2] || 'http://localhost:3003';

const run = async () => {
  for (const c of cases) {
    const body = {
      profile: {
        진로: '데이터 분석',
        보유자격증: [],
        학습방식: '문제풀이형',
        비용선호: '무료 위주',
        가용시간: '하루 2시간',
        목표시기: '2026년 하반기',
        관심공고: '데이터 분석 채용',
      },
      message: c.name,
    };

    const res = await fetch(`${base}/api/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const intent = json.type ?? 'unknown';

    const ok = intent === c.expected;
    if (c.goal && json.result?.primary?.name) {
      const goalOk = json.result.primary.name === c.goal;
      console.log(`${ok && goalOk ? '✓' : '✗'} ${c.name}`);
      console.log(`  type=${intent} (expected=${c.expected}), primary=${json.result.primary.name} (expected=${c.goal})`);
    } else {
      console.log(`${ok ? '✓' : '✗'} ${c.name}`);
      console.log(`  type=${intent} (expected=${c.expected})${json.result ? ', primary=' + json.result.primary?.name : ''}`);
    }
  }
};

run().catch(e => { console.error(e); process.exit(1); });
