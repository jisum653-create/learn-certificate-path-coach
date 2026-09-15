// === 서비스 웹 리서치 모듈 ===
// Vercel Functions에서 fetch로 호출 가능한 검색 + 추출 파이프라인
//
// 네이버 검색 API (NAVER API HUB — 뉴스 검색) + Jina Reader URL 콘텐츠 추출
//
// 환경변수: NAVER_API_CLIENT_ID, NAVER_API_CLIENT_SECRET (네이버 API HUB)

import { extractMultipleUrls, ExtractedPage } from './extract';

// ──────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────

export interface SearchResult {
  query: string;
  rawText: string;
  extractedUrls: string[];
  extractedAt: string;
  source: 'naver' | 'none';
  error?: string;
}

export interface WebResearchOutput {
  query: string;
  search: SearchResult;
  pages: ExtractedPage[];
  extractedAt: string;
}

// ──────────────────────────────────────────────────────────────
// Jina Reader (URL 콘텐츠 추출용, API 키 불필요)
// ──────────────────────────────────────────────────────────────

const JINA_READER_BASE = 'https://r.jina.ai/';
const JINA_READER_TIMEOUT_MS = 30000;

/** Jina Reader로 URL 콘텐츠 추출 (텍스트/마크다운) */
export async function readUrlWithJina(url: string): Promise<string | null> {
  const encodedUrl = encodeURIComponent(url);
  const jinaUrl = `${JINA_READER_BASE}${encodedUrl}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JINA_READER_TIMEOUT_MS);
    const res = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, text/markdown',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 30000 ? text.substring(0, 30000) + '\n\n...(이하 생략)' : text;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// 네이버 검색 API (NAVER API HUB — 뉴스 검색)
// ──────────────────────────────────────────────────────────────

const NAVER_SEARCH_BASE = 'https://naverapihub.apigw.ntruss.com/search/v1/news';
const NAVER_SEARCH_TIMEOUT_MS = 20000;

interface NaverSearchParams {
  query: string;
  display?: number;
  start?: number;
  sort?: 'sim' | 'date';
  format?: 'json' | 'xml';
}

interface NaverSearchItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverSearchResponse {
  lastBuildDate?: string;
  total?: number;
  start?: number;
  display?: number;
  items?: NaverSearchItem[];
}

/** 네이버 뉴스 검색으로 후보 URL + 요약 추출 */
export async function searchWithNaver(params: NaverSearchParams): Promise<SearchResult> {
  const clientId = process.env.NAVER_API_CLIENT_ID;
  const clientSecret = process.env.NAVER_API_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      query: params.query,
      rawText: '',
      extractedUrls: [],
      extractedAt: new Date().toISOString(),
      source: 'naver',
      error: '네이버 검색 API 미설정: NAVER_API_CLIENT_ID, NAVER_API_CLIENT_SECRET 환경변수 필요',
    };
  }

  const extractedAt = new Date().toISOString();
  const qs = new URLSearchParams({
    query: params.query,
    display: String(params.display ?? 10),
    start: String(params.start ?? 1),
    sort: params.sort ?? 'sim',
    format: params.format ?? 'json',
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), NAVER_SEARCH_TIMEOUT_MS);

    const res = await fetch(`${NAVER_SEARCH_BASE}?${qs.toString()}`, {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        query: params.query,
        rawText: '',
        extractedUrls: [],
        extractedAt,
        source: 'naver',
        error: `네이버 검색 실패: HTTP ${res.status}${errText ? ' — ' + errText : ''}`,
      };
    }

    const data: NaverSearchResponse = await res.json();
    const items = data.items || [];

    const cleanB = (s: string) => s.replace(/<b>/gi, '').replace(/<\/b>/gi, '');
    const urls: string[] = items
      .map((item) => item.link || item.originallink)
      .filter((u): u is string => Boolean(u));

    const rawTextParts: string[] = items.map((item) => {
      const title = cleanB(item.title);
      const desc = cleanB(item.description);
      return `- ${title}\n  URL: ${item.link || item.originallink}\n  요약: ${desc}\n  게시일: ${item.pubDate}`;
    });

    return {
      query: params.query,
      rawText: rawTextParts.join('\n\n'),
      extractedUrls: urls,
      extractedAt,
      source: 'naver',
    };
  } catch (err) {
    return {
      query: params.query,
      rawText: '',
      extractedUrls: [],
      extractedAt: new Date().toISOString(),
      source: 'naver',
      error: `네이버 검색 예외: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ──────────────────────────────────────────────────────────────
// 검색 + 추출 통합 파이프라인
// ──────────────────────────────────────────────────────────────

/** 검색 + 추출 통합 파이프라인
 *
 * 1. 네이버 뉴스 검색 → 결과에서 URL 추출 → 각 URL에 Jina Reader/extract로 콘텐츠 추출
 * 2. 네이버 미설정 시 공식 URL만 방문 (Jina Reader)
 *
 * @param query 검색 쿼리
 * @param maxPages 추출할 최대 페이지 수 (기본 3)
 * @param officialUrls 검색 결과와 무관하게 방문할 공식 URL 목록
 */
export async function webResearch(
  query: string,
  maxPages: number = 3,
  officialUrls?: string[],
): Promise<WebResearchOutput> {
  const extractedAt = new Date().toISOString();
  const useNaver = !!(process.env.NAVER_API_CLIENT_ID && process.env.NAVER_API_CLIENT_SECRET);

  let searchResult: SearchResult;
  const pages: ExtractedPage[] = [];

  if (useNaver) {
    // ── 네이버 우선 ──
    searchResult = await searchWithNaver({ query, display: maxPages, sort: 'date' });

    // 검색 결과에서 URL 추출, 없으면 공식 URL 사용
    const targetUrls = (searchResult.extractedUrls.length > 0 && !searchResult.error)
      ? searchResult.extractedUrls
      : (officialUrls || []);

    if (targetUrls.length > 0) {
      for (const url of targetUrls.slice(0, maxPages)) {
        const page = await visitUrl(url, extractedAt);
        if (page) pages.push(page);
      }
    } else if (searchResult.error && officialUrls && officialUrls.length > 0) {
      // 검색 실패 시 공식 URL로 대체
      searchResult = { ...searchResult, extractedUrls: officialUrls };
      for (const url of officialUrls.slice(0, maxPages)) {
        const page = await visitUrl(url, extractedAt);
        if (page) pages.push(page);
      }
    }
  } else {
    // ── 공식 URL만 (네이버 미설정) ──
    searchResult = {
      query,
      rawText: '',
      extractedUrls: officialUrls || [],
      extractedAt,
      source: 'none',
      error: !officialUrls ? '네이버 API 미설정 & 방문할 공식 URL 없음' : undefined,
    };
    if (officialUrls) {
      for (const url of officialUrls.slice(0, maxPages)) {
        const page = await visitUrl(url, extractedAt);
        if (page) pages.push(page);
      }
    }
  }

  return { query, search: searchResult, pages, extractedAt };
}

/** URL 방문: Jina Reader → extract.ts 폴백 */
async function visitUrl(url: string, extractedAt: string): Promise<ExtractedPage | null> {
  let content = '';
  let method: ExtractedPage['method'] = 'none';
  let title = url;

  // 1. Jina Reader 시도 (API 키 불필요)
  const jinaContent = await readUrlWithJina(url);
  if (jinaContent) {
    content = jinaContent;
    method = 'jina';
    const firstLine = jinaContent.split('\n')[0];
    const m = firstLine.match(/Content from: (.+)/);
    if (m) title = m[1];
  }

  // 2. Jina Reader 실패 시 extract.ts (cheerio/fetch)
  if (!content) {
    const [extracted] = await extractMultipleUrls([url]);
    if (extracted.content) {
      content = extracted.content;
      method = extracted.method;
      title = extracted.title || url;
    }
  }

  if (!content) return null;
  return { url, title, content, extractedAt, method };
}

/** 웹 리서치 + Solar 프롬프트용 텍스트 조립 */
export function buildResearchContext(output: WebResearchOutput): string {
  const parts: string[] = [];

  parts.push(`## 검색 쿼리: ${output.query}`);
  parts.push(`검색 출처: ${output.search.source === 'naver' ? '네이버 뉴스' : '없음'}`);
  parts.push(`검색 시간: ${output.search.extractedAt}`);
  parts.push('');

  if (output.search.error) {
    parts.push(`⚠ 검색 경고: ${output.search.error}`);
    parts.push('');
  }

  if (output.search.rawText) {
    parts.push('## 검색 결과 (원문)');
    parts.push(output.search.rawText);
    parts.push('');
  }

  if (output.pages.length > 0) {
    parts.push('## 추출한 페이지 콘텐츠');
    for (const page of output.pages) {
      parts.push(`### ${page.title || page.url}`);
      parts.push(`URL: ${page.url}`);
      parts.push(`추출 방식: ${page.method}`);
      parts.push(page.content);
      parts.push('');
    }
  } else if (output.search.extractedUrls.length > 0) {
    parts.push('## 후보 URL (추출 실패)');
    for (const url of output.search.extractedUrls) {
      parts.push(`- ${url}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}
