import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getBooks = (category) =>
  api.get('/books', { params: category ? { category } : {} })

export const deleteBook = (id) => api.delete(`/books/${id}`)
export const uploadBook = (formData) => api.post('/books', formData)
export const login = (username, password) =>
  api.post('/admin/login', { username, password })
export const getMe = () => api.get('/admin/me')

export default api
