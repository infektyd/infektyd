export const meta = {
  name: 'harden',
  description:
    'Adversarially harden a plan/design/spec to zero verified design defects — ground in the real code+docs, draft/refine the design, then review -> verify -> revise looped until clean. Read-only EXCEPT the one design doc it writes; outputs a converged design + the recommendations it applied, NOT code.',
  whenToUse:
    'You have a plan, design, or spec you want stress-tested and hardened BEFORE building. It does not implement code: it grounds in the real codebase/docs, then adversarially converges the DESIGN to zero verified defects and writes the converged doc. Sibling of implement-converge (which hardens an implementation); this hardens the plan. Recovered from Fable\'s 2026-06-11 handoff-design-converge.',
  phases: [
    { title: 'Ground', detail: 'parallel readers gather ground truth from the real code + docs' },
    { title: 'Design', detail: 'draft/refine the design doc from the spec + ground evidence' },
    { title: 'Converge', detail: 'adversarial design lenses -> skeptic verify -> revise, looped until clean' },
  ],
}

// ---- args ----------------------------------------------------------------
// { spec, goal?, ground?, out?, effort?, maxRounds?, models? }
//   spec  — the plan/design/spec to harden (text), OR a path the Design agent reads.
//   goal  — what the design is for (context for alignment lens).
//   ground — path(s)/glob(s)/description of the real code+docs to read as ground truth.
//   out   — output doc path (default docs/research/hardened-design.md).
let a = args
if (typeof a === 'string') {
  const s = a.trim()
  if (s.startsWith('{')) {
    try { a = JSON.parse(s) } catch (e) { a = { spec: a } }
  } else {
    a = { spec: a }
  }
}
a = a || {}
const SPEC = (a.spec || a.task || '').toString().trim()
const GOAL = (a.goal || '').toString().trim()
const OUT = (a.out || 'docs/research/hardened-design.md').toString().trim()
const GROUND = Array.isArray(a.ground) ? a.ground : a.ground ? [a.ground] : []
const EFFORT = Math.min(5, Math.max(1, Number(a.effort) || 3))
const MAX_ROUNDS = Math.max(1, Number(a.maxRounds) || 4)

if (!SPEC && !GOAL) {
  log('No spec/goal. Pass {spec, goal?, ground?, out?, effort?, maxRounds?, models?}.')
  return { error: 'no spec' }
}

// Tiering: reading/judging defaults to sonnet; the design + revise WRITES default to
// the session model (highest-stakes reasoning) and keep full tools (no agentType).
const MODELS = Object.assign(
  { ground: 'sonnet', review: 'sonnet', verify: 'sonnet', design: null, revise: null },
  a.models || {}
)
const PERSONAS = a.personas !== false

// ---- adversarial DESIGN lenses (read-only reviewers) --------------------
const LENSES = {
  mechanics: {
    tag: 'Mechanics', agentType: 'plumb',
    brief: 'does the proposed mechanism actually work? gaps in the flow, missing states/transitions, unhandled cases, ordering/race hazards in the DESIGN, hand-wavy steps that hide real complexity.',
  },
  grounding: {
    tag: 'Grounding', agentType: 'recon',
    brief: 'claims in the design NOT supported by the real code/docs — assumptions about APIs, file layout, behavior, or constraints that do not hold against ground truth. Cite the contradicting code/doc.',
  },
  alignment: {
    tag: 'Alignment', agentType: 'keystone',
    brief: 'does the design satisfy the stated goal + every requirement/constraint? missing requirements, scope drift, interface/contract breaks, unaddressed open questions.',
  },
  security: {
    tag: 'SecurityHygiene', agentType: 'cassandra',
    brief: 'security, privacy, data-integrity, and failure-mode hygiene in the design: unsafe trust boundaries, secret handling, destructive/irreversible steps without guards, missing validation. Only real, consequential risks.',
  },
  operability: {
    tag: 'Operability', agentType: 'watt',
    brief: 'can it be operated, tested, observed, migrated, and rolled back? missing observability, migration/rollout/rollback story, performance/resource cliffs, no failure handling.',
  },
}
const LENS_PLAN = {
  1: ['mechanics'],
  2: ['mechanics', 'alignment'],
  3: ['mechanics', 'grounding', 'alignment'],
  4: ['mechanics', 'grounding', 'alignment', 'security'],
  5: ['mechanics', 'grounding', 'alignment', 'security', 'operability'],
}
const activeLenses = LENS_PLAN[EFFORT]

