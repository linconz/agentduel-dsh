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
  border-radius: 12px;
  background: transparent;
  text-align: left;
}

.agentduel-trigger:hover,
.agentduel-item:hover {
  background: var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%));
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
  border-radius: 7px;
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

.agentduel-key-card {
  width: min(calc(100% - 32px), 520px);
  margin: auto;
  padding: clamp(28px, 5vw, 44px);
  border: 1px solid var(--dsw-alias-border-l1, #e5e5e5);
  border-radius: 20px;
  background: var(--dsw-alias-bg-base, #fff);
  box-shadow: 0 18px 60px rgb(0 0 0 / 8%);
}

.agentduel-key-header {
  margin-bottom: 28px;
}

.agentduel-eyebrow {
  margin: 0 0 8px;
  color: var(--dsw-alias-label-secondary, #757575);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.agentduel-key-title {
  margin: 0;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 650;
  letter-spacing: -.035em;
  line-height: 1.15;
}

.agentduel-key-description {
  margin: 12px 0 0;
  color: var(--dsw-alias-label-secondary, #666);
  font-size: 14px;
  line-height: 1.65;
}

.agentduel-key-form {
  display: flex;
  flex-direction: column;
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

.agentduel-entity-detail {
  --agentduel-detail-blue: #2563ff;
  --agentduel-detail-ink: #111827;
  --agentduel-detail-muted: #5b6472;
  --agentduel-detail-line: #d8dee8;
  min-height: 100%;
  padding: 32px clamp(22px, 5vw, 58px);
  color: var(--agentduel-detail-ink);
  font-family: "Avenir Next", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif;
}

.agentduel-entity-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 28px;
  padding-bottom: 26px;
  border-bottom: 1px solid #b8c2d2;
}

.agentduel-entity-hero > div:first-child {
  min-width: 0;
}

.agentduel-entity-back {
  display: inline-flex;
  margin-bottom: 22px;
  color: var(--agentduel-detail-muted);
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.agentduel-entity-back:hover {
  color: var(--agentduel-detail-blue);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.agentduel-entity-kicker {
  margin: 0 0 7px;
  color: var(--agentduel-detail-blue);
  font: 700 12px/18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  letter-spacing: .03em;
  text-transform: uppercase;
}

.agentduel-entity-hero h1 {
  max-width: 760px;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: clamp(38px, 6vw, 60px);
  font-weight: 800;
  letter-spacing: -.05em;
  line-height: 1;
}

.agentduel-entity-summary {
  max-width: 720px;
  margin: 15px 0 0;
  color: var(--agentduel-detail-muted);
  font-size: 15px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}

.agentduel-entity-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.agentduel-entity-action {
  display: inline-flex;
  min-height: 42px;
  padding: 9px 16px;
  border: 1px solid #b8c2d2;
  border-radius: 7px;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--agentduel-detail-blue);
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
}

.agentduel-entity-action:hover {
  border-color: var(--agentduel-detail-blue);
  background: #eef3fa;
}

.agentduel-entity-action.is-primary {
  border-color: var(--agentduel-detail-blue);
  background: var(--agentduel-detail-blue);
  color: #fff;
}

.agentduel-entity-action.is-primary:hover {
  border-color: var(--agentduel-detail-ink);
  background: var(--agentduel-detail-ink);
}

.agentduel-entity-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 30px 0 0;
  border-top: 1px solid #b8c2d2;
  border-bottom: 1px solid var(--agentduel-detail-line);
}

.agentduel-entity-metrics > div {
  min-width: 0;
  padding: 16px 18px 16px 0;
  border-right: 1px solid var(--agentduel-detail-line);
}

.agentduel-entity-metrics > div:not(:first-child) {
  padding-left: 18px;
}

.agentduel-entity-metrics > div:last-child {
  border-right: 0;
}

.agentduel-entity-metrics dt,
.agentduel-entity-profile dt {
  color: var(--agentduel-detail-muted);
  font-size: 12px;
  font-weight: 650;
  line-height: 18px;
}

.agentduel-entity-metrics dd {
  margin: 5px 0 0;
  overflow-wrap: anywhere;
  color: var(--agentduel-detail-ink);
  font: 750 16px/23px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.agentduel-entity-profile {
  display: grid;
  grid-template-columns: minmax(150px, .45fr) minmax(0, 1.55fr);
  gap: 32px;
  margin-top: 38px;
}

.agentduel-entity-profile h2 {
  margin: 0;
  font-size: 23px;
  line-height: 30px;
}

.agentduel-entity-profile dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid #b8c2d2;
}

.agentduel-entity-profile dl > div {
  min-width: 0;
  padding: 14px 14px 14px 0;
  border-bottom: 1px solid var(--agentduel-detail-line);
}

.agentduel-entity-profile dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
}

.agentduel-entity-battles {
  margin-top: 48px;
  padding-top: 40px;
  border-top: 1px solid #b8c2d2;
}

.agentduel-entity-battles .battle-records-hero {
  max-width: 720px;
}

.agentduel-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 1px 0 4px;
}

.agentduel-conversation-row {
  appearance: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 7px 10px 7px 22px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.agentduel-conversation-row:hover,
.agentduel-conversation-row[aria-current='page'] {
  background: var(--dsw-alias-bg-hover, rgb(0 0 0 / 5%));
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

@media (max-width: 900px) {
  .agentduel-entity-hero,
  .agentduel-entity-profile {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 20px;
  }

  .agentduel-entity-actions {
    justify-content: flex-start;
  }

  .agentduel-entity-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agentduel-entity-metrics > div:nth-child(2) {
    border-right: 0;
  }

  .agentduel-entity-metrics > div:nth-child(-n + 2) {
    border-bottom: 1px solid var(--agentduel-detail-line);
  }
}

@media (max-width: 560px) {
  .agentduel-module-state {
    padding: 32px 14px;
  }

  .agentduel-key-card {
    width: calc(100% - 28px);
    padding: 24px 20px;
    border-radius: 16px;
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

  .agentduel-entity-detail {
    padding: 32px 15px;
  }

  .agentduel-entity-hero,
  .agentduel-entity-profile {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 20px;
  }

  .agentduel-entity-actions {
    justify-content: flex-start;
  }

  .agentduel-entity-action {
    flex: 1 1 140px;
  }

  .agentduel-entity-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agentduel-entity-metrics > div,
  .agentduel-entity-metrics > div:not(:first-child) {
    padding: 13px 10px;
    border-right: 0;
    border-bottom: 1px solid var(--agentduel-detail-line);
  }

  .agentduel-entity-metrics > div:nth-child(odd) {
    padding-left: 0;
    border-right: 1px solid var(--agentduel-detail-line);
  }

  .agentduel-entity-profile dl {
    grid-template-columns: 1fr;
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
