# Limiting Suspect

A PLTL chemistry game: a pharmacy break-in solved with stoichiometry. Each team gets its own generated case (its own
stolen medicine, patients, suspects and numbers) and cracks it in four acts:

1. **The Lab Files:** balance the combustion equation of each of the four medicines on the suspect shelf.
2. **The Residue:** grams of CO₂ and H₂O → moles; the mole ratio matches one medicine's balanced equation.
3. **The Prescription Log:** convert each patient's dose (mg) to mmol to match the pharmacy log; the medicine nobody
   was prescribed is the stolen one.
4. **The Accusation:** how many mmol are missing from the stolen bottle? The thief's vial holds exactly that much.

One student per team is the **lead detective** and types each answer; the role rotates every clue. Wrong tries cost
a quarter of a clue's points; after three, the team can see the answer and move on (0 points). The leader can set a
case clock (20, 30 or 45 minutes). Every phone has a calculator and a molar-mass reference card.

The projector is a corkboard with every team's case file, stamped as each clue is solved. The results show every
team's whole case with the answers, and an Excel download.

## Pages

| Path | Who | What |
|---|---|---|
| `/` | Leader | Lobby (teams, case clock), then the corkboard and results |
| `/join` | Students | Join with the code, read the case file, answer when you're the lead detective |

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the shared PLTL Supabase project's URL and publishable key.
3. `npm run dev`

The backend lives in the shared `supabase-backend` repo: the `ls-game` and `ls-play` Edge Functions, the case
generator and checking in `_shared/limitingSuspect.ts` (with tests), and the `limiting_suspect` migration.

On Vercel, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for **Production** (and Preview).
