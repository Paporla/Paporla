import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminUsersPage from '@/app/(admin)/admin/users/page'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminUser } from '@/components/admin/useAdminUsers'

// El hook de listado es el contrato de la página: se mockea por completo; solo
// la RPC de cambio de rol (admin_set_user_role) se prueba a través del cliente.
const usersState = vi.hoisted(() => ({
  users: [] as unknown[],
  loading: false,
  usersError: '',
}))

const useAdminUsersMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/admin/useAdminUsers', () => ({
  useAdminUsers: useAdminUsersMock,
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-self' } }),
}))

let rpc: ReturnType<typeof vi.fn>

function setupSupabase(error: { message: string; code?: string } | null = null) {
  rpc = vi.fn().mockResolvedValue({ data: { ok: true }, error })
  ;(supabaseBrowser as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
    rpc,
    from: vi.fn(),
  })
}

function userRow(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'user-1',
    display_name: 'María Staging',
    email: 'maria@paporla.test',
    phone_e164: '+56912345678',
    role: 'user',
    account_status: 'active',
    created_at: '2026-08-01T09:00:00Z',
    ...overrides,
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('AdminUsersPage (página)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersState.users = [
      userRow(),
      userRow({
        id: 'user-2',
        display_name: null,
        email: 'anon@paporla.test',
        phone_e164: null,
        role: 'comercio',
      }),
    ]
    usersState.loading = false
    usersState.usersError = ''
    useAdminUsersMock.mockImplementation(() => ({
      users: usersState.users as AdminUser[],
      loading: usersState.loading,
      error: usersState.usersError,
    }))
    setupSupabase()
  })

  const renderPage = () => render(<AdminUsersPage />, { wrapper: createWrapper() })

  it('muestra display_name, email y teléfono reales (no user.name / user.phone)', () => {
    renderPage()
    expect(screen.getByText('María Staging')).toBeTruthy()
    expect(screen.getByText('maria@paporla.test')).toBeTruthy()
    expect(screen.getByText('+56912345678')).toBeTruthy()
    // Sin display_name: «Sin nombre» (no un campo inventado)
    expect(screen.getByText('Sin nombre')).toBeTruthy()
    expect(screen.getByText('anon@paporla.test')).toBeTruthy()
  })

  it('cambiar el rol llama a admin_set_user_role con p_target_user_id y p_new_role', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Editar María Staging' }))
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'admin' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')!)
    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('admin_set_user_role', {
        p_target_user_id: 'user-1',
        p_new_role: 'admin',
      })
    })
    expect(await screen.findByText('Rol actualizado a Administrador')).toBeTruthy()
    // Éxito: el modal se cierra.
    await waitFor(() => expect(screen.queryByText('Editar Usuario')).toBeNull())
  })

  it('no hay botón de eliminar: una sola acción por fila (editar)', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /eliminar/i })).toBeNull()
  })

  it('el error SUPER_ADMIN_REQUIRED se traduce y el modal se queda abierto', async () => {
    setupSupabase({ message: 'SUPER_ADMIN_REQUIRED', code: '42501' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Editar María Staging' }))
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'super_admin' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')!)
    expect(await screen.findByText('Ese cambio de rol solo lo puede hacer un super administrador.')).toBeTruthy()
    // Error: el modal sigue abierto para reintentar.
    expect(screen.getByText('Editar Usuario')).toBeTruthy()
  })
})
