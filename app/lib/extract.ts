// === 웹 페이지 추출 유틸리티 ===
// cheerio + fetch 기반 정적 HTML 추출 (jina.ai Reader 혼합 방식)

import * as cheerio from 'cheerio';

// === 추출 설정 ===
const JINA_READER_BASE = 'https://r.jina.ai/';
const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// === URL 인코딩 안전 처리 ===
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    // 이미 절대 URL이거나 상대 경로인 경우 처리
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }
}

// === fetch로 HTML 가져오기 (cheerio 추출용) ===
async function fetchHtml(url: string): Promise<string | null> {
  const targetUrl = safeUrl(url);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[fetchHtml] ${targetUrl} → HTTP ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.warn(`[fetchHtml] ${targetUrl} → HTML 아님 (${contentType})`);
      return null;
    }

    const html = await res.text();
    return html;
  } catch (err) {
    console.warn(`[fetchHtml] ${targetUrl} fetch 오류: ${err}`);
    return null;
  }
}

// === cheerio로 핵심 텍스트 추출 ===
function extractTextWithCheerio(html: string, url: string): string {
  const $ = cheerio.load(html);

  // Wayback Machine + 사이트 공통 노이즈 요소 제거
  const noiseSelectors = [
    'script', 'style', 'noscript', 'svg', 'form',
    '#wm-ipp-base', '#wm-ipp-print', '#skip_menu', '#dim', '#gnb_dim',
    '#popup_logchk', '#top_notice', '#mask_screen',
    '.floating-banner-wrap', '.float_dimd',
    'header', 'footer', 'nav', 'aside',
    '.gnb_01', '.gnb_02', '.gnb_03', '.gnb_04', '.gnb_05', '.gnb_06', '.gnb_07',
    '.header_top', '.header_bottom', '.all_menu',
  ];
  noiseSelectors.forEach(sel => $(sel).remove());

  // 메인 콘텐츠 영역 우선 추출
  // q-net: id=container, TOEIC: section#wrap > div#contents, 일반: main/.content 등
  const mainSelectors = [
    '#container',
    'section#wrap',
    'div#contents',
    'main',
    '.content',
    '.container',
    '#content',
    '.article',
    '.post-content',
    '.board-content',
    'article',
  ];
  let mainElement = null;
  for (const sel of mainSelectors) {
    mainElement = $(sel);
    if (mainElement.length > 0) break;
  }

  let text = '';

  if (mainElement) {
    // 메인 영역 내에서도 한 번 더 노이즈 제거 (clone 사용)
    const clone = mainElement.clone();
    noiseSelectors.forEach(sel => $(clone).find(sel).remove());
    text = clone.text();
  } else {
    // 본문 영역이 없으면 body에서 추출하되 불필요한 태그 제외
    $('body').children().each((i, el) => {
      const tag = $(el).prop('tagName')?.toLowerCase();
      if (['script', 'style', 'nav', 'footer', 'header', 'aside', 'form'].includes(tag || '')) {
        return;
      }
      text += $(el).text() + '\n';
    });
  }

  // 공백 정리 (연속 빈줄 제거, 양쪽 공백 제거)
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // 너무 길면 앞부분만 (15,000자 제한)
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '\n\n...(이하 생략)';
  }

  return text;
}

// === jina.ai Reader로 추출 (백업/대안) ===
async function extractWithJina(url: string): Promise<string | null> {
  const targetUrl = safeUrl(url);
  const jinaUrl = `${JINA_READER_BASE}${encodeURIComponent(targetUrl)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS * 2);

    const res = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, text/markdown',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[jina] ${jinaUrl} → HTTP ${res.status}`);
      return null;
    }

    const text = await res.text();
    if (text.length > 20000) {
      return text.substring(0, 20000) + '\n\n...(이하 생략)';
    }
    return text;
  } catch (err) {
    console.warn(`[jina] ${jinaUrl} 오류: ${err}`);
    return null;
  }
}

// === URL에서 페이지 정보 추출 (메인 함수) ===
export interface ExtractedPage {
  url: string;
  title: string;
  content: string;       // 추출된 텍스트 (cheerio 또는 jina)
  extractedAt: string;   // 추출 시각 (ISO)
  method: 'cheerio' | 'jina' | 'none';
  error?: string;
}

export async function extractPage(url: string): Promise<ExtractedPage> {
  const targetUrl = safeUrl(url);
  const extractedAt = new Date().toISOString();
  const originalUrl = targetUrl; // 원본 URL 보존 (Wayback 리다이렉트된 경우 대비)

  // 1. cheerio + fetch 시도
  const html = await fetchHtml(targetUrl);
  if (html) {
    const $ = cheerio.load(html);
    // title 태그가 있으면 사용, 없으면 원본 URL
    const title = $('title').text().trim() || originalUrl;
    const content = extractTextWithCheerio(html, targetUrl);

    if (content && content.length > 100) {
      return {
        url: originalUrl, // 실제 정보 출처 URL
        title,
        content,
        extractedAt,
        method: 'cheerio',
      };
    }
  }

  // 2. jina.ai Reader 시도
  const jinaContent = await extractWithJina(targetUrl);
  if (jinaContent && jinaContent.length > 100) {
    return {
      url: targetUrl,
      title: url,
      content: jinaContent,
      extractedAt,
      method: 'jina',
    };
  }

  // 3. 모두 실패
  return {
    url: targetUrl,
    title: url,
    content: '',
    extractedAt,
    method: 'none',
    error: '페이지 추출 실패 (cheerio, jina 모두 실패)',
  };
}

// === 여러 URL 동시 추출 ===
export async function extractMultipleUrls(urls: string[]): Promise<ExtractedPage[]> {
  const results = await Promise.allSettled(urls.map(url => extractPage(url)));
  return results.map(r => (r.status === 'fulfilled' ? r.value : {
    url: '',
    title: '',
    content: '',
    extractedAt: new Date().toISOString(),
    method: 'none' as const,
    error: `추출 중 오류: ${r.reason}`,
  }));
}
