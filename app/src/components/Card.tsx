import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

type BaseProps = {
  children: ReactNode
  sponsored?: boolean
  className?: string
}

type DivProps = BaseProps & HTMLAttributes<HTMLDivElement> & { as?: 'div' }
type BtnProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as: 'button'
    onPress?: () => void
  }

type Props = DivProps | BtnProps

export function Card(props: Props) {
  const { children, sponsored, className = '' } = props
  const cls = `ds-card ${sponsored ? 'ds-card--sponsored card sponsored' : 'card'} ${className}`.trim()

  if (props.as === 'button') {
    const { onPress, onClick, ...rest } = props
    return (
      <button
        type="button"
        className={`${cls} pressable-card`}
        onClick={onPress ?? onClick}
        {...rest}
      >
        {children}
      </button>
    )
  }

  const { as: _a, ...divRest } = props
  return (
    <div className={cls} {...divRest}>
      {children}
    </div>
  )
}
