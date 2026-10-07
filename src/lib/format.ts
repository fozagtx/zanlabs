const monthFormat = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "2026-09" → "Sep 2026" */
export function formatMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)))
}
