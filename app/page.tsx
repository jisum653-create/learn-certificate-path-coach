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

type ProfileStringKey = '진로' | '학습방식' | '비용선호' | '예산' | '가용시간' | '목표시기' | '목표회차' | '관심공고' | '영어성적' | '유효기간자산'

type ProfileArrayKey = '보유자격증' | '취득완료자격'

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

// ---------- Apple 디자인 토큰 (디자인 시스템) ----------
const tokens = {
  colors: {
    white: '#ffffff',
    parchment: '#f5f5f7',
    parchmentStrong: '#efedef',
    ink: '#1d1d1f',
    inkDark: '#000000',
    inkLight: '#333333',
    muted: '#7a7a7a',
    mutedLight: '#999999',
    hairline: '#e0e0e0',
    hairlineStrong: '#d2d2d7',
    accent: '#0066cc',
    accentHover: '#0052a3',
    accentFocus: '#0071e3',
    accentLight: '#b3d4fc',
    accentBg: '#e8f0fe',
    success: '#34c759',
    successBg: '#e8f5e9',
    successBorder: '#b8e0c0',
    warning: '#ff9500',
    warningBg: '#fff4e5',
    warningBorder: '#ffcc80',
    danger: '#ff3b30',
    dangerBg: '#fde8e8',
    dangerBorder: '#f5c6c6',
    successDark: '#1b7a3d',
    warningDark: '#b85c00',
    back: '#f5f5f7',
  },
  fonts: {
    family: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", system-ui, sans-serif',
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
  },
  type: {
    heroDisplay: { size: 'clamp(32px, 5vw, 56px)', weight: 600, lh: 1.07, tracking: '-0.28px' },
    displayLg: { size: 'clamp(28px, 4vw, 40px)', weight: 600, lh: 1.1, tracking: '0px' },
    displayMd: { size: 'clamp(24px, 3.5vw, 34px)', weight: 600, lh: 1.15, tracking: '-0.374px' },
    h1: { size: 'clamp(24px, 3vw, 32px)', weight: 600, lh: 1.15, tracking: '-0.3px' },
    h2: { size: '22px', weight: 600, lh: 1.2, tracking: '-0.3px' },
    h3: { size: '18px', weight: 600, lh: 1.3, tracking: '-0.3px' },
    body: { size: '17px', weight: 400, lh: 1.47, tracking: '-0.3px' },
    bodyStrong: { size: '17px', weight: 600, lh: 1.3, tracking: '-0.3px' },
    bodySmall: { size: '15px', weight: 400, lh: 1.43, tracking: '-0.3px' },
    caption: { size: '14px', weight: 400, lh: 1.43, tracking: '-0.2px' },
    captionStrong: { size: '14px', weight: 600, lh: 1.3, tracking: '-0.2px' },
    small: { size: '12px', weight: 400, lh: 1.35, tracking: '-0.1px' },
    smallStrong: { size: '12px', weight: 600, lh: 1.3, tracking: '-0.1px' },
    micro: { size: '10px', weight: 500, lh: 1.3, tracking: '-0.05px' },
    utility: { size: '13px', weight: 500, lh: 1.29, tracking: '-0.2px' },
    overline: { size: '10px', weight: 600, lh: 1.2, tracking: '0.12em' },
  },
  radius: {
    none: 0,
    xs: 5,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    pill: 9999,
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    section: 80,
  },
  shadows: {
    card: '0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
    raised: '0 4px 12px rgba(0, 0, 0, 0.06)',
    modal: '0 12px 40px rgba(0, 0, 0, 0.14)',
    button: '0 1px 3px rgba(0, 102, 204, 0.3)',
  },
  borders: {
    hairline: '1px solid var(--hairline)',
    accent: '1px solid var(--accent)',
    none: 'none',
  },
}

// ---------- Hooks ----------
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const m = window.matchMedia(query)
    setMatches(m.matches)
    const h = () => setMatches(m.matches)
    m.addEventListener('change', h)
    return () => m.removeEventListener('change', h)
  }, [query])
  return matches
}

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
  localStorage.removeItem('certCoachGoal')
  localStorage.removeItem('certCoachRec')
  localStorage.removeItem('certCoachSchedule')
  localStorage.removeItem('certCoachPlan')
}

function loadGoal(): string | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('certCoachGoal')
    if (!raw) return null
    return raw as string
  } catch { return null }
}

function saveGoal(goal: string | null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (goal) localStorage.setItem('certCoachGoal', goal)
  else localStorage.removeItem('certCoachGoal')
}

function loadStoredRec(): RecResult | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('certCoachRec')
    if (!raw) return null
    return JSON.parse(raw) as RecResult
  } catch { return null }
}

function saveStoredRec(rec: RecResult | null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (rec) localStorage.setItem('certCoachRec', JSON.stringify(rec))
  else localStorage.removeItem('certCoachRec')
}

function loadStoredSchedule(): ScheduleData | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('certCoachSchedule')
    if (!raw) return null
    return JSON.parse(raw) as ScheduleData
  } catch { return null }
}

function saveStoredSchedule(s: ScheduleData | null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (s) localStorage.setItem('certCoachSchedule', JSON.stringify(s))
  else localStorage.removeItem('certCoachSchedule')
}

function loadStoredPlan(): PlanData | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem('certCoachPlan')
    if (!raw) return null
    return JSON.parse(raw) as PlanData
  } catch { return null }
}

function saveStoredPlan(p: PlanData | null) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return
  if (p) localStorage.setItem('certCoachPlan', JSON.stringify(p))
  else localStorage.removeItem('certCoachPlan')
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

// ============================================================
//  컴포넌트
// ============================================================

// ---------- 메시지 버블 ----------
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const [visible, setVisible] = useState(isUser)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [msg])

  return (
    <div
      style={{
        maxWidth: isUser ? '80%' : '88%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        background: isUser ? tokens.colors.ink : tokens.colors.parchment,
        color: isUser ? tokens.colors.white : tokens.colors.ink,
        borderRadius: isUser
          ? `${tokens.radius.lg}px ${tokens.radius.xs}px ${tokens.radius.lg}px ${tokens.radius.lg}px`
          : `${tokens.radius.xs}px ${tokens.radius.lg}px ${tokens.radius.lg}px ${tokens.radius.lg}px`,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
        fontSize: tokens.type.body.size,
        lineHeight: tokens.type.body.lh,
        fontWeight: tokens.type.body.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.body.tracking,
        wordBreak: 'break-word',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
    >
      {metaBadge(msg.meta) && (
        <div
          style={{
            fontSize: tokens.type.micro.size,
            color: tokens.colors.muted,
            marginBottom: tokens.spacing.xs,
            fontWeight: tokens.type.micro.weight,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            opacity: 0.75,
          }}
        >
          {metaBadge(msg.meta)}
        </div>
      )}
      {msg.text}
    </div>
  )
}

// ---------- 탭 버튼 ----------
function TabButton({ active, label, onClick, isMobile }: { active: boolean; label: string; onClick: () => void; isMobile?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        background: active ? tokens.colors.accent : tokens.colors.white,
        color: active ? tokens.colors.white : tokens.colors.ink,
        border: active ? 'none' : '1px solid',
        borderColor: active ? tokens.colors.accent : tokens.colors.hairline,
        padding: `${isMobile ? tokens.spacing.xs : tokens.spacing.xs}px ${isMobile ? tokens.spacing.sm : tokens.spacing.md}px`,
        borderRadius: tokens.radius.pill,
        cursor: 'pointer',
        fontSize: tokens.type.utility.size,
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: tokens.type.utility.tracking,
        fontFamily: tokens.fonts.family,
        lineHeight: 1.29,
        transition: 'background 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
        boxShadow: active ? tokens.shadows.button : 'none',
        outline: 'none',
      }}
      onFocus={(e) => {
        if (active) {
          e.currentTarget.style.outline = `2px solid ${tokens.colors.accentFocus}`
          e.currentTarget.style.outlineOffset = '2px'
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none'
      }}
    >
      {label}
    </button>
  )
}

