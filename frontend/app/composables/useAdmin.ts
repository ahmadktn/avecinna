import { ref } from 'vue'
import { useApi } from './useApi'
import type { User, Ward } from './useAuth'

export const useAdmin = () => {
  const api = useApi()
  const users = ref<User[]>([])
  const wards = ref<Ward[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ users: User[] }>('/admin/users')
      users.value = res.users
      return res.users
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch staff accounts'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createUser = async (payload: {
    username: string
    password: string
    fullName: string
    role: string
    homeWardId: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; user: User }>('/admin/users', payload)
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to create staff account'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (id: string, payload: Partial<User & { password?: string }>) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.put<{ message: string; user: User }>(`/admin/users/${id}`, payload)
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to update staff account'
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; user: Partial<User> }>(`/admin/users/${id}/status`, { isActive })
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to toggle account active status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchWards = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ wards: Ward[] }>('/admin/wards')
      wards.value = res.wards
      return res.wards
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch hospital wards'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createWard = async (payload: { code: string; name: string; department: string; headOfUnitId?: string }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; ward: Ward }>('/admin/wards', payload)
      await fetchWards()
      return res.ward
    } catch (err: any) {
      error.value = err.message || 'Failed to create hospital ward'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    users,
    wards,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    fetchWards,
    createWard,
  }
}
