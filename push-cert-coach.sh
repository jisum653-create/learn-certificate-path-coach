#!/bin/bash
set -e
cd /c/DongUk/공모전/MABC/certificate-path-coach

echo "=== Stage ==="
git add -A

echo "=== Commit ==="
git commit -m "release/demo-core: 구글 인증·캘린더 백엔드 Stub 제거, intent.ts 마이너 수정

- 구글 OAuth 라우팅 4개 + 구글 캘린더 2개 + googleapis Stub 2개 삭제
- intent.ts 1줄 수정 (LF→CRLF 경고 동반)
- demo-core 범위 정리: 외부 인증/캘린더 Stub 걷어내고 핵심 데모 기능만 유지"

echo "=== Push ==="
git push origin release/demo-core
