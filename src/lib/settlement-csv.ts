import type { SettlementTransfer } from '@/api/queries/settlement'

const quote = (cell: string) =>
  /[",;\r\n\t]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell

/**
 * CSV injection: a spreadsheet runs a text cell that starts with = + - @ tab or CR as a formula.
 * Names come from users, so such a cell gets a leading apostrophe. The amount column is not text
 * (it comes from the API as a decimal) and stays as it is.
 */
const defuse = (cell: string) => (/^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell)

/**
 * The transfers as CSV: person, recipient, amount, currency. The amount keeps the API's decimal
 * point ("33.34") whatever the UI language, so a spreadsheet or a script reads it the same way.
 * A leading BOM makes Excel read the Polish letters as UTF-8.
 */
export function transfersToCsv(
  transfers: SettlementTransfer[],
  currency: string | null,
  nameOf: (profileId: string) => string,
  header: [string, string, string, string],
): string {
  const rows = transfers.map((transfer) => [
    quote(defuse(nameOf(transfer.from_profile_id))),
    quote(defuse(nameOf(transfer.to_profile_id))),
    quote(transfer.amount),
    quote(defuse(currency ?? '')),
  ])
  return `﻿${[header.map(quote), ...rows].map((row) => row.join(',')).join('\r\n')}\r\n`
}

/** Saves text as a file through a temporary link: no library, works offline. */
export function downloadTextFile(filename: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
