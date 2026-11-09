// Line icons on a 24px grid, 1.6px strokes, drawn in currentColor.
const props = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const UndoIcon = () => (
  <svg {...props} width="18" height="18">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)

export const FlipIcon = () => (
  <svg {...props} width="18" height="18">
    <path d="M7 4v16M7 4 4 7M7 4l3 3" />
    <path d="M17 20V4M17 20l-3-3M17 20l3-3" />
  </svg>
)

export const PlusIcon = () => (
  <svg {...props} width="18" height="18">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

// Eight spokes around a ring: a gear drawn with plain strokes.
export const GearIcon = () => (
  <svg {...props} width="20" height="20" strokeWidth={1.5}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="7" />
    <path d="M19 12h2.5M16.95 16.95l1.77 1.77M12 19v2.5M7.05 16.95l-1.77 1.77M5 12H2.5M7.05 7.05 5.28 5.28M12 5V2.5M16.95 7.05l1.77-1.77" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...props} width="18" height="18" strokeWidth={1.5}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
