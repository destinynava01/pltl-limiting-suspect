import { useEffect, useState } from 'react'
import { ACTS, actOf, sub } from './config'
import { Button, Label } from './ui'

// The leader's peek at one team's case: the clue it's on (with the evidence its phones show), the lead detective,
// every answer tried on this clue, and how the earlier clues went. The answer stays behind a button, since the
// board is often on the projector. Refreshes whenever the board does (`stamp` changes).
export default function Peek({ call, team, stamp, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [shownFor, setShownFor] = useState(null) // the clue the answer was shown for (a new clue hides it again)

  useEffect(() => {
    call({ action: 'peek', team_index: team.index }).then((d) => { setData(d); setError('') }).catch((e) => setError(e.message))
  }, [call, team.index, stamp])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const step = data?.case.step
  const showAnswer = shownFor !== null && shownFor === step

  const c = data?.case
  const f = c?.file
  const act = c ? ACTS[actOf(c.step) - 1] : null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={`Peek at ${team.name}`}>
      <section className="paper my-auto w-full max-w-3xl rounded-md p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Label className="!text-stamp">👀 Peeking at {team.name}</Label>
            {c && !c.finished && <h2 className="mt-1 font-display text-2xl text-accent">{act.emoji} Act {act.act}: {act.title}{c.step <= 3 ? ` · lab file ${c.step + 1} of 4` : ''}</h2>}
            {c?.finished && <h2 className="mt-1 font-display text-2xl text-accent">Case closed</h2>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md border-2 border-line px-3 py-1 font-bold hover:bg-hover" aria-label="Close">✕</button>
        </div>

        {error && <p className="mt-3 font-bold text-bad">{error}</p>}
        {!data && !error && <p className="mt-4 text-muted">Loading…</p>}

        {c && (
          <>
            {/* How every clue has gone so far */}
            <ol className="mt-3 flex flex-wrap gap-1.5">
              {data.history.map((h) => (
                <li key={h.step} title={`Clue ${h.step + 1}`} className={`rounded-md px-2 py-1 text-xs font-bold ${h.solved ? (h.solved.revealed ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok') : h.step === c.step && !c.finished ? 'bg-tag text-ink' : 'bg-panel text-muted'}`}>
                  {h.step <= 3 ? `1.${h.step + 1}` : actOf(h.step)} {h.solved ? (h.solved.revealed ? 'shown' : '✓') : h.step === c.step && !c.finished ? 'now' : ''}{h.wrong ? ` · ${h.wrong}✗` : ''}
                </li>
              ))}
            </ol>

            {!c.finished && (
              <>
                <div className="mt-4 rounded-md bg-panel p-3 text-sm">
                  <Label>What their phones show</Label>
                  <Evidence c={c} f={f} />
                </div>

                <p className="mt-3 text-sm">🕵️ Lead detective: <b>{data.lead ?? '…'}</b> · {c.misses ? <span className="font-bold text-bad">{c.misses} wrong tr{c.misses === 1 ? 'y' : 'ies'} on this clue</span> : 'no wrong tries on this clue yet'}</p>

                <div className="mt-3">
                  <Label>Their tries on this clue</Label>
                  {data.attempts.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing submitted yet.</p> : (
                    <ol className="mt-1 space-y-1">
                      {data.attempts.map((a, i) => (
                        <li key={i} className={`flex items-start gap-2 rounded-md px-2 py-1 text-sm ${a.correct ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                          <span>{a.correct ? '✓' : '✗'}</span>
                          <span className="min-w-0"><b>{a.by}:</b> <span className="font-mono">{describe(c.step, a.answer, f)}</span></span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="!px-3 !py-1.5 text-sm" onClick={() => setShownFor(showAnswer ? null : step)}>{showAnswer ? 'Hide' : 'Show'} the answer</Button>
                  <span className="text-xs text-muted">(hidden by default in case this is on the projector)</span>
                </div>
                {showAnswer && <p className="mt-2 rounded-md bg-ok-soft px-3 py-2 font-mono text-sm text-ok">{data.answer}</p>}
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}

// The evidence for the clue the team is on (the same facts their phones show)
function Evidence({ c, f }) {
  if (c.step <= 3) {
    const m = f.lineup[c.step]
    return <p className="mt-1">Balance the combustion of <b>{m.name}</b>: <span className="font-display">{m.species.map((s, i) => `${i > 0 ? (i === m.reactants ? ' → ' : ' + ') : ''}__${sub(s)}`).join('')}</span></p>
  }
  if (c.step === 4) {
    return <p className="mt-1">Residue sample {f.residue.sample_g} g burned into <b>{f.residue.co2_g} g CO₂</b> and <b>{f.residue.h2o_g} g H₂O</b>. Suspect medicines: {f.lineup.map((m) => `${m.name} (${sub(m.formula)})`).join(', ')}.</p>
  }
  if (c.step === 5) {
    return (
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        <p><b>Pharmacy log:</b> {f.log.map((l) => `${l.medicine} ${l.mmol} mmol`).join(' · ')}</p>
        <p><b>Charts:</b> {f.patients.map((p) => `${p.name} ${p.dose_mg} mg`).join(' · ')}</p>
      </div>
    )
  }
  return <p className="mt-1">{f.inventory.medicine}: {f.inventory.start_g} g → {f.inventory.end_g} g. Vials: {f.suspects.map((s) => `${s.name} ${s.vial_mmol} mmol`).join(' · ')}.</p>
}

// One answer, written out the way the student entered it
function describe(step, answer, f) {
  const nameOf = (id) => f.lineup.find((m) => m.id === id)?.name ?? id ?? '?'
  if (step <= 3) {
    const m = f.lineup[step]
    const k = answer.coefficients ?? []
    return m.species.map((s, i) => `${i > 0 ? (i === m.reactants ? ' → ' : ' + ') : ''}${k[i] ?? '?'}${sub(s)}`).join('')
  }
  if (step === 4) return `${answer.co2_mol ?? '?'} mol CO₂, ${answer.h2o_mol ?? '?'} mol H₂O → ${nameOf(answer.medicine)}`
  if (step === 5) return Object.entries(answer.matches ?? {}).map(([p, id]) => `${p}: ${nameOf(id)}`).join('; ')
  return `${answer.missing_mmol ?? '?'} mmol missing → ${answer.suspect ?? '?'}`
}
