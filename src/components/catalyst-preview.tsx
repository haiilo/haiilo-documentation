'use client';

import { ensureCatalystLoaded } from '@/components/catalyst-loader';
import { useEffect, useRef } from 'react';

const PREVIEW_CONTAINER_CLASS =
  'cat-flex-row cat-flex-wrap cat-items-center cat-justify-center cat-gap-m';

const CATALYST_TOKENS_URL = '/catalyst/variables.css';
const CATALYST_CORE_URL = '/catalyst/catalyst.css';
const OVERLAY_SELECTOR = /flatpickr|toastify/i;

function ensureStylesheet(parent: ParentNode, id: string, href: string): void {
  if (parent.querySelector(`link[data-catalyst-style="${id}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.catalystStyle = id;
  parent.append(link);
}

function collectOverlayCss(sheet: CSSStyleSheet): string {
  const parts: string[] = [];

  for (const rule of sheet.cssRules) {
    if (rule instanceof CSSStyleRule && OVERLAY_SELECTOR.test(rule.selectorText)) {
      parts.push(rule.cssText);
      continue;
    }

    if (!(rule instanceof CSSMediaRule)) continue;

    const inner = [...rule.cssRules]
      .filter(function isOverlayRule(child): child is CSSStyleRule {
        return child instanceof CSSStyleRule && OVERLAY_SELECTOR.test(child.selectorText);
      })
      .map(function toCss(child) {
        return child.cssText;
      });

    if (inner.length) {
      parts.push(`@media ${rule.media.mediaText} { ${inner.join('')} }`);
    }
  }

  return parts.join('\n');
}

let overlayPromise: Promise<void> | null = null;

function ensureOverlayStyles(): Promise<void> {
  if (overlayPromise) return overlayPromise;

  overlayPromise = fetch(CATALYST_CORE_URL)
    .then(function readCss(res) {
      return res.text();
    })
    .then(function applyOverlayCss(css) {
      if (document.getElementById('catalyst-overlays')) return;

      const parsed = new CSSStyleSheet();
      parsed.replaceSync(css.replace(/^@charset[^;]+;/i, ''));
      const overlayCss = collectOverlayCss(parsed);
      if (!overlayCss) return;

      const style = document.createElement('style');
      style.id = 'catalyst-overlays';
      style.textContent = overlayCss;
      document.head.append(style);
    })
    .catch(function ignoreOverlayFailure() {
      return undefined;
    });

  return overlayPromise;
}

interface CatalystPreviewProps {
  html: string;
}

export function CatalystPreview({ html }: CatalystPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;

    void Promise.all([ensureCatalystLoaded(), ensureOverlayStyles()]).then(function renderPreview(): void {
      if (cancelled || !hostRef.current) return;

      ensureStylesheet(document.head, 'tokens', CATALYST_TOKENS_URL);

      const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      ensureStylesheet(shadow, 'core', CATALYST_CORE_URL);

      let container = shadow.querySelector<HTMLDivElement>('[data-catalyst-preview]');
      if (!container) {
        container = document.createElement('div');
        container.dataset.catalystPreview = '';
        container.className = `${PREVIEW_CONTAINER_CLASS} w-full`;
        shadow.append(container);
      }

      container.innerHTML = html;
    });

    return function cancelPreview(): void {
      cancelled = true;
    };
  }, [html]);

  return <div ref={hostRef} className="w-full" />;
}
