# Wolinet AI Provider Integration

WolinetIDE is powered natively by **Wolinet AI** via the unified LiteLLM gateway hosted at `https://lango.wolinet.com` (and `https://ai.wolinet.com`).

Instead of requiring developers to install 15 separate command-line harnesses (Claude Code, Grok Build, GLM, MiMo, Pi, DeepSeek, OpenCode, Cline, etc.) and juggle separate subscription accounts, all model requests, reasoning tasks, and tool interactions route securely through Wolinet AI.

---

## Architecture Overview

```
   ┌────────────────────────────────────────────────────────┐
   │             WolinetIDE Desktop Application             │
   │      (User authenticated via Wolinet AI Account)       │
   └───────────────────────────┬────────────────────────────┘
                               │
                               │ HTTPS / SSE (OpenAI & Anthropic Compatible)
                               │ Header: Authorization: Bearer <wolinet_token>
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │         lango.wolinet.com / ai.wolinet.com             │
   │               (Wolinet AI LiteLLM Gateway)             │
   │  • User authentication, balance & credit metering      │
   │  • Rate limiting & security                            │
   │  • Smart routing, model fallbacks, & latency balancing │
   └───────┬──────────────┬──────────────┬──────────────┬───┘
           │              │              │              │
           ▼              ▼              ▼              ▼
     Claude 3.7      DeepSeek V3/R1    Gemini 2.0    Kimi / Qwen
      (Sonnet)          (DeepSeek)       (Google)     (Moonshot)
```

---

## Curated Model Tiers

WolinetIDE offers two focused models in the composer:

### 1. Wolinet Pro (`wolinet-pro`) — Default
* **Workload**: Autonomous agent swarms, architect workers, multi-file code refactoring, complex bug analysis, and project-wide reasoning.
* **Routing Strategy**: LiteLLM routes `wolinet-pro` primarily to **Claude 3.7 Sonnet**, with automatic failover to **DeepSeek R1** or **GPT-4o**.
* **Capabilities**: Full access to tool execution (file editing, shell execution, diff verification, git branches).

### 2. Wolinet Coder (`wolinet-coder`)
* **Workload**: Instant inline completions, single-file edits, quick bug repairs, turn checks, and syntax transformations.
* **Routing Strategy**: LiteLLM routes `wolinet-coder` to high-throughput, low-latency models such as **DeepSeek V3**, **Gemini 2.0 Flash**, and **Qwen 2.5 Coder**.
* **Capabilities**: Fast turnaround with minimal latency.

---

## Authentication & Credentials

Authentication is managed via the **Wolinet AI Account** card in Settings:

1. **One-Click Web Social Login**:
   * Users click **"Sign in with Wolinet AI"** to open `https://lango.wolinet.com/auth`.
   * Login with Google, GitHub, or Email.
   * On authorization, a session token is securely passed back to the app.
2. **Direct API Key**:
   * Users enter their Wolinet API key (`wolinet-sk-...`).
   * The key is verified live against `https://lango.wolinet.com/v1/key/info`.
3. **Secure Storage**:
   * Stored natively in the OS Keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).
   * Plaintext keys are never logged or stored in unencrypted configuration files.

---

## Legacy Provider Retirement

In previous upstream versions, 15 individual CLI provider cards were displayed in Settings. Under WolinetIDE v1.0:
* Individual provider cards (Claude Code, GLM, MiMo, OpenCode, Antigravity, Grok Build, Pi, Oh My Pi, DeepSeek, Command Code, Cline, GitHub Copilot CLI, Muse Code) have been retired from the primary UI.
* All agent execution runs through the unified Wolinet AI gateway.
