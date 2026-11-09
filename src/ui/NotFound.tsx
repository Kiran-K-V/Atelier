import { Link } from 'wouter'
import { labelClass } from './styles'
import { useDocumentTitle } from './useDocumentTitle'
import { AcademyLayout } from './academy/AcademyLayout'

export function NotFound() {
  useDocumentTitle('Not found · Atelier Chess')
  return (
    <AcademyLayout>
      <p className={`${labelClass} m-0`}>Not found</p>
      <h1 className="atelier-display m-0 mt-3 text-3xl font-light leading-tight text-text lg:text-4xl">This page does not exist.</h1>
      <p className="m-0 mt-4 text-text-muted">
        <Link href="/" className="text-accent-strong underline underline-offset-4 hover:text-text">Back to the board</Link>
        {' · '}
        <Link href="/academy" className="text-accent-strong underline underline-offset-4 hover:text-text">Academy</Link>
      </p>
    </AcademyLayout>
  )
}
