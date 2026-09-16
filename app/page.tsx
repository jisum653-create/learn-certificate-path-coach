'use client'
import { useState, useEffect, useRef } from 'react'

// ---------- 도메인 타입 ----------
interface Profile {
  진로?: string
  보유자격증?: string[]
  학습방식?: string
  비용선호?: string
  예산?: string
  가용시간?: string
  목표시기?: string
  목표회차?: string
  관심공고?: string
  저장동의?: boolean
  취득완료자격?: string[]
  영어성적?: string
  유효기간자산?: string
}

type TabId = 'chat' | 'dashboard' | 'schedule' | 'plan' | 'profile' | 'p1'

interface Message {
  role: 'user' | 'bot'
  text: string
  meta?: string
}

interface RecResult {
  primary: { name: string; reason: string; prepRange: string; caution: string }
  alternatives: { name: string; reason: string }[]
  path: {
    basic: {
      lecture: string; examMaterial: string; textbook: string
      estimatedCost: string; reason: string
      paidLecture?: string; caution?: string
    }
  }
  usedInfo: string[]
  guideline?: { jobSummary: string; requiredSkills: string; certConnection: string; portfolio: string; referencePosts: string }
}

interface ScheduleData {
  qualification: string
  items: { label: string; value: string; source: string; note?: string }[]
}

interface PlanData {
  qualification: string
  examDate: string
  totalWeeks: number
  weeks: { week: number; focus: string; hours: string; done: boolean }[]
  briefing: { task: string; deadline: string }
  status: '준비중' | '접수완료' | '응시완료' | '합격' | '불합격'
}

// ---------- Apple 디자인 토큰 ----------
const C = {
  white: '#ffffff',
  parchment: '#f5f5f7',
  ink: '#1d1d1f',
  muted: '#333333',
  muted2: '#7a7a7a',
  muted3: '#999999',
  hairline: '#e0e0e0',
  hairlineStrong: '#d2d2d7',
  accent: '#0066cc',
  accentHover: '#0052a3',
  accentFocus: '#0071e3',
  accentDark: '#2997ff',
  darkTile: '#272729',
  darkTileText: '#ffffff',
  success: '#34c759',
  warning: '#ff9500',
  danger: '#ff3b30',
  back: '#f5f5f7',
}

const F = {
  family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Segoe UI, system-ui, sans-serif',
  display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
}

const T = {
  hero: { size: 'clamp(30px, 4.5vw, 52px)', weight: 600, lh: 1.07, tracking: '-0.28px' },
  h1:   { size: 'clamp(26px, 3.5vw, 38px)', weight: 600, lh: 1.1, tracking: '0px' },
  h2:   { size: '20px', weight: 600, lh: 1.2, tracking: '-0.2px' },
  h3:   { size: '17px', weight: 600, lh: 1.3, tracking: '-0.3px' },
  body: { size: '17px', weight: 400, lh: 1.47, tracking: '-0.3px' },
  bodyStrong: { size: '17px', weight: 600, lh: 1.3, tracking: '-0.3px' },
  caption: { size: '14px', weight: 400, lh: 1.43, tracking: '-0.2px' },
  captionStrong: { size: '14px', weight: 600, lh: 1.3, tracking: '-0.2px' },
  small: { size: '12px', weight: 400, lh: 1.35, tracking: '-0.1px' },
  smallStrong: { size: '12px', weight: 600, lh: 1.3, tracking: '-0.1px' },
  micro: { size: '10px', weight: 500, lh: 1.3, tracking: '-0.05px' },
  utility: { size: '13px', weight: 500, lh: 1.29, tracking: '-0.2px' },
}

const R = { none: 0, sm: 8, md: 11, lg: 18, pill: 9999 }

const S = {
  xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48
}

const SH = {
  card: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  raised: '0 4px 12px rgba(0,0,0,0.06)',
  modal: '0 12px 40px rgba(0,0,0,0.14)',
}

const 유료가이드라인 =
  '유료 강의 추천 시 이유 없이 유료부터 제시하지 않고, 사용자가 유료 허용 시 유료 후보를 포함하며, ' +
  '유료 강의는 가격·무료 전환 지점·전체 범위 cover 여부를 반드시 표시하고 사용자 조건과 연결해 설명하되, ' +
  '무료 대안이 있으면 함께 제시한다.'

// ---------- localStorage helpers ----------
function loadProfile(): Profile {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem('certCoachProfile')
    if (!raw) return {}
    return JSON.parse(raw) as Profile
  } catch { return {} }
}
function saveProfile(p: Profile, 동의: boolean) {
  if (!동의) return
  localStorage.setItem('certCoachProfile', JSON.stringify({ ...p, 저장동의: true }))
}
function clearProfile() {
  localStorage.removeItem('certCoachProfile')
  localStorage.removeItem('certCoachMessages')
}

// ---------- API 호출 ----------
async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ---------- 메시지 로컬 저장 ----------
function loadMessages(): Message[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem('certCoachMessages')
    if (!raw) return []
    return JSON.parse(raw) as Message[]
  } catch { return [] }
}
function saveMessages(msgs: Message[]) {
  localStorage.setItem('certCoachMessages', JSON.stringify(msgs))
}

// ---------- 메시지 메타 배지 ----------
function metaBadge(meta?: string): string {
  if (!meta || meta === 'first-visit') return ''
  switch (meta) {
    case 'question': return '질문'
    case 'done': return '완료'
    case 'saved': return '저장됨'
    case 'error': return '오류'
    case 'reset': return '초기화'
    case 'next': return '다음'
    default: return '알림'
  }
}

// ---------- 달력 헬퍼 ----------
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function parseDate(str: string): Date | null {
  if (!str) return null
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d.getTime()) ? null : d
}
function extractExamDate(items: ScheduleData['items']): string | null {
  const it = items.find(i =>
    i.label.includes('시험일정') || i.label.includes('시험일') || i.label.includes('시험 날짜')
  )
  return it ? it.value : null
}

// ---------- 메시지 버블 ----------
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      maxWidth: isUser ? '80%' : '88%',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      background: isUser ? C.ink : C.parchment,
      color: isUser ? C.white : C.ink,
      borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
      padding: '10px 14px',
      fontSize: T.body.size,
      lineHeight: T.body.lh,
      fontWeight: T.body.weight,
      fontFamily: F.family,
      letterSpacing: T.body.tracking,
      wordBreak: 'break-word',
    }}>
      {metaBadge(msg.meta) && (
        <div style={{
          fontSize: T.micro.size,
          color: isUser ? C.muted2 : C.muted2,
          marginBottom: S.xs,
          fontWeight: T.micro.weight,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          opacity: 0.7,
        }}>
          {metaBadge(msg.meta)}
        </div>
      )}
      {msg.text}
    </div>
  )
}

// ---------- 탭 버튼 ----------
function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? C.accent : C.white,
        color: active ? C.white : C.ink,
        border: active ? 'none' : '1px solid',
        borderColor: active ? C.accent : C.hairline,
        padding: `${(S.sm - 2)}px ${S.md}px`,
        borderRadius: R.pill,
        cursor: 'pointer',
        fontSize: T.utility.size,
        fontWeight: active ? T.utility.weight : T.utility.weight,
        textTransform: 'none',
        letterSpacing: T.utility.tracking,
        fontFamily: F.family,
        lineHeight: 1.29,
        transition: 'background 120ms ease, border-color 120ms ease',
        boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

// ---------- 상태 배지 ----------
function StatusBadge({ status }: { status: PlanData['status'] }) {
  const map = {
    준비중: { bg: C.parchment, color: C.ink, label: '준비중' },
    접수완료: { bg: '#fff4e5', color: '#b85c00', label: '접수완료' },
    응시완료: { bg: '#e8f0fe', color: C.accent, label: '응시완료' },
    합격: { bg: '#e8f5e9', color: '#1b7a3d', label: '합격' },
    불합격: { bg: '#fde8e8', color: '#c0392b', label: '불합격' },
  }
  const s = map[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: `${S.xxs}px ${S.sm}px`,
      background: s.bg,
      color: s.color,
      borderRadius: R.pill,
      fontSize: T.captionStrong.size,
      fontWeight: T.captionStrong.weight,
      fontFamily: F.family,
      letterSpacing: T.captionStrong.tracking,
      textTransform: 'uppercase',
    }}>
      {s.label}
    </span>
  )
}

