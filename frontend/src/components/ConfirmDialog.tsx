import { Button } from './ui/button'
import { Dialog } from './ui/dialog'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '削除',
  pending,
  error,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()} title={title} description={description}>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          キャンセル
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={pending}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
