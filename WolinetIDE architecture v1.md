# WolinetIDE Architecture v1.0
**The Unified Autonomous Agentic IDE Powered by Wolinet AI**

*Document Version:* 1.0.0  
*Organization:* Wolinet Tech  
*Gateway Endpoint:* `https://lango.wolinet.com` / `https://ai.wolinet.com`  
*Target Platforms:* macOS (Apple Silicon & Intel), Windows (x64 & ARM64), Linux (x64 & ARM64)

---

## 1. Executive Summary & Vision

WolinetIDE is an enterprise-grade, high-performance, autonomous agentic developer environment built by **Wolinet Tech**. 

Rather than attempting to build an IDE from scratch—which requires maintaining language servers, syntax parsers, and custom editors—Wolinet Tech is adapting and hardening this high-performance native desktop foundation (Tauri + Rust + Vite) and transforming it into a cohesive product centered around **Wolinet AI**.

### Core Pillars
1. **Zero Configuration Frustration**: Eliminate the fragmented multi-provider setup where developers must juggle 15 different CLI tools (Claude Code, Grok, GLM, MiMo, Pi, DeepSeek, OpenCode, Cline, etc.) and individual API keys.
2. **Unified Intelligence Gateway**: All model requests, reasoning tasks, and tool interactions route securely through **LiteLLM** hosted at `lango.wolinet.com` / `ai.wolinet.com`.
3. **Curated Model Tiers**: Developers interact with two intuitive models: **Wolinet Pro** (reasoning, architecture, multi-file refactoring) and **Wolinet Coder** (fast inline coding, diff generation, syntax checks). LiteLLM intelligently routes and optimizes upstream requests behind the scenes.
4. **Clean, Modern Workspace Aesthetics**: A clutter-free, dark-slate UI inspired by Cursor and Antigravity, free of wallpaper covers and legacy experimental views.
5. **Complete Brand Ownership**: Full removal and replacement of all legacy upstream (PandaCode) naming, documentation, endpoints, and screens in favor of Wolinet Tech's design system.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph DesktopClient ["WolinetIDE Desktop Client (macOS / Windows / Linux)"]
        UI["Modern Webview (HTML5 / TypeScript / Vanilla CSS)"]
        Tauri["Tauri v2 Native Bridge (Rust)"]
        Keychain["OS Secure Keychain / Secret Store"]
        Agents["Agent Swarms & Architect Engine"]
        Sandbox["Local VM & Cloud Sandbox Runner"]
        
        UI <--> Tauri
        Tauri <--> Keychain
        Tauri <--> Agents
        Tauri <--> Sandbox
    end

    subgraph WolinetGateway ["Wolinet AI Gateway (lango.wolinet.com / ai.wolinet.com)"]
        Auth["LiteLLM Auth & Social Login (Google / GitHub)"]
        Quota["Token Metering & Credit Balance Engine"]
        Router["LiteLLM Intelligent Router & Fallback Matrix"]
        
        Auth --- Quota
        Quota --- Router
    end

    subgraph UpstreamLLMs ["Upstream Foundation Models (Managed by Wolinet Tech)"]
        Claude["Anthropic Claude 3.7 Sonnet"]
        DeepSeekR1["DeepSeek R1 (Reasoning)"]
        DeepSeekV3["DeepSeek V3 (Coding)"]
        GeminiFlash["Google Gemini 2.0 Flash"]
        KimiQwen["Moonshot Kimi / Qwen 2.5 Coder"]
    end

    Tauri -->|Encrypted HTTPS / SSE (OpenAI & Anthropic Compatible)| WolinetGateway
    Router -->|Internal Route| Claude
    Router -->|Internal Route| DeepSeekR1
    Router -->|Internal Route| DeepSeekV3
    Router -->|Internal Route| GeminiFlash
    Router -->|Internal Route| KimiQwen
