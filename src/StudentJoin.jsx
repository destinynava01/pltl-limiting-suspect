import { useCallback, useEffect, useRef, useState } from 'react'
import { lsPlay, watchGame } from './api'
import Calculator from './Calculator'
import { ACTS, actOf, ATOMIC_MASS, clockText, equation, MOLAR, SITE_NAME, sub } from './config'
import { playClosed, playSolved, playWrong } from './sounds'
import { Button, CenterCard, Label, Paper, Stamp } from './ui'

const STORAGE_KEY = 'limitingSuspectStudent'
const DEVICE_KEY = 'limitingSuspectDevice'
const field = 'w-full rounded-md border-2 border-line bg-panel px-4 py-3 text-center text-xl font-bold text-ink outline-none focus:border-accent'
const input = 'rounded-md border-2 border-line bg-white px-2 py-2 text-center font-bold text-ink outline-none focus:border-accent'

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch {
    return crypto.randomUUID()
  }
}
const readSaved = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }
const writeSaved = (v) => { try { v ? localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORAGE_KEY) } catch { /* blocked */ } }

// The phone: join, wait for a team, then work the case. Everyone sees the evidence; the lead detective (it rotates
// every step) types the answer.
export default function StudentJoin() {
  const [saved, setSaved] = useState(readSaved)
  const [notice, setNotice] = useState('')
  const leave = useCallback((message = '') => { writeSaved(null); setSaved(null); setNotice(message) }, [])
  return saved ? <Room saved={saved} onLeave={leave} /> : <JoinForm notice={notice} onJoined={(v) => { writeSaved(v); setSaved(v); setNotice('') }} />
}

function JoinForm({ onJoined, notice }) {
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('code') ?? '').toUpperCase())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function join(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const d = await lsPlay({ action: 'join', join_code: code, display_name: name, device_id: deviceId() })
      onJoined({ playerId: d.player.id, gameId: d.game.id })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <CenterCard title={SITE_NAME}>
      <p className="mt-2 text-muted">Report for duty, detective.</p>
      <form onSubmit={join} className="mt-4 space-y-4">
        {notice && <p className="font-bold text-muted">{notice}</p>}
        <div>
          <Label>Game code</Label>
          <input className={`${field} mt-2 uppercase tracking-[0.4em]`} maxLength={6} placeholder="ABC123" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required autoCapitalize="characters" autoComplete="off" />
        </div>
        <div>
          <Label>Your name</Label>
          <input className={`${field} mt-2`} maxLength={40} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button className="w-full" disabled={busy || code.length < 6 || !name.trim()}>{busy ? 'Checking your badge…' : 'Join'}</Button>
        {error && <p className="font-bold text-bad">{error}</p>}
      </form>
    </CenterCard>
  )
}

