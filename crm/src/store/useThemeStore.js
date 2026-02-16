import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Theme store for light/dark mode
const useThemeStore = create(
    persist(
        (set, get) => ({
            theme: 'dark',

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark'
                document.documentElement.setAttribute('data-theme', newTheme)
                set({ theme: newTheme })
            },

            initTheme: () => {
                const theme = get().theme
                document.documentElement.setAttribute('data-theme', theme)
            }
        }),
        {
            name: 'crm-theme',
        }
    )
)

export default useThemeStore
