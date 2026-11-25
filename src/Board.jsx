import { useCallback, useEffect, useRef, useState } from 'react'
import HowToPlay from './HowToPlay'
import { SLIDES as HOW_TO_SLIDES } from './howToSlides'
import { lsGame, watchGame } from './api'
import Results from './Results'
import { ACTS, actOf, clockText, SITE_NAME } from './config'
import { playClosed, playSolved, playWrong, setSoundOn, soundOn } from './sounds'
import { Button, Stamp } from './ui'

// The projector: a corkboard with every team's case file pinned up. As a team cracks each clue, it gets stamped
// (every team has its own case, so showing a team's answers can't help another team). The case clock counts down
// at the top; the game ends when it runs out or every case is closed.
export default function Board({ session, onLobby, onNewGame }) {
  const [board, setBoard] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sound, setSound] = useState(soundOn)
  const [now, setNow] = useState(() => Date.now())
  const last = useRef(null)

  const call = useCallback((payload) => lsGame({ ...payload, game_id: session.gameId, host_token: session.hostToken }), [session])

  // One sound per update, the biggest news first
  const listen = (d) => {
    const events = new Map(d.teams.map((t) => [t.index, t.last_event ?? null]))
    if (last.current) {
      const kinds = new Set()
      for (const [i, e] of events) if (e && e.at !== last.current.get(i)?.at) kinds.add(e.kind)
      if (kinds.has('closed')) playClosed()
      else if (kinds.has('right') || kinds.has('revealed')) playSolved()
      else if (kinds.has('wrong')) playWrong()
    }
    last.current = events
  }

  const load = useCallback(() => call({ action: 'board' }).then((d) => { listen(d); setBoard({ ...d, offset: Date.parse(d.server_now) - Date.now() }); setError('') }).catch((e) => setError(e.message)), [call])
  useEffect(() => {
    load()
    return watchGame(session.gameId, ['state', 'lobby'], load, 5000)
  }, [session, load])
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id) }, [])
  // When the clock runs out, ask the server (it closes the case files)
  const left = board?.game.ends_at ? Date.parse(board.game.ends_at) - (now + board.offset) : null
  useEffect(() => { if (left !== null && left <= 0 && board?.game.status === 'playing') load() }, [left, board?.game.status, load])

  async function end() {
    if (!window.confirm('Close every case file now and see the results?')) return
    setBusy(true)
    try { await call({ action: 'end_game' }); await load() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!board) return <main className="cork-bg flex min-h-dvh items-center justify-center"><p className="font-display text-card">{error || 'Pinning up the case files…'}</p></main>
  if (board.game.status === 'finished') return <Results session={session} onNewGame={onNewGame} onLobby={onLobby} />
  const serverNow = now + board.offset

  return (
    <main className="cork-bg min-h-dvh p-4 text-ink sm:p-6">
      {/* The visual how-to guide: opens once per game, skippable */}
      <HowToPlay site="limitingsuspect" gameId={session.gameId} name={SITE_NAME} accent="#c0392b" slides={HOW_TO_SLIDES} autoOpen={!board.game.ends_at}
        note={board.game.ends_at ? 'The case clock keeps running while this is open.' : ''} />
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="tag text-sm uppercase tracking-[0.25em]">join code {session.joinCode}</p>
          <h1 className="mt-2 font-display text-5xl text-card drop-shadow-[0_3px_0_rgb(0_0_0/0.45)]">🕵️ {SITE_NAME}</h1>
        </div>
        {left !== null && (
          <div className={`paper rounded-md px-5 py-2 text-center ${left < 120000 ? 'shake' : ''}`} key={left < 120000 ? Math.floor(left / 10000) : 'clock'}>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-muted">Case clock</p>
            <p className={`font-display text-4xl ${left < 120000 ? 'text-stamp' : 'text-accent'}`}>{clockText(left)}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {board.waiting > 0 && <Button variant="stamp" className="!px-4 !py-2 text-sm" onClick={onLobby}>{board.waiting} waiting to join</Button>}
          <Button variant="outline" className="!px-4 !py-2 text-sm" aria-label={sound ? 'Mute sounds' : 'Turn sounds on'} title={sound ? 'Mute sounds' : 'Turn sounds on'}
            onClick={() => { setSoundOn(!sound); setSound(!sound); if (!sound) playSolved() }}>
            {sound ? '🔊' : '🔇'}
          </Button>
          <Button variant="outline" className="!px-4 !py-2 text-sm" onClick={onLobby}>Lobby</Button>
          <Button variant="stamp" className="!px-4 !py-2 text-sm" disabled={busy} onClick={end}>End game</Button>
        </div>
      </header>
      {error && <p className="mx-auto mt-3 max-w-7xl rounded-md bg-card px-3 py-2 font-bold text-bad">{error}</p>}

      <section className={`mx-auto mt-10 grid max-w-7xl gap-8 ${board.teams.length > 1 ? 'md:grid-cols-2' : ''} ${board.teams.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {board.teams.map((t, i) => <CaseFile key={t.index} team={t} tilt={i % 2 ? 'rotate-1' : '-rotate-1'} serverNow={serverNow} />)}
      </section>
    </main>
  )
}

function CaseFile({ team, tilt, serverNow }) {
  const c = team.case
  if (!c) return null
  const f = c.file
  const e = team.last_event
  const fresh = e && serverNow - Date.parse(e.at) < 6000
  const act = actOf(c.step)
  const medal = ['🥇', '🥈', '🥉']
  const solvedAct = (a) => (a === 1 ? c.step >= 4 : c.step >= a + 3)
  const lines = {
    1: `${Math.min(c.step, 4)}/4 lab files balanced`,
    2: f.weapon ? `Residue: ${f.weapon.name}` : 'Residue: ?',
    3: f.stolen ? `Stolen: ${f.stolen.name}` : 'Stolen: ?',
    4: f.suspects.some((s) => s.thief) ? `Thief: ${f.suspects.find((s) => s.thief).name}` : 'Thief: ?',
  }
  return (
    <article className={`paper pinned ${tilt} rounded-md ${fresh && e.kind === 'wrong' ? 'shake' : ''}`} key={fresh && e.kind === 'wrong' ? e.at : 'file'}>
      <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-line px-5 pb-3 pt-5">
        <div className="min-w-0">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-muted">Case file · {f.hospital}</p>
          <h2 className="truncate font-display text-3xl" style={{ color: team.color }}>{team.name}</h2>
          <p className="truncate text-sm text-muted">{team.members.join(', ')}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-accent">{c.points}</p>
          <p className="text-sm text-muted">points</p>
        </div>
      </div>

      <ol className="space-y-2 px-5 py-4">
        {ACTS.map((a) => (
          <li key={a.act} className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 ${a.act === act && !c.finished ? 'bg-tag/40' : 'bg-panel'}`}>
            <span className={`text-sm ${a.act > act ? 'text-muted' : ''}`}>
              <b>{a.emoji} Act {a.act}</b> · {a.act <= act || c.finished ? lines[a.act] : a.title}
            </span>
            {solvedAct(a.act) && <Stamp className="shrink-0 text-xs">Solved</Stamp>}
          </li>
        ))}
      </ol>

      <div className="px-5 pb-5">
        {c.finished ? (
          <p className="text-center"><Stamp className="text-2xl">{medal[c.finish_rank - 1] ?? ''} Case closed</Stamp></p>
        ) : (
          <p className="text-sm">🕵️ Lead detective: <b>{team.lead ?? '…'}</b>{c.misses ? <span className="text-bad"> · {c.misses} wrong tr{c.misses === 1 ? 'y' : 'ies'} on this clue</span> : ''}</p>
        )}
        {fresh && !c.finished && (
          <p className={`pop mt-2 rounded-md px-3 py-2 text-sm font-semibold ${e.kind === 'wrong' ? 'bg-bad-soft text-bad' : e.kind === 'revealed' ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`} key={e.at}>
            {e.kind === 'wrong' && `❌ ${e.by}'s answer didn't check out`}
            {e.kind === 'right' && `✅ ${e.by} cracked a clue!`}
            {e.kind === 'revealed' && `📂 ${e.by} asked to see the answer`}
          </p>
        )}
      </div>
    </article>
  )
}
