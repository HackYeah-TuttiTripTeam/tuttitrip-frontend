import { Copy, Share } from '@keyline-icons/react'
import { useEffect, useState } from 'react'
import { QrCode } from '@/components/shared/qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copyText, shareOrCopy } from '@/lib/share'
import { m } from '@/paraglide/messages'

const FEEDBACK_MS = 4000

interface LinkShareProps {
  link: string
  /** Accessible name of the QR image. */
  qrLabel: string
  /** One line under the code: how long and for whom the link works. */
  validity: string
  /** Label of the read-only field with the link. */
  linkLabel: string
  shareTitle: string
  shareText: string
  /** Unique per dialog on the page; the field and its label are tied by it. */
  fieldId: string
  qrClassName?: string
}

/** A fresh link with a secret in it: a QR code to scan, and the link to share or copy. */
export function LinkShare({
  link,
  qrLabel,
  validity,
  linkLabel,
  shareTitle,
  shareText,
  fieldId,
  qrClassName,
}: LinkShareProps) {
  const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null)

  const report = (copied: boolean) => setFeedback(copied ? 'copied' : 'failed')

  // The confirmation is a moment, not a state: it fades out after a few seconds.
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), FEEDBACK_MS)
    return () => clearTimeout(timer)
  }, [feedback])

  return (
    <div className="flex flex-col items-center gap-4">
      <QrCode value={link} label={qrLabel} className={qrClassName} />
      <p className="text-center text-muted-foreground text-sm">{validity}</p>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor={fieldId}>{linkLabel}</Label>
        <Input
          id={fieldId}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 font-mono text-xs md:h-9"
        />
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          className="h-11 flex-1 md:h-9"
          onClick={() =>
            void shareOrCopy({
              url: link,
              title: shareTitle,
              text: shareText,
            }).then((result) => {
              if (result === 'copied') report(true)
              else if (result === 'failed') report(false)
            })
          }
        >
          <Share aria-hidden="true" />
          {m.invite_share()}
        </Button>
        <Button
          variant="outline"
          className="h-11 flex-1 md:h-9"
          onClick={() => void copyText(link).then(report)}
        >
          <Copy aria-hidden="true" />
          {m.invite_copy()}
        </Button>
      </div>
      <p role="status" className="min-h-5 text-sm">
        {feedback === 'copied' && m.invite_copied()}
        {feedback === 'failed' && (
          <span className="text-destructive">{m.invite_copy_failed()}</span>
        )}
      </p>
    </div>
  )
}
