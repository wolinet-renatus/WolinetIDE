import type { ProviderId } from './types';
import { escape } from './dom';
import githubCopilotLogo from './assets/providers/github-copilot.svg?raw';
import clineLogo from './assets/providers/cline.svg?raw';

// Original provider assets; see docs/brand-assets.md for provenance.
// Harnesses without an asset (omp) show no mark; their name stands alone.
const logos: Partial<Record<ProviderId, string>> = {
  claude: new URL('./assets/providers/claude.svg', import.meta.url).href,
  codex: new URL('./assets/providers/openai.svg', import.meta.url).href,
  kimi: new URL('./assets/providers/kimi.png', import.meta.url).href,
  opencode: new URL('./assets/providers/opencode.png', import.meta.url).href,
  glm: new URL('./assets/providers/glm.svg', import.meta.url).href,
  antigravity: new URL('./assets/providers/antigravity.png', import.meta.url).href,
  grok: new URL('./assets/providers/grok.png', import.meta.url).href,
  mimo: new URL('./assets/providers/mimo.png', import.meta.url).href,
  pi: new URL('./assets/providers/pi.png', import.meta.url).href,
  deepseek: new URL('./assets/providers/deepseek.png', import.meta.url).href,
  commandcode: new URL('./assets/providers/commandcode.png', import.meta.url).href,
  muse: new URL('./assets/providers/muse.svg', import.meta.url).href,
};

/** Decorative provider mark. The surrounding control supplies its accessible name. */
export function providerLogo(id: ProviderId, cls = ''): string {
  const className = `provider-logo${cls ? ` ${escape(cls)}` : ''}`;
  if (id === 'wolinet') {
    return `<svg class="${className}" data-provider="wolinet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" width="20" height="20"><path d="m12 2 8.5 4.9v9.8L12 21.6 3.5 16.7V6.9Zm0 2.6L5.5 8v7.6l6.5 3.8 6.5-3.8V8ZM8 9l1.8 5.5h1.5l1.7-3.5 1.7 3.5h1.5L18 9"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`;
  }
  // Monochrome marks are inlined and drawn in the theme's text color.
  const inline = id === 'github-copilot' ? githubCopilotLogo : id === 'cline' ? clineLogo.replaceAll('#1C1C24', 'currentColor') : '';
  if (inline) {
    return inline.replace('<svg ', `<svg class="${className}" data-provider="${id}" aria-hidden="true" focusable="false" `);
  }
  const src = logos[id];
  if (!src) return '';
  return `<img class="${className}" data-provider="${id}" src="${escape(src)}" width="20" height="20" alt="" aria-hidden="true" draggable="false">`;
}
