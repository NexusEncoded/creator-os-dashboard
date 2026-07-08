import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-base-surface border border-base-border rounded-2xl shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