// ---------- 상태 배지 ----------
function StatusBadge({ status }: { status: PlanData['status'] }) {
  const map = {
    준비중: { bg: tokens.colors.parchment, color: tokens.colors.ink, label: '준비중' },
    접수완료: { bg: tokens.colors.warningBg, color: tokens.colors.warningDark, label: '접수완료' },
    응시완료: { bg: tokens.colors.accentBg, color: tokens.colors.accent, label: '응시완료' },
    합격: { bg: tokens.colors.successBg, color: tokens.colors.successDark, label: '합격' },
    불합격: { bg: tokens.colors.dangerBg, color: tokens.colors.danger, label: '불합격' },
  }
  const s = map[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${tokens.spacing.xxs}px ${tokens.spacing.sm}px`,
        background: s.bg,
        color: s.color,
        borderRadius: tokens.radius.pill,
        fontSize: tokens.type.captionStrong.size,
        fontWeight: tokens.type.captionStrong.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.captionStrong.tracking,
        textTransform: 'uppercase',
      }}
    >
      {s.label}
    </span>
  )
}

// ---------- 오버라인 (섹션 레이블) ----------
function Overline({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      style={{
        fontSize: tokens.type.overline.size,
        fontWeight: 600,
        color: tokens.colors.accent,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ---------- 카드 ----------
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: tokens.colors.white,
        borderRadius: tokens.radius.lg,
        padding: tokens.spacing.lg,
        boxShadow: tokens.shadows.card,
        border: '1px solid',
        borderColor: tokens.colors.hairline,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ---------- 카드 헤더 ----------
function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: tokens.spacing.md }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.spacing.sm }}>
        <div>
          <h2
            style={{
              fontSize: tokens.type.h3.size,
              fontWeight: tokens.type.h3.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h3.tracking,
              margin: 0,
              lineHeight: tokens.type.h3.lh,
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                fontSize: tokens.type.small.size,
                color: tokens.colors.muted,
                margin: `${tokens.spacing.xs}px 0 0`,
                fontFamily: tokens.fonts.family,
                letterSpacing: tokens.type.small.tracking,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}

// ============================================================
//  캘린더 위젯 (Apple Calendar 스타일)
// ============================================================
function CalendarWidget({ schedule, isMobile }: { schedule: ScheduleData | null; isMobile?: boolean }) {
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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  return (
    <Card>
      <CardHeader
        title="공식 시험 일정"
        subtitle={schedule ? schedule.qualification : '대화에서 자격증 일정을 확인하면 캘린더에 표시돼요'}
      />

      {schedule ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          {/* 월 네비게이션 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: tokens.spacing.sm,
              gap: isMobile ? tokens.spacing.sm : tokens.spacing.md,
            }}
          >
            <button
              onClick={prevMonth}
              aria-label="이전 달"
              style={{
                width: isMobile ? 30 : 34,
                height: isMobile ? 30 : 34,
                background: tokens.colors.parchment,
                border: 'none',
                borderRadius: tokens.radius.pill,
                cursor: 'pointer',
                fontSize: tokens.type.caption.size,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.family,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.colors.parchmentStrong }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.colors.parchment }}
            >
              {'‹'}
            </button>
            <span
              style={{
                fontSize: tokens.type.bodyStrong.size,
                fontWeight: tokens.type.bodyStrong.weight,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.display,
                letterSpacing: tokens.type.bodyStrong.tracking,
                flex: 1,
                textAlign: 'center',
              }}
            >
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              aria-label="다음 달"
              style={{
                width: isMobile ? 30 : 34,
                height: isMobile ? 30 : 34,
                background: tokens.colors.parchment,
                border: 'none',
                borderRadius: tokens.radius.pill,
                cursor: 'pointer',
                fontSize: tokens.type.caption.size,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.family,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = tokens.colors.parchmentStrong }}
              onMouseLeave={(e) => { e.currentTarget.style.background = tokens.colors.parchment }}
            >
              {'›'}
            </button>
          </div>

          {/* 캘린더 그리드 */}
          <div style={{ userSelect: 'none' }}>
            {/* 요일 헤더 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 2,
                marginBottom: tokens.spacing.xs,
              }}
            >
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: isMobile ? tokens.type.small.size : tokens.type.small.size,
                    fontWeight: tokens.type.smallStrong.weight,
                    color: tokens.colors.muted,
                    fontFamily: tokens.fonts.family,
                    padding: isMobile ? tokens.spacing.xs : tokens.spacing.xs,
                    letterSpacing: tokens.type.small.tracking,
                    lineHeight: 1.2,
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: isMobile ? 0 : 2,
                backgroundColor: tokens.colors.white,
                borderRadius: tokens.radius.md,
                border: '1px solid',
                borderColor: tokens.colors.hairline,
                padding: isMobile ? tokens.spacing.xs : tokens.spacing.xs,
              }}
            >
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`e${idx}`} style={{ borderRadius: tokens.radius.sm, aspectRatio: isMobile ? 'auto' : '1' }} />
                }
                const isTodayCell = isToday(viewYear, viewMonth, day)
                const isExam = isExamDay(viewYear, viewMonth, day)
                const isOutside = day < today.getDate() &&
                  viewYear === today.getFullYear() && viewMonth === today.getMonth()

                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: tokens.radius.sm,
                      background: isTodayCell
                        ? (isExam ? tokens.colors.danger : tokens.colors.accent)
                        : isOutside
                          ? 'transparent'
                          : 'transparent',
                      color: isTodayCell
                        ? tokens.colors.white
                        : isOutside
                          ? tokens.colors.mutedLight
                          : tokens.colors.ink,
                      fontSize: tokens.type.caption.size,
                      fontWeight: (isTodayCell || isExam) ? tokens.type.captionStrong.weight : tokens.type.caption.weight,
                      fontFamily: tokens.fonts.family,
                      letterSpacing: tokens.type.caption.tracking,
                      cursor: 'default',
                      position: 'relative',
                      transition: 'background 150ms ease, transform 150ms ease',
                      padding: isMobile ? tokens.spacing.xs : 0,
                      aspectRatio: isMobile ? 'auto' : '1',
                    }}
                  >
                    <span>{day}</span>
                    {isExam && !isTodayCell && (
                      <span
                        style={{
                          width: 4,
                          height: 4,
                          background: tokens.colors.accent,
                          borderRadius: tokens.radius.pill,
                          marginTop: 1,
                          display: 'block',
                        }}
                      />
                    )}
                    {isTodayCell && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          width: 4,
                          height: 4,
                          background: tokens.colors.white,
                          borderRadius: tokens.radius.pill,
                          opacity: isExam ? 0 : 0.7,
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 시험일 하이라이트 */}
          {examDate && (
            <div
              style={{
                padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                background: tokens.colors.accentBg,
                borderRadius: tokens.radius.md,
                border: '1px solid',
                borderColor: tokens.colors.accentLight,
              }}
            >
              <div
                style={{
                  fontSize: tokens.type.smallStrong.size,
                  fontWeight: tokens.type.smallStrong.weight,
                  color: tokens.colors.accent,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.smallStrong.tracking,
                  textTransform: 'uppercase',
                  marginBottom: tokens.spacing.xs,
                }}
              >
                시험 예정일
              </div>
              <div
                style={{
                  fontSize: tokens.type.bodyStrong.size,
                  fontWeight: tokens.type.bodyStrong.weight,
                  color: tokens.colors.ink,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.bodyStrong.tracking,
                }}
              >
                {examDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}

          {/* 일정 항목 목록 */}
          {schedule.items.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: tokens.type.smallStrong.size,
                  fontWeight: tokens.type.smallStrong.weight,
                  color: tokens.colors.inkLight,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.smallStrong.tracking,
                  textTransform: 'uppercase',
                  marginBottom: tokens.spacing.xs,
                }}
              >
                상세 정보
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
                {schedule.items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      padding: isMobile ? `${tokens.spacing.xs}px ${tokens.spacing.sm}px` : `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
                      background: tokens.colors.parchment,
                      borderRadius: tokens.radius.sm,
                      transition: 'background 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        fontSize: tokens.type.captionStrong.size,
                        fontWeight: tokens.type.captionStrong.weight,
                        color: tokens.colors.ink,
                        fontFamily: tokens.fonts.family,
                        letterSpacing: tokens.type.captionStrong.tracking,
                      }}
                    >
                      {it.label}
                    </div>
                    <div
                      style={{
                        fontSize: tokens.type.caption.size,
                        color: tokens.colors.inkLight,
                        fontFamily: tokens.fonts.family,
                        letterSpacing: tokens.type.caption.tracking,
                        marginTop: 2,
                      }}
                    >
                      {it.value}
                    </div>
                    {it.source && (
                      <div
                        style={{
                          fontSize: tokens.type.micro.size,
                          color: tokens.colors.muted,
                          fontFamily: tokens.fonts.family,
                          letterSpacing: tokens.type.micro.tracking,
                          marginTop: tokens.spacing.xxs,
                          opacity: 0.8,
                        }}
                      >
                        출처: {it.source}
                      </div>
                    )}
                    {it.note && (
                      <div
                        style={{
                          fontSize: tokens.type.micro.size,
                          color: tokens.colors.danger,
                          fontFamily: tokens.fonts.family,
                          fontWeight: 600,
                          letterSpacing: tokens.type.micro.tracking,
                          marginTop: tokens.spacing.xxs,
                        }}
                      >
                        {it.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 캘린더 등록 동의 영역 */}
          {schedule && (
            <p
              style={{
                fontSize: tokens.type.small.size,
                color: tokens.colors.inkLight,
                fontFamily: tokens.fonts.family,
                letterSpacing: tokens.type.small.tracking,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Google Calendar에 시험 일정을 등록할 수 있어요. 동의하면 연결돼요.
            </p>
          )}
        </div>
      ) : (
        <EmptyCalendar />
      )}
    </Card>
  )
}

// ---------- 캘린더 빈 상태 ----------
function EmptyCalendar() {
  return (
    <div
      style={{
        padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
        textAlign: 'center',
        color: tokens.colors.muted,
        fontFamily: tokens.fonts.family,
        fontSize: tokens.type.body.size,
        lineHeight: tokens.type.body.lh,
      }}
    >
      <div
        style={{
          fontSize: tokens.type.h3.size,
          fontWeight: tokens.type.h3.weight,
          color: tokens.colors.ink,
          fontFamily: tokens.fonts.display,
          letterSpacing: tokens.type.h3.tracking,
          marginBottom: tokens.spacing.sm,
        }}
      >
        아직 일정이 없어요
      </div>
      <p style={{ margin: 0 }}>
        대화에서{' '}
        <InlineAccent>"정보처리기사 일정 알려줘"</InlineAccent>처럼
        물어보면 공식 일정을 가져와서 여기에 표시해요.
      </p>
      <ExampleChips
        items={[
          '정보처리기사 시험 일정 알려줘',
          'SQLD 응시료랑 접수 일정 알려줘',
          '컴활 1급 시험일 언제야',
        ]}
      />
    </div>
  )
}

// ---------- 인라인 액센트 텍스트 ----------
function InlineAccent({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: tokens.colors.accent,
        fontWeight: 500,
        borderBottom: '1px solid',
        borderColor: tokens.colors.accentLight,
      }}
    >
      {children}
    </span>
  )
}

