import copy from "../../copy/en.json" with { type: "json" };

const text = copy as unknown as Record<string, string>;

const byStage: Record<string, string> = {
  invite_required: text.inviteRequired,
  publishing_closed: text.publishingClosed,
  unsupported: text.unsupported,
  pii: text.pii,
  empty: text.empty,
  limits: text.limits,
  controls: text.controls,
  no_change: text.noChange,
  clarification: text.clarification,
  preview_unavailable: text.previewUnavailable,
  unavailable: text.couldNotPlace,
  expired: text.expired,
  rate_limited: text.rateLimited,
  paused: text.paused,
  invalid_output: text.couldNotPlace,
  fingerprint_mismatch: text.fingerprintMismatch,
  already_published: text.alreadyPublished,
  acknowledgement_required: text.recoveryWarning,
  pseudonym: text.pseudonymRejected,
  recovery_refused: text.recoveryRefused,
  publishing_blocked: text.publishingBlocked,
  forbidden_field: text.pii,
};

export function stageNotice(stage: string): string | null {
  return byStage[stage] ?? null;
}
