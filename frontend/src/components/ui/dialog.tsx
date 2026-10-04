import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

/** スマホでは下からのシート、md以上では中央モーダル */
export function Dialog({ open, onOpenChange, title, description, children }: Props) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          {...(description ? {} : { 'aria-describedby': undefined })}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] animate-slide-up overflow-y-auto rounded-t-2xl border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:animate-zoom-in md:rounded-2xl md:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="閉じる" className="-mr-2 -mt-1">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
