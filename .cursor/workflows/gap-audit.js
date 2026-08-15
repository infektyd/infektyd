export const meta = {
  name: 'gap-audit',
  description: 'Iterative gap audit of the infektyd/infektyd GitHub profile landing-page repo: rubric refresh -> off-ratelimit sweeps -> adversarial verify -> dedup vs known findings -> triage proposal. Findings only, never fixes. Run repeatedly until 2 consecutive dry rounds.',
  whenToUse: 'Re-audit the profile README repo for the campaign gap classes. args: {round: N, rubric: [...], knownFindings: "...", verifiedHolding: "...", escapes: "..."} — the orchestrator composes the ledger between rounds.',
  phases: [
    { title: 'Rubric', detail: 'validate/extend the heuristic rubric from escapes since last round' },
    { title: 'Sweep', detail: 'seven profile-surface sweeps (identity, catalog, datasets, assets, CI, badges, contracts)' },
    { title: 'Verify', detail: 'adversarial verification, one verifier per sweep, refute-by-default' },
    { title: 'Synthesize', detail: 'dedup vs known findings, rank, dry-round verdict' },
  ],
}

// ---------------------------------------------------------------------------
// The audit's constitution — carried verbatim from the Minni gap-audit
// (plan-eedfc0b2f536b828) and its scar tissue. Do not weaken these.
//  * Findings only. No code fixes, no issue filing, no repo writes of any
//    kind inside this workflow. Fixes/issues are promoted by the operator
//    from the triage proposal.
//  * Every gap cites file:line or a reproducible observation (API query,
//    ls count, executed command output) — no vibes.
//  * A finding survives only if a verifier confirms it against current
//    source or a live read-only observation. Sweepers locate; verifiers confirm.
//  * Coverage-counts over log-reading: should-cover vs is-covered.
//  * The triage proposal is INPUT to the operator. This workflow never
//    marks anything accepted/fixed/filed — that gate lives with Hans.
//    (Scar: a gate that omits the human approval will pass without it.)
//
// Adaptation note (2026-08-15): this is NOT the Minni product codebase.
// infektyd/infektyd is the GitHub special profile README repo — treated as
// a real repo because it is the public identity surface. Sweeps target
// writer→reader pairs on that surface (README claims, assets, CI, live
// GitHub/HF/X presence), not memory/hooks/AFM internals.
// ---------------------------------------------------------------------------

const REPO = '/workspace'
// args may arrive as a JSON string depending on the caller — coerce.
// (Round 2 ran with defaults because a stringified args object silently
// failed every property read; that is this workflow's own H2.)
let a = args
if (typeof a === 'string') { try { a = JSON.parse(a) } catch { a = {} } }
if (!a || typeof a !== 'object') a = {}
const round = Number(a.round || 1)

// Baseline rubric = the five proven classes + the five escape classes.
// Same H1-H10 as the Minni audit; the *surfaces* change, the classes do not.
const RUBRIC = a.rubric || [
  'H1 logged-then-orphaned: state recorded (file, row, marker, audit line, generated asset, CI artifact) that no reader ever surfaces or drains',
  'H2 silent-empty channel: a consumer receives empty/default and cannot distinguish "nothing there" from "producer failed/cut/unreachable"',
  'H3 capture-without-reassert: data captured at one lifecycle point that is never re-delivered where it matters (a project/dataset once on the profile, later dropped while still public)',
  'H4 dead-letter/unbounded queue: writers without readers, retention without bound or age surface (failed Actions runs, metrics commits with no consumer)',
  'H5 health-signal overstatement: a gate/status/doc/badge attests to something it never checked (incl. hardcoded ok, static shields, count claims, "shipping now")',
  'H6 budget/deadline interaction: work abandoned by a budget wrapper whose handles/side-effects outlive it; scheduled jobs that run past usefulness',
  'H7 floating/unpinned reference: state assumed pinned that actually tracks a moving target (unpinned Action tag, checkout by branch name, unpinned CLI/dep install)',
  'H8 execution-environment resolution: code resolving interpreters/modules/binaries through attacker- or accident-influenceable paths (unpinned PATH, third-party Action at @latest with contents:write)',
  'H9 idempotency-key poisoning: a dedup/once-only key satisfiable by an artifact that did not actually do the work (marker written before the action)',
  'H10 migration race: two versions of a protocol/code path live simultaneously producing artifacts neither would alone',
]

// First audit of this repo: no prior dispositioned ledger.
const KNOWN = a.knownFindings ||
  `No prior gap-audit ledger exists for infektyd/infektyd (first run 2026-08-15). Do not invent duplicate IDs. GitHub PRs #1-#3 are historical README edits, not a findings backlog. Draft PR #4 (AGENTS.md env-setup) is unrelated to this audit.`
const HOLDING = a.verifiedHolding ||
  `Verified-holding (do NOT re-sweep, spot-check at most): none yet — this is round 1 on a profile landing-page repo.`
