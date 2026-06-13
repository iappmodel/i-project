import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: string
  children: ReactNode
}

const buttonVariantClass: Record<ButtonVariant, string> = {
  default: 'mcs-btn mcs-btn--primary',
  outline: 'mcs-btn mcs-btn--outline',
  ghost: 'mcs-btn mcs-btn--ghost',
  secondary: 'mcs-btn mcs-btn--secondary',
  destructive: 'mcs-btn mcs-btn--destructive',
  link: 'mcs-btn mcs-btn--link',
}

export function Button({ variant = 'default', className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariantClass[variant], className)} {...rest}>
      {children}
    </button>
  )
}

export function Badge({
  children,
  className = '',
  variant = 'default',
}: {
  children: ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}) {
  return <span className={cn('mcs-badge', `mcs-badge--${variant}`, className)}>{children}</span>
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={cn('mcs-input', className)} {...rest} />
})

export function Label({ className = '', children, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('mcs-label', className)} {...rest}>
      {children}
    </label>
  )
}

export function Separator({ className = '' }: { className?: string }) {
  return <hr className={cn('mcs-separator', className)} />
}

export function Switch({
  checked,
  onCheckedChange,
  id,
  className = '',
}: {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  id?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      className={cn('mcs-switch', checked && 'mcs-switch--on', className)}
      onClick={() => onCheckedChange?.(!checked)}
    />
  )
}

type RadioGroupProps = {
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}


export function RadioGroup({ value = '', onValueChange, children, className = '' }: RadioGroupProps) {
  return (
    <div
      className={cn('mcs-radio-group', className)}
      data-value={value}
      onChangeCapture={(e) => {
        const target = e.target as HTMLInputElement
        if (target.type === 'radio' && target.checked) onValueChange?.(target.value)
      }}
    >
      {children}
    </div>
  )
}

export function RadioGroupItem({
  value,
  id,
  className = '',
}: {
  value: string
  id?: string
  className?: string
}) {
  return <input type="radio" id={id} value={value} name="mcs-radio" className={cn('mcs-radio', className)} />
}

type SheetProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) return null
  return (
    <div className="mcs-root immersive-glass-sheet" role="presentation">
      <button
        type="button"
        className="immersive-glass-sheet__backdrop"
        aria-label="Close checkout"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>
  )
}

export function SheetContent({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
  side?: string
}) {
  return <div className={cn('mcs-sheet-content immersive-glass-sheet__panel', className)}>{children}</div>
}

export function SheetHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <header className={cn('mcs-sheet-header immersive-glass-sheet__header', className)}>{children}</header>
}

export function SheetTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('mcs-sheet-title immersive-glass-sheet__title', className)}>{children}</h2>
}

export function SheetDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={cn('mcs-sheet-desc immersive-glass-sheet__hint', className)}>{children}</p>
}
