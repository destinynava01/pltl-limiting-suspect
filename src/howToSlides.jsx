/* eslint-disable react-refresh/only-export-components -- static slide content with small local helpers */
// The "How to play" slides for Limiting Suspect (shown before the case clock starts). The art uses the same pieces
// as the real game (pinned paper, evidence tags, the red stamp).

function Sheet({ children, className = '' }) {
  return <div className={`paper pinned w-full max-w-xs rounded-md p-4 text-left text-sm text-ink ${className}`}>{children}</div>
}
function Box({ children }) {
  return <span className="inline-block w-9 rounded border-2 border-line bg-white py-0.5 text-center font-bold">{children}</span>
}

export const SLIDES = [
  {
    title: 'A pharmacy break-in',
    text: 'Someone broke into the hospital pharmacy and a patient fell ill. Every team gets its own case (its own stolen medicine and numbers), so there\'s no copying. Solve it in four acts.',
    art: (
      <Sheet className="-rotate-2">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-muted">Case file · St. Mercy Hospital</p>
        <ol className="mt-2 space-y-1">
          <li>⚗️ <b>Act 1</b> Balance the lab files</li>
          <li>🔬 <b>Act 2</b> Identify the residue</li>
          <li>📋 <b>Act 3</b> Check the prescription log</li>
          <li>🕵️ <b>Act 4</b> Name the thief</li>
        </ol>
      </Sheet>
    ),
  },
  {
    title: 'One lead detective at a time',
    text: 'Everyone\'s phone shows the evidence, but one student is the lead detective and types the answer. The role moves to the next teammate after every clue. Talk it through and check the math together; there\'s a calculator on every phone.',
    art: (
      <Sheet className="rotate-1">
        <p className="rounded-md bg-panel px-2 py-1.5 font-bold text-accent">🕵️ You&apos;re the lead detective for this clue.</p>
        <p className="mt-2 rounded-md bg-panel px-2 py-1.5">🕵️ <b>Maria</b> is the lead detective. Help out loud!</p>
      </Sheet>
    ),
  },
  {
    title: 'Act 1: balance the lab tests',
    text: 'The crime lab ran four test reactions: a single displacement, a double displacement, a strong acid with a strong base, and one more. Fill in the smallest whole-number coefficients. Each balanced test unlocks one suspect medicine\'s file (its molar mass).',
    art: (
      <Sheet>
        <p className="font-display text-lg">Single displacement</p>
        <p className="mt-2 flex flex-wrap items-center gap-1 text-base font-bold"><Box>2</Box>Al + <Box>6</Box>HCl → <Box>2</Box>AlCl₃ + <Box>3</Box>H₂</p>
      </Sheet>
    ),
  },
  {
    title: 'Act 2: the residue',
    text: 'The medicines are hydrochloride salts. The lab dissolved the residue from the cup and added silver nitrate: its chloride came out as AgCl, 1 mol per mol of medicine. Grams of AgCl → moles → molar mass of the residue. Only one medicine matches.',
    art: (
      <Sheet>
        <div className="grid grid-cols-2 gap-2 text-center">
          <p className="rounded-md bg-white p-2 shadow"><span className="tag text-xs">EVIDENCE A</span><span className="block font-display text-xl">0.350 g</span>residue</p>
          <p className="rounded-md bg-white p-2 shadow"><span className="tag text-xs">EVIDENCE B</span><span className="block font-display text-xl">0.249 g</span>AgCl</p>
        </div>
        <p className="mt-2 text-center">0.249 ÷ 143.32 = 0.00174 mol → 0.350 ÷ 0.00174 = <b>201 g/mol</b> → Pseudoephedrine HCl!</p>
      </Sheet>
    ),
  },
  {
    title: 'Acts 3 & 4: follow the moles',
    text: 'Convert each patient\'s dose to mmol (mg ÷ 1000 = g, ÷ molar mass = mol, × 1000 = mmol) to match the pharmacy log; the medicine nobody was prescribed was stolen. Then work out how many mmol are missing from its bottle: the thief\'s vial holds exactly that much.',
    art: (
      <Sheet className="-rotate-1">
        <p className="flex justify-between"><span>💉 Nurse Kim</span><b>vial: 6.94 mmol</b></p>
        <p className="mt-1 flex justify-between"><span>💊 Mr. Barrow</span><b>vial: 8.28 mmol</b></p>
        <p className="mt-3 text-center"><span className="stamp text-lg">Thief!</span></p>
      </Sheet>
    ),
  },
  {
    title: 'Points and the clock',
    text: 'Each clue scores points (the accusation scores the most); every wrong try costs a quarter of that clue. Stuck after three tries? You can see the answer and move on, for 0 points. Close the case first for a bonus!',
    art: (
      <Sheet>
        <p className="flex justify-between font-display text-lg"><span>🥇 Team 2</span><span className="text-accent">460</span></p>
        <p className="mt-1 flex justify-between font-display text-lg"><span>🥈 Team 1</span><span className="text-accent">395</span></p>
        <p className="mt-3 text-center"><span className="stamp text-xl">Case closed</span></p>
      </Sheet>
    ),
  },
]

// The guide's own look (the case file: cream paper with a red-and-navy header stripe, a cork art box, typewriter
// lettering). HowToPlay.jsx reads this; anything left out uses its plain dark look.
export const SKIN = {
  backdrop: 'bg-[#2b2118]/75',
  panel: 'rounded-md bg-card text-ink shadow-2xl before:block before:h-2 before:content-[\'\'] before:bg-[repeating-linear-gradient(90deg,#c0392b_0_24px,#1f3a5f_24px_48px)]',
  glow: false,
  label: 'font-display text-sm uppercase tracking-[0.25em] text-stamp',
  skip: 'rounded-md border-2 border-line bg-panel px-3 py-1 text-sm font-bold text-muted hover:bg-hover',
  art: 'cork-bg rounded-md',
  step: 'font-display text-sm uppercase tracking-widest text-muted',
  title: 'font-display text-3xl leading-tight text-accent sm:text-4xl',
  text: 'text-lg leading-relaxed text-ink',
  footer: 'border-t-2 border-dashed border-line bg-panel',
  check: 'text-sm text-muted',
  back: 'rounded-md border-2 border-line bg-card px-4 py-2 font-display text-ink hover:bg-hover',
  next: 'rounded-md bg-accent px-5 py-2 font-display text-lg text-on-accent hover:brightness-125',
  dotOff: '#d6c49c',
  launcher: 'rounded-md border-2 border-line bg-card px-4 py-2 font-display text-sm text-accent shadow-lg hover:bg-hover',
}