// ---------- 예시 칩 ----------
function ExampleChips({ items }: { items: string[] }) {
  return (
    <div
      style={{
        marginTop: tokens.spacing.md,
        display: 'flex',
        flexWrap: 'wrap',
        gap: tokens.spacing.xs,
        justifyContent: 'center',
      }}
    >
      {items.map(q => (
        <span
          key={q}
          style={{
            padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
            background: tokens.colors.parchment,
            borderRadius: tokens.radius.pill,
            fontSize: tokens.type.caption.size,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.caption.tracking,
            border: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          {q}
        </span>
      ))}
    </div>
  )
}

// ============================================================
//  계획 위젯 (Apple 스타일 타임라인)
// ============================================================
function PlanWidget({ plan, isMobile }: { plan: PlanData | null; isMobile?: boolean }) {
  if (!plan) {
    return (
      <Card>
        <CardHeader
          title="학습 계획"
          subtitle="추천받은 자격증에 대해 '준비 시작할래'라고 말하면 만들어드려요"
        />
        <div
          style={{
            padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
            textAlign: 'center',
            color: tokens.colors.muted,
            fontFamily: tokens.fonts.family,
            fontSize: tokens.type.body.size,
            lineHeight: tokens.type.body.lh,
          }}
        >
          <div
            style={{
              fontSize: tokens.type.h3.size,
              fontWeight: tokens.type.h3.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h3.tracking,
              marginBottom: tokens.spacing.sm,
            }}
          >
            계획이 아직 없어요
          </div>
          <p style={{ margin: 0 }}>
            자격증 추천을 받은 뒤{' '}
            <InlineAccent>"정보처리기사 준비 시작할래"</InlineAccent>라고 말하면
            주차별 계획이 만들어져요.
          </p>
          <ExampleChips
            items={[
              '주 5시간으로 시험일까지 계획 세워줘',
              '오늘 뭐 공부해?',
              '계획 줄여줘',
            ]}
          />
        </div>
      </Card>
    )
  }

  const doneCount = plan.weeks.filter(w => w.done).length
  const progress = plan.totalWeeks > 0 ? (doneCount / plan.totalWeeks) * 100 : 0

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* 헤더 */}
      <div
        style={{
          padding: tokens.spacing.lg,
          borderBottom: '1px solid',
          borderColor: tokens.colors.hairline,
          background: tokens.colors.parchment,
        }}
      >
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start', justifyContent: 'space-between', gap: tokens.spacing.md }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: tokens.type.h3.size,
                fontWeight: tokens.type.h3.weight,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.display,
                letterSpacing: tokens.type.h3.tracking,
                marginBottom: tokens.spacing.xs,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {plan.qualification}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: tokens.spacing.sm, alignItems: 'center' }}>
              <MetaInline label="시험일" value={plan.examDate} />
              <MetaInline label="총 기간" value={`${plan.totalWeeks}주`} />
              <StatusBadge status={plan.status} />
            </div>
          </div>
          {/* 진행률 */}
          <div style={{ minWidth: 130, textAlign: 'right' }}>
            <div
              style={{
                fontSize: tokens.type.smallStrong.size,
                fontWeight: tokens.type.smallStrong.weight,
                color: tokens.colors.muted,
                fontFamily: tokens.fonts.family,
                letterSpacing: tokens.type.smallStrong.tracking,
                marginBottom: tokens.spacing.xs,
              }}
            >
              진행 {doneCount}/{plan.totalWeeks}주
            </div>
            <div
              style={{
                height: 6,
                background: tokens.colors.hairline,
                borderRadius: tokens.radius.pill,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: progress >= 100 ? tokens.colors.success : tokens.colors.accent,
                  borderRadius: tokens.radius.pill,
                  transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 주차 목록 (타임라인) */}
      <div style={{ padding: tokens.spacing.lg }}>
        <Overline style={{ marginBottom: tokens.spacing.sm }}>주차별 계획</Overline>
        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
          {plan.weeks.map(w => (
            <div
              key={w.week}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? tokens.spacing.xs : tokens.spacing.md,
                padding: isMobile ? `${tokens.spacing.sm}px ${tokens.spacing.md}px` : `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                background: w.done ? tokens.colors.successBg : tokens.colors.parchment,
                borderRadius: tokens.radius.md,
                border: '1px solid',
                borderColor: w.done ? tokens.colors.successBorder : tokens.colors.hairline,
                transition: 'background 200ms ease, border-color 200ms ease',
              }}
            >
              {/* 주차 번호 배지 */}
              <div
                style={{
                  minWidth: isMobile ? 40 : 52,
                  padding: `${tokens.spacing.xxs}px ${tokens.spacing.xs}px`,
                  background: w.done ? tokens.colors.success : tokens.colors.accentBg,
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.type.captionStrong.size,
                  fontWeight: tokens.type.captionStrong.weight,
                  color: w.done ? tokens.colors.white : tokens.colors.accent,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.captionStrong.tracking,
                  textAlign: 'center',
                }}
              >
                {w.week}주차
              </div>

              {/* 포커스 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: tokens.type.caption.size,
                    color: tokens.colors.ink,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                    fontWeight: 500,
                  }}
                >
                  {w.focus}
                </div>
              </div>

              {/* 권장 시간 */}
              <div
                style={{
                  minWidth: isMobile ? 44 : 56,
                  textAlign: 'right',
                  fontSize: tokens.type.caption.size,
                  color: tokens.colors.muted,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.caption.tracking,
                }}
              >
                {w.hours}
              </div>

              {/* 완료 체크 */}
              <div
                role="checkbox"
                aria-checked={w.done}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: tokens.radius.pill,
                  background: w.done
                    ? 'linear-gradient(135deg, #34c759, #28a745)'
                    : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: tokens.type.caption.size,
                  fontWeight: tokens.type.captionStrong.weight,
                  color: w.done ? tokens.colors.white : tokens.colors.mutedLight,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.captionStrong.tracking,
                  border: w.done ? 'none' : '1.5px solid',
                  borderColor: w.done ? tokens.colors.success : tokens.colors.hairline,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  boxShadow: w.done ? '0 1px 3px rgba(52,199,89,0.3)' : 'none',
                }}
              >
                {w.done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 오늘 브리핑 */}
        <div
          style={{
            marginTop: tokens.spacing.md,
            padding: isMobile ? `${tokens.spacing.sm}px ${tokens.spacing.md}px` : `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
            background: 'linear-gradient(135deg, #0066cc, #0052a3)',
            borderRadius: tokens.radius.md,
            color: tokens.colors.white,
            boxShadow: '0 2px 8px rgba(0,102,204,0.25)',
          }}
        >
          <div
            style={{
              fontSize: tokens.type.smallStrong.size,
              fontWeight: tokens.type.smallStrong.weight,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.smallStrong.tracking,
              textTransform: 'uppercase',
              marginBottom: tokens.spacing.xs,
              opacity: 0.9,
            }}
          >
            오늘 브리핑
          </div>
          <div
            style={{
              fontSize: tokens.type.bodyStrong.size,
              fontWeight: tokens.type.bodyStrong.weight,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.bodyStrong.tracking,
              lineHeight: isMobile ? 1.5 : 1.4,
            }}
          >
            {plan.briefing.task}
            <br />
            <span
              style={{
                fontSize: tokens.type.caption.size,
                fontWeight: tokens.type.caption.weight,
                opacity: 0.85,
                display: 'block',
                marginTop: isMobile ? tokens.spacing.sm : tokens.spacing.xs,
              }}
            >
              가장 가까운 마감: {plan.briefing.deadline}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: tokens.spacing.md,
            fontSize: tokens.type.small.size,
            color: tokens.colors.muted,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.small.tracking,
            lineHeight: 1.5,
            padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
            background: tokens.colors.parchment,
            borderRadius: tokens.radius.sm,
            border: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          지연 3일 이상 또는 주당 가용시간 50% 초과 시 재조정돼요.
          <br />
          3일 연속 미완료 시 계획 축소 안내가 나가요.
        </div>
      </div>
    </Card>
  )
}

// ---------- 인라인 메타 (라벨 + 값) ----------
function MetaInline({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span
        style={{
          fontSize: tokens.type.caption.size,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: tokens.type.bodyStrong.size,
          fontWeight: tokens.type.bodyStrong.weight,
          color: tokens.colors.ink,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.bodyStrong.tracking,
        }}
      >
        {value}
      </span>
    </span>
  )
}

