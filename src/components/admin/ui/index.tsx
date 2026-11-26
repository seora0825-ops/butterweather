import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

const buttonStyles = {
  primary: 'border-ink bg-ink text-white hover:bg-board-ink',
  secondary: 'border-line bg-white hover:bg-cloud',
  danger: 'border-ink bg-white font-semibold hover:bg-butter-light',
  ghost: 'border-transparent hover:bg-cloud',
}

type Variant = keyof typeof buttonStyles

function buttonClass(variant: Variant, className = '') {
  return `inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-md border px-3 text-center text-sm font-medium disabled:cursor-not-allowed disabled:border-line disabled:bg-cloud disabled:text-ink-muted ${buttonStyles[variant]} ${className}`
}

export function Button({
  variant = 'secondary',
  className,
  type = 'button',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClass(variant, className)}
    />
  )
}

export function ButtonLink({
  variant = 'secondary',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />
}

export function PageHeader({
  title,
  count,
  actions,
}: {
  title: string
  count?: string
  actions?: ReactNode
}) {
  return (
    <header className="border-line flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">
          {title}
        </h1>
        {count && (
          <span className="text-ink-muted text-sm tabular-nums">{count}</span>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

const fieldClass =
  'block w-full min-w-0 rounded-md border border-ink-muted bg-white px-3 text-base text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:border-line disabled:bg-cloud disabled:text-ink-muted sm:text-sm'

export function TextField({
  className = '',
  ...props
}: ComponentProps<'input'>) {
  return <input {...props} className={`${fieldClass} min-h-11 ${className}`} />
}

export function TextArea({
  className = '',
  ...props
}: ComponentProps<'textarea'>) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} min-h-24 py-2 ${className}`}
    />
  )
}

const iconPaths = {
  chevron: 'm5 7 5 5 5-5',
  check: 'm4 10 4 4 8-8',
  alert: 'M10 4v7m0 4h.01',
  info: 'M10 8v7m0-11h.01',
}

export function AdminIcon({
  name,
  className = '',
}: {
  name: keyof typeof iconPaths
  className?: string
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 ${className}`}
    >
      <path d={iconPaths[name]} />
    </svg>
  )
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block min-w-0">
      <select
        {...props}
        className={`${fieldClass} min-h-11 appearance-none pe-9 ${className}`}
      />
      <span className="text-ink-muted pointer-events-none absolute inset-y-0 end-0 grid w-9 place-items-center">
        <AdminIcon name="chevron" />
      </span>
    </span>
  )
}

export function Checkbox({
  className = '',
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  return (
    <input
      {...props}
      type="checkbox"
      className={`accent-ink size-5 shrink-0 ${className}`}
    />
  )
}

export function FilterBar({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`border-line grid gap-3 rounded-md border bg-white p-3 [&_label]:min-w-0 [&_label]:font-medium ${className}`}
    >
      {children}
    </div>
  )
}

export function Table({
  label,
  columns,
  children,
  responsive = false,
}: {
  label: string
  columns: ReadonlyArray<string | { label: string; numeric: true }>
  children: ReactNode
  responsive?: boolean
}) {
  return (
    <div
      className={
        responsive
          ? 'lg:border-line lg:max-h-[70dvh] lg:overflow-auto lg:rounded-md lg:border'
          : 'border-line max-h-[70dvh] overflow-auto rounded-md border'
      }
    >
      <table
        aria-label={label}
        role="table"
        className={`w-full text-left ${responsive ? 'block lg:table' : ''}`}
      >
        <thead
          role="rowgroup"
          className={`bg-cloud text-ink-muted top-0 z-10 text-xs font-medium ${responsive ? 'sr-only lg:not-sr-only lg:sticky' : 'sticky'}`}
        >
          <tr role="row">
            {columns.map((column) => {
              const label = typeof column === 'string' ? column : column.label
              return (
                <th
                  key={label}
                  role="columnheader"
                  scope="col"
                  className={`border-line border-b px-3 py-3 whitespace-nowrap ${typeof column === 'string' ? 'text-left' : 'text-right'}`}
                >
                  {label}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody
          role="rowgroup"
          className={responsive ? 'grid gap-3 lg:table-row-group' : 'bg-white'}
        >
          {children}
        </tbody>
      </table>
    </div>
  )
}

export const numericCell = 'text-right whitespace-nowrap tabular-nums'

const badgeStyles = {
  neutral: 'border-line bg-white text-ink',
  quiet: 'border-line bg-cloud text-ink-muted',
  emphasis: 'border-butter bg-butter-light text-ink',
  strong: 'border-ink bg-ink text-white',
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: keyof typeof badgeStyles
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap ${badgeStyles[tone]}`}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="border-line grid justify-items-start gap-3 rounded-md border bg-white px-4 py-8 text-sm">
      <p className="font-medium">{children}</p>
      {action}
    </div>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'error'
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 py-3 text-sm wrap-anywhere whitespace-pre-line ${tone === 'error' ? 'border-ink bg-butter-light' : 'border-line bg-white'}`}
    >
      <AdminIcon
        name={
          tone === 'error' ? 'alert' : tone === 'success' ? 'check' : 'info'
        }
        className="mt-0.5"
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