const ESCAPES = a.escapes ||
  `No prior-audit escapes on this repo. Keep H6-H10 as a secondary lens. Profile-shaped examples of those classes: (H6) a 6-hour metrics cron that keeps burning runner minutes after the token died; (H7) lowlighter/metrics@latest; (H8) contents:write + unpinned third-party Action; (H9) [Skip GitHub Action] commit messages that hide whether the SVG was actually refreshed; (H10) GitHub profile bio vs README.md vs repo description saying three different things.`

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings', 'coverage'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'severity', 'rubric_class', 'claim', 'evidence'],
        properties: {
          id: { type: 'string', description: 'sweep-local id, e.g. S1-3' },
          severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
          rubric_class: { type: 'string', description: 'H1..H10' },
          claim: { type: 'string', description: 'one-sentence defect statement' },
          evidence: { type: 'string', description: 'file:line citations and/or reproducible observation' },
          duplicate_of: { type: 'string', description: 'known-finding ID if this duplicates one; omit if new' },
        },
      },
    },
    coverage: { type: 'string', description: 'what was examined vs skipped, honestly — silent truncation is itself an H5' },
  },
}

const VERDICTS_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'verdict', 'proof'],
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['CONFIRMED', 'REFUTED', 'DUPLICATE', 'UNPROVEN'] },
          proof: { type: 'string', description: 'what was executed/read to decide; for REFUTED, the contrary evidence' },
          corrected_severity: { type: 'string', enum: ['HIGH', 'MED', 'LOW'] },
        },
      },
    },
  },
}

// Seven sweeps, remapped from Minni subsystems onto the profile surface.
// should-cover vs is-covered still rules: enumerate the public first-party
// repos, the README links, the assets on disk, the Actions runs, the HF
// datasets named in the README.
const SWEEPS = [
  { key: 'identity-presence', scope: 'Identity & live presence: README name/trade/location/currently-line vs GitHub user record (name, bio, location, twitter_username, blog), X @infektyd, Hugging Face /Infektyd, repo description/homepage. Writer→reader: which identity field is source of truth, and which surfaces drift.' },
  { key: 'project-catalog', scope: 'Project catalog (Now / Range / Research): every README link, every first-party public repo (exclude forks), status phrases (current focus, shipped and resting, evolving, public). Coverage-count: first-party repos on disk-of-GitHub vs rows in the profile tables. Do not treat omitted forks as findings.' },
  { key: 'research-datasets', scope: 'Research/dataset claims: the four HF datasets named in README.md, claimed example counts vs live HF API / datasets-server row counts / raw jsonl line counts. Also the HF org link and any count that a card or the profile repeats without checking.' },
  { key: 'asset-pipeline', scope: 'Asset pipeline: ha_sigil-light.svg, ha_sigil-dark.svg, github-metrics.svg. Writer→reader: who generates each file, who displays it. <picture> dark/light wiring in README.md. Metrics SVG last-updated stamp vs HEAD commit vs whether README references the file at all.' },
  { key: 'ci-automation', scope: 'CI/automation: .github/workflows/metrics.yml — cron, workflow_dispatch, push-to-main, permissions.contents, secrets.METRICS_TOKEN, lowlighter/metrics pin, [Skip GitHub Action] commit convention. Live Actions: success vs failure counts, last success, current failure mode. Unbounded failed-run queue.' },
  { key: 'health-signals', scope: 'Health-signal honesty: every shields.io badge (focus, Swift 6, Apple FoundationModels, public, current focus, evolving) and every status word that a visitor could take as a live check. What does the badge actually fetch? What would a failed metrics job change on the rendered profile? Nothing is itself a finding if true.' },
  { key: 'contract-drift', scope: 'Contract/docs drift: "Shipping now: minni:plan", stack table (Swift 6, TypeScript, Python, AFM, MCP, SQLite/FAISS), upstream swiftlang/swift#89835, "Currently: Minni" vs minni pushed_at, repo description vs README lede. Any promise the profile makes that a live repo/issue/dataset does not keep.' },
]

function sweepPrompt(s) {
  return `READ-ONLY AUDIT SWEEP (round ${round}) of the infektyd/infektyd GitHub profile landing-page repo at ${REPO}, plus its live deployed state (GitHub API, Actions runs, Hugging Face API, HTTP HEAD of every outbound link). You are a gap finder. You MUST NOT modify any file, run any mutating command, or touch git state.

SYSTEM UNDER AUDIT: ${s.scope}

This is a profile README repo, not an application codebase. Treat it with the same seriousness as a product repo: the rendered GitHub profile is the production surface. Live API reads and ls/git counts are first-class audit surfaces.

RUBRIC — a finding counts ONLY if it matches one of these classes. H1-H5 are the PRIMARY lens — data that gets written and orphaned, channels that go silently empty, captures never re-asserted, queues nobody drains, health signals that overstate. Hunt those FIRST and hardest:
${RUBRIC.slice(0, 5).map(r => '- ' + r).join('\n')}

Secondary classes — flag when you trip over them, but do not let them displace H1-H5 coverage:
${RUBRIC.slice(5).map(r => '- ' + r).join('\n')}

The secondary classes come from these escapes / profile-shaped examples:
${ESCAPES}

DEDUP LEDGER — do not re-report these; if you rediscover one, mark duplicate_of:
${KNOWN}

${HOLDING}

METHOD: coverage-counts over log-reading (enumerate should-cover vs is-covered), trace writer->reader pairs, execute cheap read-only proofs (grep counts, gh api, curl -I, wc -l, git log) rather than asserting. Every finding cites file:line or a reproducible observation. Report your coverage honestly — what you skipped is part of the deliverable.

Return ONLY the JSON matching the schema.`
}