// ============================================================
//  추천 위젯
// ============================================================
function RecommendationWidget({ rec, isMobile }: { rec: RecResult | null; isMobile?: boolean }) {
  if (!rec) {
    return (
      <Card>
        <CardHeader
          title="추천 결과"
          subtitle="대화 중 자격증 추천을 요청하면 1순위 + 대안 + 학습 경로를 표시해요"
        />
        <div
          style={{
            padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
            textAlign: 'center',
            color: tokens.colors.muted,
            fontFamily: tokens.fonts.family,
            fontSize: tokens.type.body.size,
            lineHeight: tokens.type.body.lh,
          }}
        >
          <div
            style={{
              fontSize: tokens.type.h3.size,
              fontWeight: tokens.type.h3.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h3.tracking,
              marginBottom: tokens.spacing.sm,
            }}
          >
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
      <div style={{ marginBottom: tokens.spacing.md }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            marginBottom: tokens.spacing.xs,
          }}
        >
          <span
            style={{
              fontSize: tokens.type.h3.size,
              fontWeight: tokens.type.h3.weight,
              color: tokens.colors.accent,
              fontFamily: tokens.fonts.display,
            }}
          >
            1순위
          </span>
          <span
            style={{
              fontSize: tokens.type.h1.size,
              fontWeight: tokens.type.h1.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h1.tracking,
            }}
          >
            {rec.primary.name}
          </span>
        </div>
        <p
          style={{
            fontSize: tokens.type.body.size,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.body.tracking,
            lineHeight: tokens.type.body.lh,
            margin: 0,
            padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
            background: tokens.colors.parchment,
            borderRadius: tokens.radius.md,
          }}
        >
          {rec.primary.reason}
        </p>
        <div
          style={{
            marginTop: tokens.spacing.sm,
            padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
            background: tokens.colors.white,
            borderRadius: tokens.radius.sm,
            border: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          <MetaRow label="준비 예상" value={rec.primary.prepRange} />
          <MetaRow label="주의점" value={rec.primary.caution} />
        </div>
      </div>

      {/* 대안 */}
      {rec.alternatives.length > 0 && (
        <div style={{ marginTop: tokens.spacing.md }}>
          <Overline style={{ marginBottom: tokens.spacing.sm }}>대안 자격증</Overline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}>
            {rec.alternatives.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                  background: tokens.colors.parchment,
                  borderRadius: tokens.radius.md,
                  border: '1px solid',
                  borderColor: tokens.colors.hairline,
                }}
              >
                <div
                  style={{
                    fontSize: tokens.type.captionStrong.size,
                    fontWeight: tokens.type.captionStrong.weight,
                    color: tokens.colors.ink,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.captionStrong.tracking,
                    marginBottom: 2,
                  }}
                >
                  {a.name}
                </div>
                <div
                  style={{
                    fontSize: tokens.type.caption.size,
                    color: tokens.colors.inkLight,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                  }}
                >
                  {a.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 학습 경로 */}
      {rec.path?.basic && (
        <div
          style={{
            marginTop: tokens.spacing.lg,
            paddingTop: tokens.spacing.lg,
            borderTop: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          <Overline style={{ marginBottom: tokens.spacing.sm }}>기본 학습 경로</Overline>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: tokens.spacing.sm,
              fontSize: tokens.type.caption.size,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.caption.tracking,
            }}
          >
            <MetaBlock label="강의" value={rec.path.basic.lecture} />
            <MetaBlock label="기출·자료" value={rec.path.basic.examMaterial} />
            <MetaBlock label="교재" value={rec.path.basic.textbook} />
            <MetaBlock label="예상 비용" value={rec.path.basic.estimatedCost} />
          </div>
          {rec.path.basic.reason && (
            <div
              style={{
                marginTop: tokens.spacing.sm,
                padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
                background: tokens.colors.parchment,
                borderRadius: tokens.radius.sm,
                fontSize: tokens.type.caption.size,
                color: tokens.colors.inkLight,
                fontFamily: tokens.fonts.family,
                letterSpacing: tokens.type.caption.tracking,
                lineHeight: 1.5,
              }}
            >
              <strong>선택 이유:</strong> {rec.path.basic.reason}
            </div>
          )}
          {rec.path.basic.paidLecture && (
            <WarningBlock label="유료 강의 옵션" content={rec.path.basic.paidLecture} type="warning" />
          )}
          {rec.path.basic.caution && (
            <WarningBlock label="주의" content={rec.path.basic.caution} type="danger" />
          )}
        </div>
      )}

      {/* 취업 가이드라인 */}
      {rec.guideline && (
        <div
          style={{
            marginTop: tokens.spacing.lg,
            padding: tokens.spacing.md,
            background: tokens.colors.accentBg,
            borderRadius: tokens.radius.md,
            border: '1px solid',
            borderColor: tokens.colors.accentLight,
          }}
        >
          <div
            style={{
              fontSize: tokens.type.smallStrong.size,
              fontWeight: tokens.type.smallStrong.weight,
              color: tokens.colors.accent,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.smallStrong.tracking,
              textTransform: 'uppercase',
              marginBottom: tokens.spacing.sm,
            }}
          >
            📋 취업 가이드라인 (조건부)
          </div>
          <MetaRow label="직무 요약" value={rec.guideline.jobSummary} />
          <MetaRow label="필요 역량" value={rec.guideline.requiredSkills} />
          <MetaRow label="자격증 연결" value={rec.guideline.certConnection} />
          <MetaRow label="포트폴리오 방향" value={rec.guideline.portfolio} />
          <MetaRow label="참고 공고" value={rec.guideline.referencePosts} />
        </div>
      )}
    </Card>
  )
}

// ---------- 메타 행 (라벨 + 값 두 줄) ----------
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: tokens.spacing.xs }}>
      <span style={{ fontWeight: 500, color: tokens.colors.muted, fontSize: tokens.type.caption.size, fontFamily: tokens.fonts.family, letterSpacing: tokens.type.caption.tracking }}>
        {label}:
      </span>
      <div style={{ color: tokens.colors.ink, fontWeight: 500, fontSize: tokens.type.caption.size, fontFamily: tokens.fonts.family, letterSpacing: tokens.type.caption.tracking, marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

// ---------- 2열 메타 블록 ----------
function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: tokens.colors.muted, fontWeight: 500, fontSize: tokens.type.caption.size, fontFamily: tokens.fonts.family, letterSpacing: tokens.type.caption.tracking }}>
        {label}
      </span>
      <div style={{ marginTop: 2, color: tokens.colors.ink, fontWeight: tokens.type.captionStrong.weight, fontSize: tokens.type.caption.size, fontFamily: tokens.fonts.family, letterSpacing: tokens.type.caption.tracking }}>
        {value}
      </div>
    </div>
  )
}

// ---------- 경고 블록 (유 paid / caution) ----------
function WarningBlock({ label, content, type }: { label: string; content: string; type: 'warning' | 'danger' }) {
  const config = type === 'warning'
    ? { bg: tokens.colors.warningBg, border: tokens.colors.warningBorder, color: tokens.colors.warningDark }
    : { bg: tokens.colors.dangerBg, border: tokens.colors.dangerBorder, color: tokens.colors.danger }
  return (
    <div
      style={{
        marginTop: tokens.spacing.sm,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
        background: config.bg,
        borderRadius: tokens.radius.md,
        border: '1px solid',
        borderColor: config.border,
        fontSize: tokens.type.caption.size,
        color: config.color,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.caption.tracking,
        fontWeight: tokens.type.captionStrong.weight,
      }}
    >
      <strong>{label}:</strong> {content}
    </div>
  )
}

