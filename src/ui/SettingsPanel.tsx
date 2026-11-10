import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { BoardSet } from '../design/tokens'
import { useSettings } from '../store/settings'
import type { QualityTier, ThemePreference } from '../store/types'
import { Button } from './Button'
import { CloseIcon, GearIcon } from './icons'
import { bezier, sec } from './motionTokens'
import { Segmented } from './Segmented'
import { labelClass } from './styles'
import { useFocusTrap } from './useFocusTrap'

type QualityChoice = QualityTier | 'auto'
type MotionChoice = 'system' | 'on' | 'off'
type SoundChoice = 'on' | 'off'
type TacticsChoice = 'on' | 'off'

const SETS: readonly { value: BoardSet; label: string }[] = [
  { value: 'wood', label: 'Wood' },
  { value: 'glacier', label: 'Glacier' },
  { value: 'atelier', label: 'Atelier' },
]
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
      <div aria-hidden onClick={onClose} className="glass-scrim-sheet absolute inset-0 bg-bg/60 lg:bg-transparent" />
      <motion.div
        ref={ref}
        role="dialog"
        aria-label="Settings"
        tabIndex={-1}
        initial={{ y: 16 }}
        animate={{ y: 0, transition: enter }}
        exit={{ y: 8, transition: { duration: sec('fast'), ease: bezier('exit') } }}
        className="glass absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-6 overflow-y-auto rounded-t-md border-t border-line-strong bg-surface2 px-4 pb-6 pt-3 shadow-lg outline-none lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-[5.5rem] lg:w-80 lg:rounded-md lg:border lg:px-5 lg:pt-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="atelier-display m-0 text-xl font-light text-text">Settings</h2>
          <Button variant="ghost" iconOnly aria-label="Close settings" onClick={onClose} className="-mr-2" icon={<CloseIcon />} />
        </div>
        <Segmented legend="Board set" columns={3} options={SETS} value={s.boardSet} onChange={s.setBoardSet} />
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
      <Button
        ref={trigger}
        iconOnly
        aria-label="Settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className="shrink-0 text-text-muted enabled:hover:text-text"
        icon={<GearIcon />}
      />
      {/* Portalled to body: the glass panel's backdrop-filter would otherwise trap this fixed layer inside the panel. */}
      {createPortal(<AnimatePresence>{open && <SettingsDialog onClose={close} />}</AnimatePresence>, document.body)}
    </>
  )
}
