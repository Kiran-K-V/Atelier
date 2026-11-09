import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { useSettings } from '../store/settings'
import type { QualityTier, ThemePreference } from '../store/types'
import { bezier, sec } from './motionTokens'
import { Segmented } from './Segmented'
import { labelClass } from './styles'
import { useFocusTrap } from './useFocusTrap'

type QualityChoice = QualityTier | 'auto'
type MotionChoice = 'system' | 'on' | 'off'
type SoundChoice = 'on' | 'off'
type TacticsChoice = 'on' | 'off'

const THEMES: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const QUALITIES: readonly { value: QualityChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]
const MOTIONS: readonly { value: MotionChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]
const SOUNDS: readonly { value: SoundChoice; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]
const TACTICS: readonly { value: TacticsChoice; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

const motionChoice = (user: boolean | null): MotionChoice => (user === null ? 'system' : user ? 'on' : 'off')
const motionValue = (choice: MotionChoice): boolean | null => (choice === 'system' ? null : choice === 'on')

// Eight spokes around a ring: a gear drawn with plain strokes.
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="7" />
      <path d="M19 12h2.5M16.95 16.95l1.77 1.77M12 19v2.5M7.05 16.95l-1.77 1.77M5 12H2.5M7.05 7.05 5.28 5.28M12 5V2.5M16.95 7.05l1.77-1.77" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

const iconButton =
  'grid size-11 place-items-center rounded-xs text-text-muted transition-colors duration-fast ease-standard hover:bg-surface2 hover:text-text active:bg-surface3'

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, onClose)
  const s = useSettings()
  const enter = { duration: sec('base'), ease: bezier('enter') }

  return (
    <motion.div
      className="fixed inset-0 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: sec('fast'), ease: bezier('standard') }}
    >
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-bg/60 lg:bg-transparent" />
      <motion.div
        ref={ref}
        role="dialog"
        aria-label="Settings"
        tabIndex={-1}
        initial={{ y: 16 }}
        animate={{ y: 0, transition: enter }}
        exit={{ y: 8, transition: { duration: sec('fast'), ease: bezier('exit') } }}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-6 overflow-y-auto border-t border-line-strong bg-surface2 px-4 pb-6 pt-3 shadow-lg outline-none lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-16 lg:w-80 lg:rounded-xs lg:border lg:px-5 lg:pt-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="atelier-display m-0 text-xl font-light text-text">Settings</h2>
          <button type="button" aria-label="Close settings" onClick={onClose} className={iconButton}>
            <CloseIcon />
          </button>
        </div>
        <Segmented legend="Theme" columns={3} options={THEMES} value={s.theme} onChange={s.setTheme} />
        <div>
          <Segmented
            legend="Quality"
            columns={4}
            options={QUALITIES}
            value={s.qualityAuto ? 'auto' : s.quality}
            onChange={s.setQuality}
          />
          {s.qualityAuto && <p className={`${labelClass} mb-0 mt-2.5 normal-case tracking-normal`}>Auto is using {s.quality}.</p>}
        </div>
        <Segmented
          legend="Reduce motion"
          columns={3}
          options={MOTIONS}
          value={motionChoice(s.reducedMotionUser)}
          onChange={(v) => s.setReducedMotion(motionValue(v))}
        />
        <Segmented
          legend="Sound"
          columns={2}
          options={SOUNDS}
          value={s.sound ? 'on' : 'off'}
          onChange={(v) => s.setSound(v === 'on')}
        />
        <Segmented
          legend="Tactic hints"
          columns={2}
          options={TACTICS}
          value={s.tactics ? 'on' : 'off'}
          onChange={(v) => s.setTactics(v === 'on')}
        />
      </motion.div>
    </motion.div>
  )
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    // Safari does not focus a button on click, so the trap cannot restore focus there.
    trigger.current?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={`-mr-3 ${iconButton}`}
      >
        <GearIcon />
      </button>
      <AnimatePresence>{open && <SettingsDialog onClose={close} />}</AnimatePresence>
    </>
  )
}