function Room({ saved, onLeave }) {
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null) // { kind: 'right' | 'wrong' | 'closed' | 'info', text, at }
  const [now, setNow] = useState(() => Date.now())
  const lastEvent = useRef(null)
  const ownPlay = useRef(false)
  const stamp = useRef(0)
  const say = (kind, text) => { stamp.current += 1; setFlash({ kind, text, at: stamp.current }) }

  const check = useCallback(() => lsPlay({ action: 'status', player_id: saved.playerId, device_id: deviceId() })
    .then((d) => {
      if (d.ended) return onLeave('That game has ended. Join another with a new code.')
      // A teammate (the lead detective) answered: sounds for everyone, a note when it wasn't this phone
      const e = d.last_event
      if (e && lastEvent.current && e.at !== lastEvent.current) {
        if (e.kind === 'closed') playClosed()
        else if (e.kind === 'wrong') playWrong()
        else playSolved()
        if (!ownPlay.current && !e.mine) {
          if (e.kind === 'wrong') say('wrong', `🔍 ${e.by}'s answer didn't check out. Look again together.`)
          else if (e.kind === 'closed') say('closed', '🎉 Case closed!')
          else say('right', `✅ ${e.by} cracked it. On to the next clue!`)
        }
      }
      ownPlay.current = false
      lastEvent.current = e?.at ?? lastEvent.current ?? 'none'
      setView({ ...d, offset: Date.parse(d.server_now) - Date.now() })
      setError('')
    })
    .catch((err) => {
      if (/not found|another phone/i.test(err.message)) return onLeave('You were removed from that game.')
      setError(err.message)
    }), [saved, onLeave])

  useEffect(() => {
    check()
    return watchGame(saved.gameId, ['state', 'lobby'], check, 5000)
  }, [saved, check])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])

  async function send(action, answer) {
    setBusy(true)
    setError('')
    try {
      ownPlay.current = true
      const r = await lsPlay({ action, player_id: saved.playerId, device_id: deviceId(), step: view.case.step, answer })
      if (r.closed) say('closed', `🎉 ${r.feedback} Case closed${r.rank ? ` (#${r.rank} to solve it)` : ''}!`)
      else if (r.revealed) say('info', `📂 ${r.feedback}`)
      else if (r.correct) say('right', `✅ ${r.feedback} +${r.points}`)
      else say('wrong', `❌ ${r.feedback}${r.can_reveal ? ' (You can ask to see the answer now.)' : ''}`)
      await check()
    } catch (e) {
      ownPlay.current = false
      setError(e.message)
      check()
    } finally {
      setBusy(false)
    }
  }

  if (!view) return <CenterCard title={SITE_NAME}><p className="mt-4 text-muted">{error || 'Connecting…'}</p></CenterCard>
  const { player, teams } = view
  const myTeam = teams[player.team_index]
  const c = view.case
  const left = view.game.ends_at ? Date.parse(view.game.ends_at) - (now + view.offset) : null
  let body

  if (player.approval_status !== 'approved') body = <Note title="Almost in!" text="Your leader will put you on a team in a moment." />
  else if (view.game.status === 'setup') body = <Note title={`You're on ${myTeam?.name ?? 'a team'}`} text="The case files open soon. Have a calculator ready (there's one here too)." />
  else if (!c) body = <Note title="Opening the case file…" text="" />
  else if (view.game.status === 'finished' || c.finished) {
    body = (
      <Paper className="text-center">
        {c.finished ? <Stamp className="text-3xl">Case closed</Stamp> : <p className="font-display text-2xl">Time&apos;s up!</p>}
        <p className="mt-4 font-display text-xl">{myTeam?.name}: {c.points} points</p>
        <p className="mt-1 text-muted">{c.solved.length} of {c.steps} clues solved{c.finish_rank ? ` · #${c.finish_rank} to close the case` : ''}</p>
        {c.file.suspects.some((s) => s.thief) && <p className="mt-3">The thief: <b>{c.file.suspects.find((s) => s.thief).name}</b>, with the stolen {c.file.stolen?.name}.</p>}
      </Paper>
    )
  } else {
    body = (
      <>
        <ActProgress step={c.step} />
        <Task c={c} lead={view.lead} busy={busy} canReveal={view.can_reveal} onAnswer={(a) => send('answer', a)} onReveal={() => send('reveal')} />
        <Reference />
        <Calculator />
        <CaseNotes c={c} />
      </>
    )
  }

  return (
    <main className="cork-bg min-h-dvh text-ink">
      <div className="mx-auto max-w-md space-y-5 p-4">
        <header className="flex items-center justify-between gap-2 rounded-md bg-card/90 px-3 py-2 shadow">
          <div className="min-w-0">
            <p className="truncate font-display text-lg">{player.display_name}</p>
            {myTeam && <p className="text-sm text-muted"><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: myTeam.color }} />{myTeam.name}</p>}
          </div>
          <div className="text-right">
            {left !== null && view.game.status === 'playing' && <p className={`font-display text-xl ${left < 120000 ? 'text-stamp' : ''}`}>⏱ {clockText(left)}</p>}
            {c && <p className="font-display text-sm text-accent">{c.points} pts</p>}
          </div>
        </header>
        {flash && (
          <p key={flash.at} className={`pop rounded-md px-4 py-3 font-semibold shadow ${flash.kind === 'wrong' ? 'shake bg-bad-soft text-bad' : flash.kind === 'info' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>{flash.text}</p>
        )}
        {body}
        {error && <p className="rounded-md bg-card px-3 py-2 text-center font-bold text-bad">{error}</p>}
        <p className="text-center"><button onClick={() => onLeave()} className="text-sm text-card/80 hover:text-card">Leave game</button></p>
      </div>
    </main>
  )
}

function ActProgress({ step }) {
  const act = actOf(step)
  return (
    <ol className="grid grid-cols-4 gap-1.5">
      {ACTS.map((a) => (
        <li key={a.act} className={`rounded-md px-1 py-1.5 text-center text-xs font-bold shadow ${a.act < act ? 'bg-ok-soft text-ok' : a.act === act ? 'bg-tag text-ink' : 'bg-card/70 text-muted'}`}>
          <span className="block text-lg">{a.act < act ? '✓' : a.emoji}</span>Act {a.act}
        </li>
      ))}
    </ol>
  )
}

// The current step: what to do, the evidence it needs, and (for the lead detective) the answer form
function Task({ c, lead, busy, canReveal, onAnswer, onReveal }) {
  const act = ACTS[actOf(c.step) - 1]
  const f = c.file
  const isLead = lead?.me
  return (
    <Paper className="lined" key={c.step}>
      <Label>Act {act.act}: {act.title}{c.step <= 3 ? ` · lab test ${c.step + 1} of 4` : ''}</Label>
      {f.story && <div className="mt-2 rounded-lg border-2 border-dashed border-line px-3 py-2 text-sm">{f.story.title && <p className="font-bold">{f.story.title}</p>}<p>{f.story.text}</p></div>}
      {c.step === 0 && (
        <p className="mt-2 text-sm">
          Last night someone broke into the pharmacy at <b>{f.hospital}</b>. A patient fell ill after drinking tea that had a strange residue in the cup.
          Four medicines are on the shelf of suspects: {f.lineup.map((m) => m.name).join(', ')}. First, balance the crime lab&apos;s four test reactions.
          Each one you balance unlocks a medicine&apos;s file.
        </p>
      )}
      <div className="mt-3">
        {c.step <= 3 && <BalanceTask test={f.tests[c.step]} med={f.lineup[c.step]} isLead={isLead} busy={busy} onAnswer={onAnswer} />}
        {c.step === 4 && <ResidueTask f={f} isLead={isLead} busy={busy} onAnswer={onAnswer} />}
        {c.step === 5 && <LogTask f={f} isLead={isLead} busy={busy} onAnswer={onAnswer} />}
        {c.step === 6 && <AccuseTask f={f} isLead={isLead} busy={busy} onAnswer={onAnswer} />}
      </div>
      <div className="mt-4 rounded-md bg-panel px-3 py-2 text-sm">
        {isLead
          ? <p className="font-bold text-accent">🕵️ You&apos;re the lead detective for this clue. Talk it through with your team, then type the answer.</p>
          : <p>🕵️ <b>{lead?.name ?? 'Your teammate'}</b> is the lead detective for this clue. Help out loud and check the math on your calculator.</p>}
        {c.misses > 0 && <p className="mt-1 text-bad">{c.misses} wrong tr{c.misses === 1 ? 'y' : 'ies'} on this clue (each costs a quarter of its points).</p>}
      </div>
      {isLead && canReveal && (
        <button type="button" disabled={busy} onClick={() => window.confirm('Show the answer? This clue scores 0, but your team moves on.') && onReveal()} className="mt-3 w-full text-sm font-bold text-warn underline">
          Stuck? Show us the answer (0 points for this clue)
        </button>
      )}
    </Paper>
  )
}

// Act 1: coefficient boxes in front of each species
function BalanceTask({ test, med, isLead, busy, onAnswer }) {
  const [coefs, setCoefs] = useState(() => test.species.map(() => ''))
  const ready = coefs.every((x) => /^\d+$/.test(x) && Number(x) > 0)
  return (
    <div>
      <p className="font-display text-xl">{test.type}</p>
      <p className="mt-1 text-sm text-muted">Fill in the smallest whole-number coefficients. Balancing it unlocks <b>{med.name}</b>&apos;s file.</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-lg font-bold">
        {test.species.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <span className="px-0.5 text-muted">{i === test.reactants ? '→' : '+'}</span>}
            <input aria-label={`Coefficient for ${s}`} className={`${input} w-12`} inputMode="numeric" disabled={!isLead || busy} value={coefs[i]}
              onChange={(e) => setCoefs(coefs.map((x, k) => (k === i ? e.target.value.replace(/\D/g, '').slice(0, 3) : x)))} />
            <span>{sub(s)}</span>
          </span>
        ))}
      </div>
      {isLead && <Button className="mt-4 w-full" disabled={busy || !ready} onClick={() => onAnswer({ coefficients: coefs.map(Number) })}>{busy ? 'Checking…' : '⚗️ Submit the balanced equation'}</Button>}
    </div>
  )
}

// Act 2: grams of AgCl to moles, the residue's molar mass, and which medicine matches
function ResidueTask({ f, isLead, busy, onAnswer }) {
  const [mol, setMol] = useState('')
  const [mass, setMass] = useState('')
  const [med, setMed] = useState('')
  return (
    <div>
      <p className="text-sm">The suspect medicines are hydrochloride salts (·HCl). The crime lab dissolved the residue from the cup and added silver nitrate: the chloride came out as solid <b>AgCl</b>, 1 mol for every mol of medicine.</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <p className="rounded-md bg-white p-2 shadow"><span className="tag text-xs">EVIDENCE A</span><span className="mt-1 block font-display text-2xl">{f.residue.sample_g} g</span>residue</p>
        <p className="rounded-md bg-white p-2 shadow"><span className="tag text-xs">EVIDENCE B</span><span className="mt-1 block font-display text-2xl">{f.residue.agcl_g} g</span>AgCl</p>
      </div>
      <p className="mt-2 text-sm text-muted">Turn the AgCl into moles ({MOLAR.AgCl} g/mol). That&apos;s also the moles of medicine, so its molar mass is grams of residue ÷ moles. Compare with the molar masses in your case notes.</p>
      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-bold">mol AgCl <input className={`${input} flex-1`} inputMode="decimal" placeholder="moles" disabled={!isLead || busy} value={mol} onChange={(e) => setMol(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-sm font-bold">molar mass <input className={`${input} flex-1`} inputMode="decimal" placeholder="g/mol" disabled={!isLead || busy} value={mass} onChange={(e) => setMass(e.target.value)} /></label>
        <MedicinePicker meds={f.lineup} value={med} onChange={setMed} disabled={!isLead || busy} />
      </div>
      {isLead && <Button className="mt-4 w-full" disabled={busy || !mol || !mass || !med} onClick={() => onAnswer({ agcl_mol: mol, molar_mass: mass, medicine: med })}>{busy ? 'Checking…' : '🔬 Name the residue'}</Button>}
    </div>
  )
}

// Act 3: match every patient to a log entry
function LogTask({ f, isLead, busy, onAnswer }) {
  const [matches, setMatches] = useState({})
  const ready = f.patients.every((p) => matches[p.name])
  return (
    <div>
      <p className="text-sm">The weapon was <b>{f.weapon.name}</b>. Was it stolen? The pharmacy log records doses in <b>mmol</b>; the patients&apos; charts are in <b>mg</b>. Match every patient to their medicine. The log entry nobody matches is the stolen bottle.</p>
      <p className="mt-2 rounded-md bg-panel px-3 py-2 text-sm"><b>Convert each chart:</b> mg ÷ 1000 = g → g ÷ molar mass = mol → mol × 1000 = <b>mmol</b>. Try each medicine&apos;s molar mass (case notes) until one matches a log entry.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-white p-2 text-sm shadow">
          <p className="tag text-xs">PHARMACY LOG</p>
          <ul className="mt-1 space-y-0.5">{f.log.map((l) => <li key={l.id} className="flex justify-between gap-1"><span>{l.medicine}</span><b>{l.mmol} mmol</b></li>)}</ul>
        </div>
        <div className="rounded-md bg-white p-2 text-sm shadow">
          <p className="tag text-xs">PATIENT CHARTS</p>
          <ul className="mt-1 space-y-0.5">{f.patients.map((p) => <li key={p.name} className="flex justify-between gap-1"><span>{p.name}</span><b>{p.dose_mg} mg</b></li>)}</ul>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {f.patients.map((p) => (
          <label key={p.name} className="flex items-center gap-2 text-sm font-bold">
            <span className="w-28 shrink-0">{p.name} takes</span>
            <select className={`${input} flex-1 text-left`} disabled={!isLead || busy} value={matches[p.name] ?? ''} onChange={(e) => setMatches({ ...matches, [p.name]: e.target.value })}>
              <option value="">Choose…</option>
              {f.lineup.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      {isLead && <Button className="mt-4 w-full" disabled={busy || !ready} onClick={() => onAnswer({ matches })}>{busy ? 'Checking…' : '📋 Submit the matches'}</Button>}
    </div>
  )
}

// Act 4: the missing amount, and whose vial matches it
function AccuseTask({ f, isLead, busy, onAnswer }) {
  const [missing, setMissing] = useState('')
  const [who, setWho] = useState('')
  return (
    <div>
      <p className="text-sm">The stolen bottle of <b>{f.inventory.medicine}</b> held <b>{f.inventory.start_g} g</b> at the start of the night shift. This morning it holds <b>{f.inventory.end_g} g</b>. Each suspect&apos;s locker has a small vial of it. Work out how many <b>mmol</b> are missing; the thief&apos;s vial holds exactly that much.</p>
      <p className="mt-2 rounded-md bg-panel px-3 py-2 text-sm">grams missing ÷ molar mass = mol → mol × 1000 = <b>mmol</b></p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {f.suspects.map((s) => (
          <li key={s.name}>
            <button type="button" disabled={!isLead || busy} onClick={() => setWho(s.name)}
              className={`w-full rounded-md border-2 bg-white p-2 text-left text-sm shadow transition ${who === s.name ? 'border-stamp' : 'border-transparent'} disabled:cursor-default`}>
              <span className="text-2xl">{s.emoji}</span>
              <span className="block font-bold">{s.name}</span>
              <span className="block text-xs text-muted">{s.role}</span>
              <span className="mt-1 block font-display">vial: {s.vial_mmol} mmol</span>
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm font-bold">mmol missing <input className={`${input} flex-1`} inputMode="decimal" placeholder="mmol" disabled={!isLead || busy} value={missing} onChange={(e) => setMissing(e.target.value)} /></label>
      {isLead && <Button variant="stamp" className="mt-4 w-full" disabled={busy || !missing || !who} onClick={() => onAnswer({ missing_mmol: missing, suspect: who })}>{busy ? 'Checking…' : `🕵️ Accuse ${who || '…'}`}</Button>}
    </div>
  )
}

function MedicinePicker({ meds, value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {meds.map((m) => (
        <button key={m.id} type="button" disabled={disabled} onClick={() => onChange(m.id)}
          className={`rounded-md border-2 px-2 py-1.5 text-left text-sm font-bold transition ${value === m.id ? 'border-stamp bg-bad-soft' : 'border-line bg-white'} disabled:cursor-default`}>
          {m.name} <span className="block text-xs font-normal text-muted">{sub(m.formula)}</span>
        </button>
      ))}
    </div>
  )
}

// Atomic and molar masses (the values the answers are checked with)
function Reference() {
  return (
    <details className="rounded-md bg-card p-3 shadow">
      <summary className="cursor-pointer font-display">📖 Reference card</summary>
      <p className="mt-2 text-sm">Atomic masses: {Object.entries(ATOMIC_MASS).map(([el, m]) => `${el} ${m}`).join(' · ')} g/mol</p>
      <p className="text-sm">AgCl = {MOLAR.AgCl} g/mol</p>
      <p className="mt-1 text-sm"><b>mg → mmol:</b> mg ÷ 1000 = g → g ÷ molar mass = mol → mol × 1000 = mmol</p>
      <p className="text-xs text-muted">Shortcut: the ÷ 1000 and × 1000 cancel, so mg ÷ molar mass gives mmol in one step.</p>
    </details>
  )
}

// Everything solved so far: the balanced lab tests, the medicines' files (molar masses), the weapon, the matches
function CaseNotes({ c }) {
  const f = c.file
  const tests = f.tests.filter((t) => t.balanced)
  if (!tests.length) return null
  return (
    <Paper pinned={false}>
      <Label>Case notes</Label>
      <p className="mt-2 text-sm font-bold">Medicine files</p>
      <ul className="mt-1 space-y-1 text-sm">
        {f.lineup.map((m) => (
          <li key={m.id}>
            <b>{m.name}</b> <span className="text-muted">({sub(m.formula)})</span>: {m.molar_mass ? <b>{m.molar_mass} g/mol</b> : <span className="text-muted">locked</span>}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-bold">Balanced lab tests</p>
      <ul className="mt-1 space-y-1 text-sm">
        {tests.map((t) => <li key={t.id}><span className="text-muted">{t.type}:</span> <span className="font-display text-base">{equation(t, t.balanced)}</span></li>)}
      </ul>
      {f.weapon && <p className="mt-3 text-sm">🔬 The residue: <b>{f.weapon.name}</b></p>}
      {f.stolen && <p className="text-sm">📋 Stolen: <b>{f.stolen.name}</b> ({f.patients.map((p) => `${p.name}: ${p.medicine}`).join(', ')})</p>}
    </Paper>
  )
}

function Note({ title, text }) {
  return (
    <Paper className="text-center">
      <h2 className="font-display text-2xl text-accent">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </Paper>
  )
}