// ============================================================
//  프로필 위젯
// ============================================================
function ProfileWidget({ profile, onSave, isMobile }: { profile: Profile; onSave: (p: Profile) => void; isMobile?: boolean }) {
  const [local, setLocal] = useState<Profile>(profile)

  useEffect(() => {
    setLocal(profile)
  }, [profile])

  const fields: { key: ProfileStringKey; label: string }[] = [
    { key: '진로', label: '진로 / 관심 직무' },
    { key: '학습방식', label: '학습 방식' },
    { key: '비용선호', label: '비용 선호' },
    { key: '예산', label: '예산' },
    { key: '가용시간', label: '가용 시간' },
    { key: '목표시기', label: '목표 시기' },
    { key: '목표회차', label: '목표 회차' },
    { key: '관심공고', label: '관심 공고' },
    { key: '영어성적', label: '영어 성적' },
    { key: '유효기간자산', label: '유효기간 자산' },
  ]

  const listFields: { key: ProfileArrayKey; label: string }[] = [
    { key: '보유자격증', label: '보유 자격증' },
    { key: '취득완료자격', label: '취득 완료 자격' },
  ]

  const handleChange = (key: ProfileStringKey, value: string) => {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  const handleListChange = (key: ProfileArrayKey, value: string) => {
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
      <div
        style={{
          padding: tokens.spacing.lg,
          borderBottom: '1px solid',
          borderColor: tokens.colors.hairline,
          background: tokens.colors.parchment,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontSize: tokens.type.h3.size,
              fontWeight: tokens.type.h3.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h3.tracking,
              marginBottom: tokens.spacing.xs,
            }}
          >
            프로필
          </div>
          <div
            style={{
              fontSize: tokens.type.caption.size,
              color: tokens.colors.inkLight,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.caption.tracking,
            }}
          >
            {profile.저장동의 ? '저장됨 — 수정 가능' : (Object.keys(profile).length > 0 ? '저장 전 — 동의하면 저장돼요' : '미설정')}
          </div>
        </div>
        <SolidButton onClick={handleSave} style={{ boxShadow: tokens.shadows.button }}>
          저장
        </SolidButton>
      </div>

      <div style={{ padding: tokens.spacing.lg }}>
        {/* 텍스트 필드 */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: tokens.spacing.sm }}>
          {fields.map(f => (
            <ProfileTextField key={f.key} field={f} value={local[f.key] || ''} onChange={(v) => handleChange(f.key, v)} isMobile={isMobile} />
          ))}
        </div>

        {/* 목록 필드 */}
        <div style={{ marginTop: tokens.spacing.md, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: tokens.spacing.sm }}>
          {listFields.map(f => (
            <ProfileListField key={f.key} field={f} value={(local[f.key] || []).join(', ')} onChange={(v) => handleListChange(f.key, v)} />
          ))}
        </div>

        {/* 현재 저장된 값 미리보기 */}
        <div
          style={{
            marginTop: tokens.spacing.lg,
            padding: tokens.spacing.md,
            background: tokens.colors.white,
            borderRadius: tokens.radius.md,
            border: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          <div
            style={{
              fontSize: tokens.type.micro.size,
              fontWeight: tokens.type.micro.weight,
              color: tokens.colors.muted,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.micro.tracking,
              textTransform: 'uppercase',
              marginBottom: tokens.spacing.sm,
            }}
          >
            저장된 프로필 미리보기
          </div>
          <pre
            style={{
              fontSize: tokens.type.small.size,
              background: tokens.colors.parchment,
              color: tokens.colors.ink,
              padding: tokens.spacing.sm,
              borderRadius: tokens.radius.sm,
              whiteSpace: 'pre-wrap',
              maxHeight: 140,
              overflow: 'auto',
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.small.tracking,
              margin: 0,
              border: '1px solid',
              borderColor: tokens.colors.hairline,
            }}
          >
            {JSON.stringify(local, null, 2) || '(저장된 프로필 없음)'}
          </pre>
        </div>

        <p
          style={{
            marginTop: tokens.spacing.md,
            fontSize: tokens.type.small.size,
            color: tokens.colors.muted,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.small.tracking,
            lineHeight: 1.5,
          }}
        >
          대화 중에{' '}
          <InlineAccent>"내 목표가 바뀌었어"</InlineAccent> 또는{' '}
          <InlineAccent>"비용 선호를 변경할래"</InlineAccent>라고 말해도 반영돼요.
          이미 확인된 값은 함부로 바꾸지 않고 새 정보만 갱신해요.
        </p>
      </div>
    </Card>
  )
}

// ---------- 프로필 텍스트 필드 ----------
function ProfileTextField({ field, value, onChange, isMobile }: { field: { key: ProfileStringKey; label: string }; value: string; onChange: (v: string) => void; isMobile?: boolean }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: tokens.type.micro.size,
          fontWeight: tokens.type.micro.weight,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: tokens.spacing.xs,
        }}
      >
        {field.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
          background: tokens.colors.white,
          border: '1px solid',
          borderColor: tokens.colors.hairline,
          borderRadius: tokens.radius.sm,
          fontSize: tokens.type.caption.size,
          color: tokens.colors.ink,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = tokens.colors.accent
          e.target.style.boxShadow = `0 0 0 3px rgba(0,102,204,0.1)`
        }}
        onBlur={(e) => {
          e.target.style.borderColor = tokens.colors.hairline
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

// ---------- 프로필 목록 필드 (쉼표 구분) ----------
function ProfileListField({ field, value, onChange }: { field: { key: ProfileArrayKey; label: string }; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: tokens.type.micro.size,
          fontWeight: tokens.type.micro.weight,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: tokens.spacing.xs,
        }}
      >
        {field.label}
        <span style={{ color: tokens.colors.mutedLight, marginLeft: tokens.spacing.xs, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          (쉼표로 구분)
        </span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
          background: tokens.colors.white,
          border: '1px solid',
          borderColor: tokens.colors.hairline,
          borderRadius: tokens.radius.sm,
          fontSize: tokens.type.caption.size,
          color: tokens.colors.ink,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = tokens.colors.accent
          e.target.style.boxShadow = `0 0 0 3px rgba(0,102,204,0.1)`
        }}
        onBlur={(e) => {
          e.target.style.borderColor = tokens.colors.hairline
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

// ============================================================
//  추가 기능 위젯들
// ============================================================

// ---------- 캘린더 등록 블록 (p1 탭) ----------
function CalendarRegisterBlock({ schedule, calendarConsentAsked, calendarConsent, calendarRegistered, onAskConsent, onConsent, onDecline }: {
  schedule: ScheduleData | null
  calendarConsentAsked: boolean
  calendarConsent: boolean | null
  calendarRegistered: boolean
  onAskConsent: () => void
  onConsent: () => void
  onDecline: () => void
}) {
  if (!schedule) {
    return (
      <p
        style={{
          fontSize: tokens.type.caption.size,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
          lineHeight: 1.5,
        }}
      >
        먼저 대화에서 특정 자격증 일정을 확인해 주세요.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
      <div
        style={{
          padding: tokens.spacing.md,
          background: tokens.colors.parchment,
          borderRadius: tokens.radius.md,
          border: '1px solid',
          borderColor: tokens.colors.hairline,
        }}
      >
        <div
          style={{
            fontSize: tokens.type.captionStrong.size,
            fontWeight: tokens.type.captionStrong.weight,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.captionStrong.tracking,
          }}
        >
          현재 대화에서 확인된 일정
        </div>
        <div
          style={{
            fontSize: tokens.type.bodyStrong.size,
            fontWeight: tokens.type.bodyStrong.weight,
            color: tokens.colors.accent,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.bodyStrong.tracking,
            marginTop: tokens.spacing.xs,
          }}
        >
          {schedule.qualification}
        </div>
      </div>

      {!calendarConsentAsked ? (
        <SolidButton onClick={onAskConsent} style={{ boxShadow: tokens.shadows.button }}>
          캘린더 등록 동의 물어보기
        </SolidButton>
      ) : (
        <div
          style={{
            padding: tokens.spacing.md,
            background: tokens.colors.parchment,
            borderRadius: tokens.radius.md,
            border: '1px solid',
            borderColor: tokens.colors.hairline,
          }}
        >
          <p
            style={{
              fontSize: tokens.type.caption.size,
              color: tokens.colors.inkLight,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.caption.tracking,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            공식 확정된 일정을 캘린더에 등록할까요?
            <br />
            (미등록 시 텍스트 일정과 연결 안내로 대체돼요)
          </p>
          <div style={{ display: 'flex', gap: tokens.spacing.sm, marginTop: tokens.spacing.md }}>
            <SolidButton onClick={onConsent} style={{ boxShadow: tokens.shadows.button }}>
              등록 동의
            </SolidButton>
            <GhostButton onClick={onDecline}>등록 안 함</GhostButton>
          </div>

          {calendarConsent === true && calendarRegistered === true && (
            <StatusInfo type="success" message="✓ 동의했어요. 캘린더에 일정이 등록됐어요." />
          )}
          {calendarConsent === true && calendarRegistered === false && (
            <StatusInfo type="warning" message="동의했지만 캘린더 연결이 아직 안 됐어요. 캘린더 연결하기를 먼저 진행해 주세요." />
          )}
          {calendarConsent === false && (
            <StatusInfo type="neutral" message="등록하지 않기로 했어요. 텍스트 일정과 연결 안내를 제공해요." />
          )}
        </div>
      )}
    </div>
  )
}

// ---------- 상태 정보 박스 ----------
function StatusInfo({ type, message }: { type: 'success' | 'warning' | 'neutral'; message: string }) {
  const config = {
    success: { bg: tokens.colors.successBg, color: tokens.colors.successDark, border: tokens.colors.successBorder },
    warning: { bg: tokens.colors.warningBg, color: tokens.colors.warningDark, border: tokens.colors.warningBorder },
    neutral: { bg: tokens.colors.parchment, color: tokens.colors.muted, border: tokens.colors.hairline },
  }[type]
  return (
    <div
      style={{
        marginTop: tokens.spacing.sm,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
        background: config.bg,
        borderRadius: tokens.radius.sm,
        color: config.color,
        fontSize: tokens.type.captionStrong.size,
        fontWeight: tokens.type.captionStrong.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.captionStrong.tracking,
        border: '1px solid',
        borderColor: config.border,
      }}
    >
      {message}
    </div>
  )
}

// ---------- 다음 경로 블록 ----------
function NextPathBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
      <div
        style={{
          padding: tokens.spacing.md,
          background: tokens.colors.successBg,
          borderRadius: tokens.radius.md,
          border: '1px solid',
          borderColor: tokens.colors.successBorder,
        }}
      >
        <div
          style={{
            fontSize: tokens.type.captionStrong.size,
            fontWeight: tokens.type.captionStrong.weight,
            color: tokens.colors.successDark,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.captionStrong.tracking,
            marginBottom: tokens.spacing.xs,
          }}
        >
          합격
        </div>
        <p
          style={{
            fontSize: tokens.type.caption.size,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.caption.tracking,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          보유 자격증 추가, 상태 합격, 다음 자격증 제안
        </p>
      </div>
      <div
        style={{
          padding: tokens.spacing.md,
          background: tokens.colors.dangerBg,
          borderRadius: tokens.radius.md,
          border: '1px solid',
          borderColor: tokens.colors.dangerBorder,
        }}
      >
        <div
          style={{
            fontSize: tokens.type.captionStrong.size,
            fontWeight: tokens.type.captionStrong.weight,
            color: tokens.colors.danger,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.captionStrong.tracking,
            marginBottom: tokens.spacing.xs,
          }}
        >
          불합격
        </div>
        <p
          style={{
            fontSize: tokens.type.caption.size,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.caption.tracking,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          완료율 가장 낮았던 단계만 말하고, 다음 회차 공식 일정 확인 후 그 단계 비중을 올린 계획을 제안해요.
          위로보다 다음 계획을 먼저 제시해요.
        </p>
      </div>
    </div>
  )
}

// ---------- Notion 연동 블록 ----------
function NotionBlock({
  plan,
  notionToken,
  notionParentPageId,
  notionResult,
  loading,
  onTokenChange,
  onParentPageIdChange,
  onConnect,
}: {
  plan: PlanData | null
  notionToken: string
  notionParentPageId: string
  notionResult: { type: 'success' | 'error' | 'fallback'; url?: string; message: string } | null
  loading: boolean
  onTokenChange: (v: string) => void
  onParentPageIdChange: (v: string) => void
  onConnect: () => void
}) {
  if (!plan) {
    return (
      <p
        style={{
          fontSize: tokens.type.caption.size,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        먼저 대화에서 학습 계획이 만들어져야 해요.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
      <div
        style={{
          padding: tokens.spacing.md,
          background: tokens.colors.parchment,
          borderRadius: tokens.radius.md,
          border: '1px solid',
          borderColor: tokens.colors.hairline,
        }}
      >
        <div
          style={{
            fontSize: tokens.type.captionStrong.size,
            fontWeight: tokens.type.captionStrong.weight,
            color: tokens.colors.ink,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.captionStrong.tracking,
          }}
        >
          현재 계획
        </div>
        <div
          style={{
            fontSize: tokens.type.bodyStrong.size,
            fontWeight: tokens.type.bodyStrong.weight,
            color: tokens.colors.accent,
            fontFamily: tokens.fonts.family,
            letterSpacing: tokens.type.bodyStrong.tracking,
            marginTop: tokens.spacing.xs,
          }}
        >
          {plan.qualification} · 시험일: {plan.examDate}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: tokens.spacing.sm }}>
        <NotionInput
          label="Notion 토큰"
          value={notionToken}
          onChange={onTokenChange}
        />
        <NotionInput
          label="부모 페이지 ID"
          value={notionParentPageId}
          onChange={onParentPageIdChange}
        />
      </div>

      <SolidButton
        onClick={onConnect}
        disabled={loading}
        style={{ alignSelf: 'flex-start', boxShadow: loading ? 'none' : tokens.shadows.button }}
      >
        {loading ? '연동 중…' : 'Notion 학습 공간 만들기'}
      </SolidButton>

      {notionResult && (
        <NotionResult result={notionResult} />
      )}
    </div>
  )
}

// ---------- Notion 입력 필드 ----------
function NotionInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: tokens.type.micro.size,
          fontWeight: tokens.type.micro.weight,
          color: tokens.colors.muted,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.micro.tracking,
          textTransform: 'uppercase',
          marginBottom: tokens.spacing.xs,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
          background: tokens.colors.white,
          border: '1px solid',
          borderColor: tokens.colors.hairline,
          borderRadius: tokens.radius.sm,
          fontSize: tokens.type.caption.size,
          color: tokens.colors.ink,
          fontFamily: tokens.fonts.family,
          letterSpacing: tokens.type.caption.tracking,
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = tokens.colors.accent
          e.target.style.boxShadow = `0 0 0 3px rgba(0,102,204,0.1)`
        }}
        onBlur={(e) => {
          e.target.style.borderColor = tokens.colors.hairline
          e.target.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

// ---------- Notion 결과 표시 ----------
function NotionResult({ result }: { result: { type: 'success' | 'error' | 'fallback'; url?: string; message: string } }) {
  const config = {
    success: { bg: tokens.colors.successBg, color: tokens.colors.successDark, border: tokens.colors.successBorder },
    fallback: { bg: tokens.colors.parchment, color: tokens.colors.inkLight, border: tokens.colors.hairline },
    error: { bg: tokens.colors.dangerBg, color: tokens.colors.danger, border: tokens.colors.dangerBorder },
  }[result.type]

  return (
    <div
      style={{
        padding: tokens.spacing.md,
        background: config.bg,
        borderRadius: tokens.radius.md,
        border: '1px solid',
        borderColor: config.border,
        color: config.color,
        fontSize: tokens.type.caption.size,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.caption.tracking,
        lineHeight: 1.5,
      }}
    >
      {result.message}
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: tokens.spacing.sm,
            color: tokens.colors.accent,
            fontWeight: tokens.type.captionStrong.weight,
            textDecoration: 'none',
            borderBottom: '1px solid',
            borderColor: tokens.colors.accentLight,
          }}
        >
          Notion 페이지 열기 →
        </a>
      )}
    </div>
  )
}

// ============================================================
//  버튼 컴포넌트
// ============================================================

// ---------- 솔리드 버튼 (Action Blue) ----------
function SolidButton({
  children,
  onClick,
  disabled,
  style,
  size = 'md',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
  size?: 'sm' | 'md' | 'lg'
}) {
  const paddingMap = {
    sm: `${tokens.spacing.xs}px ${tokens.spacing.md}px`,
    md: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
    lg: `${tokens.spacing.md}px ${tokens.spacing.xl}px`,
  }
  const fontSizeMap = {
    sm: tokens.type.caption.size,
    md: tokens.type.captionStrong.size,
    lg: tokens.type.body.size,
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        padding: paddingMap[size],
        background: disabled ? tokens.colors.parchment : tokens.colors.accent,
        color: disabled ? tokens.colors.muted : tokens.colors.white,
        border: 'none',
        borderRadius: tokens.radius.pill,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: fontSizeMap[size],
        fontWeight: tokens.type.captionStrong.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.captionStrong.tracking,
        textTransform: 'uppercase',
        boxShadow: disabled ? 'none' : tokens.shadows.button,
        transition: 'background 150ms ease, box-shadow 150ms ease, transform 100ms ease',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {children}
    </button>
  )
}

// ---------- 고스트 버튼 (흰 배경 + 테두리) ----------
function GhostButton({ children, onClick, disabled, style }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      style={{
        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
        background: tokens.colors.white,
        color: tokens.colors.ink,
        border: '1px solid',
        borderColor: tokens.colors.hairline,
        borderRadius: tokens.radius.pill,
        cursor: disabled ? 'default' : 'pointer',
        fontSize: tokens.type.captionStrong.size,
        fontWeight: tokens.type.captionStrong.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.captionStrong.tracking,
        textTransform: 'uppercase',
        transition: 'background 150ms ease, border-color 150ms ease',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = tokens.colors.parchment
          e.currentTarget.style.borderColor = tokens.colors.hairlineStrong
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = tokens.colors.white
        e.currentTarget.style.borderColor = tokens.colors.hairline
      }}
    >
      {children}
    </button>
  )
}

// ============================================================
//  모바일 토글 버튼 (채팅 패널 열고 닫기)
// ============================================================
function ChatToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? '채팅 패널 닫기' : '채팅 패널 열기'}
      aria-expanded={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.xs,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
        background: tokens.colors.white,
        color: tokens.colors.ink,
        border: '1px solid',
        borderColor: tokens.colors.hairline,
        borderRadius: tokens.radius.pill,
        cursor: 'pointer',
        fontSize: tokens.type.caption.size,
        fontWeight: tokens.type.captionStrong.weight,
        fontFamily: tokens.fonts.family,
        letterSpacing: tokens.type.caption.tracking,
        textTransform: 'uppercase',
        boxShadow: tokens.shadows.card,
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tokens.colors.parchment
        e.currentTarget.style.borderColor = tokens.colors.hairlineStrong
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = tokens.colors.white
        e.currentTarget.style.borderColor = tokens.colors.hairline
      }}
    >
      <ChatIcon open={open} />
      {open ? '채팅 닫기' : '채팅 열기'}
    </button>
  )
}

// ---------- 채팅 아이콘 ----------
function ChatIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ============================================================
//  MAIN PAGE
// ============================================================
export default function Home() {
  const isMobile = useMediaQuery('(max-width: 720px)')

  const [tab, setTab] = useState<TabId>('chat')
  const [messages, setMessages] = useState<Message[]>(loadMessages)
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState<Profile>(loadProfile())
  const [goalStandard, setGoalStandard] = useState<string | null>(loadGoal)
  const [rec, setRec] = useState<RecResult | null>(loadStoredRec)
  const [schedule, setSchedule] = useState<ScheduleData | null>(loadStoredSchedule)
  const [plan, setPlan] = useState<PlanData | null>(loadStoredPlan)
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
  const [chatOpen, setChatOpen] = useState(true)

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
        const q = (res.questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\\n')
        setMessages(prev => [...prev, { role: 'bot', text: q || '더 필요한 정보가 없어요. 추천할 준비가 되었어요.', meta: 'question' }])
        if (res.profileUpdate) {
          setProfile(prev => ({ ...prev, ...res.profileUpdate }))
        }
      } else if (res.recommendation) {
        setRec(res.recommendation)
        // 목표 확정 자격증 업데이트 (recResult 대비 호환)
        const goal = (res.result && (res.result as any).primary?.name) || goalStandard
        if (goal && goal !== goalStandard) {
          setGoalStandard(goal)
          saveGoal(goal)
          // 이전 목표의 저장 데이터 정리
          saveStoredRec(null)
          saveStoredSchedule(null)
          saveStoredPlan(null)
        }
        // 저장동의 시 대시보드 데이터 저장
        if (profile.저장동의 === true) {
          saveStoredRec(res.recommendation)
        }
        const ok = profile.저장동의 !== true
        if (ok) setShownConsent(true)
        setMessages(prev => [...prev, { role: 'bot', text: '자격증 추천을 준비했어요. 아래 대시보드에서 결과를 확인할 수 있어요.', meta: 'done' }])
      } else if (res.schedule) {
        setSchedule(res.schedule)
        if (profile.저장동의 === true) {
          saveStoredSchedule(res.schedule)
        }
        setMessages(prev => [...prev, { role: 'bot', text: '공식 시험 일정 정보를 가져왔어요. 아래 일정 탭에서 확인해요.', meta: 'done' }])
      } else if (res.plan) {
        setPlan(res.plan)
        if (profile.저장동의 === true) {
          saveStoredPlan(res.plan)
        }
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

  // 모바일일 때 채팅이 닫혀있으면 채팅 패널 숨김
  const showChat = !isMobile || chatOpen

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.back,
        fontFamily: tokens.fonts.family,
        color: tokens.colors.ink,
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: tokens.colors.white,
          borderBottom: '1px solid',
          borderColor: tokens.colors.hairline,
          padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: tokens.shadows.card,
          gap: tokens.spacing.md,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: tokens.type.h2.size,
              fontWeight: tokens.type.h2.weight,
              color: tokens.colors.ink,
              fontFamily: tokens.fonts.display,
              letterSpacing: tokens.type.h2.tracking,
              margin: 0,
              lineHeight: tokens.type.h2.lh,
            }}
          >
            자격증 패스 코치
          </h1>
          <p
            style={{
              fontSize: tokens.type.small.size,
              color: tokens.colors.muted,
              margin: `${tokens.spacing.xs}px 0 0`,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.small.tracking,
            }}
          >
            처음 자격증 준비를 시작하는 분을 위한 대화형 코치
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm, flexShrink: 0 }}>
          <span
            style={{
              fontSize: tokens.type.micro.size,
              color: tokens.colors.muted,
              fontFamily: tokens.fonts.family,
              letterSpacing: tokens.type.micro.tracking,
              textTransform: 'uppercase',
              fontWeight: tokens.type.micro.weight,
              padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
              background: tokens.colors.parchment,
              borderRadius: tokens.radius.pill,
            }}
          >
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
              fontSize: tokens.type.micro.size,
              padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
              border: '1px solid',
              borderColor: tokens.colors.hairline,
              color: tokens.colors.muted,
              background: tokens.colors.white,
              borderRadius: tokens.radius.pill,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: tokens.type.micro.tracking,
              fontWeight: tokens.type.micro.weight,
              fontFamily: tokens.fonts.family,
              transition: 'background 150ms ease, border-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = tokens.colors.parchment
              e.currentTarget.style.borderColor = tokens.colors.hairlineStrong
              e.currentTarget.style.color = tokens.colors.ink
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = tokens.colors.white
              e.currentTarget.style.borderColor = tokens.colors.hairline
              e.currentTarget.style.color = tokens.colors.muted
            }}
          >
            초기화
          </button>
        </div>
      </header>

      {/* 모바일 토글 (모바일에서만 보임) */}
      {isMobile && (
        <div
          style={{
            padding: `${tokens.spacing.sm}px ${tokens.spacing.lg}px`,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <ChatToggle open={chatOpen} onToggle={() => setChatOpen(!chatOpen)} />
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '360px 1fr',
          minHeight: 'calc(100vh - 63px - ' + (isMobile ? 0 : 0) + 'px)',
        }}
      >
        {/* CHAT PANEL (모바일에서 토글 가능) */}
        {showChat && (
          <aside
            style={{
              background: tokens.colors.white,
              borderRight: '1px solid',
              borderColor: tokens.colors.hairline,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              height: 'calc(100vh - 63px)',
            }}
          >
            {/* 봇 헤더 */}
            <div
              style={{
                padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
                borderBottom: '1px solid',
                borderColor: tokens.colors.hairline,
                background: tokens.colors.parchment,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radius.pill,
                  background: tokens.colors.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: tokens.colors.white,
                  fontSize: tokens.type.bodyStrong.size,
                  fontWeight: tokens.type.bodyStrong.weight,
                  fontFamily: tokens.fonts.display,
                  letterSpacing: tokens.type.bodyStrong.tracking,
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,102,204,0.25)',
                }}
              >
                코
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: tokens.type.captionStrong.size,
                    fontWeight: tokens.type.captionStrong.weight,
                    color: tokens.colors.ink,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.captionStrong.tracking,
                  }}
                >
                  자격증 패스 코치
                </div>
                <div
                  style={{
                    fontSize: tokens.type.micro.size,
                    color: tokens.colors.muted,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.micro.tracking,
                    marginTop: 1,
                  }}
                >
                  추천 · 일정 · 학습 경로 · 진도 관리
                </div>
              </div>
              <span
                style={{
                  fontSize: tokens.type.micro.size,
                  color: tokens.colors.successDark,
                  fontWeight: tokens.type.micro.weight,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.micro.tracking,
                  textTransform: 'uppercase',
                  padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
                  background: tokens.colors.successBg,
                  borderRadius: tokens.radius.pill,
                }}
              >
                온라인
              </span>
            </div>

            {/* 대화 영역 */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: tokens.spacing.lg,
                display: 'flex',
                flexDirection: 'column',
                gap: tokens.spacing.sm,
                minHeight: 320,
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: tokens.colors.muted,
                    fontFamily: tokens.fonts.family,
                    fontSize: tokens.type.body.size,
                    lineHeight: tokens.type.body.lh,
                    paddingTop: 40,
                  }}
                >
                  <p style={{ margin: 0 }}>대화로 시작하세요.</p>
                  <p
                    style={{
                      fontSize: tokens.type.caption.size,
                      color: tokens.colors.mutedLight,
                      marginTop: tokens.spacing.sm,
                      fontFamily: tokens.fonts.family,
                      letterSpacing: tokens.type.caption.tracking,
                    }}
                  >
                    예:{' '}
                    <InlineAccent>IT 분야 자격증 추천해줘</InlineAccent>
                    ,{' '}
                    <InlineAccent>정보처리기사 일정 알려줘</InlineAccent>
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} msg={msg} />
              ))}
              {loading && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    background: tokens.colors.parchment,
                    borderRadius: `${tokens.radius.xs}px ${tokens.radius.lg}px ${tokens.radius.lg}px ${tokens.radius.lg}px`,
                    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                    color: tokens.colors.inkLight,
                    fontSize: tokens.type.caption.size,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                  }}
                >
                  코치 답변 중…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 입력 영역 */}
            <div
              style={{
                padding: `${tokens.spacing.md}px ${tokens.spacing.lg}px`,
                borderTop: '1px solid',
                borderColor: tokens.colors.hairline,
                background: tokens.colors.white,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: tokens.spacing.sm,
                  alignItems: 'center',
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="메시지를 입력하세요 (Enter: 전송, Shift+Enter: 줄바꿈)"
                  style={{
                    flex: 1,
                    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                    background: tokens.colors.parchment,
                    color: tokens.colors.ink,
                    border: '1.5px solid',
                    borderColor: tokens.colors.hairline,
                    borderRadius: tokens.radius.pill,
                    fontSize: tokens.type.body.size,
                    fontWeight: tokens.type.body.weight,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.body.tracking,
                    outline: 'none',
                    lineHeight: tokens.type.body.lh,
                    transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = tokens.colors.accent
                    e.target.style.boxShadow = `0 0 0 3px rgba(0,102,204,0.1)`
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = tokens.colors.hairline
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  disabled={loading || !input.trim()}
                  onClick={() => sendMessage()}
                  style={{
                    padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
                    borderRadius: tokens.radius.pill,
                    background: loading || !input.trim() ? tokens.colors.parchment : tokens.colors.accent,
                    color: loading || !input.trim() ? tokens.colors.muted : tokens.colors.white,
                    border: 'none',
                    cursor: loading || !input.trim() ? 'default' : 'pointer',
                    fontSize: tokens.type.captionStrong.size,
                    fontWeight: tokens.type.captionStrong.weight,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.captionStrong.tracking,
                    textTransform: 'uppercase',
                    boxShadow: loading || !input.trim() ? 'none' : tokens.shadows.button,
                    transition: 'background 150ms ease, box-shadow 150ms ease, transform 100ms ease',
                    minWidth: 44,
                  }}
                  onMouseDown={(e) => { if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(0.97)' }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  전송
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* DASHBOARD */}
        <main
          style={{
            padding: tokens.spacing.lg,
            overflowY: 'auto',
            background: tokens.colors.back,
            minWidth: 0,
          }}
        >
          {/* 탭 내비게이션 */}
          <nav
            style={{
              display: 'flex',
              gap: isMobile ? tokens.spacing.xxs : tokens.spacing.xs,
              marginBottom: tokens.spacing.md,
              flexWrap: 'wrap',
              paddingBottom: tokens.spacing.sm,
              borderBottom: '1px solid',
              borderColor: tokens.colors.hairline,
            }}
          >
            {tabs.map(([id, label]) => (
              <TabButton key={id} active={tab === id} label={label} onClick={() => setTab(id as TabId)} isMobile={isMobile} />
            ))}
          </nav>

          {/* 탭 콘텐츠 */}
          {tab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              <RecommendationWidget rec={rec} isMobile={isMobile} />
              {schedule && <CalendarWidget schedule={schedule} isMobile={isMobile} />}
              {plan && <PlanWidget plan={plan} isMobile={isMobile} />}
              {!rec && !schedule && !plan && (
                <Card>
                  <CardHeader
                    title="대시보드"
                    subtitle={goalStandard ? `${goalStandard} 관련 추천·일정·계획을 여기에 보여드려요` : '대화에서 자격증 추천을 요청하면 여기에 결과가 모여요'}
                  />
                  <div
                    style={{
                      padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
                      textAlign: 'center',
                      color: tokens.colors.muted,
                      fontFamily: tokens.fonts.family,
                      fontSize: tokens.type.body.size,
                      lineHeight: tokens.type.body.lh,
                    }}
                  >
                    <div
                      style={{
                        fontSize: tokens.type.h3.size,
                        fontWeight: tokens.type.h3.weight,
                        color: tokens.colors.ink,
                        fontFamily: tokens.fonts.display,
                        letterSpacing: tokens.type.h3.tracking,
                        marginBottom: tokens.spacing.sm,
                      }}
                    >
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
            schedule ? (
              <CalendarWidget schedule={schedule} isMobile={isMobile} />
            ) : goalStandard ? (
              <Card>
                <CardHeader
                  title={`${goalStandard} 시험 일정`}
                  subtitle="아직 일정이 로드되지 않았어요. 대화에서 '시험 일정 알려줘'라고 말하면 확인할 수 있어요."
                />
                <p style={{ fontSize: tokens.type.body.size, color: tokens.colors.muted, fontFamily: tokens.fonts.family, margin: 0 }}>
                  대화창에 "{"{goalStandard} 시험 일정 알려줘"}"라고 입력해 보세요.
                </p>
              </Card>
            ) : (
              <Card>
                <CardHeader title="시험 일정" subtitle="시험 일정을 확인할 자격증명을 먼저 정해 주세요" />
                <p style={{ fontSize: tokens.type.body.size, color: tokens.colors.muted, fontFamily: tokens.fonts.family, margin: 0 }}>
                  채팅에서 "정보처리기사 시험 일정 알려줘"처럼 자격증명을 말하면 일정이 여기에 표시돼요.
                </p>
              </Card>
            )
          )}

          {tab === 'plan' && (
            plan ? (
              <PlanWidget plan={plan} isMobile={isMobile} />
            ) : goalStandard ? (
              <Card>
                <CardHeader
                  title={`${goalStandard} 학습 계획`}
                  subtitle="아직 계획이 로드되지 않았어요. 대화에서 '학습 계획 세워줘'라고 말하면 만들 수 있어요."
                />
                <p style={{ fontSize: tokens.type.body.size, color: tokens.colors.muted, fontFamily: tokens.fonts.family, margin: 0 }}>
                  대화창에 "{"{goalStandard} 학습 계획 세워줘"}"라고 입력해 보세요.
                </p>
              </Card>
            ) : (
              <Card>
                <CardHeader title="학습 계획" subtitle="학습 계획을 세울 자격증명을 먼저 정해 주세요" />
                <p style={{ fontSize: tokens.type.body.size, color: tokens.colors.muted, fontFamily: tokens.fonts.family, margin: 0 }}>
                  채팅에서 "빅데이터분석기사 학습 계획 세워줘"처럼 말하면 계획이 여기에 표시돼요.
                </p>
              </Card>
            )
          )}

          {tab === 'profile' && <ProfileWidget profile={profile} onSave={setProfile} isMobile={isMobile} />}

          {tab === 'p1' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
              {/* 캘린더 등록 */}
              <Card>
                <CardHeader
                  title="캘린더 등록"
                  subtitle="Google Calendar 커넥터 연결 확인 후, 공식 확정 일정만 사용자 동의 후 등록해요"
                />
                <CalendarRegisterBlock
                  schedule={schedule}
                  calendarConsentAsked={calendarConsentAsked}
                  calendarConsent={calendarConsent}
                  calendarRegistered={calendarRegistered}
                  onAskConsent={() => setCalendarConsentAsked(true)}
                  onConsent={() => { setCalendarConsent(true); handleCalendarRegister() }}
                  onDecline={() => { setCalendarConsent(false); setCalendarRegistered(false) }}
                />
              </Card>

              {/* 다음 경로 */}
              <Card>
                <CardHeader
                  title="취득 후 다음 경로"
                  subtitle="보유 자격증 갱신 + 추가 취득 방향"
                />
                <p
                  style={{
                    fontSize: tokens.type.caption.size,
                    color: tokens.colors.inkLight,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  "취득했다"고 직접 말한 경우만 확정해요. 보유 자격증·등급을 확인하고 프로필에 추가(동의 시)해요.
                  <br /><br />
                  기존 자격증과 과도한 중복 후보는 낮추고, 새로운 직무 가치를 더하는 1순위+대안을 제시해요.
                  추가 자격증보다 프로젝트·실무·포트폴리오가 우선인 시점이면 솔직히 말해요.
                </p>
                <div
                  style={{
                    marginTop: tokens.spacing.md,
                    padding: tokens.spacing.md,
                    background: tokens.colors.parchment,
                    borderRadius: tokens.radius.md,
                    border: '1px solid',
                    borderColor: tokens.colors.hairline,
                    fontSize: tokens.type.caption.size,
                    color: tokens.colors.ink,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                  }}
                >
                  <strong>예시:</strong>{' '}
                  "정보처리기사 취득했어" / "SQLD 시험 합격했어" / "다음엔 뭘 따면 좋을까?"
                </div>
              </Card>

              {/* 결과 반영 */}
              <Card>
                <CardHeader
                  title="합격/불합격 결과 반영"
                  subtitle="결과 기반 상태 업데이트 + 다음 계획 조정"
                />
                <NextPathBlock />
              </Card>

              {/* 유효기간 */}
              <Card>
                <CardHeader
                  title="유효기간 자산 관리"
                  subtitle="보유 자격증 · 영어 성적 등 유효기간 있는 자산 검토"
                />
                <p
                  style={{
                    fontSize: tokens.type.caption.size,
                    color: tokens.colors.inkLight,
                    fontFamily: tokens.fonts.family,
                    letterSpacing: tokens.type.caption.tracking,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  사용자가 제공한 취득/만료 시점 + 공식 규정 바탕으로 유효 여부·갱신 시점을 검토해요.
                  사용자가 원하지 않으면 이름·등급 중심으로만 확인하고 유효기간 관리는 진행하지 않아요.
                </p>
              </Card>

              {/* 취업 가이드라인 (조건부) */}
              {profile.관심공고 && (
                <Card>
                  <CardHeader
                    title="취업 가이드라인"
                    subtitle="관심 공고 기반 직무 요약 · 필요 역량 · 자격증 연결"
                  />
                  <div
                    style={{
                      padding: tokens.spacing.md,
                      background: tokens.colors.accentBg,
                      borderRadius: tokens.radius.md,
                      border: '1px solid',
                      borderColor: tokens.colors.accentLight,
                      fontSize: tokens.type.caption.size,
                      color: tokens.colors.ink,
                      fontFamily: tokens.fonts.family,
                      letterSpacing: tokens.type.caption.tracking,
                      lineHeight: 1.6,
                    }}
                  >
                    <div
                      style={{
                        fontSize: tokens.type.smallStrong.size,
                        fontWeight: tokens.type.smallStrong.weight,
                        color: tokens.colors.accent,
                        fontFamily: tokens.fonts.family,
                        letterSpacing: tokens.type.smallStrong.tracking,
                        textTransform: 'uppercase',
                        marginBottom: tokens.spacing.sm,
                      }}
                    >
                      관심 공고
                    </div>
                    <div>{profile.관심공고}</div>
                    <div style={{ marginTop: tokens.spacing.sm, paddingTop: tokens.spacing.sm, borderTop: '1px solid', borderColor: tokens.colors.accentLight }}>
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
                <NotionBlock
                  plan={plan}
                  notionToken={notionToken}
                  notionParentPageId={notionParentPageId}
                  notionResult={notionResult}
                  loading={loading}
                  onTokenChange={setNotionToken}
                  onParentPageIdChange={setNotionParentPageId}
                  onConnect={handleNotionConnect}
                />
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* 저장 동의 모달 */}
      {shownConsent && (
        <div
          style={{
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
            padding: tokens.spacing.lg,
          }}
        >
          <div
            style={{
              background: tokens.colors.white,
              borderRadius: tokens.radius.xl,
              padding: `${tokens.spacing.xl}px ${tokens.spacing.lg}px`,
              width: '100%',
              maxWidth: 480,
              boxShadow: tokens.shadows.modal,
              border: '1px solid',
              borderColor: tokens.colors.hairline,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2
              style={{
                fontSize: tokens.type.h3.size,
                fontWeight: tokens.type.h3.weight,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.display,
                letterSpacing: tokens.type.h3.tracking,
                margin: 0,
                marginBottom: tokens.spacing.md,
              }}
            >
              프로필 저장 동의
            </h2>
            <p
              style={{
                fontSize: tokens.type.body.size,
                color: tokens.colors.ink,
                fontFamily: tokens.fonts.family,
                letterSpacing: tokens.type.body.tracking,
                lineHeight: tokens.type.body.lh,
                margin: 0,
                marginBottom: tokens.spacing.lg,
              }}
            >
              추천을 더 정확하게 맞춤화하려면 프로필 정보를 저장합니다.
              저장 전 동의를 받습니다. 저장된 정보는 로컬 스토리지에만 보관되며, 다른 기기에서는 사용할 수 없습니다.
            </p>
            <div
              style={{
                padding: tokens.spacing.md,
                background: tokens.colors.parchment,
                borderRadius: tokens.radius.md,
                border: '1px solid',
                borderColor: tokens.colors.hairline,
                marginBottom: tokens.spacing.lg,
              }}
            >
              <div
                style={{
                  fontSize: tokens.type.micro.size,
                  fontWeight: tokens.type.micro.weight,
                  color: tokens.colors.muted,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.micro.tracking,
                  textTransform: 'uppercase',
                  marginBottom: tokens.spacing.sm,
                }}
              >
                현재 저장된 프로필 (없을 수 있음)
              </div>
              <pre
                style={{
                  fontSize: tokens.type.small.size,
                  background: tokens.colors.white,
                  color: tokens.colors.ink,
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radius.sm,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 160,
                  overflow: 'auto',
                  border: '1px solid',
                  borderColor: tokens.colors.hairline,
                  fontFamily: tokens.fonts.family,
                  letterSpacing: tokens.type.small.tracking,
                  margin: 0,
                }}
              >
                {JSON.stringify(profile, null, 2) || '(저장된 프로필 없음)'}
              </pre>
            </div>
            <div style={{ display: 'flex', gap: tokens.spacing.sm, justifyContent: 'flex-end' }}>
              <GhostButton onClick={() => setShownConsent(false)}>나중에</GhostButton>
              <SolidButton onClick={동의후저장} style={{ boxShadow: tokens.shadows.button }}>
                저장하고 사용
              </SolidButton>
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
