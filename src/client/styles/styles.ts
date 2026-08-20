export const styles = String.raw`
.agentduel-root,
.agentduel-root *,
.agentduel-page,
.agentduel-page * {
  box-sizing: border-box;
}

.agentduel-root {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 0;
  color: var(--dsw-alias-label-primary, #171717);
  font-family: inherit;
}

.agentduel-root--expanded {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(0 0 0 / 8%);
}

.agentduel-root--expanded .agentduel-trigger {
  width: 100%;
  margin: 4px 0;
}

.agentduel-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(520px, 62vh);
  overflow: auto;
  padding: 4px 0 6px;
}

.agentduel-trigger,
.agentduel-item,
.agentduel-primary-button,
.agentduel-secondary-button,
.agentduel-danger-button,
.agentduel-reset-button,
.agentduel-get-key-button {
  appearance: none;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.agentduel-trigger {
  display: flex;
  flex: none;
  align-items: center;
  gap: 8px;
  width: calc(100% + 4px);
  height: 42px;
  margin: 4px -2px;
  padding: 0 10px 0 8px;
  border-radius: 0;
  background: transparent;
  text-align: left;
}

.agentduel-trigger:hover,
.agentduel-item:hover {
  background: var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%));
}

.agentduel-root:not(.agentduel-root--expanded):not(.agentduel-root--rail) .agentduel-trigger {
  padding: 0 9px 0 7px;
  border: 1px solid transparent;
}

.agentduel-root:not(.agentduel-root--expanded):not(.agentduel-root--rail) .agentduel-trigger:hover {
  border-color: #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 14px rgb(0 0 0 / 8%);
}

.agentduel-item[aria-current='page'],
.agentduel-root--rail .agentduel-trigger[aria-current='page'] {
  background: var(--dsw-alias-interactive-bg-hover, var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%)));
}

.agentduel-logo {
  display: block;
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  transform: scale(1.125);
  transform-origin: center;
}

.agentduel-trigger-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.agentduel-trigger-indicator {
  display: block;
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-secondary, #737373);
  fill: currentColor;
}

.agentduel-section {
  margin: 6px 8px 2px;
  color: var(--dsw-alias-label-secondary, #757575);
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
}

.agentduel-section:first-child {
  margin-top: 0;
}

.agentduel-item {
  width: 100%;
  min-height: 32px;
  padding: 6px 10px 6px 22px;
  border-radius: 0;
  background: transparent;
  text-align: left;
  font-size: 13px;
}

.agentduel-separator {
  height: 1px;
  margin: 5px 8px;
  background: var(--dsw-alias-border-l1, #e5e5e5);
}

.agentduel-root--rail {
  align-items: center;
}

.agentduel-root--rail .agentduel-trigger {
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 8px 0 10px;
  padding: 0;
  border-radius: 50%;
}

.agentduel-conversation-battle-button,
a.agentduel-conversation-battle-button:link,
a.agentduel-conversation-battle-button:visited {
  box-sizing: border-box;
  appearance: none;
  display: inline-flex;
  min-height: 42px;
  padding: 0 16px;
  align-items: center;
  justify-content: center;
  border: 1px solid #7a4b22;
  border-radius: 8px;
  background: #7a4b22;
  color: #fff !important;
  -webkit-text-fill-color: #fff;
  font: 700 14px/20px var(--duel-font-body, "Avenir Next", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif);
  letter-spacing: normal;
  text-shadow: none;
  text-decoration: none;
  cursor: pointer;
  overflow: hidden;
  transition: background 140ms ease-out, border-color 140ms ease-out, color 140ms ease-out, transform 120ms ease;
}

.agentduel-conversation-battle-button:hover,
a.agentduel-conversation-battle-button:hover,
a.agentduel-conversation-battle-button:visited:hover {
  background: #69401d;
  border-color: #7a4b22;
  color: #fff !important;
  -webkit-text-fill-color: #fff;
  text-decoration: none;
}

.agentduel-conversation-battle-button:active {
  transform: translateY(1px);
}

.agentduel-conversation-battle-button:focus-visible {
  outline: 2px solid #b07600;
  outline-offset: 3px;
}

.agentduel-conversation-battle-fallback {
  position: absolute;
  right: 32px;
  bottom: 132px;
}

.agentduel-page {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: auto;
  background: #f7f9fc;
  color: var(--dsw-alias-label-primary, #171717);
}

.agentduel-trigger:focus-visible,
.agentduel-item:focus-visible,
.agentduel-page button:focus-visible,
.agentduel-page input:focus-visible,
.agentduel-page textarea:focus-visible,
.agentduel-page select:focus-visible,
.agentduel-page a:focus-visible {
  outline: 2px solid #2563ff;
  outline-offset: 2px;
}

.agentduel-module-host {
  width: 100%;
  min-width: 0;
  min-height: 100%;
}

.agentduel-module-host > * {
  width: min(100%, 1180px);
  min-width: 0;
  margin-inline: auto;
  padding-block: 32px;
}

.agentduel-module-host > .agentduel-battles-new,
.agentduel-module-host > .agentduel-replay-player {
  min-height: 100%;
}

.agentduel-module-host > .agentduel-replay-player {
  width: min(100%, 1280px);
  container: agentduel-replay / inline-size;
}

/* 回放页单独放宽，并让地图和日志在桌面宽度下始终完整显示。 */
.agentduel-module-host > .agentduel-replay-player .battle-stage {
  width: 100%;
  padding-inline: 16px;
}

.agentduel-module-host > .agentduel-replay-player .battle-replay-content-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, var(--replay-map-target-width)) minmax(320px, 1fr);
  align-items: stretch;
  gap: 16px;
}

.agentduel-module-host > .agentduel-replay-player .battle-replay-main-row,
.agentduel-module-host > .agentduel-replay-player .battle-replay-log-column {
  width: 100%;
  min-width: 0;
}

.agentduel-module-host > .agentduel-replay-player .battle-replay-log-column,
.agentduel-module-host > .agentduel-replay-player .battle-replay-log-column:not(.is-open) {
  display: flex;
  height: auto;
}

.agentduel-module-host > .agentduel-replay-player .battle-replay-log-toggle {
  display: none;
}

.agentduel-module-host > .agentduel-replay-player .agentduel-spectate-next-button {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid #7a4b22;
  border-radius: 6px;
  background: #7a4b22;
  color: #fff;
  font: 700 14px/20px var(--duel-font-body, inherit);
  cursor: pointer;
}

.agentduel-module-host > .agentduel-replay-player .agentduel-spectate-next-button:hover:not(:disabled),
.agentduel-module-host > .agentduel-replay-player .agentduel-spectate-next-button:focus-visible {
  border-color: #69401d;
  background: #69401d;
}

.agentduel-module-host > .agentduel-replay-player .agentduel-spectate-next-button:disabled {
  cursor: not-allowed;
  opacity: .55;
}

.agentduel-module-host > .agentduel-replay-player .replay-participant-tools > .agentduel-character-agent-optimization {
  width: 100%;
}

@container agentduel-replay (max-width: 1174px) {
  .agentduel-module-host > .agentduel-replay-player .battle-replay-content-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .agentduel-module-host > .agentduel-replay-player .battle-replay-log-column {
    height: 600px;
  }
}

@container agentduel-replay (max-width: 860px) {
  .agentduel-replay-player .app-shell {
    --replay-map-target-width: calc(100cqi - 32px);
    --replay-map-target-height: calc((100cqi - 32px) * .61111);
  }

  .agentduel-replay-player .battle-stage {
    padding: 16px;
  }
}

@container agentduel-replay (max-width: 820px) {
  .agentduel-module-host > .agentduel-replay-player .replay-participant-tools .agentduel-character-agent-form {
    grid-template-columns: minmax(0, 600px);
  }

  .agentduel-module-host > .agentduel-replay-player .replay-participant-tools .agentduel-character-agent-controls {
    width: 100%;
    max-width: 600px;
  }
}

@container agentduel-replay (max-width: 620px) {
  .agentduel-module-host > .agentduel-replay-player .replay-participant-tools .agentduel-character-workspace-card {
    grid-template-columns: 1fr;
  }

  .agentduel-module-host > .agentduel-replay-player .replay-participant-tools .agentduel-character-workspace-button {
    width: 100%;
  }
}

.agentduel-module-host .agentduel-battles-new .battle-start-shell {
  padding-block: 0;
}

.agentduel-mode-list-shell,
.agentduel-recent-battles-shell {
  min-height: 100%;
}

.agentduel-module-state {
  display: grid;
  width: 100%;
  min-height: 100%;
  padding: 32px 24px;
  place-items: center;
}

.agentduel-module-state > div {
  width: min(100%, 460px);
  padding: 28px;
  border: 1px solid #d8dee8;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  box-shadow: 0 18px 60px rgb(15 23 42 / 8%);
}

.agentduel-module-state h1,
.agentduel-module-state p {
  margin: 0;
}

.agentduel-module-state p {
  margin-top: 10px;
  color: #5b6472;
  line-height: 1.6;
}

.agentduel-module-state button {
  margin-top: 20px;
}

.agentduel-module-kicker {
  color: #2563ff !important;
  font: 700 12px/18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.agentduel-module-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.agentduel-module-actions button,
.agentduel-module-state > div > button {
  min-height: 40px;
  padding: 8px 15px;
  border: 1px solid #b8c2d2;
  border-radius: 8px;
  background: #fff;
  color: #2563ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.agentduel-module-actions button:hover,
.agentduel-module-state > div > button:hover {
  background: #eef3fa;
}

.agentduel-eyebrow {
  margin: 0 0 8px;
  color: var(--dsw-alias-label-secondary, #757575);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.agentduel-key-form {
  display: flex;
  flex-direction: column;
  width: min(100%, 520px);
}

.agentduel-field-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}

.agentduel-key-input {
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid var(--dsw-alias-border-l2, #d4d4d4);
  border-radius: 10px;
  outline: none;
  background: var(--dsw-alias-bg-base, #fff);
  color: var(--dsw-alias-label-primary, #171717);
  font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.agentduel-key-input:focus {
  border-color: var(--dsw-alias-button-primary-bg, #2563eb);
  box-shadow: 0 0 0 3px rgb(37 99 235 / 14%);
}

.agentduel-key-input[aria-invalid='true'] {
  border-color: var(--dsw-alias-label-error, #dc2626);
}

.agentduel-key-input:disabled {
  cursor: wait;
  background: var(--dsw-alias-bg-hover, #f2f2f2);
  color: var(--dsw-alias-label-secondary, #757575);
}

.agentduel-field-hint {
  margin: 8px 0 0;
  color: var(--dsw-alias-label-secondary, #757575);
  font-size: 12px;
  line-height: 1.5;
}

.agentduel-turnstile {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 110;
}

.agentduel-turnstile:empty {
  display: none;
}

.agentduel-status {
  min-height: 22px;
  margin: 10px 0 4px;
}

.agentduel-error {
  margin: 0;
  color: var(--dsw-alias-label-error, #c02626);
  font-size: 13px;
  line-height: 1.55;
}

.agentduel-primary-button,
.agentduel-secondary-button,
.agentduel-danger-button,
.agentduel-reset-button,
.agentduel-get-key-button {
  min-height: 40px;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  transition: opacity 120ms ease, background 120ms ease, transform 120ms ease;
}

.agentduel-primary-button {
  background: var(--dsw-alias-button-primary-bg, #2563eb);
  color: var(--dsw-alias-button-primary-label, #fff);
}

.agentduel-primary-button:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-bg-hover, #1d4ed8);
}

.agentduel-primary-button:disabled {
  cursor: default;
  opacity: .5;
}

.agentduel-or {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0;
  color: var(--dsw-alias-label-secondary, #757575);
  font-size: 12px;
  text-align: center;
}

.agentduel-or span {
  flex: 1;
  height: 1px;
  background: var(--dsw-alias-border-l1, #e5e5e5);
}

.agentduel-get-key-button {
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2, #d4d4d4);
  background: var(--dsw-alias-bg-base, #fff);
  animation: agentduel-get-key-flash 2s steps(1, end) infinite;
}

@keyframes agentduel-get-key-flash {
  0% {
    background: #fff;
  }

  50% {
    background: #fff4c2;
  }
}

.agentduel-get-key-button:hover,
.agentduel-secondary-button:hover {
  background: var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%));
}

.agentduel-primary-button:active:not(:disabled),
.agentduel-secondary-button:active,
.agentduel-danger-button:active,
.agentduel-reset-button:active,
.agentduel-get-key-button:active {
  transform: translateY(1px);
}

.agentduel-verified {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px;
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 14px;
  background: var(--dsw-alias-bg-hover, #f7f7f7);
}

.agentduel-verified-mark {
  display: inline-flex;
  min-height: 26px;
  padding: 3px 9px;
  align-items: center;
  border-radius: 999px;
  background: rgb(22 163 74 / 12%);
  color: #15803d;
  font-size: 12px;
  font-weight: 700;
}

.agentduel-verified-label {
  margin: 16px 0 7px;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 12px;
  font-weight: 600;
}

.agentduel-masked-key {
  max-width: 100%;
  overflow-wrap: anywhere;
  font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.agentduel-reset-button {
  margin-top: 22px;
  padding-inline: 0;
  background: transparent;
  color: var(--dsw-alias-label-error, #b42318);
}

.agentduel-reset-button:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.agentduel-dialog-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  padding: 24px;
  place-items: center;
  background: rgb(0 0 0 / 36%);
  backdrop-filter: blur(4px);
}

.agentduel-dialog {
  width: min(100%, 420px);
  padding: 24px;
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 16px;
  background: var(--dsw-alias-bg-base, #fff);
  box-shadow: 0 24px 80px rgb(0 0 0 / 20%);
}

.agentduel-dialog h2 {
  margin: 0;
  font-size: 19px;
}

.agentduel-dialog p {
  margin: 10px 0 18px;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 14px;
  line-height: 1.6;
}

.agentduel-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.agentduel-settings-page {
  width: 100%;
  min-height: 100%;
  padding: clamp(24px, 4vw, 48px) 20px;
}

.agentduel-settings-card {
  width: min(100%, 780px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 20px;
  background: var(--dsw-alias-bg-base, #fff);
  box-shadow: 0 18px 60px rgb(0 0 0 / 8%);
}

.agentduel-settings-header {
  padding: clamp(28px, 5vw, 44px);
  border-bottom: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
}

.agentduel-settings-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.agentduel-settings-logo {
  display: grid;
  flex: 0 0 54px;
  width: 54px;
  height: 54px;
  place-items: center;
}

.agentduel-settings-logo .agentduel-logo {
  width: 54px;
  height: 54px;
  transform: none;
}

.agentduel-settings-brand h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 650;
  letter-spacing: -.035em;
  line-height: 1.15;
}

.agentduel-settings-meta {
  display: grid;
  gap: 12px;
  margin: 28px 0 0;
}

.agentduel-settings-meta > div {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 12px;
  align-items: baseline;
}

.agentduel-settings-meta dt,
.agentduel-settings-meta dd {
  margin: 0;
}

.agentduel-settings-meta dt {
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 13px;
  font-weight: 600;
}

.agentduel-settings-meta dd {
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.agentduel-settings-meta a,
.agentduel-settings-faq a {
  color: var(--dsw-alias-button-primary-bg, #2563eb);
  text-underline-offset: 3px;
}

.agentduel-settings-meta code {
  font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.agentduel-settings-key,
.agentduel-settings-faq {
  padding: clamp(28px, 5vw, 44px);
}

.agentduel-settings-key {
  border-bottom: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
}

.agentduel-settings-section-header {
  margin-bottom: 24px;
}

.agentduel-settings-key--empty > .agentduel-settings-section-header,
.agentduel-settings-key--empty > .agentduel-key-form {
  width: min(100%, 520px);
  margin-inline: auto;
}

.agentduel-settings-section-header h2,
.agentduel-settings-section-header p {
  margin: 0;
}

.agentduel-settings-section-header h2,
.agentduel-settings-faq h2 {
  font-size: 20px;
  line-height: 1.3;
}

.agentduel-settings-section-header p {
  margin-top: 8px;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 14px;
  line-height: 1.65;
}

.agentduel-settings-faq h2 {
  margin: 0 0 24px;
}

.agentduel-settings-faq > dl {
  display: grid;
  gap: 0;
  margin: 0;
}

.agentduel-settings-faq-item {
  padding: 20px 0;
  border-top: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
}

.agentduel-settings-faq-item:first-child {
  padding-top: 0;
  border-top: 0;
}

.agentduel-settings-faq-item:last-child {
  padding-bottom: 0;
}

.agentduel-settings-faq-item dt {
  font-size: 15px;
  font-weight: 650;
  line-height: 1.5;
}

.agentduel-settings-faq-item dd {
  margin: 8px 0 0;
  color: var(--dsw-alias-label-secondary, #5f6368);
  font-size: 14px;
  line-height: 1.75;
}

.agentduel-secondary-button {
  border: 1px solid var(--dsw-alias-border-l2, #d4d4d4);
  background: transparent;
}

.agentduel-danger-button {
  background: #b42318;
  color: #fff;
}

.agentduel-danger-button:hover {
  background: #912018;
}

.agentduel-owner-detail-shell {
  display: grid;
  align-content: start;
  gap: 28px;
  min-height: 100%;
  padding: 32px clamp(22px, 5vw, 58px);
}

.agentduel-detail-breadcrumb {
  min-width: 0;
}

.agentduel-character-workspace-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 20px;
  border: 1px solid var(--duel-line-strong, #b8c2d2);
  border-radius: 10px;
  background: color-mix(in srgb, var(--duel-surface, #fff) 82%, var(--duel-blue-soft, #e6eeff));
}

.agentduel-character-workspace-card h3,
.agentduel-character-workspace-card p {
  margin: 0;
}

.agentduel-character-workspace-card h3 {
  color: var(--duel-ink, #111827);
  font-size: 16px;
  line-height: 24px;
}

.agentduel-character-workspace-card p {
  margin-top: 5px;
  color: var(--duel-muted, #5b6472);
  font-size: 13px;
  line-height: 20px;
}

.agentduel-character-workspace-card > .character-detail-error {
  grid-column: 1 / -1;
  margin-top: -6px;
}

.agentduel-character-workspace-button {
  min-width: 120px;
  white-space: nowrap;
}

.agentduel-character-agent-form {
  display: grid;
  grid-template-columns: minmax(0, 500px) minmax(220px, 360px);
  gap: 10px 24px;
  align-items: start;
  justify-content: start;
  padding: 14px 0;
  border-top: 1px solid var(--duel-line-strong, #b8c2d2);
  border-bottom: 1px solid var(--duel-line, #d8dee8);
}

.agentduel-character-agent-prompt-field {
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 500px;
  min-width: 0;
}

.agentduel-character-agent-instructions {
  color: var(--duel-muted, #5b6472);
  font-size: 12px;
  line-height: 18px;
}

.agentduel-character-agent-label,
.agentduel-character-agent-model-field label {
  color: var(--duel-muted, #5b6472);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
}

.agentduel-character-agent-prompt {
  box-sizing: border-box;
  width: 100%;
  max-width: 500px;
  min-height: 120px;
  max-height: 200px;
  padding: 12px;
  resize: vertical;
  overflow: auto;
  border: 1px solid var(--duel-line-strong, #b8c2d2);
  border-radius: 8px;
  outline: none;
  background: color-mix(in srgb, var(--duel-surface, #fff) 76%, transparent);
  color: var(--duel-ink, #111827);
  font: 600 13px/20px var(--duel-font-code, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.agentduel-character-agent-prompt:focus,
.agentduel-character-agent-model-field select:focus {
  border-color: var(--duel-blue, #2563ff);
  box-shadow: 0 0 0 3px rgb(37 99 255 / 12%);
}

.agentduel-character-agent-prompt:disabled,
.agentduel-character-agent-model-field select:disabled {
  cursor: default;
  opacity: .62;
}

.agentduel-character-agent-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
  max-width: 260px;
}

.agentduel-character-agent-model-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  min-width: 0;
}

.agentduel-character-agent-model-field select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 7px 34px 7px 11px;
  border: 1px solid var(--duel-line-strong, #b8c2d2);
  border-radius: 8px;
  outline: none;
  background: var(--duel-surface, #fff);
  color: var(--duel-ink, #111827);
  font: 600 13px/20px var(--duel-font-body, inherit);
}

.agentduel-character-agent-submit {
  width: 100%;
  min-width: 148px;
  white-space: nowrap;
}

.agentduel-character-agent-form > .agentduel-agent-model-failures,
.agentduel-character-agent-status {
  grid-column: 1 / -1;
}

.agentduel-character-agent-status p {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
}

.agentduel-character-agent-status:empty {
  display: none;
}

.agentduel-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 1px 0 4px;
}

.agentduel-conversation-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  width: 100%;
  min-height: 44px;
  border-radius: 0;
  background: transparent;
  overflow: hidden;
}

.agentduel-conversation-open,
.agentduel-conversation-delete {
  appearance: none;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.agentduel-conversation-open {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 7px 6px 7px 22px;
  text-align: left;
}

.agentduel-conversation-row:hover,
.agentduel-conversation-row.is-current {
  background: var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%));
}

.agentduel-conversation-delete {
  align-self: stretch;
  padding: 0 10px;
  color: var(--dsw-alias-label-secondary, #737373);
  font-size: 10px;
  line-height: 16px;
  white-space: nowrap;
}

.agentduel-conversation-delete:hover,
.agentduel-conversation-delete:focus-visible {
  color: #b42318;
  background: rgb(180 35 24 / 8%);
}

.agentduel-conversation-open:focus-visible,
.agentduel-conversation-delete:focus-visible {
  outline: 2px solid var(--dsw-alias-focus-ring, #2563eb);
  outline-offset: -2px;
}

.agentduel-conversation-row-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.agentduel-conversation-row-main strong,
.agentduel-conversation-row-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agentduel-conversation-row-main strong {
  font-size: 12px;
  font-weight: 600;
  line-height: 17px;
}

.agentduel-conversation-row-main small {
  color: var(--dsw-alias-label-secondary, #737373);
  font-size: 10px;
  line-height: 15px;
}

.agentduel-conversation-status {
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 4px;
  color: var(--dsw-alias-label-secondary, #737373);
  font-size: 10px;
  line-height: 16px;
  white-space: nowrap;
}

.agentduel-conversation-status i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a3a3a3;
}

.agentduel-conversation-status.is-running {
  color: #1d4ed8;
}

.agentduel-conversation-status.is-running i {
  background: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 12%);
}

.agentduel-conversation-status.is-waiting {
  color: #a16207;
}

.agentduel-conversation-status.is-waiting i {
  background: #eab308;
}

.agentduel-conversation-status.is-complete {
  color: #15803d;
}

.agentduel-conversation-status.is-complete i {
  background: #22c55e;
}

.agentduel-conversation-status.is-missing {
  opacity: .65;
}

.agentduel-agent-card {
  box-sizing: border-box;
  width: min(100%, 760px);
  margin: auto;
  padding: clamp(26px, 4vw, 42px);
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 20px;
  background: var(--dsw-alias-bg-base, #fff);
  box-shadow: 0 20px 70px rgb(15 23 42 / 8%);
}

.agentduel-agent-header h1 {
  margin: 4px 0 10px;
  font-size: clamp(26px, 4vw, 38px);
  letter-spacing: -.035em;
  line-height: 1.12;
}

.agentduel-agent-header > p:last-child {
  max-width: 620px;
  margin: 0;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 14px;
  line-height: 1.7;
}

.agentduel-agent-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 28px;
}

.agentduel-agent-task-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 22px;
  padding: 4px;
  border-radius: 12px;
  background: var(--dsw-alias-bg-hover, #f4f4f5);
}

.agentduel-agent-task-tabs button {
  appearance: none;
  min-height: 38px;
  padding: 7px 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.agentduel-agent-task-tabs button[aria-pressed='true'] {
  border-color: var(--dsw-alias-border-l1, #e5e5e5);
  background: var(--dsw-alias-bg-base, #fff);
  box-shadow: 0 1px 3px rgb(15 23 42 / 7%);
  font-weight: 650;
}

.agentduel-agent-select,
.agentduel-agent-prompt {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--dsw-alias-border-l2, #d4d4d4);
  border-radius: 10px;
  outline: none;
  background: var(--dsw-alias-bg-base, #fff);
  color: inherit;
  font: inherit;
  font-size: 14px;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.agentduel-agent-select {
  min-height: 42px;
  margin: 7px 0 18px;
  padding: 8px 34px 8px 11px;
}

.agentduel-agent-prompt {
  min-height: 178px;
  margin-top: 7px;
  padding: 12px 13px;
  line-height: 1.65;
  resize: vertical;
}

.agentduel-agent-select:focus,
.agentduel-agent-prompt:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 12%);
}

.agentduel-agent-select:disabled,
.agentduel-agent-prompt:disabled {
  cursor: default;
  opacity: .62;
}

.agentduel-agent-model-failures {
  margin-top: 8px;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 12px;
  line-height: 1.55;
}

.agentduel-agent-model-failures summary {
  cursor: pointer;
}

.agentduel-agent-model-failures p {
  margin: 6px 0 0;
}

.agentduel-agent-submit {
  justify-self: end;
  min-width: 150px;
}

.agentduel-agent-empty {
  margin-top: 26px;
  padding: 20px;
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 14px;
  background: var(--dsw-alias-bg-hover, #f7f7f7);
}

.agentduel-agent-empty h2 {
  margin: 0 0 6px;
  font-size: 17px;
}

.agentduel-agent-empty p {
  margin: 0;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 820px) {
  .agentduel-character-agent-form {
    grid-template-columns: minmax(0, 600px);
  }

  .agentduel-character-agent-controls {
    width: 100%;
    max-width: 600px;
  }
}

@media (max-width: 560px) {
  .agentduel-module-state {
    padding: 32px 14px;
  }

  .agentduel-settings-page {
    padding: 14px;
  }

  .agentduel-settings-card {
    border-radius: 16px;
  }

  .agentduel-settings-header,
  .agentduel-settings-key,
  .agentduel-settings-faq {
    padding: 24px 20px;
  }

  .agentduel-settings-logo,
  .agentduel-settings-logo .agentduel-logo {
    width: 46px;
    height: 46px;
  }

  .agentduel-settings-logo {
    flex-basis: 46px;
  }

  .agentduel-agent-card {
    width: calc(100% - 8px);
    padding: 24px 18px;
    border-radius: 16px;
  }

  .agentduel-agent-task-tabs {
    grid-template-columns: 1fr;
  }

  .agentduel-agent-submit {
    width: 100%;
  }

  .agentduel-owner-detail-shell {
    padding: 32px 15px;
  }

  .agentduel-character-workspace-card {
    grid-template-columns: 1fr;
  }

  .agentduel-character-agent-submit,
  .agentduel-character-workspace-button {
    width: 100%;
  }

  .agentduel-dialog-actions {
    flex-direction: column-reverse;
  }

  .agentduel-dialog-actions button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agentduel-page *,
  .agentduel-root * {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`
