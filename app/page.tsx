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

// ---------- PRD 근거 상수 ----------
const 유료가이드라인 =
  '유료 강의 추천 시 이유 없이 유료부터 제시하지 않고, 사용자가 유료 허용 시 유료 후보를 포함하며, ' +
  '유료 강의는 가격·무료 전환 지점·전체 범위 cover 여부를 반드시 표시하고 사용자 조건과 연결해 설명하되, ' +
  '무료 대안이 있으면 함께 제시한다.'

// ---------- localStorage helpers ----------
function loadProfile(): Profile {
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

// ---------- API 호출 (실제 fetch) ----------
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
  try {
    const raw = localStorage.getItem('certCoachMessages')
    if (!raw) return []
    return JSON.parse(raw) as Message[]
  } catch { return [] }
}
function saveMessages(msgs: Message[]) {
  localStorage.setItem('certCoachMessages', JSON.stringify(msgs))
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

  // 메시지 localStorage 동기화 (불필요한 저장 방지: 로딩/빌드시 제외)
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

  const 헤더프로필 = profile.저장동의
    ? '저장됨 (수정 가능)'
    : (Object.keys(profile).length > 0 ? '저장 전 — 동의하면 저장돼요' : '미설정')

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '16px 16px 40px' }}>
      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #e2e2e2', paddingBottom: '12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <h1 style={{ fontSize: '22px', margin: '0 0 4px 0' }}>자격증 패스 코치</h1>
          <div style={{ color: '#555', fontSize: '13px', margin: 0 }}>
            처음 자격증 준비를 시작하는 분을 위한 대화형 코치 · {유료가이드라인}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#555' }}>프로필: {헤더프로필}</span>
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
            style={{ fontSize: '12px', padding: '4px 8px', border: '1px solid #c00', color: '#c00', background: 'transparent', borderRadius: '6px', cursor: 'pointer' }}
          >
            프로필·대화 초기화
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '14px' }}>
        {/* CHAT */}
        <section style={{ border: '1px solid #e2e2e2', borderRadius: '10px', background: '#fff', minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
          {/* 봇 프로필 */}
          <div style={{ borderBottom: '1px solid #e2e2e2', padding: '10px 12px', background: '#fafafa', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#1976d2,#42a5f5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
              코
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '13px' }}>자격증 패스 코치</div>
              <div style={{ fontSize: '11px', color: '#777' }}>자격증 추천 · 공식 일정 · 학습 경로 · 진도 관리</div>
            </div>
            <div style={{ fontSize: '11px', color: '#555' }}>온라인</div>
          </div>

          {/* 대화 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '280px' }}>
            {messages.length === 0 && (
              <div style={{ color: '#999', textAlign: 'center', fontSize: '13px', paddingTop: '40px' }}>
                대화로 시작하세요.<br></br>예: &quot;IT 분야 자격증 추천해줘&quot;, &quot;정보처리기사 일정 알려줘&quot;
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                maxWidth: msg.role === 'user' ? '78%' : '88%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                padding: '8px 12px',
                fontSize: '13px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
              }}>
                {msg.meta && msg.meta !== 'first-visit' && (
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px', fontWeight: '600' }}>
                    {msg.meta === 'question' ? '📌 질문' : msg.meta === 'done' ? '✅ 완료' : msg.meta === 'saved' ? '💾 저장됨' : msg.meta === 'error' ? '⚠️ 오류' : msg.meta === 'reset' ? '🔄 초기화' : msg.meta === 'next' ? '🔜 다음' : '💬'}
                  </div>
                )}
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: '#f0f0f0', borderRadius: '14px 14px 14px 4px', padding: '10px 12px', color: '#777', fontSize: '13px' }}>
                코치 답변 중…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 입력 */}
          <div style={{ borderTop: '1px solid #e2e2e2', padding: '10px', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="대화를 입력하세요 (Enter: 전송, Shift+Enter: 줄바꿈)"
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #ddd', borderRadius: '20px', fontSize: '13px', outline: 'none' }}
            />
            <button
              disabled={loading}
              onClick={() => sendMessage()}
              style={{ padding: '9px 16px', borderRadius: '20px', background: loading ? '#ccc' : '#1976d2', color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer', fontSize: '13px' }}
            >
              전송
            </button>
          </div>
        </section>

        {/* DASHBOARD (항상 표시) */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* 추천 대시보드 */}
          <section style={{ border: '1px solid #e2e2e2', borderRadius: '10px', background: '#fff', padding: '12px' }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>추천 결과</h2>
            {rec ? (
              <>
                {rec.usedInfo.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#777', background: '#f5f5f5', padding: '6px 8px', borderRadius: '6px', marginBottom: '8px' }}>
                    <strong>사용한 정보:</strong> {rec.usedInfo.join(', ')}
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>🥇 1순위: {rec.primary.name}</div>
                <div style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>{rec.primary.reason}</div>
                <div style={{ fontSize: '11px', color: '#777', marginBottom: '10px' }}>준비 예상: {rec.primary.prepRange}<br></br>주의점: {rec.primary.caution}</div>
                {rec.alternatives.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>🥈 대안 자격증</div>
                    {rec.alternatives.map((a, i) => (
                      <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: '#fafafa', borderRadius: '6px', marginBottom: '4px' }}>
                        {a.name} — {a.reason}
                      </div>
                    ))}
                  </div>
                )}
                {rec.path?.basic && (
                  <div style={{ borderTop: '1px dashed #ddd', paddingTop: '8px', marginTop: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>기본 학습 경로</div>
                    <div style={{ fontSize: '11px', lineHeight: 1.6 }}>
                      <div><strong>강의:</strong> {rec.path.basic.lecture}</div>
                      <div><strong>기출·자료:</strong> {rec.path.basic.examMaterial}</div>
                      <div><strong>교재:</strong> {rec.path.basic.textbook}</div>
                      <div><strong>예상 비용:</strong> {rec.path.basic.estimatedCost}</div>
                      {rec.path.basic.paidLecture && (
                        <div style={{ marginTop: '4px', padding: '6px 8px', background: '#fff8e1', borderRadius: '6px' }}>
                          <strong>유료 강의 옵션:</strong> {rec.path.basic.paidLecture}
                        </div>
                      )}
                      {rec.path.basic.caution && (
                        <div style={{ color: '#c00', marginTop: '4px', fontSize: '11px' }}>
                          <strong>주의:</strong> {rec.path.basic.caution}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {rec.guideline && (
                  <div style={{ marginTop: '10px', padding: '8px 10px', background: '#e8f4fd', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>📋 취업 가이드라인 (조건부)</div>
                    <div><strong>직무 요약:</strong> {rec.guideline.jobSummary}</div>
                    <div><strong>필요 역량 묶음:</strong> {rec.guideline.requiredSkills}</div>
                    <div><strong>자격증 연결:</strong> {rec.guideline.certConnection}</div>
                    <div><strong>포트폴리오 방향:</strong> {rec.guideline.portfolio}</div>
                    <div><strong>참고 공고:</strong> {rec.guideline.referencePosts}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '12px', color: '#777' }}>
                대화 중에 자격증 추천을 요청하면 여기에 1순위 + 대안 + 학습 경로가 표시돼요.<br></br>
                <span style={{ color: '#aaa', fontSize: '11px' }}>추천 전에는 이 공간이 비어 있어요.</span>
              </div>
            )}
          </section>

          {/* 일정 카드 */}
          {schedule && (
            <section style={{ border: '1px solid #e2e2e2', borderRadius: '10px', background: '#fff', padding: '12px' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>공식 시험 정보 — {schedule.qualification}</h2>
              {schedule.items.map((it, i) => (
                <div key={i} style={{ fontSize: '12px', padding: '6px 8px', background: '#fafafa', borderRadius: '6px', marginBottom: '4px' }}>
                  <strong>{it.label}:</strong> {it.value}
                  {it.source && <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>출처: {it.source}</div>}
                  {it.note && <div style={{ color: '#c00', fontSize: '10px' }}>{it.note}</div>}
                </div>
              ))}
            </section>
          )}

          {/* 계획 카드 */}
          {plan && (
            <section style={{ border: '1px solid #e2e2e2', borderRadius: '10px', background: '#fff', padding: '12px' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 8px 0' }}>학습 계획 — {plan.qualification}</h2>
              <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                시험일: {plan.examDate} · 총 {plan.totalWeeks}주 · 상태: <strong>{plan.status}</strong>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ textAlign: 'left', padding: '4px 6px', border: '1px solid #ddd' }}>주차</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', border: '1px solid #ddd' }}>초점</th>
                    <th style={{ textAlign: 'left', padding: '4px 6px', border: '1px solid #ddd' }}>권장 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.weeks.map(w => (
                    <tr key={w.week}>
                      <td style={{ padding: '3px 6px', border: '1px solid #eee' }}>{w.week}주차</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #eee' }}>{w.focus}</td>
                      <td style={{ padding: '3px 6px', border: '1px solid #eee' }}>{w.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '8px', fontSize: '11px', background: '#f5f5f5', padding: '6px 8px', borderRadius: '6px' }}>
                <strong>오늘 브리핑:</strong> {plan.briefing.task} · 가장 가까운 마감: {plan.briefing.deadline}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* 탭 내비게이션 */}
      <nav style={{ display: 'flex', gap: '6px', margin: '18px 0 10px', flexWrap: 'wrap', borderBottom: '1px solid #e2e2e2', paddingBottom: '8px' }}>
        {[
          ['chat', '💬 대화'], ['dashboard', '📊 추천'], ['schedule', '📅 일정'],
          ['plan', '📋 계획'], ['profile', '👤 프로필'], ['p1', '🔧 추가 기능']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id as TabId)}
            style={{
              background: tab === id ? '#1976d2' : 'transparent',
              color: tab === id ? '#fff' : '#333',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '16px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: tab === id ? '600' : '400',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* 탭 콘텐츠 */}
      {tab === 'dashboard' && (
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginTop: 0 }}>추천 결과 상세</h2>
          {rec ? (
            <div>
              {rec.usedInfo.length > 0 && (
                <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', marginBottom: '10px' }}>
                  <strong>이번 판단에 사용한 정보:</strong> {rec.usedInfo.join(', ')}
                </div>
              )}
              <h3 style={{ fontSize: '14px', margin: '10px 0 4px' }}>🥇 1순위: {rec.primary.name}</h3>
              <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px' }}>{rec.primary.reason}</p>
              <p style={{ fontSize: '12px', color: '#777', margin: '0 0 12px' }}>준비 예상: {rec.primary.prepRange}<br></br>주의점: {rec.primary.caution}</p>

              {rec.alternatives.length > 0 && (
                <>
                  <h3 style={{ fontSize: '14px', margin: '14px 0 4px' }}>🥈 대안 자격증</h3>
                  {rec.alternatives.map((a, i) => (
                    <div key={i} style={{ padding: '8px 10px', background: '#fafafa', borderRadius: '8px', fontSize: '13px', marginBottom: '6px' }}>
                      <strong>{a.name}</strong> — {a.reason}
                    </div>
                  ))}
                </>
              )}

              {rec.path?.basic && (
                <>
                  <h3 style={{ fontSize: '14px', margin: '18px 0 6px' }}>기본 학습 경로</h3>
                  <div style={{ fontSize: '13px', lineHeight: 1.7 }}>
                    <div><strong>강의:</strong> {rec.path.basic.lecture}</div>
                    <div><strong>기출·자료:</strong> {rec.path.basic.examMaterial}</div>
                    <div><strong>교재:</strong> {rec.path.basic.textbook}</div>
                    <div><strong>예상 비용:</strong> {rec.path.basic.estimatedCost}</div>
                    <div><strong>선택 이유:</strong> {rec.path.basic.reason}</div>
                    {rec.path.basic.paidLecture && (
                      <div style={{ marginTop: '8px', padding: '8px 10px', background: '#fff8e1', borderRadius: '8px' }}>
                        <strong>유료 강의 옵션:</strong> {rec.path.basic.paidLecture}
                      </div>
                    )}
                    {rec.path.basic.caution && (
                      <div style={{ color: '#c00', marginTop: '6px', fontSize: '12px' }}><strong>주의:</strong> {rec.path.basic.caution}</div>
                    )}
                  </div>
                </>
              )}

              {rec.guideline && (
                <div style={{ marginTop: '16px', padding: '10px 12px', background: '#e8f4fd', borderRadius: '8px', fontSize: '13px' }}>
                  <h3 style={{ fontSize: '13px', margin: '0 0 6px' }}>📋 취업 가이드라인 (조건부 — 관심 공고·목표 직무 있을 때만)</h3>
                  <div><strong>직무 요약:</strong> {rec.guideline.jobSummary}</div>
                  <div><strong>필요 역량 묶음(반복 요건 기반):</strong> {rec.guideline.requiredSkills}</div>
                  <div><strong>자격증 연결:</strong> {rec.guideline.certConnection}</div>
                  <div><strong>포트폴리오·경험 방향:</strong> {rec.guideline.portfolio}</div>
                  <div><strong>참고 공고:</strong> {rec.guideline.referencePosts}</div>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#777', fontSize: '13px' }}>대화가 진행되면 여기에 추천 결과가 표시돼요.</p>
          )}
        </div>
      )}

      {tab === 'schedule' && (
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginTop: 0 }}>공식 시험 정보 확인 (P0-2)</h2>
          {schedule ? (
            <div>
              <p style={{ fontSize: '12px', color: '#777', marginBottom: '10px' }}>
                web_extract로 주관기관 공식 원문을 직접 확인했어요. 출처·확인 날짜는 각 항목 아래에 표시돼요.<br></br>
                미발표 항목은 &quot;미확인&quot; 또는 &quot;공식 일정 미발표&quot;로 표시되고, 지난 회차는 목표 후보에서 제외돼요.
              </p>
              {schedule.items.map((it, i) => (
                <div key={i} style={{ padding: '8px 10px', background: '#fafafa', borderRadius: '8px', marginBottom: '6px', fontSize: '13px' }}>
                  <strong>{it.label}:</strong> {it.value}
                  {it.source && <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>출처: {it.source}</div>}
                  {it.note && <div style={{ color: '#c00', fontSize: '11px' }}>{it.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p style={{ color: '#777', fontSize: '13px', marginBottom: '10px' }}>특정 자격증에 대해 &quot;OO자격증 일정 알려줘&quot;라고 물어보시면 여기서 공식 일정을 확인할 수 있어요.</p>
              <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#555' }}>
                <strong>예시 질문:</strong> &quot;정보처리기사 시험 일정 알려줘&quot; / &quot;SQLD 응시료랑 접수 일정 알려줘&quot; / &quot;컴퓨터활용능력 1급 시험일 언제야&quot;
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginTop: 0 }}>학습 계획·체크인·재조정 (P0-4)</h2>
          {plan ? (
            <div>
              <p style={{ fontSize: '12px', color: '#777', marginBottom: '10px' }}>
                주차별 계획 표를 미리볼 수 있어요. 준비 시작을 원하면 프로필 탭에서 저장 후 대화를 통해 &quot;이 자격증 준비 시작할래&quot;라고 말해 주세요. (Notion 학습 공간 생성은 동의 후, 미연결 시 워크스페이스 파일 대체)
              </p>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: '#555' }}>시험일: <strong>{plan.examDate}</strong> · 총 <strong>{plan.totalWeeks}주</strong> · 상태: <strong>{plan.status}</strong></div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '10px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ textAlign: 'left', padding: '5px 8px', border: '1px solid #ddd' }}>주차</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px', border: '1px solid #ddd' }}>학습 초점</th>
                    <th style={{ textAlign: 'left', padding: '5px 8px', border: '1px solid #ddd' }}>권장 시간</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.weeks.map(w => (
                    <tr key={w.week} style={{ background: w.done ? '#fafafa' : 'transparent' }}>
                      <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{w.week}주차</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{w.focus}</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #eee' }}>{w.hours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ background: '#e8f4fd', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', marginBottom: '10px' }}>
                <strong>오늘 브리핑:</strong> {plan.briefing.task}<br></br>
                가장 가까운 마감: {plan.briefing.deadline}
              </div>
              <p style={{ fontSize: '11px', color: '#777' }}>
                지연 3일 이상 또는 주당 가용시간 50% 초과 시 재조정(시험일 고정, 앞 단계 압축·뒤 단계 보호)돼요.<br></br>
                3일 연속 미완료 시 &quot;계획 줄이고 싶으면 말해 주세요&quot; 안내가 나가요.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: '#777', fontSize: '13px', marginBottom: '10px' }}>
                자격증 추천을 받은 뒤 &quot;이 자격증 준비 시작할래&quot;라고 말하면 주차별 계획이 만들어져요.
              </p>
              <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', fontSize: '12px', color: '#555' }}>
                <strong>예시 질문:</strong> &quot;정보처리기사 주 5시간으로 시험일까지 학습 계획 세워줘&quot; / &quot;오늘 뭐 공부해?&quot; / &quot;계획 줄여줘&quot;
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginTop: 0 }}>프로필 — 조건 확인·변경 (P1-3)</h2>
          <p style={{ fontSize: '12px', color: '#777', marginBottom: '12px' }}>
            대화 중에 저장된 프로필을 확인하고, 필요하면 이 탭에서 직접 바꿀 수 있어요. 변경된 조건은 기존 추천·계획 재계산에 반영돼요. (이미 확인된 값은 함부로 바꾸지 않고 새 정보만 갱신)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginBottom: '14px' }}>
            {[
              ['진로 / 관심 직무', profile.진로 ?? '<미설정>'],
              ['보유 자격증', (profile.보유자격증 && profile.보유자격증.length > 0) ? profile.보유자격증.join(', ') : '<없음>'],
              ['학습 방식', profile.학습방식 ?? '<미설정>'],
              ['비용 선호', profile.비용선호 ?? '<미설정>'],
              ['예산', profile.예산 ?? '<미설정>'],
              ['가용시간', profile.가용시간 ?? '<미설정>'],
              ['목표 시기', profile.목표시기 ?? '<미설정>'],
              ['목표 회차', profile.목표회차 ?? '<미설정>'],
              ['관심 공고', profile.관심공고 ?? '<없음>'],
              ['취득 완료 자격', (profile.취득완료자격 && profile.취득완료자격.length > 0) ? profile.취득완료자격.join(', ') : '<없음>'],
              ['영어 성적', profile.영어성적 ?? '<미설정>'],
              ['유효기간 자산', profile.유효기간자산 ?? '<미설정>'],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '6px 8px', background: '#fafafa', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#888' }}>{label}</div>
                <div style={{ fontWeight: '500' }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#777' }}>
            💡 대화 중에 &quot;내 목표가 바뀌었어&quot; 또는 &quot;비용 선호를 변경할래&quot;라고 말하면 여기서 반영돼요.<br></br>
            프로필을 처음 저장하려면 대화 중에 저장하고 싶은 정보를 알려주면 돼요. 저장 전 동의를 받아요.
          </div>
        </div>
      )}

      {tab === 'p1' && (
        <div style={{ background: '#fff', border: '1px solid #e2e2e2', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', marginTop: 0 }}>추가 기능 (P1)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            {/* P1-1 캘린더 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>📅 캘린더 등록 (P1-1, 동의 기반)</h3>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
                Google Calendar 커넥터 연결 확인 후, 공식 확정 일정만 사용자 동의 후 등록해요.<br></br>
                취득 결정·접수 완료 상태에서 별도 동의 질문을 거쳐요.
              </p>
              {schedule ? (
                <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px' }}>
                    현재 대화에서 확인된 일정: <strong>{schedule.qualification}</strong>
                  </div>
                  {!calendarConsentAsked ? (
                    <button
                      onClick={() => setCalendarConsentAsked(true)}
                      style={{ marginTop: '8px', padding: '6px 10px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      캘린더 등록 동의 물어보기
                    </button>
                  ) : (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '12px', marginBottom: '6px' }}>
                        공식 확정된 일정을 캘린더에 등록할까요? (미등록 시 텍스트 일정과 연결 안내로 대체돼요)
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setCalendarConsent(true)}
                          style={{ padding: '5px 10px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          등록 동의
                        </button>
                        <button
                          onClick={() => setCalendarConsent(false)}
                          style={{ padding: '5px 10px', background: '#eee', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          등록 안 함
                        </button>
                      </div>
                      {calendarConsent === true && (
                        <div style={{ marginTop: '6px', color: '#1976d2', fontSize: '12px' }}>
                          ✓ 동의했어요. (실제 등록은 /api/calendar-preview에서 커넥터 상태에 따라 진행 — 미연결 시 텍스트 일정+연결 안내로 대체)
                        </div>
                      )}
                      {calendarConsent === false && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#777' }}>
                          등록하지 않기로 했어요. 텍스트 일정과 연결 안내를 제공해요.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: '12px', color: '#777' }}>먼저 대화에서 특정 자격증 일정을 확인해 주세요.</p>
              )}
            </section>

            {/* P1-2 다음 경로 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>🔜 취득 후 다음 경로 + 보유 자격증 갱신 (P1-2)</h3>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '8px' }}>
                &quot;취득했다&quot;고 직접 말한 경우만 확정해요. 보유 자격증·등급을 확인하고 프로필에 추가(동의 시)해요.<br></br>
                기존 자격증과 과도한 중복 후보는 낮추고, 새로운 직무 가치를 더하는 1순위+대안을 제시해요.<br></br>
                추가 자격증보다 프로젝트·실무·포트폴리오가 우선인 시점이면 솔직히 말해요.
              </p>
              <div style={{ background: '#f5f5f5', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#555' }}>
                예시: &quot;정보처리기사 취득했어&quot; / &quot;SQLD 시험 합격했어&quot; / &quot;다음엔 뭘 따면 좋을까?&quot;
              </div>
            </section>

            {/* P1-3 조건 변경 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>🔄 프로필 조건 변경 반영 (P1-3)</h3>
              <p style={{ fontSize: '12px', color: '#555' }}>
                비용 선호·가용시간·학습 방식·목표 시기가 바뀌면 기존 추천·계획이 재계산돼요. 이미 확인된 값은 함부로 바꾸지 않고 새 정보만 갱신해요. (프로필 탭에서도 수정 가능)
              </p>
            </section>

            {/* P1-4 결과 반영 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>📈 합격/불합격 결과 반영 (P1-4)</h3>
              <p style={{ fontSize: '12px', color: '#555' }}>
                &quot;합격했어&quot; → 보유 자격증 추가, 상태 합격, 다음 자격증 제안(E 모드)<br></br>
                &quot;불합격했어&quot; → 완료율 가장 낮았던 단계 사실만 말하고, 다음 회차 공식 일정 확인 후 그 단계 비중을 올린 계획 제안 (위로보다 다음 계획 먼저)
              </p>
            </section>

            {/* P1-5 유효기간 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>⏳ 유효기간 자산 관리 (P1-5, 사용자 원할 때만)</h3>
              <p style={{ fontSize: '12px', color: '#555' }}>
                보유 자격증·영어 성적 등 유효기간 있는 자산을, 사용자가 제공 취득/만료 시점 + 공식 규정 바탕으로 유효 여부·갱신 시점 검토해요.<br></br>
                사용자가 원하지 않으면 이름·등급 중심으로만 확인하고 유효기간 관리는 진행하지 않아요.
              </p>
            </section>

            {/* P1-6 취업 */}
            <section>
              <h3 style={{ fontSize: '14px', margin: '0 0 6px' }}>💼 취업 가이드라인 (P1-6, 조건부)</h3>
              <p style={{ fontSize: '12px', color: '#555' }}>
                관심 공고·목표 직무가 있을 때만, web_extract로 반복 요건을 추출해 직무 요약·필요 역량 묶음·자격증 연결·포트폴리오 방향·참고 공고 링크/확인 날짜를 제공해요.<br></br>
                관심 공고·목표 직무가 없으면 이 블록은 출력하지 않아요.
              </p>
              {profile.관심공고 && (
                <div style={{ background: '#e8f4fd', padding: '8px 10px', borderRadius: '8px', fontSize: '12px' }}>
                  관심 공고: {profile.관심공고} → 취업 가이드라인 블록을 조건에 맞게 제공해요.
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* 저장 동의 모달 */}
      {shownConsent && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', marginBottom: '12px' }}>프로필 저장 동의</h3>
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px' }}>
              추천을 더 정확하게 맞춤화하려면 프로필 정보를 저장합니다.
              저장 전 동의를 받습니다. 저장된 정보는 로컬 스토리지에만 보관되며, 다른 기기에서는 사용할 수 없습니다.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
                현재 저장된 프로필 (없을 수 있음)
              </label>
              <pre style={{
                fontSize: '11px',
                background: '#f5f5f5',
                padding: '10px',
                borderRadius: '4px',
                whiteSpace: 'pre-wrap',
                maxHeight: '150px',
                overflow: 'auto',
              }}>
                {JSON.stringify(profile, null, 2) || '(저장된 프로필 없음)'}
              </pre>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShownConsent(false)}
                style={{ padding: '8px 16px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '6px', background: '#f5f5f5', cursor: 'pointer' }}
              >
                나중에
              </button>
              <button
                onClick={동의후저장}
                style={{ padding: '8px 16px', fontSize: '13px', backgroundColor: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
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

// 대화 기록 초기화 헬퍼 (위 clearMessages 함수 사용)
function clearMessages() {
  localStorage.removeItem('certCoachMessages')
}
