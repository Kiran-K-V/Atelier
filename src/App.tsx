import { lazy, Suspense } from 'react'
import { BoardLoading } from './ui/BoardLoading'
import { Shell } from './ui/Shell'

const Scene = lazy(() => import('./scene/Scene'))

export function App() {
  return (
    <Shell
      board={
        <Suspense fallback={<BoardLoading />}>
          <Scene />
        </Suspense>
      }
    />
  )
}
