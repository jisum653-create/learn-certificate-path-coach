import { NextRequest, NextResponse } from 'next/server'

// P0-1: 사용자 조건 기반 1순위+대안 추천
// P0-3: 개인화 학습 경로 (유료 강의 가이드라인 포함)
// P1-6: 취업 가이드라인 (조건부 — 관심 공고·목표 직무 있을 때만)
export async function POST(req: NextRequest) {
  const b...[truncated]