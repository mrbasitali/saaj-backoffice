const DEFAULT_TIMEZONE = 'Asia/Karachi'

type DateValue = string | number | Date | null | undefined

function validDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function partsInTimezone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(parts.map(part => [part.type, part.value])) as Record<string, string>
}

export function useAppDateTime() {
  const timezone = useState<string>('app-timezone', () => DEFAULT_TIMEZONE)

  const timezoneLabel = computed(() => timezone.value.replaceAll('_', ' '))

  function formatDate(value: DateValue, fallback = 'Not set') {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number)
      return new Intl.DateTimeFormat('en-PK', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year!, month! - 1, day!, 12)))
    }

    const date = validDate(value)
    if (!date) return fallback

    return new Intl.DateTimeFormat('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: timezone.value,
    }).format(date)
  }

  function formatDateTime(value: DateValue, fallback = 'Not set') {
    const date = validDate(value)
    if (!date) return fallback

    return new Intl.DateTimeFormat('en-PK', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone.value,
      timeZoneName: 'short',
    }).format(date)
  }

  function toDateTimeInput(value: DateValue = new Date()) {
    const date = validDate(value)
    if (!date) return ''
    const parts = partsInTimezone(date, timezone.value)
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  }

  function todayDateInput() {
    return toDateTimeInput().slice(0, 10)
  }

  function startOfMonthInput() {
    return `${todayDateInput().slice(0, 7)}-01`
  }

  function startOfYearInput() {
    return `${todayDateInput().slice(0, 4)}-01-01`
  }

  function previousMonthRangeInput() {
    const [year, month] = todayDateInput().split('-').map(Number)
    const firstOfThisMonth = new Date(Date.UTC(year!, month! - 1, 1))
    const firstOfPreviousMonth = new Date(Date.UTC(year!, month! - 2, 1))
    const lastOfPreviousMonth = new Date(firstOfThisMonth.getTime() - 86400000)
    return {
      from: firstOfPreviousMonth.toISOString().slice(0, 10),
      to: lastOfPreviousMonth.toISOString().slice(0, 10),
    }
  }

  function dateTimeInputToIso(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
    if (!match) return null

    const [, year, month, day, hour, minute] = match
    const desiredWallTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))

    const offsetAt = (timestamp: number) => {
      const instant = new Date(timestamp)
      const parts = partsInTimezone(instant, timezone.value)
      const representedAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      )
      return representedAsUtc - Math.trunc(timestamp / 1000) * 1000
    }

    let utcTimestamp = desiredWallTime - offsetAt(desiredWallTime)
    utcTimestamp = desiredWallTime - offsetAt(utcTimestamp)
    return new Date(utcTimestamp).toISOString()
  }

  return {
    timezone,
    timezoneLabel,
    formatDate,
    formatDateTime,
    toDateTimeInput,
    todayDateInput,
    startOfMonthInput,
    startOfYearInput,
    previousMonthRangeInput,
    dateTimeInputToIso,
  }
}
