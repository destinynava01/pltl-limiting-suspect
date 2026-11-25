// Shared building blocks with the corkboard look: case-file paper pinned to cork, typewriter lettering, red stamps

export function CenterCard({ title, children }) {
  return (
    <main className="cork-bg flex min-h-dvh items-center justify-center p-4 text-ink">
      <div className="paper pinned w-full max-w-md rounded-md p-8 text-center">
        <h1 className="font-display text-4xl text-accent">{title}</h1>
        {children}
      </div>
    </main>
  )
}

export function Label({ children, className = '' }) {
  return <p className={`font-display text-sm uppercase tracking-[0.2em] text-muted ${className}`}>{children}</p>
}

const BUTTONS = {
  primary: 'bg-accent text-on-accent hover:brightness-125',
  stamp: 'bg-stamp text-white hover:brightness-110',
  outline: 'border-2 border-line bg-card text-ink hover:bg-hover',
}

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-md px-6 py-3 font-display text-lg tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${BUTTONS[variant]} ${className}`}
      {...props}
    />
  )
}

// A sheet of paper pinned to the board
export function Paper({ children, className = '', pinned = true }) {
  return <section className={`paper rounded-md p-5 ${pinned ? 'pinned' : ''} ${className}`}>{children}</section>
}

// The red rubber stamp ("SOLVED", "CASE CLOSED")
export function Stamp({ children, className = '' }) {
  return <span className={`stamp stamp-in ${className}`}>{children}</span>
}
