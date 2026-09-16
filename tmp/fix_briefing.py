p = 'app/lib/intent.ts'
lines = open(p, encoding='utf-8').read().splitlines(True)
out = []
for ln in lines:
    out.append(ln)
    if ln.startswith('const RECOMMEND_PAT = '):
        out.append('const TODAY_BRIEFING_PAT = /(오늘|지금|뭐\s*(?:공부|해야|할|해야\s*해|할까)|브리핑|오늘\s*뭐|오늘\s*할\s*일|오늘\s*공부|뭐\s*부터|오늘\s*체크|체크인|진도)/i;\n')
open(p, 'w', encoding='utf-8').writelines(out)
print('TODAY_BRIEFING_PAT 삽입 완료')