```

---

## 3. The Unified Gateway: `lango.wolinet.com` / `ai.wolinet.com`

### 3.1 Why LiteLLM?
LiteLLM serves as the central proxy, load balancer, and security firewall for WolinetIDE:
* **Protocol Standard**: Exposes OpenAI-compatible `/v1/chat/completions` and `/v1/models`, as well as Anthropic-compatible `/v1/messages`.
* **Zero Client Redeployment**: When upstream providers release new model checkpoints (e.g. Claude 3.8, DeepSeek R2) or change pricing, Wolinet Tech updates the routing configuration on the server. Zero desktop app updates are required.
* **Resilience & High Availability**: Automated retry, latency-based fallback, and rate-limit mitigation across multi-region API backends.

### 3.2 Curated Model Tier Definitions

Developers in WolinetIDE will only see two models in the composer:

| Model ID | Display Name | Intended Workload | Upstream Routing Target |
| :--- | :--- | :--- | :--- |
| `wolinet-pro` | **Wolinet Pro** *(Default)* | Autonomous agent swarms, architecture planning, multi-file refactoring, complex bug analysis | Primary: **Claude 3.7 Sonnet**<br>Fallback: **DeepSeek R1** / **GPT-4o** |
| `wolinet-coder` | **Wolinet Coder** | High-speed inline completions, diff reviews, instant single-file fixes, turn checks | Primary: **DeepSeek V3**<br>Fallback: **Gemini 2.0 Flash** / **Qwen 2.5 Coder** |

### 3.3 Server Gateway Configuration (`config.yaml`)

```yaml
model_list:
  # -------------------------------------------------------------
  # Wolinet Pro: Deep reasoning, architectural planning, and agents
  # -------------------------------------------------------------
  - model_name: wolinet-pro
    litellm_params:
      model: anthropic/claude-3-7-sonnet-20250219
      api_key: os.environ/ANTHROPIC_API_KEY
      max_tokens: 16384
      temperature: 0.2
  - model_name: wolinet-pro
    litellm_params:
      model: deepseek/deepseek-reasoner
      api_key: os.environ/DEEPSEEK_API_KEY
      max_tokens: 16384

  # -------------------------------------------------------------
  # Wolinet Coder: High-speed edits, syntax fixes, and diff reviews
  # -------------------------------------------------------------
  - model_name: wolinet-coder
    litellm_params:
      model: deepseek/deepseek-chat
      api_key: os.environ/DEEPSEEK_API_KEY
      max_tokens: 8192
  - model_name: wolinet-coder
    litellm_params:
      model: gemini/gemini-2.0-flash
      api_key: os.environ/GEMINI_API_KEY
      max_tokens: 8192

router_settings:
  routing_strategy: latency-based-routing
  enable_pre_call_checks: true
  num_retries: 3
  timeout: 60
  allowed_fails: 2
  cooldown_time: 30

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL # PostgreSQL for virtual keys & quota
```

---

## 4. Authentication & User Journey

### 4.1 Login Pathways
WolinetIDE provides two friction-free ways to authenticate:
1. **One-Click Web Social Login (Google / GitHub)**:
   * User clicks **"Sign in with Wolinet AI"** in the app.
   * A secure browser window opens to `https://lango.wolinet.com/auth` (or `ai.wolinet.com`).
   * The user authenticates via Google OAuth, GitHub, or Email.
   * The browser redirects back to WolinetIDE via the custom URI scheme `wolinet://auth?token=<session_token>` or provides a 1-click **"Copy Key to WolinetIDE"** button.
2. **Direct API Key**:
   * Enterprise or automated users can directly paste a Wolinet API Key (`wolinet-sk-...`).
   * The key is validated in real-time against `https://lango.wolinet.com/v1/key/info`.

### 4.2 Credential Security
* Tokens are stored natively in the operating system's credential vault:
  * **macOS**: Apple Keychain Service (`kSecClassGenericPassword`)
  * **Windows**: Windows Credential Manager (`CredWriteW`)
  * **Linux**: FreeDesktop Secret Service via libsecret / DBus
* Tokens are never written to plaintext log files, config files, or local SQLite tables.

---

## 5. UI/UX Transformation: Purging Clutter

### 5.1 Removal of Legacy Provider Cards from `src/provider-settings.ts`
The existing UI displays 15 separate provider cards requiring external CLIs and keys. All of the following will be removed from the user interface:
* ❌ Claude Code
* ❌ GLM Coding Plan
* ❌ MiMo Token Plan
* ❌ OpenCode
* ❌ Google Antigravity
* ❌ Grok Build
* ❌ Pi & Oh My Pi
* ❌ DeepSeek Harness
* ❌ Command Code
* ❌ Cline
* ❌ GitHub Copilot CLI
* ❌ Muse Code