// ---- schemas -------------------------------------------------------------
const GROUND_SCHEMA = {
  type: 'object', required: ['facts'], additionalProperties: false,
  properties: {
    facts: { type: 'array', items: { type: 'string' }, description: 'Ground-truth facts (with file:line / source) the design must respect.' },
    risks: { type: 'array', items: { type: 'string' } },
  },
}
const DESIGN_SCHEMA = {
  type: 'object', required: ['summary'], additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'What the design says + what was written to the out doc.' },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
}
const FINDINGS_SCHEMA = {
  type: 'object', required: ['findings'], additionalProperties: false,
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object', required: ['severity', 'where', 'title', 'detail'], additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['blocker', 'should-fix', 'nit'] },
          where: { type: 'string', description: 'Design section / claim the defect is in.' },
          title: { type: 'string' },
          detail: { type: 'string', description: 'Why it is a design defect + the recommended change.' },
        },
      },
    },
  },
}
const VERDICT_SCHEMA = {
  type: 'object', required: ['real', 'reason'], additionalProperties: false,
  properties: {
    real: { type: 'boolean', description: 'true only if it is a genuine design defect worth fixing.' },
    reason: { type: 'string' },
  },
}
const key = (f) => `${(f.where || '').toLowerCase().slice(0, 60)}::${(f.title || '').toLowerCase().slice(0, 80)}`

// ---- 1. Ground -----------------------------------------------------------
phase('Ground')
const groundTargets = GROUND.length ? GROUND : ['(no explicit ground given — infer the relevant code/docs from the spec and read them)']
const groundResults = await parallel(
  groundTargets.map((g) => () =>
    agent(
      `You are gathering GROUND TRUTH so a design can be hardened against reality (no guessing).

DESIGN GOAL: ${GOAL || '(inferred from spec)'}
SPEC UNDER REVIEW:
${SPEC || '(spec is at the out path / to be designed)'}

READ THIS GROUND SOURCE and extract the concrete facts the design MUST respect: ${g}
Read the actual files (Grep/Read), cite file:line. Report verifiable facts (real APIs, signatures, file layout, current behavior, constraints) and any risks the design should account for. Do not propose the design — only establish what is true.`,
      Object.assign({ label: `ground:${String(g).slice(0, 24)}`, phase: 'Ground', schema: GROUND_SCHEMA },
        MODELS.ground ? { model: MODELS.ground } : {}, PERSONAS ? { agentType: 'recon' } : {})
    ).then((r) => r || { facts: [], risks: [] })
  )
)
const groundBrief = groundResults.filter(Boolean).flatMap((r) => [
  ...(r.facts || []).map((f) => `FACT: ${f}`),
  ...(r.risks || []).map((x) => `RISK: ${x}`),
]).join('\n') || '(no ground facts gathered)'

// ---- 2. Design (writes the doc to OUT; full tools, session/override model) ----
phase('Design')
const design = await agent(
  `You are a senior systems designer. Produce a hardened DESIGN document and WRITE it to: ${OUT}

DESIGN GOAL: ${GOAL || '(infer from the spec)'}

SPEC / PLAN TO HARDEN:
${SPEC || '(no inline spec — read any existing draft at ' + OUT + ' and refine it)'}

GROUND TRUTH (the design MUST respect these — do not contradict them):
${groundBrief}

Write a clear, complete design doc at ${OUT}: goal, the mechanism step-by-step, the data/interfaces, failure handling, rollout/rollback, testing, and explicit open questions. Ground every claim in the facts above. Do NOT implement code — this is a design doc only. Create the directory if needed. Return a summary of the design.`,
  Object.assign({ label: 'design', phase: 'Design', schema: DESIGN_SCHEMA },
    MODELS.design ? { model: MODELS.design } : {})
)
let lastSummary = design.summary || ''
const fixedLog = []
const unverified = []
let converged = false
let roundsRun = 0

