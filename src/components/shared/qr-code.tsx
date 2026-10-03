import { QRCodeSVG } from 'qrcode.react'

// Scanners need dark modules on a light ground and a quiet zone of 4 modules, in dark mode too.
// So the code keeps its own fixed colors instead of following the theme tokens.
const QR_DARK = '#000000'
const QR_LIGHT = '#ffffff'

interface QrCodeProps {
  /** What the code encodes; it is drawn in the browser and never sent anywhere. */
  value: string
  /** Accessible name of the image. */
  label: string
  className?: string
}

/** A QR code as SVG: scales to the width it is given, up to 14rem. */
export function QrCode({ value, label, className }: QrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      title={label}
      size={224}
      level="M"
      marginSize={4}
      fgColor={QR_DARK}
      bgColor={QR_LIGHT}
      role="img"
      className={className ?? 'h-auto w-full max-w-56 rounded-lg border'}
    />
  )
}
