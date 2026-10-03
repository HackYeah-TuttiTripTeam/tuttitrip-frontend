import { Copy, Share } from '@keyline-icons/react'
import { useState } from 'react'
import { QrCode } from '@/components/shared/qr-code'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/format'
import { copyText, shareOrCopy } from '@/lib/share'
import { m } from '@/paraglide/messages'

interface InvitationShareProps {
  link: string
  tripName: string
  expiresAt: string
  maxUses: number
}

/** The fresh invitation: a QR code to scan, and the link to share or copy. */
export function InvitationShare({ link, tripName, expiresAt, maxUses }: InvitationShareProps) {
  const [feedback, setFeedback] = useState<'copied' | 'failed' | null>(null)

  const report = (copied: boolean) => setFeedback(copied ? 'copied' : 'failed')

  return (
    <div className="flex flex-col items-center gap-4">
      <QrCode value={link} label={m.invite_qr_label()} />
      <p className="text-center text-muted-foreground text-sm">
        {m.invite_validity({ date: formatDate(expiresAt), max: maxUses })}
      </p>

      <div className="flex w-full flex-col gap-2">
        <Label htmlFor="invite-link">{m.invite_link_label()}</Label>
        <Input
          id="invite-link"
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
              title: tripName,
              text: m.invite_share_text({ trip: tripName }),
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
