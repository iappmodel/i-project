import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'secondary'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  primary: 'ds-btn',
  ghost: 'ds-btn ds-btn--ghost',
  secondary: 'ds-btn ds-btn--secondary',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button type="button" className={`${variantClass[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
