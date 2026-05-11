export const truncate = (text: string, length = 120, suffix = '...') => {
  if (!text || text.length <= length) {
    return String(text ?? '').replace(/[.,;:!?]+$/, '')
  }

  const truncated = text.slice(0, length - suffix.length)
  const lastSpace = truncated.lastIndexOf(' ')

  const result = lastSpace <= 0
    ? truncated
    : truncated.slice(0, lastSpace)

  return (result.trimEnd().replace(/[.,;:!?]+$/, '') + suffix)
}

export const fitText = (text: string) => {

  const parse1 = text.split('package for')
  const parse2 = (parse1.at(1) ?? parse1.at(0))?.split('providing') ?? []
  const fixed = parse2.at(1) ?? parse2.at(0)?.trim() ?? ''

  const out = uppercaseFirst(truncate(fixed, 100, '').trim())
  return out.length >= 90 ? out + '…' : out + '.'
}

export const uppercaseFirst = (value = '') => {
  if (!value) {
    return value
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

export const abbreviateNumber = (value: string | number) => {
  const number = Number(value)

  if (number < 1_000) {
    return String(number)
  }

  if (number < 1_000_000) {
    return `${Math.floor(number / 1_000)}k`
  }

  if (number < 1_000_000_000) {
    return `${Math.floor(number / 1_000_000)}m`
  }

  return `${Math.floor(number / 1_000_000_000)}b`
}

export async function getTotalDownloads (packageName: string, fromYear = 2015) {
  const currentYear = new Date().getFullYear()
  let total = 0

  try {
    for (let year = fromYear; year <= currentYear; year++) {
      const from = `${year}-01-01`
      const to = year === currentYear
        ? new Date().toISOString().slice(0, 10)
        : `${year}-12-31`

      const encoded = encodeURIComponent(packageName)
      const url = `https://api.npmjs.org/downloads/range/${from}:${to}/${encoded}`

      const response = await fetch(url).catch(e => e)
      const data = await response.json()

      total += data.downloads?.reduce((sum: number, item: any) => {
        return sum + item.downloads
      }, 0) ?? 0
    }

  } catch {
    //
  }

  return total
}