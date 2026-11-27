import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { lsGame, watchGame } from './api'
import { ACTS, DURATIONS, HUB_URL, MAX_TEAMS, MIN_TEAMS, SITE_NAME, TEAM_COLORS } from './config'
import { saveSession } from './session'
import { Button, Label, Paper } from './ui'

const choice = (on) =>
  `rounded-md border-2 px-3 py-2 text-center font-display text-base transition ${on ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-panel hover:bg-hover'}`

// Leader lobby: create the game -> teams -> finalize -> case clock -> start. Every team gets its own case.
// Students join from their phones; the leader puts them on teams. A team of one works.
export default function Lobby({ onStart, onOpenBoard, hasGame, resume, onCloseGame }) {
  const [session, setSession] = useState(resume?.session ?? null)
  const [teamNames, setTeamNames] = useState(resume?.teams?.length ? resume.teams : ['Team 1', 'Team 2'])
  const [finalized, setFinalized] = useState(Boolean(resume?.finalized))
  const [duration, setDuration] = useState(30)
  const [players, setPlayers] = useState([])
  const [busy, setBusy] = useState(false)
  const [guide, setGuide] = useState(false) // the how-to guide, shown when Start is pressed (before the case clock starts)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return undefined
    const load = () => lsGame({ action: 'list_players', game_id: session.gameId, host_token: session.hostToken }).then((d) => setPlayers(d.players)).catch(() => {})
    load()
    return watchGame(session.gameId, ['lobby'], load, 10000)
  }, [session])

  const call = (payload) => lsGame({ ...payload, game_id: session.gameId, host_token: session.hostToken })
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const teamLabel = (i) => teamNames[i].trim() || `Team ${i + 1}`
  const waiting = players.filter((p) => p.approval_status === 'pending')
  const sizes = teamNames.map((_, i) => players.filter((p) => p.approval_status === 'approved' && p.team_index === i).length)
  const emptyTeams = teamNames.map((_, i) => i).filter((i) => sizes[i] === 0)

  const create = () => run(async () => {
    const d = await lsGame({ action: 'create_game' })
    const s = { gameId: d.game.id, hostToken: d.host_token, joinCode: d.game.join_code }
    saveSession(s)
    setSession(s)
  })
  const finalize = () => run(async () => { await call({ action: 'set_teams', team_names: teamNames.map((_, i) => teamLabel(i)) }); setFinalized(true) })
  const studentAction = (payload) => run(async () => { await call(payload); setPlayers((await call({ action: 'list_players' })).players) })
  const start = () => run(async () => {
    await call({ action: 'start_game', team_names: teamNames.map((_, i) => teamLabel(i)), duration_min: duration })
    onStart(session)
  })

  const joinUrl = session ? `${window.location.origin}/join?code=${session.joinCode}` : ''

  return (
    <main className="cork-bg min-h-dvh p-4 text-ink sm:p-8">
      {/* Start shows the how-to guide first; the game (and its clock) starts when it closes */}
      {guide && <HowToPlay site="limitingsuspect" gameId={session?.gameId ?? 'lobby'} name={SITE_NAME} accent="#c0392b" slides={HOW_TO_SLIDES} open onClose={() => { setGuide(false); start() }} />}
      {hasGame && <button onClick={onOpenBoard} className="fixed right-4 top-4 z-20 rounded-md border-2 border-line bg-card px-4 py-2 font-display hover:bg-hover">Back to the case</button>}

      <header className="mx-auto mb-10 max-w-5xl text-center">
        <p className="tag text-sm uppercase tracking-[0.3em]">{SITE_NAME}</p>
        <h1 className="mt-3 font-display text-5xl text-card drop-shadow-[0_3px_0_rgb(0_0_0/0.45)]">Detectives&apos; Briefing Room</h1>
        <p className="mt-2 text-card/90">Set up the teams, set the clock, then open the case files.</p>
        <p className="mt-2 text-sm font-bold">
          <a href={HUB_URL} className="text-tag hover:underline">← All games</a>
        </p>
        <div className="mt-6">
          {session ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-display text-xl text-tag">Game ready!</p>
              <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={busy} onClick={() => window.confirm('Close this game? Every student will be sent back to the join page.') && onCloseGame()}>Close game and start fresh</Button>
            </div>
          ) : <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create new game'}</Button>}
          {error && <p className="mt-3 rounded-md bg-card px-3 py-2 font-bold text-bad">{error}</p>}
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <Paper className="-rotate-1">
          <h2 className="font-display text-2xl text-accent">Join</h2>
          <p className="mt-3">Join code: {session ? <span className="font-display text-3xl tracking-widest text-stamp">{session.joinCode}</span> : <span className="text-muted">Not created yet</span>}</p>
          {session && (
            <div className="mt-5 flex flex-col items-center">
              <div className="rounded-md bg-white p-4 shadow"><QRCodeSVG value={joinUrl} size={200} title={`Join code ${session.joinCode}`} /></div>
              <p className="mt-3 text-center text-sm text-muted">Students scan this with their phone camera to join.</p>
            </div>
          )}
          <div className="mt-6 rounded-md border-2 border-dashed border-line p-4 text-sm">
            <p className="font-display text-base">The case, in four acts</p>
            <ol className="mt-2 space-y-1.5">
              {ACTS.map((a) => <li key={a.act}><span className="font-bold">{a.emoji} Act {a.act}: {a.title}.</span> <span className="text-muted">{a.what}.</span></li>)}
            </ol>
            <p className="mt-2 text-muted">Every team gets its own case (a different stolen medicine, different numbers), so no copying. One <b className="text-ink">lead detective</b> types each answer; the role rotates every step.</p>
          </div>
        </Paper>

        <Paper className="rotate-1">
          <h2 className="font-display text-2xl text-accent">Teams</h2>
          <div className="mt-4 space-y-2">
            {teamNames.map((name, i) => (
              <div key={i} className="flex items-center gap-3 overflow-hidden rounded-md border-2 border-line bg-panel">
                <span className="w-2 self-stretch" style={{ background: TEAM_COLORS[i] }} aria-hidden="true" />
                <input className="min-w-0 flex-1 bg-transparent py-2.5 font-display text-lg outline-none" value={name} maxLength={40} disabled={finalized}
                  aria-label={`Name for team ${i + 1}`} onChange={(e) => setTeamNames(teamNames.map((n, k) => (k === i ? e.target.value : n)))} />
                {finalized && <span className="pr-3 text-sm text-muted">{sizes[i]} detective{sizes[i] === 1 ? '' : 's'}</span>}
                {!finalized && teamNames.length > MIN_TEAMS && (
                  <button type="button" onClick={() => setTeamNames(teamNames.filter((_, k) => k !== i))} aria-label={`Remove team ${i + 1}`} className="mr-3 px-2 text-muted hover:text-bad">✕</button>
                )}
              </div>
            ))}
          </div>
          {!finalized && teamNames.length < MAX_TEAMS && <Button variant="outline" className="mt-3 w-full" onClick={() => setTeamNames([...teamNames, `Team ${teamNames.length + 1}`])}>+ Add team ({teamNames.length}/{MAX_TEAMS})</Button>}
          <p className="mt-2 text-xs text-muted">Teams of 2 to 5 work best. Every team needs at least one student.</p>
          <Button className="mt-4 w-full" disabled={!session || finalized || busy} onClick={finalize}>{finalized ? 'Teams finalized' : 'Finalize teams'}</Button>
          {finalized && <button type="button" className="mt-2 text-sm font-bold text-accent" onClick={() => setFinalized(false)}>Edit teams</button>}

          {finalized && (
            <div className="mt-6 space-y-4 border-t-2 border-dashed border-line pt-4">
              <div>
                <Label>Case clock</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => <button key={String(d)} type="button" className={choice(duration === d)} onClick={() => setDuration(d)}>{d ? `${d} min` : 'None'}</button>)}
                </div>
                <p className="mt-1 text-xs text-muted">When time runs out, every team scores what it has solved. With no clock, it ends when every case is closed (or you end it).</p>
              </div>
              {emptyTeams.length > 0 && <p className="text-sm font-bold text-bad">Every team needs at least one student. Still empty: {emptyTeams.map(teamLabel).join(', ')}.</p>}
              <Button variant="stamp" className="w-full" disabled={busy || emptyTeams.length > 0} onClick={() => (duration && !howToSkipped() ? setGuide(true) : start())}>
                {busy ? 'Opening the case files…' : '🕵️ Open the case files'}
              </Button>
            </div>
          )}
        </Paper>

        <Paper className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-accent">Detectives waiting</h2>
            <Button variant="outline" className="!px-4 !py-2 text-sm" disabled={!finalized || waiting.length === 0 || busy} onClick={() => studentAction({ action: 'assign_random' })}>🎲 Randomly assign teams ({waiting.length})</Button>
          </div>
          {!session && <p className="mt-4 text-muted">Create the game first, then students can join with the code.</p>}
          {session && !finalized && <p className="mt-4 text-muted">Finalize the teams so you can put students on them.</p>}
          {session && players.length === 0 && <p className="mt-4 text-muted">No students have joined yet.</p>}
          {waiting.length > 0 && (
            <ul className="mt-4 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-line bg-panel px-3 py-2">
                  <span className="font-bold">{p.display_name}</span>
                  <span className="flex flex-wrap gap-2">
                    {teamNames.map((_, i) => (
                      <button key={i} type="button" disabled={!finalized || busy} onClick={() => studentAction({ action: 'approve_player', player_id: p.id, team_index: i })}
                        className="rounded-md px-3 py-1 text-sm font-bold text-white disabled:opacity-40" style={{ background: TEAM_COLORS[i] }}>{teamLabel(i)}</button>
                    ))}
                    <button type="button" disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="rounded-md border-2 border-line px-3 py-1 text-sm font-bold hover:bg-hover">Remove</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {players.some((p) => p.approval_status === 'approved') && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {teamNames.map((_, i) => (
                <div key={i} className="overflow-hidden rounded-md border-2 border-line bg-panel">
                  <div className="h-1.5" style={{ background: TEAM_COLORS[i] }} />
                  <div className="p-3">
                    <p className="font-display">{teamLabel(i)}</p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {players.filter((p) => p.approval_status === 'approved' && p.team_index === i).map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span>{p.display_name}</span>
                          <button type="button" aria-label={`Remove ${p.display_name}`} disabled={busy} onClick={() => studentAction({ action: 'remove_player', player_id: p.id })} className="text-xs font-bold text-bad">✕</button>
                        </li>
                      ))}
                      {sizes[i] === 0 && <li className="text-xs font-bold text-bad">Needs a student</li>}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Paper>
      </section>
    </main>
  )
}

// The leader turned the how-to guide off on this computer ("Don't show this again")
function howToSkipped() {
  try {
    return Boolean(localStorage.getItem('pltlHowToSkip:limitingsuspect'))
  } catch {
    return false
  }
}
