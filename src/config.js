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
  { act: 1, title: 'The Lab Files', what: 'Balance each medicine\'s combustion equation', emoji: '⚗️' },
  { act: 2, title: 'The Residue', what: 'Grams of CO₂ and H₂O → moles → which medicine', emoji: '🔬' },
  { act: 3, title: 'The Prescription Log', what: 'mg → mmol: match each patient; the leftover was stolen', emoji: '📋' },
  { act: 4, title: 'The Accusation', what: 'How many mmol are missing? Whose vial matches?', emoji: '🕵️' },
]
export const actOf = (step) => (step <= 3 ? 1 : step - 2)

// Molar masses students use (the same values the server checks with)
export const ATOMIC_MASS = { C: 12.01, H: 1.008, N: 14.01, O: 16.0 }
export const MOLAR = { CO2: 44.01, H2O: 18.02 }

// "C9H8O4" with subscript digits
export const sub = (formula) => formula.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d])

// mm:ss left on the case clock
export function clockText(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
