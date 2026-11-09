import { lazy, Suspense } from 'react'
import { Route, Switch } from 'wouter'
import { BoardLoading } from './ui/BoardLoading'
import { NotFound } from './ui/NotFound'
import { Shell } from './ui/Shell'
import { AcademyHome } from './ui/academy/AcademyHome'
import { AcademyLayout } from './ui/academy/AcademyLayout'
import { LessonPage } from './ui/academy/LessonPage'
import { useDocumentTitle } from './ui/useDocumentTitle'

// Only imported when the Play route renders, so Academy pages never fetch the 3D chunk.
const Scene = lazy(() => import('./scene/Scene'))

function Play() {
  useDocumentTitle('Atelier Chess')
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

function Academy() {
  useDocumentTitle('Academy · Atelier Chess')
  return (
    <AcademyLayout>
      <AcademyHome />
    </AcademyLayout>
  )
}

export function App() {
  return (
    <Switch>
      <Route path="/" component={Play} />
      <Route path="/academy" component={Academy} />
      <Route path="/academy/:skillId">{(params) => <LessonPage skillId={params.skillId} />}</Route>
      <Route component={NotFound} />
    </Switch>
  )
}
