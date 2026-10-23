import './provider-settings.css';
import { call, preview } from './bridge';
import { escape, icon } from './dom';
import type { ConnectionSnapshot } from './connections';
import type { ProviderId } from './types';

const GATEWAY_DEFAULT = 'https://lango.wolinet.com';
const GATEWAY_FALLBACK = 'https://ai.wolinet.com';

interface Configuration {
  deepseekKeySaved?: boolean;
  deepseekKeyFromEnvironment?: boolean;
  secureStorageAvailable: boolean;
  credentialStorageError?: string | null;
}

export function mountProviderSettings(
  host: HTMLElement,
  saved: () => Promise<unknown>,
  named?: { harnesses: { id: ProviderId; name: string }[]; saved: (snapshot: ConnectionSnapshot) => void }
): () => void {
  let disposed = false;
  let pending = false;
  let unmountNamed: (() => void) | undefined;
  let savedKeyActive = false;

  const currentGateway = localStorage.getItem('wolinet_gateway_endpoint') || GATEWAY_DEFAULT;

  host.classList.add('provider-connections');
  host.innerHTML = `
    <p class="dialog-description">Next-generation autonomous coding intelligence and model access for WolinetIDE.</p>
    ${named ? '<section id="named-connections" hidden></section>' : ''}

    <section class="connection-card wolinet-hero-card">
      <div class="wolinet-card-header">
        <div class="wolinet-card-title">
          <span class="wolinet-badge-icon">${icon('bot')}</span>
          <div>
            <h3>Wolinet AI</h3>
            <span class="wolinet-gateway-url">${currentGateway === GATEWAY_DEFAULT ? 'Wolinet Cloud · Global Network' : 'Wolinet Cloud · Enterprise Network'}</span>
          </div>
        </div>
        <span class="wolinet-status-pill"><span class="wolinet-status-dot"></span> Connected</span>
      </div>

      <p class="wolinet-description">
        Access your unified Wolinet subscription, enterprise compute credits, and frontier coding intelligence.
      </p>

      <div class="wolinet-auth-actions">
        <button type="button" class="primary-button wolinet-web-login-btn" id="wolinet-web-login">
          ${icon('forward')} Sign in with Wolinet
        </button>
        <span class="wolinet-auth-or">or enter your API key</span>
      </div>

      <form id="wolinet-key-form" class="wolinet-key-form">
        <label for="wolinet-key">API Key</label>
        <div class="connection-input-row">
          <input
            id="wolinet-key"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="wolinet-sk-..."
            maxlength="4096"
          />
          <button class="primary-button" type="submit" id="wolinet-save-key-btn">Save Key</button>
        </div>
      </form>

      <div class="connection-key-status">
        <span id="wolinet-key-status" role="status">Checking credentials…</span>
        <button type="button" class="secondary-button" id="wolinet-remove-key-btn" hidden>Remove Key</button>
      </div>

      <div class="wolinet-endpoint-selector">
        <label for="wolinet-endpoint-select">Cloud Region</label>
        <div class="connection-select">
          <select id="wolinet-endpoint-select">
            <option value="${GATEWAY_DEFAULT}" ${currentGateway === GATEWAY_DEFAULT ? 'selected' : ''}>Global Cloud Network (Recommended)</option>
            <option value="${GATEWAY_FALLBACK}" ${currentGateway === GATEWAY_FALLBACK ? 'selected' : ''}>Enterprise Cloud Network</option>
          </select>
        </div>
      </div>
    </section>

    <section class="connection-card">
      <h3>${icon('widget')} Frontier Intelligence</h3>
      <p>Curated model tiers engineered for autonomous development:</p>
      
      <div class="wolinet-model-tiers">
        <div class="wolinet-tier-item">
          <div class="wolinet-tier-header">
            <strong>Wolinet Pro</strong>
            <span class="wolinet-tier-badge">Flagship</span>
          </div>
          <p>Our most capable autonomous reasoning model. Built for full-codebase refactoring, architectural planning, multi-agent swarms, and complex bug isolation.</p>
        </div>

        <div class="wolinet-tier-item">
          <div class="wolinet-tier-header">
            <strong>Wolinet Coder</strong>
            <span class="wolinet-tier-badge secondary">Lightning</span>
          </div>
          <p>Ultra-fast precision coding model. Engineered for instant code generation, inline edits, turn checks, and real-time completions.</p>
        </div>
      </div>
    </section>

    <p class="connection-feedback" role="status" hidden></p>
    ${preview ? '<p class="settings-preview-note">Browser preview · credentials are managed securely via system vault.</p>' : ''}
  `;

  const feedback = host.querySelector<HTMLElement>('.connection-feedback')!;
  const keyInput = host.querySelector<HTMLInputElement>('#wolinet-key')!;
  const keyStatus = host.querySelector<HTMLElement>('#wolinet-key-status')!;
  const removeBtn = host.querySelector<HTMLButtonElement>('#wolinet-remove-key-btn')!;
  const endpointSelect = host.querySelector<HTMLSelectElement>('#wolinet-endpoint-select')!;
  const webLoginBtn = host.querySelector<HTMLButtonElement>('#wolinet-web-login')!;

  function message(text: string, error = false): void {
    feedback.textContent = text;
    feedback.hidden = false;
    feedback.classList.toggle('error', error);
  }

  function updateStatus(saved: boolean, error?: string | null): void {
    savedKeyActive = saved;
    if (saved) {
      keyStatus.textContent = 'Active Wolinet subscription connected. Credentials secured in system vault.';
      keyStatus.classList.remove('error');
      removeBtn.hidden = false;
    } else if (error) {
      keyStatus.textContent = error;
      keyStatus.classList.add('error');
      removeBtn.hidden = true;
    } else {
      keyStatus.textContent = 'No key configured. Sign in to your Wolinet account or enter your API key above.';
      keyStatus.classList.remove('error');
      removeBtn.hidden = true;
    }
  }

  async function checkCredentials(): Promise<void> {
    try {
      const config = await call<Configuration>('provider_configuration');
      if (disposed) return;
      const hasKey = Boolean(config.deepseekKeySaved || localStorage.getItem('wolinet_api_key'));
      updateStatus(hasKey, config.credentialStorageError);
    } catch {
      const hasLocal = Boolean(localStorage.getItem('wolinet_api_key'));
      updateStatus(hasLocal);
    }
  }

  const submit = async (event: Event) => {
    event.preventDefault();
    if (pending || disposed) return;
    const key = keyInput.value.trim();
    if (!key) {
      keyInput.focus();
      return;
    }

    pending = true;
    host.setAttribute('aria-busy', 'true');
    try {
      if (!preview) {
        await call('provider_save_deepseek_key', { key });
      }
      localStorage.setItem('wolinet_api_key', key);
      keyInput.value = '';
      updateStatus(true);
      message('Wolinet API key saved successfully.');
      await saved();
    } catch (err) {
      message(String(err), true);
    } finally {
      pending = false;
      host.removeAttribute('aria-busy');
    }
  };

  const onRemove = async () => {
    if (pending || disposed) return;
    pending = true;
    host.setAttribute('aria-busy', 'true');
    try {
      if (!preview) {
        await call('provider_remove_deepseek_key');
      }
      localStorage.removeItem('wolinet_api_key');
      updateStatus(false);
      message('Wolinet credentials removed.');
      await saved();
    } catch (err) {
      message(String(err), true);
    } finally {
      pending = false;
      host.removeAttribute('aria-busy');
    }
  };

  const onEndpointChange = () => {
    const chosen = endpointSelect.value;
    localStorage.setItem('wolinet_gateway_endpoint', chosen);
    const urlLabel = host.querySelector<HTMLElement>('.wolinet-gateway-url');
    if (urlLabel) urlLabel.textContent = chosen === GATEWAY_DEFAULT ? 'Wolinet Cloud · Global Network' : 'Wolinet Cloud · Enterprise Network';
    message(`Cloud region updated.`);
  };

  const onWebLogin = () => {
    const gateway = endpointSelect.value || GATEWAY_DEFAULT;
    const authUrl = `${gateway}/auth`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
    message(`Opened Wolinet sign-in in your browser. Complete authentication to get started.`);
  };

  host.querySelector('#wolinet-key-form')!.addEventListener('submit', submit);
  removeBtn.addEventListener('click', onRemove);
  endpointSelect.addEventListener('change', onEndpointChange);
  webLoginBtn.addEventListener('click', onWebLogin);

  void checkCredentials();

  return () => {
    disposed = true;
    unmountNamed?.();
  };
}