function verifyPrompt(s, findings) {
  return `ADVERSARIAL VERIFICATION of audit findings for the "${s.key}" system of the infektyd/infektyd profile repo at ${REPO}. Default stance: REFUTE. A finding survives only if the current source or a reproducible read-only observation forces it.

For each finding: open the cited file:line yourself, re-run the cited observation where cheap (read-only ONLY — no file writes, no git mutations, no secret changes), and rule CONFIRMED / REFUTED / DUPLICATE (give the duplicated ID from the ledger below) / UNPROVEN (plausible but you could not force it — say what proof is missing).

Sweeper findings are claims from an external model — they may hallucinate line numbers, misread guards, or re-report taste as defects. The fix ledger:
${KNOWN}

FINDINGS TO VERIFY:
${JSON.stringify(findings, null, 2)}

Return ONLY the JSON matching the schema.`
}

phase('Rubric')
log(`gap-audit round ${round}: ${RUBRIC.length} rubric classes, 7 profile-surface sweeps, adversarial verification`)

const results = await pipeline(
  SWEEPS,
  s => agent(sweepPrompt(s), {
    label: `sweep:${s.key}`,
    phase: 'Sweep',
    agentType: 'agy',
    schema: FINDINGS_SCHEMA,
  }).then(r => r || agent(sweepPrompt(s), {
    // Fallback on a Claude agent, NOT a second agy attempt — a silently-empty
    // sweep fabricates a dry round (H2/H5).
    label: `sweep-fallback:${s.key}`,
    phase: 'Sweep',
    model: 'sonnet',
    schema: FINDINGS_SCHEMA,
  })),
  (sweep, s) => {
    if (!sweep || !sweep.findings || sweep.findings.length === 0) {
      return { key: s.key, coverage: sweep ? sweep.coverage : 'SWEEP FAILED — no result', confirmed: [], refuted: 0, unproven: [] }
    }
    return agent(verifyPrompt(s, sweep.findings), {
      label: `verify:${s.key}`,
      phase: 'Verify',
      model: 'opus',
      schema: VERDICTS_SCHEMA,
    }).then(v => {
      const verdicts = (v && v.verdicts) || []
      const byId = Object.fromEntries(verdicts.map(x => [x.id, x]))
      const confirmed = sweep.findings
        .filter(f => byId[f.id] && byId[f.id].verdict === 'CONFIRMED' && !f.duplicate_of)
        .map(f => ({ ...f, severity: byId[f.id].corrected_severity || f.severity, proof: byId[f.id].proof, sweep: s.key }))
      const unproven = sweep.findings
        .filter(f => byId[f.id] && byId[f.id].verdict === 'UNPROVEN')
        .map(f => ({ ...f, missing_proof: byId[f.id].proof, sweep: s.key }))
      return {
        key: s.key,
        coverage: sweep.coverage,
        confirmed,
        unproven,
        refuted: verdicts.filter(x => x.verdict === 'REFUTED').length,
        duplicates: verdicts.filter(x => x.verdict === 'DUPLICATE').length,
      }
    })
  }
)

phase('Synthesize')
const clean = results.filter(Boolean)
const allConfirmed = clean.flatMap(r => r.confirmed)
const allUnproven = clean.flatMap(r => r.unproven || [])
const rank = { HIGH: 0, MED: 1, LOW: 2 }
allConfirmed.sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3))
const newHighMed = allConfirmed.filter(f => f.severity === 'HIGH' || f.severity === 'MED').length

log(`round ${round}: ${allConfirmed.length} confirmed new findings (${newHighMed} HIGH/MED), ${allUnproven.length} unproven, ${clean.reduce((n, r) => n + (r.refuted || 0), 0)} refuted, ${clean.reduce((n, r) => n + (r.duplicates || 0), 0)} duplicates of known findings`)

return {
  round,
  dry: newHighMed === 0,
  confirmed: allConfirmed,
  unproven: allUnproven,
  perSweep: clean.map(r => ({ key: r.key, coverage: r.coverage, confirmed: r.confirmed.length, refuted: r.refuted, duplicates: r.duplicates || 0 })),
  next_round_inputs: {
    note: 'Orchestrator: fold confirmed findings into knownFindings, fold any newly-caught escapes into escapes/rubric, and re-invoke with round+1. Stop after 2 consecutive dry rounds. Triage of confirmed findings is OPERATOR-gated — propose, never file.',
  },
}
