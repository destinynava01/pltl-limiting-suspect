// Change these to rebrand the game.
export const SITE_NAME = 'Limiting Suspect'
export const SITE_TAGLINE = 'A pharmacy break-in, solved with stoichiometry.'
export const HUB_URL = 'https://pltl-game-hub.vercel.app'

export const MIN_TEAMS = 1
export const MAX_TEAMS = 8
export const TEAM_COLORS = ['#c0392b', '#1f3a5f', '#1e8449', '#b9770e', '#6c3483', '#117a65', '#a04000', '#2e4053']
export const DURATIONS = [null, 20, 30, 45] // minutes (null: no clock)

// The four acts (steps 0-3 are Act 1's four equations)
export const ACTS = [
  { act: 1, title: 'The Lab Tests', what: 'Balance displacement and acid-base reactions', emoji: '⚗️' },
  { act: 2, title: 'The Residue', what: 'Grams of AgCl → moles → molar mass → which medicine', emoji: '🔬' },
  { act: 3, title: 'The Prescription Log', what: 'mg → mmol: match each patient; the leftover was stolen', emoji: '📋' },
  { act: 4, title: 'The Accusation', what: 'How many mmol are missing? Whose vial matches?', emoji: '🕵️' },
]
export const actOf = (step) => (step <= 3 ? 1 : step - 2)

// Molar masses students use (the same values the server checks with)
export const ATOMIC_MASS = { C: 12.01, H: 1.008, N: 14.01, O: 16.0, S: 32.07, Cl: 35.45, Ag: 107.87 }
export const MOLAR = { AgCl: 143.32 }

// "Ca3(PO4)2" with subscript digits (a coefficient-free formula, so every digit is a subscript)
export const sub = (formula) => formula.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d])

// "Zn + HCl → ZnCl2 + H2" with the given coefficients (null: blanks), as the case notes show it
export const equation = (test, coefs) => test.species
  .map((s, i) => `${i > 0 ? (i === test.reactants ? ' → ' : ' + ') : ''}${coefs ? (coefs[i] === 1 ? '' : coefs[i] ?? '?') : '__'}${sub(s)}`)
  .join('')

// mm:ss left on the case clock
export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