### 5.2 The New "Wolinet AI Account" Screen
In place of the legacy provider cards, Settings will display a single, focused **Wolinet AI Account** card:
* **Account Banner**: Shows user avatar, email (`user@domain.com`), and account tier (`Wolinet Pro` / `Team` / `Enterprise`).
* **Connection Health**: Real-time latency indicator to `lango.wolinet.com` (e.g. `● Connected (42ms)`).
* **Usage & Balance**: Current cycle credit consumption and remaining quota.
* **Authentication Controls**:
  * "Sign in with Wolinet AI" (OAuth button)
  * "Enter Wolinet Key" input form
  * "Disconnect / Switch Account"

---

## 6. Codebase De-PandaCode & Branding Purge

To complete the transformation to Wolinet Tech ownership, all references to upstream legacy identifiers will be purged:

| Component | Upstream / Legacy State | WolinetIDE Target State |
| :--- | :--- | :--- |
| **Product Name** | PandaCode | **WolinetIDE** |
| **Organization** | Open-source fork | **Wolinet Tech** (`wolinet.com`) |
| **AI Backend** | 15 local/remote CLIs | **Wolinet AI** (`lango.wolinet.com` / `ai.wolinet.com`) |
| **Repository** | PandaCode repos | `https://github.com/wolinet-renatus/WolinetIDE.git` |
| **Desktop Updater** | PandaCode release releases | `wolinet-renatus/WolinetIDE/releases/latest` |
| **Config Directory** | `~/.pandacode/` | `~/.wolinet/` |
| **Keychain Service** | `app.pandacode.cloud` | `com.wolinet.ide` |
| **URI Scheme** | `pandacode://` | `wolinet://` |
| **Default Appearance**| Wallpaper scene rotation | Clean Solid Dark (`#090d16`) with Wolinet Blue (`#0066f5`) |

---

## 7. Native Rust Backend Architecture

### 7.1 New Provider Module: `src-tauri/src/providers/wolinet.rs`
The backend Rust engine will include a dedicated Wolinet AI client:
* **Streaming Protocol**: Implements Server-Sent Events (SSE) streaming compatible with OpenAI and Anthropic format.
* **Tool Call Execution**: Maps Wolinet Pro agent actions (file edits, bash execution, directory listing, git commands) directly to the Rust `ToolHost`.
* **Token Tracking**: Captures prompt and completion token counts from the response stream to update the local usage ledger.

### 7.2 Storage Schema Updates
* Store the active Wolinet account metadata in SQLite (`sessions.db`):
  * `wolinet_user_email`: TEXT
  * `wolinet_plan_tier`: TEXT
  * `wolinet_cached_balance`: REAL
* Ensure graceful migrations without disrupting user task history.

---

## 8. Implementation Roadmap

### Phase 1: Architecture & Documentation (Current)
- [x] Publish `WolinetIDE Architecture v1.0` specification.
- [x] Align model tier definitions (`wolinet-pro`, `wolinet-coder`) and gateway routing targets.

### Phase 2: Frontend Clean-Up & Provider Consolidation
- [ ] Refactor `src/provider-settings.ts` to remove the 15 legacy provider cards.
- [ ] Implement the new **Wolinet AI Account** card with social login and key management.
- [ ] Configure `src/main.ts` and `src/model-picker.ts` so that new sessions default to `Wolinet Pro` and `Wolinet Coder`.

### Phase 3: Rust Native Wolinet Provider Implementation
- [ ] Create `src-tauri/src/providers/wolinet.rs` with OpenAI/SSE streaming to `lango.wolinet.com`.
- [ ] Integrate Wolinet AI credentials into `src-tauri/src/provider_settings.rs` and the OS Keychain.
- [ ] Register `wolinet` in `PROVIDERS` and wire model discovery to LiteLLM `/v1/models`.

### Phase 4: Systematic PandaCode Brand Purge
- [ ] Search and replace remaining `PandaCode` strings in `src/`, `src-tauri/`, and docs.
- [ ] Update URI schemes, config directory paths, and updater endpoints.
- [ ] Clean up unwanted legacy screens and ensure solid dark mode remains default.

### Phase 5: Verification & Multi-Platform Release
- [ ] Run full test suites (`npm test`, `npm run test:release`, `npx tsc --noEmit`).
- [ ] Verify build pipelines for macOS (`x64`, `arm64`), Windows (`x64`, `arm64`), and Linux (`x64`, `arm64`).
- [ ] Tag and push production releases to GitHub.
