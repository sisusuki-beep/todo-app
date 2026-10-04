import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary: 'bg-muted text-foreground hover:bg-muted/70',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 dark:text-background',
      },
      size: {
        md: 'h-10 px-4',
        sm: 'h-8 px-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface Props
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, type = 'button', ...props }: Props) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export const fieldClass =
  'w-full rounded-lg border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 transition-colors focus-visible:border-primary'
