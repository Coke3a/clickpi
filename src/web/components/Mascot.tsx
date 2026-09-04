import './Mascot.css'

export type MascotMood = 'happy' | 'idle'

const FACES: Record<MascotMood, { eyes: string; mouth: string }> = {
  happy: {
    eyes:
      '<path d="M31 38q5-7 10 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M51 38q5-7 10 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
    mouth: '<path d="M37 49q9 10 18 0" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
  },
  idle: {
    eyes: '<circle cx="36" cy="38" r="3.5"/><circle cx="56" cy="38" r="3.5"/>',
    mouth: '<path d="M40 50h12" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" fill="none"/>',
  },
}

/**
 * A small map-pin character carrying the product's "Map" identity into
 * onboarding and empty states. Purely decorative — always aria-hidden.
 */
export function Mascot({ mood = 'happy', size = 84 }: { mood?: MascotMood; size?: number }) {
  const face = FACES[mood]
  return (
    <div className="mascot" aria-hidden="true" style={{ width: size, height: size }}>
      <svg viewBox="0 0 92 100" fill="none" width="100%" height="100%">
        <ellipse cx="46" cy="93" rx="20" ry="5" fill="var(--c-lavender)" opacity="0.7" />
        <path
          d="M46 4C25.6 4 9 20.4 9 40.6 9 63 34 84 43.4 95.2a3.4 3.4 0 0 0 5.2 0C58 84 83 63 83 40.6 83 20.4 66.4 4 46 4Z"
          fill="var(--c-accent)"
        />
        <circle cx="46" cy="41" r="24" fill="var(--c-cream)" />
        <g color="var(--c-ink)" dangerouslySetInnerHTML={{ __html: face.eyes + face.mouth }} />
        <circle cx="31" cy="46" r="4.5" fill="var(--c-accent-deep)" opacity="0.55" />
        <circle cx="61" cy="46" r="4.5" fill="var(--c-accent-deep)" opacity="0.55" />
      </svg>
    </div>
  )
}
