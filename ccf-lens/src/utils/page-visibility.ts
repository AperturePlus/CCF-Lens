/**
 * page-visibility - 页面可见性判断工具
 * 
 * 判断统计面板在不同网站和页面上的可见性
 */

import type { SiteAdapter } from '../adapters/types'

export function shouldShowStatsPanelForCurrentPage(adapter: SiteAdapter | null): boolean {
  if (!adapter) return false

  const url = new URL(window.location.href)

  switch (adapter.siteId) {
    case 'arxiv':
      return url.pathname.startsWith('/search') || url.pathname.startsWith('/list')
    case 'ieee':
      return (
        url.pathname.startsWith('/search') ||
        url.pathname.startsWith('/author') ||
        url.pathname.startsWith('/xpl/conhome') ||
        url.pathname.startsWith('/xpl/tocresult')
      )
    case 'google-scholar': {
      // Hide on single-citation detail pages.
      if (url.pathname === '/citations' && url.searchParams.get('view_op') === 'view_citation') {
        return false
      }
      return url.pathname === '/scholar' || url.pathname === '/citations'
    }
    case 'dblp':
      // DBLP adapter only matches list/search pages.
      return true
    default:
      return true
  }
}

export function hasArxivPublicationSignal(element: HTMLElement): boolean {
  // Journal reference is a strong indicator that this is beyond a plain preprint.
  if (element.querySelector('.list-journal-ref, td.tablecell.jref, .jref')) {
    return true
  }

  const labelTextCandidates = Array.from(
    element.querySelectorAll('span.has-text-black-bis.has-text-weight-semibold, span.descriptor')
  )
    .map(span => span.textContent?.trim() || '')
    .filter(Boolean)

  if (labelTextCandidates.some(text => /journal\s*-?\s*ref/i.test(text))) {
    return true
  }

  // External DOI (not the arXiv-issued DOI) often indicates a published version exists.
  const doiLinks = Array.from(element.querySelectorAll('a[href^="https://doi.org/"]'))
  for (const link of doiLinks) {
    const href = link.getAttribute('href') || ''
    if (!href) continue
    if (/10\.48550\/arxiv/i.test(href)) continue
    return true
  }

  // Comments sometimes explicitly say "Accepted/Published/To appear", even when venue parsing fails.
  const text = element.textContent || ''
  if (/\b(accepted|published|to\s+appear|appears\s+in|presented)\b/i.test(text)) {
    return true
  }

  return false
}

export function installUrlChangeListener(onChange: () => void): () => void {
  let lastHref = window.location.href

  const check = () => {
    const currentHref = window.location.href
    if (currentHref === lastHref) return
    lastHref = currentHref
    onChange()
  }

  const originalPushState = history.pushState
  const originalReplaceState = history.replaceState

  history.pushState = function (...args: Parameters<History['pushState']>) {
    originalPushState.apply(this, args)
    check()
  }

  history.replaceState = function (...args: Parameters<History['replaceState']>) {
    originalReplaceState.apply(this, args)
    check()
  }

  window.addEventListener('popstate', check)
  window.addEventListener('hashchange', check)

  return () => {
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
    window.removeEventListener('popstate', check)
    window.removeEventListener('hashchange', check)
  }
}
