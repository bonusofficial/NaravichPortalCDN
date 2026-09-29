import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article'
}

export function Card({ as: Tag = 'section', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cn('card', className)} {...rest}>
      {children}
    </Tag>
  )
}

interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  divided?: boolean
  titleId?: string
  level?: 2 | 3
}

export function CardHeader({ title, subtitle, actions, divided, titleId, level = 2 }: CardHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className={cn('card__header', divided && 'card__header--divided')}>
      <div className="card__heading">
        <Heading className="card__title" id={titleId}>
          {title}
        </Heading>
        {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="card__actions">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, flush, children }: { className?: string; flush?: boolean; children: ReactNode }) {
  return <div className={cn('card__body', flush && 'card__body--flush', className)}>{children}</div>
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="card__footer">{children}</div>
}
