import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'

// Stub component to test useTheme hook
function TestConsumer() {
  const { theme, toggleTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggleTheme}>
        Toggle
      </button>
      <button data-testid="set-light-btn" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark-btn" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
    </div>
  )
}

// Component that calls useTheme outside ThemeProvider to test error
function OrphanConsumer() {
  try {
    useTheme()
    return <div data-testid="no-error">OK</div>
  } catch (e: unknown) {
    return <div data-testid="error">{(e as Error).message}</div>
  }
}

describe('ThemeProvider', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? false : true,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock, writable: true })
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset document class list
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello</div>
      </ThemeProvider>,
    )
    expect(screen.getByTestId('child')).toHaveTextContent('Hello')
  })

  it('defaults to dark theme when no localStorage value and prefers-color-scheme is dark', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    // matchMedia returns matches=true for 'dark' queries
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
  })

  it('uses stored light theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('light')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
  })

  it('uses stored dark theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
  })

  it('toggles theme from dark to light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')

    act(() => {
      screen.getByTestId('toggle-btn').click()
    })

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('paporla-theme', 'light')
  })

  it('toggles theme from light to dark', () => {
    localStorageMock.getItem.mockReturnValueOnce('light')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')

    act(() => {
      screen.getByTestId('toggle-btn').click()
    })

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('paporla-theme', 'dark')
  })

  it('setTheme function updates theme to light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    act(() => {
      screen.getByTestId('set-light-btn').click()
    })

    expect(screen.getByTestId('theme-value')).toHaveTextContent('light')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('paporla-theme', 'light')
  })

  it('setTheme function updates theme to dark', () => {
    localStorageMock.getItem.mockReturnValueOnce('light')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    act(() => {
      screen.getByTestId('set-dark-btn').click()
    })

    expect(screen.getByTestId('theme-value')).toHaveTextContent('dark')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('paporla-theme', 'dark')
  })

  it('adds dark class to document element when theme is dark', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from document element when theme is light', () => {
    localStorageMock.getItem.mockReturnValueOnce('light')

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    )

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('useTheme', () => {
  it('throws an error when used outside ThemeProvider', () => {
    render(<OrphanConsumer />)
    expect(screen.getByTestId('error')).toHaveTextContent('useTheme must be used within ThemeProvider')
  })
})