// ---------- 카드 ----------
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white,
      borderRadius: R.lg,
      padding: S.lg,
      boxShadow: SH.card,
      border: '1px solid',
      borderColor: C.hairline,
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: S.md }}>
      <h2 style={{
        fontSize: T.h3.size,
        fontWeight: T.h3.weight,
        color: C.ink,
        fontFamily: F.family,
        letterSpacing: T.h3.tracking,
        margin: 0,
        lineHeight: T.h3.lh,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{
          fontSize: T.small.size,
          color: C.muted2,
          margin: `${S.xs}px 0 0`,
          fontFamily: F.family,
          letterSpacing: T.small.tracking,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ---------- 캘린더 위젯 ----------
function CalendarWidget({ schedule }: { schedule: ScheduleData | null }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const examDateStr = schedule ? extractExamDate(schedule.items) : null
  const examDate = examDateStr ? parseDate(examDateStr) : null

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isToday = (year: number, month: number, day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
  const isExamDay = (year: number, month: number, day: number) =>
    examDate && year === examDate.getFullYear() && month === examDate.getMonth() && day === examDate.getDate()

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })

  return (
    <Card>
      <CardHeader
        title="공식 시험 일정"
        subtitle={schedule ? schedule.qualification : '대화에서 자격증 일정을 확인하면 캘린더에 표시돼요'}
      />

      {schedule ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
          {/* 월 그리드 */}
          <div>
            {/* 월 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: S.sm,
            }}>
              <button
                onClick={() => {
                  if (viewMonth === 0) { setViewYear(v => v - 1); setViewMonth(11) }
                  else setViewMonth(m => m - 1)
                }}
                style={{
                  width: 32, height: 32,
                  background: C.parchment,
                  border: 'none',
                  borderRadius: R.pill,
                  cursor: 'pointer',
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'none',
                }}
                title="이전 달"
              >
                ‹
              </button>
              <span style={{
                fontSize: T.bodyStrong.size,
                fontWeight: T.bodyStrong.weight,
                color: C.ink,
                fontFamily: F.display,
                letterSpacing: T.bodyStrong.tracking,
              }}>
                {monthLabel}
              </span>
              <button
                onClick={() => {
                  if (viewMonth === 11) { setViewYear(v => v + 1); setViewMonth(0) }
                  else setViewMonth(m => m + 1)
                }}
                style={{
                  width: 32, height: 32,
                  background: C.parchment,
                  border: 'none',
                  borderRadius: R.pill,
                  cursor: 'pointer',
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="다음 달"
              >
                ›
              </button>
            </div>

            {/* 요일 헤더 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: S.xs,
            }}>
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} style={{
                  textAlign: 'center',
                  fontSize: T.small.size,
                  fontWeight: T.smallStrong.weight,
                  color: C.muted2,
                  fontFamily: F.family,
                  padding: S.xs,
                  letterSpacing: T.small.tracking,
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}>
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`e${idx}`} style={{ aspectRatio: '1' }} />
                }
                const isTodayCell = isToday(viewYear, viewMonth, day)
                const isExam = isExamDay(viewYear, viewMonth, day)
                const isOutside = day < today.getDate() &&
                  viewYear === today.getFullYear() && viewMonth === today.getMonth()

                return (
                  <div
                    key={day}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: R.sm,
                      background: isTodayCell ? C.accent : 'transparent',
                      color: isTodayCell ? C.white : (isOutside ? C.muted3 : C.ink),
                      fontSize: T.caption.size,
                      fontWeight: (isTodayCell || isExam) ? T.captionStrong.weight : T.caption.weight,
                      fontFamily: F.family,
                      letterSpacing: T.caption.tracking,
                      cursor: 'default',
                      position: 'relative',
                      transition: 'background 120ms ease',
                    }}
                  >
                    <span>{day}</span>
                    {isExam && (
                      <span style={{
                        width: 5, height: 5,
                        background: isTodayCell ? C.white : C.accent,
                        borderRadius: R.pill,
                        marginTop: 1,
                        display: 'block',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 시험일 하이라이트 */}
          {examDate && (
            <div style={{
              padding: `${S.sm}px ${S.md}px`,
              background: '#e8f0fe',
              borderRadius: R.md,
              border: '1px solid',
              borderColor: '#b3d4fc',
            }}>
              <div style={{
                fontSize: T.smallStrong.size,
                fontWeight: T.smallStrong.weight,
                color: C.accent,
                fontFamily: F.family,
                letterSpacing: T.smallStrong.tracking,
                textTransform: 'uppercase',
                marginBottom: S.xs,
              }}>
                시험 예정일
              </div>
              <div style={{
                fontSize: T.bodyStrong.size,
                fontWeight: T.bodyStrong.weight,
                color: C.ink,
                fontFamily: F.family,
                letterSpacing: T.bodyStrong.tracking,
              }}>
                {examDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}

          {/* 일정 항목 목록 */}
          {schedule.items.length > 0 && (
            <div>
              <div style={{
                fontSize: T.smallStrong.size,
                fontWeight: T.smallStrong.weight,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.smallStrong.tracking,
                textTransform: 'uppercase',
                marginBottom: S.xs,
              }}>
                상세 정보
              </div>
              {schedule.items.map((it, i) => (
                <div
                  key={i}
                  style={{
                    padding: `${S.xs}px ${S.sm}px`,
                    background: C.parchment,
                    borderRadius: R.sm,
                    marginBottom: S.xs,
                  }}
                >
                  <div style={{
                    fontSize: T.captionStrong.size,
                    fontWeight: T.captionStrong.weight,
                    color: C.ink,
                    fontFamily: F.family,
                    letterSpacing: T.captionStrong.tracking,
                  }}>
                    {it.label}
                  </div>
                  <div style={{
                    fontSize: T.caption.size,
                    color: C.muted,
                    fontFamily: F.family,
                    letterSpacing: T.caption.tracking,
                    marginTop: 2,
                  }}>
                    {it.value}
                  </div>
                  {it.source && (
                    <div style={{
                      fontSize: T.micro.size,
                      color: C.muted2,
                      fontFamily: F.family,
                      letterSpacing: T.micro.tracking,
                      marginTop: S.xxs,
                      opacity: 0.8,
                    }}>
                      출처: {it.source}
                    </div>
                  )}
                  {it.note && (
                    <div style={{
                      fontSize: T.micro.size,
                      color: C.danger,
                      fontFamily: F.family,
                      fontWeight: 600,
                      letterSpacing: T.micro.tracking,
                      marginTop: S.xxs,
                    }}>
                      {it.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 캘린더 등록 동의 영역 */}
          {schedule && (
            <div style={{ marginTop: S.sm }}>
              <p style={{
                fontSize: T.small.size,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.small.tracking,
                lineHeight: 1.5,
                margin: 0,
              }}>
                Google Calendar에 시험 일정을 등록할 수 있어요. 동의하면 연결돼요.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: `${S.xl}px ${S.lg}px`,
          textAlign: 'center',
          color: C.muted2,
          fontFamily: F.family,
          fontSize: T.body.size,
          lineHeight: T.body.lh,
        }}>
          <div style={{
            fontSize: T.h3.size,
            fontWeight: T.h3.weight,
            color: C.ink,
            fontFamily: F.display,
            letterSpacing: T.h3.tracking,
            marginBottom: S.sm,
          }}>
            아직 일정이 없어요
          </div>
          <p style={{ margin: 0 }}>
            대화에서 <span style={{ color: C.accent, fontWeight: 500 }}>"정보처리기사 일정 알려줘"</span>처럼
            물어보면 공식 일정을 가져와서 여기에 표시해요.
          </p>
          <div style={{
            marginTop: S.md,
            display: 'flex',
            flexWrap: 'wrap',
            gap: S.xs,
            justifyContent: 'center',
          }}>
            {['정보처리기사 시험 일정 알려줘', 'SQLD 응시료랑 접수 일정 알려줘', '컴활 1급 시험일 언제야'].map(q => (
              <span
                key={q}
                style={{
                  padding: `${S.xs}px ${S.sm}px`,
                  background: C.parchment,
                  borderRadius: R.pill,
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  border: '1px solid',
                  borderColor: C.hairline,
                }}
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ---------- 계획 위젯 ----------
function PlanWidget({ plan }: { plan: PlanData | null }) {
  if (!plan) {
    return (
      <Card>
        <CardHeader
          title="학습 계획"
          subtitle="추천받은 자격증에 대해 '준비 시작할래'라고 말하면 만들어드려요"
        />
        <div style={{
          padding: `${S.xl}px ${S.lg}px`,
          textAlign: 'center',
          color: C.muted2,
          fontFamily: F.family,
          fontSize: T.body.size,
          lineHeight: T.body.lh,
        }}>
          <div style={{
            fontSize: T.h3.size,
            fontWeight: T.h3.weight,
            color: C.ink,
            fontFamily: F.display,
            letterSpacing: T.h3.tracking,
            marginBottom: S.sm,
          }}>
            계획이 아직 없어요
          </div>
          <p style={{ margin: 0 }}>
            자격증 추천을 받은 뒤{" "}
            <span style={{ color: C.accent, fontWeight: 500 }}>"정보처리기사 준비 시작할래"</span>라고 말하면
            주차별 계획이 만들어져요.
          </p>
          <div style={{
            marginTop: S.md,
            display: 'flex',
            flexWrap: 'wrap',
            gap: S.xs,
            justifyContent: 'center',
          }}>
            {['주 5시간으로 시험일까지 계획 세워줘', '오늘 뭐 공부해?', '계획 줄여줘'].map(q => (
              <span
                key={q}
                style={{
                  padding: `${S.xs}px ${S.sm}px`,
                  background: C.parchment,
                  borderRadius: R.pill,
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  border: '1px solid',
                  borderColor: C.hairline,
                }}
              >
                {q}
              </span>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const doneCount = plan.weeks.filter(w => w.done).length
  const progress = plan.totalWeeks > 0 ? (doneCount / plan.totalWeeks) * 100 : 0

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{
        padding: S.lg,
        borderBottom: '1px solid',
        borderColor: C.hairline,
        background: C.parchment,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: S.md }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: T.h3.size,
              fontWeight: T.h3.weight,
              color: C.ink,
              fontFamily: F.display,
              letterSpacing: T.h3.tracking,
              marginBottom: S.xs,
            }}>
              {plan.qualification}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: S.sm, alignItems: 'center' }}>
              <span style={{
                fontSize: T.caption.size,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.caption.tracking,
              }}>
                시험일
              </span>
              <span style={{
                fontSize: T.bodyStrong.size,
                fontWeight: T.bodyStrong.weight,
                color: C.ink,
                fontFamily: F.family,
                letterSpacing: T.bodyStrong.tracking,
              }}>
                {plan.examDate}
              </span>
              <span style={{
                fontSize: T.caption.size,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.caption.tracking,
              }}>
                · 총 {plan.totalWeeks}주
              </span>
              <StatusBadge status={plan.status} />
            </div>
          </div>
          {/* 전체 진행률 */}
          <div style={{ minWidth: 120, textAlign: 'right' }}>
            <div style={{
              fontSize: T.smallStrong.size,
                fontWeight: T.smallStrong.weight,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.smallStrong.tracking,
                marginBottom: S.xs,
              }}>
                진행 {doneCount}/{plan.totalWeeks}주
              </div>
            <div style={{
              height: 6,
              background: C.hairline,
              borderRadius: R.pill,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: progress >= 100 ? C.success : C.accent,
                borderRadius: R.pill,
                transition: 'width 300ms ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* 주차 목록 */}
      <div style={{ padding: S.lg }}>
        <div style={{
          fontSize: T.smallStrong.size,
          fontWeight: T.smallStrong.weight,
          color: C.muted,
          fontFamily: F.family,
          letterSpacing: T.smallStrong.tracking,
          textTransform: 'uppercase',
          marginBottom: S.sm,
        }}>
          주차별 계획
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: S.xs }}>
          {plan.weeks.map(w => (
            <div
              key={w.week}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: S.md,
                padding: `${S.sm}px ${S.md}px`,
                background: w.done ? '#f0f7ec' : C.parchment,
                borderRadius: R.md,
                border: '1px solid',
                borderColor: w.done ? '#d4e8c8' : C.hairline,
              }}
            >
              {/* 주차 번호 */}
              <div style={{
                minWidth: 56,
                fontSize: T.captionStrong.size,
                fontWeight: T.captionStrong.weight,
                color: w.done ? '#1b7a3d' : C.ink,
                fontFamily: F.family,
                letterSpacing: T.captionStrong.tracking,
              }}>
                {w.week}주차
              </div>

              {/*포커스 */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  fontWeight: 500,
                }}>
                  {w.focus}
                </div>
              </div>

              {/* 권장 시간 */}
              <div style={{
                minWidth: 60,
                textAlign: 'right',
                fontSize: T.caption.size,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.caption.tracking,
              }}>
                {w.hours}
              </div>

              {/* 완료 체크 */}
              <div style={{
                width: 24, height: 24,
                borderRadius: R.pill,
                background: w.done ? C.success : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: T.caption.size,
                fontWeight: T.captionStrong.weight,
                color: w.done ? C.white : C.muted2,
                fontFamily: F.family,
                letterSpacing: T.captionStrong.tracking,
                border: w.done ? 'none' : '1.5px solid',
                borderColor: w.done ? C.success : C.hairline,
              }}>
                {w.done ? '✓' : ''}
              </div>
            </div>
          ))}
        </div>

        {/* 오늘 브리핑 */}
        <div style={{
          marginTop: S.md,
          padding: S.md,
          background: C.accent,
          borderRadius: R.md,
          color: C.white,
        }}>
          <div style={{
            fontSize: T.smallStrong.size,
            fontWeight: T.smallStrong.weight,
            fontFamily: F.family,
            letterSpacing: T.smallStrong.tracking,
            textTransform: 'uppercase',
            marginBottom: S.xs,
            opacity: 0.9,
          }}>
            오늘 브리핑
          </div>
          <div style={{
            fontSize: T.bodyStrong.size,
            fontWeight: T.bodyStrong.weight,
            fontFamily: F.family,
            letterSpacing: T.bodyStrong.tracking,
            lineHeight: 1.4,
          }}>
            {plan.briefing.task}
            <br />
            <span style={{
              fontSize: T.caption.size,
              fontWeight: T.caption.weight,
              opacity: 0.85,
              display: 'block',
              marginTop: S.xs,
            }}>
              가장 가까운 마감: {plan.briefing.deadline}
            </span>
          </div>
        </div>

        <div style={{
          marginTop: S.md,
          fontSize: T.small.size,
          color: C.muted2,
          fontFamily: F.family,
          letterSpacing: T.small.tracking,
          lineHeight: 1.5,
          padding: `${S.sm}px ${S.md}px`,
          background: C.parchment,
          borderRadius: R.sm,
          border: '1px solid',
          borderColor: C.hairline,
        }}>
          지연 3일 이상 또는 주당 가용시간 50% 초과 시 재조정돼요.
          <br />
          3일 연속 미완료 시 계획 축소 안내가 나가요.
        </div>
      </div>
    </Card>
  )
}

// ---------- 추천 위젯 ----------
function RecommendationWidget({ rec }: { rec: RecResult | null }) {
  if (!rec) {
    return (
      <Card>
        <CardHeader
          title="추천 결과"
          subtitle="대화 중 자격증 추천을 요청하면 1순위 + 대안 + 학습 경로를 표시해요"
        />
        <div style={{
          padding: `${S.xl}px ${S.lg}px`,
          textAlign: 'center',
          color: C.muted2,
          fontFamily: F.family,
          fontSize: T.body.size,
          lineHeight: T.body.lh,
        }}>
          <div style={{
            fontSize: T.h3.size,
            fontWeight: T.h3.weight,
            color: C.ink,
            fontFamily: F.display,
            letterSpacing: T.h3.tracking,
            marginBottom: S.sm,
          }}>
            아직 추천한 자격증이 없어요
          </div>
          <p style={{ margin: 0 }}>
            희망 직무나 관심 분야를 알려주시면 조건에 맞는 자격증을 추천드려요.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="추천 결과"
        subtitle={rec.usedInfo.length > 0 ? `근거: ${rec.usedInfo.join(', ')}` : undefined}
      />

      {/* 1순위 */}
      <div>
        <div style={{
          fontSize: T.h2.size,
          fontWeight: T.h2.weight,
          color: C.accent,
          fontFamily: F.display,
          letterSpacing: T.h2.tracking,
          marginBottom: S.xs,
          display: 'flex',
          alignItems: 'center',
          gap: S.sm,
        }}>
          <span style={{
            fontSize: T.h3.size,
            fontWeight: T.h3.weight,
            color: C.accent,
            fontFamily: F.display,
          }}>
            1순위
          </span>
          <span>{rec.primary.name}</span>
        </div>
        <p style={{
          fontSize: T.body.size,
          color: C.ink,
          fontFamily: F.family,
          letterSpacing: T.body.tracking,
          lineHeight: T.body.lh,
          margin: 0,
          padding: `${S.xs}px ${S.md}px`,
          background: C.parchment,
          borderRadius: R.md,
        }}>
          {rec.primary.reason}
        </p>
        <div style={{
          marginTop: S.sm,
          padding: `${S.xs}px ${S.md}px`,
          background: C.white,
          borderRadius: R.sm,
          border: '1px solid',
          borderColor: C.hairline,
          fontSize: T.caption.size,
          color: C.muted,
          fontFamily: F.family,
          letterSpacing: T.caption.tracking,
          lineHeight: 1.6,
        }}>
          <div><strong>준비 예상:</strong> {rec.primary.prepRange}</div>
          <div><strong>주의점:</strong> {rec.primary.caution}</div>
        </div>
      </div>

      {/* 대안 */}
      {rec.alternatives.length > 0 && (
        <div style={{ marginTop: S.lg }}>
          <div style={{
            fontSize: T.smallStrong.size,
            fontWeight: T.smallStrong.weight,
            color: C.muted,
            fontFamily: F.family,
            letterSpacing: T.smallStrong.tracking,
            textTransform: 'uppercase',
            marginBottom: S.sm,
          }}>
            대안 자격증
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: S.xs }}>
            {rec.alternatives.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  background: C.parchment,
                  borderRadius: R.md,
                  border: '1px solid',
                  borderColor: C.hairline,
                }}
              >
                <div style={{
                  fontSize: T.captionStrong.size,
                  fontWeight: T.captionStrong.weight,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.captionStrong.tracking,
                  marginBottom: 2,
                }}>
                  {a.name}
                </div>
                <div style={{
                  fontSize: T.caption.size,
                  color: C.muted,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                }}>
                  {a.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 학습 경로 */}
      {rec.path?.basic && (
        <div style={{
          marginTop: S.lg,
          paddingTop: S.lg,
          borderTop: '1px solid',
          borderColor: C.hairline,
        }}>
          <div style={{
            fontSize: T.smallStrong.size,
            fontWeight: T.smallStrong.weight,
            color: C.muted,
            fontFamily: F.family,
            letterSpacing: T.smallStrong.tracking,
            textTransform: 'uppercase',
            marginBottom: S.sm,
          }}>
            기본 학습 경로
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: S.sm,
            fontSize: T.caption.size,
            color: C.ink,
            fontFamily: F.family,
            letterSpacing: T.caption.tracking,
          }}>
            <div>
              <span style={{ color: C.muted2, fontWeight: 500 }}>강의</span>
              <div style={{ marginTop: 2, color: C.ink, fontWeight: T.captionStrong.weight }}>
                {rec.path.basic.lecture}
              </div>
            </div>
            <div>
              <span style={{ color: C.muted2, fontWeight: 500 }}>기출·자료</span>
              <div style={{ marginTop: 2, color: C.ink, fontWeight: T.captionStrong.weight }}>
                {rec.path.basic.examMaterial}
              </div>
            </div>
            <div>
              <span style={{ color: C.muted2, fontWeight: 500 }}>교재</span>
              <div style={{ marginTop: 2, color: C.ink, fontWeight: T.captionStrong.weight }}>
                {rec.path.basic.textbook}
              </div>
            </div>
            <div>
              <span style={{ color: C.muted2, fontWeight: 500 }}>예상 비용</span>
              <div style={{ marginTop: 2, color: C.ink, fontWeight: T.captionStrong.weight }}>
                {rec.path.basic.estimatedCost}
              </div>
            </div>
          </div>
          {rec.path.basic.reason && (
            <div style={{
              marginTop: S.sm,
              padding: `${S.xs}px ${S.md}px`,
              background: C.parchment,
              borderRadius: R.sm,
              fontSize: T.caption.size,
              color: C.muted,
              fontFamily: F.family,
              letterSpacing: T.caption.tracking,
              lineHeight: 1.5,
            }}>
              <strong>선택 이유:</strong> {rec.path.basic.reason}
            </div>
          )}
          {rec.path.basic.paidLecture && (
            <div style={{
              marginTop: S.sm,
              padding: `${S.sm}px ${S.md}px`,
              background: '#fff4e5',
              borderRadius: R.md,
              border: '1px solid',
              borderColor: '#ffcc80',
              fontSize: T.caption.size,
              color: '#b85c00',
              fontFamily: F.family,
              letterSpacing: T.caption.tracking,
              fontWeight: T.captionStrong.weight,
            }}>
              <strong>유료 강의 옵션:</strong> {rec.path.basic.paidLecture}
            </div>
          )}
          {rec.path.basic.caution && (
            <div style={{
              marginTop: S.sm,
              padding: `${S.xs}px ${S.md}px`,
              background: '#fde8e8',
              borderRadius: R.sm,
              fontSize: T.caption.size,
              color: C.danger,
              fontFamily: F.family,
              letterSpacing: T.caption.tracking,
              fontWeight: T.captionStrong.weight,
            }}>
              <strong>주의:</strong> {rec.path.basic.caution}
            </div>
          )}
        </div>
      )}

      {/* 취업 가이드라인 */}
      {rec.guideline && (
        <div style={{
          marginTop: S.lg,
          padding: S.md,
          background: '#e8f0fe',
          borderRadius: R.md,
          border: '1px solid',
          borderColor: '#b3d4fc',
          fontSize: T.caption.size,
          color: C.ink,
          fontFamily: F.family,
          letterSpacing: T.caption.tracking,
          lineHeight: 1.6,
        }}>
          <div style={{
            fontSize: T.smallStrong.size,
            fontWeight: T.smallStrong.weight,
            color: C.accent,
            fontFamily: F.family,
            letterSpacing: T.smallStrong.tracking,
            textTransform: 'uppercase',
            marginBottom: S.sm,
          }}>
            📋 취업 가이드라인 (조건부)
          </div>
          <div><strong>직무 요약:</strong> {rec.guideline.jobSummary}</div>
          <div><strong>필요 역량:</strong> {rec.guideline.requiredSkills}</div>
          <div><strong>자격증 연결:</strong> {rec.guideline.certConnection}</div>
          <div><strong>포트폴리오 방향:</strong> {rec.guideline.portfolio}</div>
          <div><strong>참고 공고:</strong> {rec.guideline.referencePosts}</div>
        </div>
      )}
    </Card>
  )
}

// ---------- 프로필 위젯 ----------
function ProfileWidget({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [local, setLocal] = useState<Profile>(profile)

  useEffect(() => {
    setLocal(profile)
  }, [profile])

  const fields = [
    { key: '진로', label: '진로 / 관심 직무', type: 'text' },
    { key: '학습방식', label: '학습 방식', type: 'text' },
    { key: '비용선호', label: '비용 선호', type: 'text' },
    { key: '예산', label: '예산', type: 'text' },
    { key: '가용시간', label: '가용 시간', type: 'text' },
    { key: '목표시기', label: '목표 시기', type: 'text' },
    { key: '목표회차', label: '목표 회차', type: 'text' },
    { key: '관심공고', label: '관심 공고', type: 'text' },
    { key: '영어성적', label: '영어 성적', type: 'text' },
    { key: '유효기간자산', label: '유효기간 자산', type: 'text' },
  ]

  const listFields = [
    { key: '보유자격증', label: '보유 자격증' },
    { key: '취득완료자격', label: '취득 완료 자격' },
  ]

  const handleChange = (key: string, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  const handleListChange = (key: string, value: string) => {
    const current = local[key] || []
    const cleaned = value.split(',').map(s => s.trim()).filter(Boolean)
    setLocal(prev => ({ ...prev, [key]: cleaned }))
  }

  const handleSave = () => {
    onSave(local)
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{
        padding: S.lg,
        borderBottom: '1px solid',
        borderColor: C.hairline,
        background: C.parchment,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{
            fontSize: T.h3.size,
            fontWeight: T.h3.weight,
            color: C.ink,
            fontFamily: F.display,
            letterSpacing: T.h3.tracking,
            marginBottom: S.xs,
          }}>
            프로필
          </div>
          <div style={{
            fontSize: T.caption.size,
            color: C.muted,
            fontFamily: F.family,
            letterSpacing: T.caption.tracking,
          }}>
            {profile.저장동의 ? '저장됨 — 수정 가능' : (Object.keys(profile).length > 0 ? '저장 전 — 동의하면 저장돼요' : '미설정')}
          </div>
        </div>
        <button
          onClick={handleSave}
          style={{
            padding: `${S.xs}px ${S.md}px`,
            background: C.accent,
            color: C.white,
            border: 'none',
            borderRadius: R.pill,
            cursor: 'pointer',
            fontSize: T.captionStrong.size,
            fontWeight: T.captionStrong.weight,
            fontFamily: F.family,
            letterSpacing: T.captionStrong.tracking,
            textTransform: 'uppercase',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        >
          저장
        </button>
      </div>

      <div style={{ padding: S.lg }}>
        {/* 텍스트 필드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.sm }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{
                display: 'block',
                fontSize: T.micro.size,
                fontWeight: T.micro.weight,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.micro.tracking,
                textTransform: 'uppercase',
                marginBottom: S.xs,
              }}>
                {f.label}
              </label>
              <input
                type="text"
                value={local[f.key] || ''}
                onChange={e => handleChange(f.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: `${S.xs}px ${S.sm}px`,
                  background: C.white,
                  border: '1px solid',
                  borderColor: C.hairline,
                  borderRadius: R.sm,
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        {/* 목록 필드 */}
        <div style={{ marginTop: S.md, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.sm }}>
          {listFields.map(f => (
            <div key={f.key}>
              <label style={{
                display: 'block',
                fontSize: T.micro.size,
                fontWeight: T.micro.weight,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.micro.tracking,
                textTransform: 'uppercase',
                marginBottom: S.xs,
              }}>
                {f.label}
                <span style={{ color: C.muted3, marginLeft: S.xs, fontWeight: 400 }}>
                  (쉼표로 구분)
                </span>
              </label>
              <input
                type="text"
                value={(local[f.key] || []).join(', ')}
                onChange={e => handleListChange(f.key, e.target.value)}
                style={{
                  width: '100%',
                  padding: `${S.xs}px ${S.sm}px`,
                  background: C.white,
                  border: '1px solid',
                  borderColor: C.hairline,
                  borderRadius: R.sm,
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>

        {/* 현재 저장된 값 미리보기 */}
        <div style={{
          marginTop: S.lg,
          padding: S.md,
          background: C.white,
          borderRadius: R.md,
          border: '1px solid',
          borderColor: C.hairline,
        }}>
          <div style={{
            fontSize: T.micro.size,
            fontWeight: T.micro.weight,
            color: C.muted,
            fontFamily: F.family,
            letterSpacing: T.micro.tracking,
            textTransform: 'uppercase',
            marginBottom: S.sm,
          }}>
            저장된 프로필 미리보기
          </div>
          <pre style={{
            fontSize: T.small.size,
            background: C.parchment,
            color: C.ink,
            padding: S.sm,
            borderRadius: R.sm,
            whiteSpace: 'pre-wrap',
            maxHeight: 140,
            overflow: 'auto',
            fontFamily: F.family,
            letterSpacing: T.small.tracking,
            margin: 0,
            border: '1px solid',
            borderColor: C.hairline,
          }}>
            {JSON.stringify(local, null, 2) || '(저장된 프로필 없음)'}
          </pre>
        </div>

        <p style={{
          marginTop: S.md,
          fontSize: T.small.size,
          color: C.muted2,
          fontFamily: F.family,
          letterSpacing: T.small.tracking,
          lineHeight: 1.5,
        }}>
          대화 중에{" "}
          <span style={{ color: C.accent }}>"내 목표가 바뀌었어"</span> 또는{" "}
          <span style={{ color: C.accent }}>"비용 선호를 변경할래"</span>라고 말해도 반영돼요.
          이미 확인된 값은 함부로 바꾸지 않고 새 정보만 갱신해요.
        </p>
      </div>
    </Card>
  )
}

// ---------- MAIN PAGE ----------
export default function Home() {
  const [tab, setTab] = useState<TabId>('chat')
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState<Profile>(loadProfile())
  const [rec, setRec] = useState<RecResult | null>(null)
  const [schedule, setSchedule] = useState<ScheduleData | null>(null)
  const [plan, setPlan] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(false)
  const [shownConsent, setShownConsent] = useState(false)
  const [calendarConsentAsked, setCalendarConsentAsked] = useState(false)
  const [calendarConsent, setCalendarConsent] = useState<boolean | null>(null)
  const [calendarRegistered, setCalendarRegistered] = useState(false)
  const [notionToken, setNotionToken] = useState<string>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('certCoachNotionToken') || '' : '')
  const [notionParentPageId, setNotionParentPageId] = useState<string>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem('certCoachNotionParentPageId') || '' : '')
  const [notionResult, setNotionResult] = useState<{ type: 'success' | 'error' | 'fallback'; url?: string; message: string } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // 첫 방문 안내 + 저장된 프로필 안내
  useEffect(() => {
    if (messages.length === 0) {
      const initMessages: Message[] = []
      if (profile.저장동의 === true && Object.keys(profile).length > 0) {
        initMessages.push({ role: 'bot', text: '저장된 프로필을 찾았어요. 필요하면 언제든 수정할 수 있어요. 먼저 프로필 탭에서 확인하고, 필요하면 대화 중에 바꿔도 돼요.', meta: 'saved' })
      }
      initMessages.push({
        role: 'bot',
        text: '안녕하세요! 자격증을 뭘 준비할지 고민 중이신가요? 희망하는 직무나 관심 있는 분야를 알려주시면, 조건에 맞는 1순위 + 대안 자격증부터 추천드릴게요. (예: IT/개발, 사무·행정, 디자인, 전기·전자, 회계, 데이터 등)',
        meta: 'first-visit',
      })
      setMessages(prev => [...prev, ...initMessages])
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  // 메시지 localStorage 동기화
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages)
  }, [messages])

  const sendMessage = async (overrideText?: string) => {
    const text = overrideText ?? input.trim()
    if (!text) return
    setInput('')
    const userMsg: Message = { role: 'user', text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    try {
      const res = await postJson('/api/recommend', { profile, message: text })
      if (res.type === 'question') {
        const q = (res.questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')
        setMessages(prev => [...prev, { role: 'bot', text: q || '더 필요한 정보가 없어요. 추천할 준비가 되었어요.', meta: 'question' }])
        if (res.profileUpdate) {
          setProfile(prev => ({ ...prev, ...res.profileUpdate }))
        }
      } else if (res.recommendation) {
        setRec(res.recommendation)
        const ok = profile.저장동의 !== true
        if (ok) setShownConsent(true)
        setMessages(prev => [...prev, { role: 'bot', text: '자격증 추천을 준비했어요. 아래 대시보드에서 결과를 확인할 수 있어요.', meta: 'done' }])
      } else if (res.schedule) {
        setSchedule(res.schedule)
        setMessages(prev => [...prev, { role: 'bot', text: '공식 시험 일정 정보를 가져왔어요. 아래 일정 탭에서 확인해요.', meta: 'done' }])
      } else if (res.plan) {
        setPlan(res.plan)
        setMessages(prev => [...prev, { role: 'bot', text: '학습 계획 미리보기를 만들었어요. 아래 계획 탭에서 확인해요. 준비 시작을 원하면 프로필 탭에서 저장 후 진행해요.', meta: 'done' }])
      } else if (res.type === 'result') {
        setMessages(prev => [...prev, { role: 'bot', text: res.result?.message || res.message || '결과를 확인했어요.', meta: 'done' }])
        if (res.profileUpdate) {
          setProfile(prev => ({ ...prev, ...res.profileUpdate }))
        }
        if (res.recommendation) {
          setRec(res.recommendation)
        }
      } else if (res.type === 'nextpath') {
        setMessages(prev => [...prev, { role: 'bot', text: res.nextPath?.note || res.message || '다음 경로를 검토했어요.', meta: 'done' }])
        if (res.recommendation) setRec(res.recommendation)
      } else if (res.type === 'profile') {
        if (res.profileUpdate) {
          setProfile(prev => ({ ...prev, ...res.profileUpdate }))
        }
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '프로필 조건이 반영됐어요.', meta: 'saved' }])
      } else if (res.type === 'validity') {
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '유효기간 검토 결과를 확인했어요.', meta: 'done' }])
      } else if (res.type === 'calendar') {
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '캘린더 등록 상태를 확인했어요.', meta: 'done' }])
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: res.text || res.message || '알겠어요. 더 필요한 정보가 있으면 알려드릴게요.', meta: 'reply' }])
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: '일시적 오류가 발생했어요. 다시 시도해 주세요.', meta: 'error' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const 동의후저장 = () => {
    saveProfile(profile, true)
    setShownConsent(false)
    setMessages(prev => [...prev, { role: 'bot', text: '프로필 저장에 동의해 주셔서 고마워요. 이제 추천 결과를 더 정확하게 맞춤화할 수 있어요.', meta: 'saved' }])
  }

  const handleCalendarRegister = async () => {
    if (!schedule) return
    setLoading(true)
    try {
      const res = await postJson('/api/calendar-register', {
        qualification: schedule.qualification,
        examDate: schedule.items.find((it) => it.label === '시험일정' || it.label === '시험일')?.value || '',
        consent: true,
      })
      if (res.status === 'registered') {
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '캘린더에 일정이 등록됐어요.', meta: 'done' }])
        setCalendarRegistered(true)
      } else if (res.status === 'unavailable' || res.status === 'token_expired') {
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '캘린더 연결이 안 되어 있어 텍스트 일정과 연결 안내로 대체해요.', meta: 'reply' }])
        setCalendarRegistered(false)
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '캘린더 등록 상태를 확인했어요.', meta: 'done' }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: '캘린더 등록 중 오류가 발생했어요. 다시 시도해 주세요.', meta: 'error' }])
      setCalendarRegistered(false)
    } finally {
      setLoading(false)
    }
  }

  const handleNotionConnect = async () => {
    if (!plan) {
      setNotionResult({ type: 'error', message: '먼저 대화에서 학습 계획이 만들어져야 해요.' })
      return
    }
    if (!notionToken || !notionParentPageId) {
      setNotionResult({ type: 'error', message: 'Notion 통합 토큰과 부모 페이지 ID를 모두 입력해 주세요.' })
      return
    }
    setLoading(true)
    try {
      const res = await postJson('/api/study-plan', {
        profile,
        qualification: plan.qualification,
        examDate: plan.examDate,
        consent: true,
        notionToken,
        notionParentPageId,
      })
      if (res.notionPageUrl) {
        localStorage.setItem('certCoachNotionToken', notionToken)
        localStorage.setItem('certCoachNotionParentPageId', notionParentPageId)
        setNotionResult({ type: 'success', url: res.notionPageUrl, message: res.message || 'Notion 학습 공간이 만들어졌어요.' })
        setMessages(prev => [...prev, { role: 'bot', text: res.message || 'Notion 학습 공간이 만들어졌어요.', meta: 'done' }])
      } else if (res.대체) {
        setNotionResult({ type: 'fallback', message: res.대체.text || 'Notion 연동은 실패했지만 워크스페이스 파일로 대체할게요.' })
        setMessages(prev => [...prev, { role: 'bot', text: res.대체.text || 'Notion 연동 실패, 텍스트 계획으로 안내드릴게요.', meta: 'reply' }])
      } else {
        setNotionResult({ type: 'error', message: res.message || 'Notion 연동 중 오류가 발생했어요.' })
        setMessages(prev => [...prev, { role: 'bot', text: res.message || '오류가 발생했어요.', meta: 'error' }])
      }
    } catch (e) {
      setNotionResult({ type: 'error', message: 'Notion 연동 중 네트워크 오류가 발생했어요.' })
      setMessages(prev => [...prev, { role: 'bot', text: 'Notion 연동 중 오류가 발생했어요. 다시 시도해 주세요.', meta: 'error' }])
    } finally {
      setLoading(false)
    }
  }

  const 헤더프로필 = profile.저장동의
    ? '저장됨'
    : (Object.keys(profile).length > 0 ? '저장 전' : '미설정')

  const tabs = [
    ['chat', '대화'],
    ['dashboard', '추천'],
    ['schedule', '일정'],
    ['plan', '계획'],
    ['profile', '프로필'],
    ['p1', '기능'],
  ] as const

  return (
    <div style={{
      minHeight: '100vh',
      background: C.back,
      fontFamily: F.family,
    }}>
      {/* HEADER */}
      <header style={{
        background: C.white,
        borderBottom: '1px solid',
        borderColor: C.hairline,
        padding: `${S.md}px ${S.lg}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: SH.card,
      }}>
        <div>
          <h1 style={{
            fontSize: T.h2.size,
            fontWeight: T.h2.weight,
            color: C.ink,
            fontFamily: F.display,
            letterSpacing: T.h2.tracking,
            margin: 0,
            lineHeight: T.h2.lh,
          }}>
            자격증 패스 코치
          </h1>
          <p style={{
            fontSize: T.small.size,
            color: C.muted2,
            margin: `${S.xs}px 0 0`,
            fontFamily: F.family,
            letterSpacing: T.small.tracking,
          }}>
            처음 자격증 준비를 시작하는 분을 위한 대화형 코치
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
          <span style={{
            fontSize: T.micro.size,
            color: C.muted2,
            fontFamily: F.family,
            letterSpacing: T.micro.tracking,
            textTransform: 'uppercase',
            fontWeight: T.micro.weight,
            padding: `${S.xs}px ${S.sm}px`,
            background: C.parchment,
            borderRadius: R.pill,
          }}>
            프로필: {헤더프로필}
          </span>
          <button
            onClick={() => {
              clearProfile()
              clearMessages()
              setProfile({})
              setRec(null)
              setSchedule(null)
              setPlan(null)
              setMessages([])
              setMessages(prev => [...prev, { role: 'bot', text: '프로필과 대화 기록이 초기화되었어요. 처음부터 다시 시작할 수 있어요.', meta: 'reset' }])
            }}
            style={{
              fontSize: T.micro.size,
              padding: `${S.xs}px ${S.sm}px`,
              border: '1px solid',
              borderColor: C.hairline,
              color: C.muted,
              background: C.white,
              borderRadius: R.pill,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: T.micro.tracking,
              fontWeight: T.micro.weight,
              fontFamily: F.family,
            }}
          >
            초기화
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 0,
        minHeight: 'calc(100vh - 63px)',
      }}>
        {/* CHAT PANEL — 좌측 고정 */}
        <aside style={{
          background: C.white,
          borderRight: '1px solid',
          borderColor: C.hairline,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* 봇 헤더 */}
          <div style={{
            padding: `${S.md}px ${S.lg}px`,
            borderBottom: '1px solid',
            borderColor: C.hairline,
            background: C.parchment,
            display: 'flex',
            alignItems: 'center',
            gap: S.md,
          }}>
            <div style={{
              width: 44, height: 44,
              borderRadius: R.pill,
              background: C.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.white,
              fontSize: T.bodyStrong.size,
              fontWeight: T.bodyStrong.weight,
              fontFamily: F.display,
              letterSpacing: T.bodyStrong.tracking,
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,102,204,0.25)',
            }}>
              코
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: T.captionStrong.size,
                fontWeight: T.captionStrong.weight,
                color: C.ink,
                fontFamily: F.family,
                letterSpacing: T.captionStrong.tracking,
              }}>
                자격증 패스 코치
              </div>
              <div style={{
                fontSize: T.micro.size,
                color: C.muted2,
                fontFamily: F.family,
                letterSpacing: T.micro.tracking,
                marginTop: 1,
              }}>
                추천 · 일정 · 학습 경로 · 진도 관리
              </div>
            </div>
            <span style={{
              fontSize: T.micro.size,
              color: C.success,
              fontWeight: T.micro.weight,
              fontFamily: F.family,
              letterSpacing: T.micro.tracking,
              textTransform: 'uppercase',
              padding: `${S.xs}px ${S.sm}px`,
              background: '#e8f5e9',
              borderRadius: R.pill,
            }}>
              온라인
            </span>
          </div>

          {/* 대화 영역 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: S.lg,
            display: 'flex',
            flexDirection: 'column',
            gap: S.sm,
            minHeight: 320,
          }}>
            {messages.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: C.muted2,
                fontFamily: F.family,
                fontSize: T.body.size,
                lineHeight: T.body.lh,
                paddingTop: 40,
              }}>
                <p style={{ margin: 0 }}>대화로 시작하세요.</p>
                <p style={{
                  fontSize: T.caption.size,
                  color: C.muted3,
                  marginTop: S.sm,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                }}>
                  예:{" "}
                  <span style={{
                    color: C.accent,
                    fontWeight: 500,
                    borderBottom: '1px solid',
                    borderColor: '#b3d4fc',
                  }}>IT 분야 자격증 추천해줘</span>
                  ,{" "}
                  <span style={{
                    color: C.accent,
                    fontWeight: 500,
                    borderBottom: '1px solid',
                    borderColor: '#b3d4fc',
                  }}>정보처리기사 일정 알려줘</span>
                </p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} msg={msg} />
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: C.parchment,
                borderRadius: '4px 18px 18px 18px',
                padding: `${S.sm}px ${S.md}px`,
                color: C.muted,
                fontSize: T.caption.size,
                fontFamily: F.family,
                letterSpacing: T.caption.tracking,
              }}>
                코치 답변 중…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 입력 영역 */}
          <div style={{
            padding: `${S.md}px ${S.lg}px`,
            borderTop: '1px solid',
            borderColor: C.hairline,
            background: C.white,
          }}>
            <div style={{
              display: 'flex',
              gap: S.sm,
              alignItems: 'center',
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요 (Enter: 전송, Shift+Enter: 줄바꿈)"
                style={{
                  flex: 1,
                  padding: `${S.sm}px ${S.md}px`,
                  background: C.parchment,
                  color: C.ink,
                  border: '1.5px solid',
                  borderColor: C.hairline,
                  borderRadius: R.pill,
                  fontSize: T.body.size,
                  fontWeight: T.body.weight,
                  fontFamily: F.family,
                  letterSpacing: T.body.tracking,
                  outline: 'none',
                  lineHeight: T.body.lh,
                  transition: 'border-color 120ms ease',
                }}
              />
              <button
                disabled={loading || !input.trim()}
                onClick={() => sendMessage()}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  borderRadius: R.pill,
                  background: loading || !input.trim() ? C.parchment : C.accent,
                  color: loading || !input.trim() ? C.muted : C.white,
                  border: 'none',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                  fontSize: T.captionStrong.size,
                  fontWeight: T.captionStrong.weight,
                  fontFamily: F.family,
                  letterSpacing: T.captionStrong.tracking,
                  textTransform: 'uppercase',
                  boxShadow: loading || !input.trim() ? 'none' : '0 1px 3px rgba(0,102,204,0.3)',
                  transition: 'background 120ms ease, box-shadow 120ms ease',
                  minWidth: 44,
                }}
              >
                전송
              </button>
            </div>
          </div>
        </aside>

        {/* DASHBOARD — 우측 */}
        <main style={{
          padding: S.lg,
          overflowY: 'auto',
          background: C.back,
        }}>
          {/* 탭 내비게이션 */}
          <nav style={{
            display: 'flex',
            gap: S.xs,
            marginBottom: S.lg,
            flexWrap: 'wrap',
            paddingBottom: S.sm,
            borderBottom: '1px solid',
            borderColor: C.hairline,
          }}>
            {tabs.map(([id, label]) => (
              <TabButton key={id} active={tab === id} label={label} onClick={() => setTab(id as TabId)} />
            ))}
          </nav>

          {/* 탭 콘텐츠 */}
          {tab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
              <RecommendationWidget rec={rec} />
              {schedule && (
                <CalendarWidget schedule={schedule} />
              )}
              {plan && (
                <PlanWidget plan={plan} />
              )}
              {!rec && !schedule && !plan && (
                <Card>
                  <CardHeader
                    title="대시보드"
                    subtitle="대화에서 자격증 추천을 요청하면 여기에 결과가 모여요"
                  />
                  <div style={{
                    padding: `${S.xl}px ${S.lg}px`,
                    textAlign: 'center',
                    color: C.muted2,
                    fontFamily: F.family,
                    fontSize: T.body.size,
                    lineHeight: T.body.lh,
                  }}>
                    <div style={{
                      fontSize: T.h3.size,
                      fontWeight: T.h3.weight,
                      color: C.ink,
                      fontFamily: F.display,
                      letterSpacing: T.h3.tracking,
                      marginBottom: S.sm,
                    }}>
                      아직 추천할 자격증이 없어요
                    </div>
                    <p style={{ margin: 0 }}>
                      좌측 채팅에서 희망 직무나 관심 분야를 알려주시면,
                      <br />
                      1순위 + 대안 자격증 + 학습 경로를 여기에 보여드려요.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'schedule' && (
            <div>
              <CalendarWidget schedule={schedule} />
            </div>
          )}

          {tab === 'plan' && (
            <div>
              <PlanWidget plan={plan} />
            </div>
          )}

          {tab === 'profile' && (
            <div>
              <ProfileWidget profile={profile} onSave={setProfile} />
            </div>
          )}

          {tab === 'p1' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
              {/* 캘린더 등록 */}
              <Card>
                <CardHeader
                  title="캘린더 등록"
                  subtitle="Google Calendar 커넥터 연결 확인 후, 공식 확정 일정만 사용자 동의 후 등록해요"
                />
                {schedule ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
                    <div style={{
                      padding: S.md,
                      background: C.parchment,
                      borderRadius: R.md,
                      border: '1px solid',
                      borderColor: C.hairline,
                    }}>
                      <div style={{
                        fontSize: T.captionStrong.size,
                        fontWeight: T.captionStrong.weight,
                        color: C.ink,
                        fontFamily: F.family,
                        letterSpacing: T.captionStrong.tracking,
                      }}>
                        현재 대화에서 확인된 일정
                      </div>
                      <div style={{
                        fontSize: T.bodyStrong.size,
                        fontWeight: T.bodyStrong.weight,
                        color: C.accent,
                        fontFamily: F.family,
                        letterSpacing: T.bodyStrong.tracking,
                        marginTop: S.xs,
                      }}>
                        {schedule.qualification}
                      </div>
                    </div>

                    {!calendarConsentAsked ? (
                      <button
                        onClick={() => setCalendarConsentAsked(true)}
                        style={{
                          padding: `${S.sm}px ${S.md}px`,
                          background: C.accent,
                          color: C.white,
                          border: 'none',
                          borderRadius: R.pill,
                          cursor: 'pointer',
                          fontSize: T.captionStrong.size,
                          fontWeight: T.captionStrong.weight,
                          fontFamily: F.family,
                          letterSpacing: T.captionStrong.tracking,
                          textTransform: 'uppercase',
                          boxShadow: '0 1px 3px rgba(0,102,204,0.3)',
                        }}
                      >
                        캘린더 등록 동의 물어보기
                      </button>
                    ) : (
                      <div style={{
                        padding: S.md,
                        background: C.parchment,
                        borderRadius: R.md,
                        border: '1px solid',
                        borderColor: C.hairline,
                      }}>
                        <p style={{
                          fontSize: T.caption.size,
                          color: C.muted,
                          fontFamily: F.family,
                          letterSpacing: T.caption.tracking,
                          lineHeight: 1.5,
                          margin: 0,
                        }}>
                          공식 확정된 일정을 캘린더에 등록할까요?
                          <br />
                          (미등록 시 텍스트 일정과 연결 안내로 대체돼요)
                        </p>
                        <div style={{ display: 'flex', gap: S.sm, marginTop: S.md }}>
                          <button
                            onClick={() => { setCalendarConsent(true); handleCalendarRegister() }}
                            style={{
                              padding: `${S.sm}px ${S.md}px`,
                              background: C.accent,
                              color: C.white,
                              border: 'none',
                              borderRadius: R.pill,
                              cursor: 'pointer',
                              fontSize: T.captionStrong.size,
                              fontWeight: T.captionStrong.weight,
                              fontFamily: F.family,
                              letterSpacing: T.captionStrong.tracking,
                              textTransform: 'uppercase',
                              boxShadow: '0 1px 3px rgba(0,102,204,0.3)',
                            }}
                          >
                            등록 동의
                          </button>
                          <button
                            onClick={() => { setCalendarConsent(false); setCalendarRegistered(false) }}
                            style={{
                              padding: `${S.sm}px ${S.md}px`,
                              background: C.white,
                              color: C.ink,
                              border: '1px solid',
                              borderColor: C.hairline,
                              borderRadius: R.pill,
                              cursor: 'pointer',
                              fontSize: T.captionStrong.size,
                              fontWeight: T.captionStrong.weight,
                              fontFamily: F.family,
                              letterSpacing: T.captionStrong.tracking,
                              textTransform: 'uppercase',
                            }}
                          >
                            등록 안 함
                          </button>
                        </div>
                        {calendarConsent === true && calendarRegistered === true && (
                          <div style={{
                            marginTop: S.sm,
                            padding: `${S.xs}px ${S.md}px`,
                            background: '#e8f5e9',
                            borderRadius: R.sm,
                            color: '#1b7a3d',
                            fontSize: T.captionStrong.size,
                            fontWeight: T.captionStrong.weight,
                            fontFamily: F.family,
                            letterSpacing: T.captionStrong.tracking,
                            border: '1px solid',
                            borderColor: '#b8e0c0',
                          }}>
                            ✓ 동의했어요. 캘린더에 일정이 등록됐어요.
                          </div>
                        )}
                        {calendarConsent === true && calendarRegistered === false && (
                          <div style={{
                            marginTop: S.sm,
                            padding: `${S.xs}px ${S.md}px`,
                            background: '#fff4e5',
                            borderRadius: R.sm,
                            color: '#b85c00',
                            fontSize: T.captionStrong.size,
                            fontWeight: T.captionStrong.weight,
                            fontFamily: F.family,
                            letterSpacing: T.captionStrong.tracking,
                            border: '1px solid',
                            borderColor: '#ffcc80',
                          }}>
                            동의했지만 캘린더 연결이 아직 안 됐어요. 캘린더 연결하기를 먼저 진행해 주세요.
                          </div>
                        )}
                        {calendarConsent === false && (
                          <div style={{
                            marginTop: S.sm,
                            padding: `${S.xs}px ${S.md}px`,
                            background: C.parchment,
                            borderRadius: R.sm,
                            color: C.muted2,
                            fontSize: T.caption.size,
                            fontFamily: F.family,
                            letterSpacing: T.caption.tracking,
                            border: '1px solid',
                            borderColor: C.hairline,
                          }}>
                            등록하지 않기로 했어요. 텍스트 일정과 연결 안내를 제공해요.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p style={{
                    fontSize: T.caption.size,
                    color: C.muted2,
                    fontFamily: F.family,
                    letterSpacing: T.caption.tracking,
                    lineHeight: 1.5,
                  }}>
                    먼저 대화에서 특정 자격증 일정을 확인해 주세요.
                  </p>
                )}
              </Card>

              {/* 다음 경로 */}
              <Card>
                <CardHeader
                  title="취득 후 다음 경로"
                  subtitle="보유 자격증 갱신 + 추가 취득 방향"
                />
                <p style={{
                  fontSize: T.caption.size,
                  color: C.muted,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  "취득했다"고 직접 말한 경우만 확정해요. 보유 자격증·등급을 확인하고 프로필에 추가(동의 시)해요.
                  <br /><br />
                  기존 자격증과 과도한 중복 후보는 낮추고, 새로운 직무 가치를 더하는 1순위+대안을 제시해요.
                  추가 자격증보다 프로젝트·실무·포트폴리오가 우선인 시점이면 솔직히 말해요.
                </p>
                <div style={{
                  marginTop: S.md,
                  padding: S.md,
                  background: C.parchment,
                  borderRadius: R.md,
                  border: '1px solid',
                  borderColor: C.hairline,
                  fontSize: T.caption.size,
                  color: C.ink,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                }}>
                  <strong>예시:</strong>{" "}
                  "정보처리기사 취득했어" / "SQLD 시험 합격했어" / "다음엔 뭘 따면 좋을까?"
                </div>
              </Card>

              {/* 결과 반영 */}
              <Card>
                <CardHeader
                  title="합격/불합격 결과 반영"
                  subtitle="결과 기반 상태 업데이트 + 다음 계획 조정"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
                  <div style={{
                    padding: S.md,
                    background: '#e8f5e9',
                    borderRadius: R.md,
                    border: '1px solid',
                    borderColor: '#b8e0c0',
                  }}>
                    <div style={{
                      fontSize: T.captionStrong.size,
                      fontWeight: T.captionStrong.weight,
                      color: '#1b7a3d',
                      fontFamily: F.family,
                      letterSpacing: T.captionStrong.tracking,
                      marginBottom: S.xs,
                    }}>
                      합격
                    </div>
                    <p style={{
                      fontSize: T.caption.size,
                      color: C.ink,
                      fontFamily: F.family,
                      letterSpacing: T.caption.tracking,
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      보유 자격증 추가, 상태 합격, 다음 자격증 제안
                    </p>
                  </div>
                  <div style={{
                    padding: S.md,
                    background: '#fde8e8',
                    borderRadius: R.md,
                    border: '1px solid',
                    borderColor: '#f5c6c6',
                  }}>
                    <div style={{
                      fontSize: T.captionStrong.size,
                      fontWeight: T.captionStrong.weight,
                      color: C.danger,
                      fontFamily: F.family,
                      letterSpacing: T.captionStrong.tracking,
                      marginBottom: S.xs,
                    }}>
                      불합격
                    </div>
                    <p style={{
                      fontSize: T.caption.size,
                      color: C.ink,
                      fontFamily: F.family,
                      letterSpacing: T.caption.tracking,
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      완료율 가장 낮았던 단계만 말하고, 다음 회차 공식 일정 확인 후 그 단계 비중을 올린 계획을 제안해요.
                      위로보다 다음 계획을 먼저 제시해요.
                    </p>
                  </div>
                </div>
              </Card>

              {/* 유효기간 */}
              <Card>
                <CardHeader
                  title="유효기간 자산 관리"
                  subtitle="보유 자격증 · 영어 성적 등 유효기간 있는 자산 검토"
                />
                <p style={{
                  fontSize: T.caption.size,
                  color: C.muted,
                  fontFamily: F.family,
                  letterSpacing: T.caption.tracking,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  사용자가 제공한 취득/만료 시점 + 공식 규정 바탕으로 유효 여부·갱신 시점을 검토해요.
                  사용자가 원하지 않으면 이름·등급 중심으로만 확인하고 유효기간 관리는 진행하지 않아요.
                </p>
              </Card>

              {/* 취업 가이드라인 */}
              {profile.관심공고 && (
                <Card>
                  <CardHeader
                    title="취업 가이드라인"
                    subtitle="관심 공고 기반 직무 요약 · 필요 역량 · 자격증 연결"
                  />
                  <div style={{
                    padding: S.md,
                    background: '#e8f0fe',
                    borderRadius: R.md,
                    border: '1px solid',
                    borderColor: '#b3d4fc',
                    fontSize: T.caption.size,
                    color: C.ink,
                    fontFamily: F.family,
                    letterSpacing: T.caption.tracking,
                    lineHeight: 1.6,
                  }}>
                    <div style={{
                      fontSize: T.smallStrong.size,
                      fontWeight: T.smallStrong.weight,
                      color: C.accent,
                      fontFamily: F.family,
                      letterSpacing: T.smallStrong.tracking,
                      textTransform: 'uppercase',
                      marginBottom: S.sm,
                    }}>
                      관심 공고
                    </div>
                    <div>{profile.관심공고}</div>
                    <div style={{ marginTop: S.sm, paddingTop: S.sm, borderTop: '1px solid', borderColor: '#b3d4fc' }}>
                      → 취업 가이드라인 블록을 조건에 맞게 제공해요.
                    </div>
                  </div>
                </Card>
              )}

              {/* Notion 학습 공간 */}
              <Card>
                <CardHeader
                  title="Notion 학습 공간 연동"
                  subtitle="학습 계획을 Notion 페이지로 생성 (사용자 토큰 기반)"
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
                  {!plan ? (
                    <p style={{
                      fontSize: T.caption.size,
                      color: C.muted2,
                      fontFamily: F.family,
                      letterSpacing: T.caption.tracking,
                      lineHeight: 1.5,
                      margin: 0,
                    }}>
                      먼저 대화에서 학습 계획이 만들어져야 해요.
                    </p>
                  ) : (
                    <>
                      <div style={{
                        padding: S.md,
                        background: C.parchment,
                        borderRadius: R.md,
                        border: '1px solid',
                        borderColor: C.hairline,
                      }}>
                        <div style={{
                          fontSize: T.captionStrong.size,
                          fontWeight: T.captionStrong.weight,
                          color: C.ink,
                          fontFamily: F.family,
                          letterSpacing: T.captionStrong.tracking,
                        }}>
                          현재 계획
                        </div>
                        <div style={{
                          fontSize: T.bodyStrong.size,
                          fontWeight: T.bodyStrong.weight,
                          color: C.accent,
                          fontFamily: F.family,
                          letterSpacing: T.bodyStrong.tracking,
                          marginTop: S.xs,
                        }}>
                          {plan.qualification} · 시험일: {plan.examDate}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: S.sm }}>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: T.micro.size,
                            fontWeight: T.micro.weight,
                            color: C.muted,
                            fontFamily: F.family,
                            letterSpacing: T.micro.tracking,
                            textTransform: 'uppercase',
                            marginBottom: S.xs,
                          }}>
                            Notion 토큰
                          </label>
                          <input
                            type="text"
                            value={notionToken}
                            onChange={e => setNotionToken(e.target.value)}
                            style={{
                              width: '100%',
                              padding: `${S.xs}px ${S.sm}px`,
                              background: C.white,
                              border: '1px solid',
                              borderColor: C.hairline,
                              borderRadius: R.sm,
                              fontSize: T.caption.size,
                              color: C.ink,
                              fontFamily: F.family,
                              letterSpacing: T.caption.tracking,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: T.micro.size,
                            fontWeight: T.micro.weight,
                            color: C.muted,
                            fontFamily: F.family,
                            letterSpacing: T.micro.tracking,
                            textTransform: 'uppercase',
                            marginBottom: S.xs,
                          }}>
                            부모 페이지 ID
                          </label>
                          <input
                            type="text"
                            value={notionParentPageId}
                            onChange={e => setNotionParentPageId(e.target.value)}
                            style={{
                              width: '100%',
                              padding: `${S.xs}px ${S.sm}px`,
                              background: C.white,
                              border: '1px solid',
                              borderColor: C.hairline,
                              borderRadius: R.sm,
                              fontSize: T.caption.size,
                              color: C.ink,
                              fontFamily: F.family,
                              letterSpacing: T.caption.tracking,
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleNotionConnect}
                        disabled={loading}
                        style={{
                          padding: `${S.sm}px ${S.md}px`,
                          background: loading ? C.parchment : C.accent,
                          color: loading ? C.muted : C.white,
                          border: 'none',
                          borderRadius: R.pill,
                          cursor: loading ? 'default' : 'pointer',
                          fontSize: T.captionStrong.size,
                          fontWeight: T.captionStrong.weight,
                          fontFamily: F.family,
                          letterSpacing: T.captionStrong.tracking,
                          textTransform: 'uppercase',
                          boxShadow: loading ? 'none' : '0 1px 3px rgba(0,102,204,0.3)',
                          alignSelf: 'flex-start',
                        }}
                      >
                        {loading ? '연동 중…' : 'Notion 학습 공간 만들기'}
                      </button>
                      {notionResult && (
                        <div style={{
                          padding: S.md,
                          background: notionResult.type === 'success' ? '#e8f5e9' : (notionResult.type === 'fallback' ? C.parchment : '#fde8e8'),
                          borderRadius: R.md,
                          border: '1px solid',
                          borderColor: notionResult.type === 'success' ? '#b8e0c0' : (notionResult.type === 'fallback' ? C.hairline : '#f5c6c6'),
                          color: notionResult.type === 'success' ? '#1b7a3d' : (notionResult.type === 'fallback' ? C.muted : C.danger),
                          fontSize: T.caption.size,
                          fontFamily: F.family,
                          letterSpacing: T.caption.tracking,
                          lineHeight: 1.5,
                        }}>
                          {notionResult.message}
                          {notionResult.url && (
                            <a
                              href={notionResult.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'block',
                                marginTop: S.sm,
                                color: C.accent,
                                fontWeight: T.captionStrong.weight,
                                textDecoration: 'none',
                                borderBottom: '1px solid',
                                borderColor: '#b3d4fc',
                              }}
                            >
                              Notion 페이지 열기 →
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* 저장 동의 모달 */}
      {shownConsent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
          padding: S.lg,
        }}>
          <div style={{
            background: C.white,
            borderRadius: R.lg,
            padding: `${S.xl}px ${S.lg}px`,
            width: '100%',
            maxWidth: 460,
            boxShadow: SH.modal,
            border: '1px solid',
            borderColor: C.hairline,
          }}>
            <div style={{
              fontSize: T.h3.size,
              fontWeight: T.h3.weight,
              color: C.ink,
              fontFamily: F.display,
              letterSpacing: T.h3.tracking,
              marginTop: 0,
              marginBottom: S.md,
            }}>
              프로필 저장 동의
            </div>
            <p style={{
              fontSize: T.body.size,
              color: C.ink,
              fontFamily: F.family,
              letterSpacing: T.body.tracking,
              lineHeight: T.body.lh,
              margin: 0,
              marginBottom: S.lg,
            }}>
              추천을 더 정확하게 맞춤화하려면 프로필 정보를 저장합니다.
              저장 전 동의를 받습니다. 저장된 정보는 로컬 스토리지에만 보관되며, 다른 기기에서는 사용할 수 없습니다.
            </p>
            <div style={{
              padding: S.md,
              background: C.parchment,
              borderRadius: R.md,
              border: '1px solid',
              borderColor: C.hairline,
              marginBottom: S.lg,
            }}>
              <div style={{
                fontSize: T.micro.size,
                fontWeight: T.micro.weight,
                color: C.muted,
                fontFamily: F.family,
                letterSpacing: T.micro.tracking,
                textTransform: 'uppercase',
                marginBottom: S.sm,
              }}>
                현재 저장된 프로필 (없을 수 있음)
              </div>
              <pre style={{
                fontSize: T.small.size,
                background: C.white,
                color: C.ink,
                padding: S.md,
                borderRadius: R.sm,
                whiteSpace: 'pre-wrap',
                maxHeight: 160,
                overflow: 'auto',
                border: '1px solid',
                borderColor: C.hairline,
                fontFamily: F.family,
                letterSpacing: T.small.tracking,
                margin: 0,
              }}>
                {JSON.stringify(profile, null, 2) || '(저장된 프로필 없음)'}
              </pre>
            </div>
            <div style={{
              display: 'flex',
              gap: S.sm,
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShownConsent(false)}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  fontSize: T.captionStrong.size,
                  border: '1px solid',
                  borderColor: C.hairline,
                  borderRadius: R.pill,
                  background: C.white,
                  color: C.ink,
                  cursor: 'pointer',
                  fontWeight: T.captionStrong.weight,
                  fontFamily: F.family,
                  letterSpacing: T.captionStrong.tracking,
                  textTransform: 'uppercase',
                }}
              >
                나중에
              </button>
              <button
                onClick={동의후저장}
                style={{
                  padding: `${S.sm}px ${S.md}px`,
                  fontSize: T.captionStrong.size,
                  backgroundColor: C.accent,
                  color: C.white,
                  border: 'none',
                  borderRadius: R.pill,
                  cursor: 'pointer',
                  fontWeight: T.captionStrong.weight,
                  fontFamily: F.family,
                  letterSpacing: T.captionStrong.tracking,
                  textTransform: 'uppercase',
                  boxShadow: '0 1px 3px rgba(0,102,204,0.3)',
                }}
              >
                저장하고 사용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function clearMessages() {
  localStorage.removeItem('certCoachMessages')
}
