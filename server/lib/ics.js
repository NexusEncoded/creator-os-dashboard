// Minimal ICS (iCalendar) generator — no external dependency needed for
// something this small. DTSTART/DTEND are emitted as "floating" local
// time (no Z suffix, no TZID), which calendar clients interpret in
// whichever timezone the viewer is in — correct here since these times
// are already the creator's own local posting/streaming times.

const LIVE_CONTENT_TYPES = new Set(['livestream', 'live'])

function escapeText(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function formatDateTime(date, time) {
  // date: YYYY-MM-DD, time: HH:MM -> YYYYMMDDTHHMMSS
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`
}

function addMinutes(date, time, minutes) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const dt = new Date(y, m - 1, d, h, min)
  dt.setMinutes(dt.getMinutes() + minutes)
  const pad = (n) => String(n).padStart(2, '0')
  return {
    date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
    time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
  }
}

function nowStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

export function buildIcsFeed(entries) {
  const dtstamp = nowStamp()
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Creator OS//Content Calendar//EN', 'CALSCALE:GREGORIAN']

  for (const entry of entries) {
    const durationMinutes = LIVE_CONTENT_TYPES.has((entry.contentType ?? '').toLowerCase()) ? 120 : 30
    const end = addMinutes(entry.date, entry.time, durationMinutes)
    const descriptionParts = [entry.contentType, entry.pillar, entry.notes].filter(Boolean)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${entry.id}@creator-os`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatDateTime(entry.date, entry.time)}`,
      `DTEND:${formatDateTime(end.date, end.time)}`,
      `SUMMARY:${escapeText(entry.title)}`,
      `DESCRIPTION:${escapeText(descriptionParts.join(' — '))}`,
      `STATUS:${entry.status === 'missed' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
