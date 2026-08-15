type ThemeMode = 'light' | 'dark'

export function useTheme() {
  const theme = useState<ThemeMode>('saaj_theme', () => 'light')

  function applyTheme(value: ThemeMode) {
    theme.value = value

    if (!import.meta.client) return

    document.documentElement.classList.toggle('dark', value === 'dark')
    localStorage.setItem('saaj_theme', value)
  }

  function initTheme() {
    if (!import.meta.client) return

    const saved = localStorage.getItem('saaj_theme')

    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved)
      return
    }

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    applyTheme(prefersDark ? 'dark' : 'light')
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    applyTheme,
    initTheme,
    toggleTheme,
  }
}