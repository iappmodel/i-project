import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function DemoModeBadge({ className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider',
        'border-amber-500/50 bg-amber-500/10 text-amber-400',
        'min-h-[24px] min-w-[60px] justify-center',
        className,
      )}
      aria-label="Demo mode active"
    >
      Demo Mode
    </span>
  )
}
