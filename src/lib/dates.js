export const MNAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const iso = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export const parse = (s) => {
  const [a, b, c] = s.split('-').map(Number)
  return new Date(a, b - 1, c)
}

export const slotLabel = (h) => {
  const hr = Math.floor(h)
  return `${((hr + 11) % 12) + 1}:${h % 1 ? '30' : '00'} ${hr >= 12 ? 'PM' : 'AM'}`
}

export const fmt = (s) => {
  const d = parse(s)
  return { dow: DOW[d.getDay()], md: `${SHORT[d.getMonth()]} ${d.getDate()}` }
}

export const todayISO = () => {
  const d = new Date()
  return iso(d.getFullYear(), d.getMonth(), d.getDate())
}
