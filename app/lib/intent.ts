// === 사용자 발화 의도 분류 ===
// 규칙 기반 우선 판별 + 자격증명 매핑(qualification-map) 연동

import { extractCertMentions, classifyCertIntent } from './qualification-map';
import { Profile } from './recommend';

export type Intent =
  | 'reset'
  | 'delete'
  | 'passed'
  | 'change-goal'
  | 'schedule'
  | 'plan'
  | 'profile'
  | 'recommend-confirmed'
  | 'recommend-unspecified'
  | 'reply';

export interface IntentResult {
  intent: Intent;
  message: string; // 프론트가 바로 보여줄 안내 문구
  certMentions: ReturnType<typeof extractCertMentions>;
  certConfirmed: boolean; // 목표 자격증 확정 여부
  goalStandard: string | null; // 확정된 표준명
  profileUpdate?: Partial<Profile>;
  // 라우팅 힌트 (true면 해당 타입의 응답을 함께 구성)
  provideSchedule?: boolean;
  providePlan?: boolean;
  provideRecommendation?: boolean;
  resultKind?: 'passed' | 'changed' | 'updated' | 'reset' | 'delete';
}

// ---- 우선순위 패턴 (먼저 걸린 쪽이 의도) ----
const INIT_PAT = /(초기화|처음부터|다시\s*시작|리셋|reset|모두\s*지워|다\s*지워|처음으로|새출발|재시작)/i;
const DELETE_PAT = /(대화\s*(?:기록\s*)?(?:지우|삭제|지워|없애|날려)|메시지\s*(?:지우|삭제|지워|없애)|기록\s*(?:지우|삭제|지워|없애)|채팅\s*(?:삭제|지우|지워|없애))/i;
const PASSED_PAT = /(합격|땄|취득|시험\s*통과|결과\s*(?:나왔|합격|통과|발표|확정)|합격했어|합격했습니다|취득했어|땄어|통과했어)/i;
const CHANGE_GOAL_PAT = /(목표(?:의\s*진로)?\s*(?:자격증|자격|진로|방향)(?:을|는|이|도|만)?\s*(?:바꾸|변경|수정|새로|다른|전환|옮겨?|바꿔|변경해|수정해)|자격증\s*(?:을|는|이|도|만)?\s*(?:바꾸|변경|바꿀|교체|전환|옮겨?|바꿔|변경해|수정해)|다른\s*자격증|추천\s*(?:다시|말고)|다른\s*거|이것\s*말고|다음으로|다른\s*방향|목표\s*(?:바꿔|변경해|수정해))/i;
const SCHEDULE_PAT = /(시험\s*(?:일정|날짜|날짜\s*알려|언제|언제\s*시험|시험\s*날짜|시험\s*일정)|접수\s*(?:일정|기간|날짜|시작|마감)|시험\s*칠|시험\s*볼|시험\s*예정|시험\s*계획|다음\s*시험|회차|시험\s*시행)/i;
const PLAN_PAT = /(학습\s*(?:계획|스케줄|준비|공부|대비)|공부\s*(?:계획|스케줄|준비|루틴|방법)|준비\s*(?:계획|일정|방법)|어떻게\s*(?:준비|공부|시작)|계획\s*(?:세워|짜|만들어|짜줘)|준비\s*(?:시작|방법|로드맵)|며칠\s*남았|남은\s*기간|준비\s*기간|공부\s*시작|준비\s*스타트)/i;
const PROFILE_PAT = /(프로필|내\s*정보|내\s*상황|진로|저장\s*(?:동의|정보)|보관|기록|프로필\s*(?:저장|업데이트|수정|추가|등록)|내게\s*맞게|나를\s*위해|내\s*조건)/i;
const RECOMMEND_PAT = /(추천|뭐가\s*좋|어떤\s*자격증|뭐\s*따|뭐\s*준비|자격증\s*(?:추천|알려|좋은|필요|도움|유리한)|따면\s*좋|준비하면\s*좋|어떤\s*자격|뭘\s*따|뭘\s*준비|도움이\s*될|유리한\s*자격)/i;

export function classifyIntent(text: string, profile: Profile): IntentResult {
  const t = text.trim();
  const certMentions = extractCertMentions(t);
  const { 확정: certConfirmed, 표준: goalStandard } = classifyCertIntent(t);

  // 1) 초기화
  if (INIT_PAT.test(t)) {
    return {
      intent: 'reset',
      message: '처음부터 다시 시작할게요.',
      certMentions,
      certConfirmed,
      goalStandard,
      profileUpdate: { 메시지: '초기화 요청' },
      resultKind: 'reset',
    };
  }

  // 2) 대화/기록 삭제
  if (DELETE_PAT.test(t)) {
    return {
      intent: 'delete',
      message: '대화 기록을 삭제할게요.',
      certMentions,
      certConfirmed,
      goalStandard,
      resultKind: 'delete',
    };
  }

  // 3) 합격/취득 결과
  if (PASSED_PAT.test(t)) {
    return {
      intent: 'passed',
      message: '합격/취득 결과를 반영해요.',
      certMentions,
      certConfirmed,
      goalStandard,
      resultKind: 'passed',
      provideRecommendation: true,
    };
  }

  // 4) 목표 변경/재탐색
  if (CHANGE_GOAL_PAT.test(t)) {
    return {
      intent: 'change-goal',
      message: '목표 자격증을 바꾸거나 새로 탐색해요.',
      certMentions,
      certConfirmed,
      goalStandard,
      resultKind: 'changed',
      provideRecommendation: true,
      providePlan: true,
    };
  }

  // 5) 시험 일정
  if (SCHEDULE_PAT.test(t)) {
    return {
      intent: 'schedule',
      message: goalStandard
        ? `${goalStandard} 시험 일정을 확인해요.`
        : '시험 일정을 알고 싶은 자격증명을 함께 말해 주세요.',
      certMentions,
      certConfirmed,
      goalStandard,
      provideSchedule: true,
      provideRecommendation: false,
    };
  }

  // 6) 학습 계획
  if (PLAN_PAT.test(t)) {
    return {
      intent: 'plan',
      message: '학습 계획을 세워요.',
      certMentions,
      certConfirmed,
      goalStandard,
      providePlan: true,
      provideRecommendation: false,
    };
  }

  // 7) 프로필 반영/보완
  if (PROFILE_PAT.test(t)) {
    return {
      intent: 'profile',
      message: '프로필 조건을 반영해요.',
      certMentions,
      certConfirmed,
      goalStandard,
      resultKind: 'updated',
      provideRecommendation: true,
    };
  }

  // 8) 추천 요청 (확정 / 미확정)
  if (RECOMMEND_PAT.test(t) || certConfirmed || goalStandard) {
    const confirmed = certConfirmed && goalStandard;
    return {
      intent: confirmed ? 'recommend-confirmed' : 'recommend-unspecified',
      message: confirmed
        ? `${goalStandard}을(를) 목표로 추천해요.`
        : '조건을 더 알려주시면 맞춤 추천해요.',
      certMentions,
      certConfirmed,
      goalStandard,
      provideRecommendation: true,
      providePlan: true,
    };
  }

  // 9) 그 외 안내/잡담
  return {
    intent: 'reply',
    message: '지금 바로 기능 연결은 어렵지만, 자격증 추천·시험 일정·학습 계획을 요청해 주세요.',
    certMentions,
    certConfirmed,
    goalStandard,
  };
}