// ---- 3. Converge: Review -> Verify -> Revise loop ------------------------
for (let round = 1; round <= MAX_ROUNDS; round++) {
  roundsRun = round
  const reviewCtx = `DESIGN GOAL: ${GOAL || '(see doc)'}
The design under review is the document at: ${OUT} (READ IT — do not trust this summary).
DESIGNER SUMMARY (round ${round}): ${lastSummary}

GROUND TRUTH the design must respect:
${groundBrief}`

  const panel = await parallel(
    activeLenses.map((lk) => () => {
      const L = LENSES[lk]
      return agent(
        `You are an adversarial ${L.tag} design reviewer. FIND DESIGN DEFECTS, do not praise. Read the design doc at ${OUT} and the ground truth.

${reviewCtx}

Focus ONLY on your lens: ${L.brief}
For each defect: severity (blocker = the design is wrong/won't work, should-fix = real gap, nit = minor), where (the design section/claim), a short title, and detail (why it's a defect + the recommended change). Find nothing? return an empty findings array — do not invent defects.`,
        Object.assign({ label: `review:${L.tag}`, phase: 'Converge', schema: FINDINGS_SCHEMA },
          MODELS.review ? { model: MODELS.review } : {}, PERSONAS && L.agentType ? { agentType: L.agentType } : {})
      ).then((r) => (r.findings || []).map((f) => ({ ...f, lens: L.tag })))
    })
  )
  const seen = new Set()
  const found = []
  for (const list of panel.filter(Boolean)) for (const f of list) { const k = key(f); if (!seen.has(k)) { seen.add(k); found.push(f) } }
  const blocking = found.filter((f) => f.severity === 'blocker' || f.severity === 'should-fix')
  const nits = found.filter((f) => f.severity === 'nit')
  log(`Round ${round}: panel raised ${blocking.length} blocking + ${nits.length} nits.`)
  if (blocking.length === 0) { converged = true; log(`Round ${round}: zero blocking design defects — converged.`); var lastNits = nits; break }

  const verdicts = await parallel(
    blocking.map((f) => () =>
      agent(
        `Adversarially VERIFY this DESIGN finding. Try to REFUTE it. Read the design doc at ${OUT} and the ground truth before deciding.

FINDING [${f.severity}] (${f.lens}) @ ${f.where}
${f.title}
${f.detail}

Default real=false if vague, already addressed in the doc, a matter of taste, or unconfirmable. Only real=true if it is a genuine design defect worth fixing.`,
        Object.assign({ label: `verify:${String(f.where).slice(0, 24)}`, phase: 'Converge', schema: VERDICT_SCHEMA },
          MODELS.verify ? { model: MODELS.verify } : {}, PERSONAS ? { agentType: 'cassandra' } : {})
      ).then((v) => ({ ...f, verdict: v }))
    )
  )
  const confirmed = verdicts.filter(Boolean).filter((f) => f.verdict && f.verdict.real)
  const unverifiedRound = verdicts.map((e, i) => (!e || !e.verdict ? blocking[i] : null)).filter(Boolean)
  if (unverifiedRound.length) { unverified.push(...unverifiedRound.map((f) => ({ ...f, round }))); log(`Round ${round}: ${unverifiedRound.length} UNVERIFIED (verifier died) — carried to report.`) }
  log(`Round ${round}: ${confirmed.length}/${blocking.length} defects survived verification.`)
  if (confirmed.length === 0) { converged = unverifiedRound.length === 0; var lastNits = nits; break }
  if (round === MAX_ROUNDS) { log(`Round cap (${MAX_ROUNDS}) reached with ${confirmed.length} open defects — not fully converged.`); var lastNits = nits; var leftover = confirmed; break }

  // ---- Revise: edit the design doc to address confirmed defects ----
  const fixList = confirmed.map((f, i) => `${i + 1}. [${f.severity}] @ ${f.where} — ${f.title}\n   ${f.detail}`).join('\n')
  const revise = await agent(
    `Revise the design doc at ${OUT}. An adversarial panel found and VERIFIED these real DESIGN defects — address ALL of them by editing the doc (rework the mechanism, fill the gaps, fix the contradictions, answer the open questions). You may push back on a specific item only if it is provably wrong — say which and why. Keep it a design doc; do not implement code.

${fixList}

Return an updated summary of what you changed in the design.`,
    Object.assign({ label: `revise:round-${round}`, phase: 'Converge', schema: DESIGN_SCHEMA },
      MODELS.revise ? { model: MODELS.revise } : {})
  )
  lastSummary = revise.summary || lastSummary
  fixedLog.push({ round, count: confirmed.length })
}

// ---- Final report --------------------------------------------------------
return {
  spec: SPEC ? SPEC.slice(0, 200) : '(from ' + OUT + ')',
  goal: GOAL,
  out: OUT,
  effort: EFFORT,
  models: { ground: MODELS.ground, review: MODELS.review, verify: MODELS.verify, design: MODELS.design || 'session', revise: MODELS.revise || 'session' },
  lenses: activeLenses.map((k) => LENSES[k].tag),
  rounds: roundsRun,
  converged,
  defectsResolved: fixedLog.reduce((n, r) => n + r.count, 0),
  resolvedByRound: fixedLog,
  openRecommendations: (typeof leftover !== 'undefined' ? leftover : []).map((f) => ({ severity: f.severity, where: f.where, title: f.title, detail: f.detail, lens: f.lens })),
  unverifiedRecommendations: unverified.map((f) => ({ severity: f.severity, where: f.where, title: f.title, lens: f.lens, round: f.round })),
  nits: (typeof lastNits !== 'undefined' ? lastNits : []).map((f) => ({ where: f.where, title: f.title, lens: f.lens })),
  finalSummary: lastSummary,
}
