import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getBooks = (category) =>
  api.get('/books', { params: category ? { category } : {} })

export const updateBook    = (id, data) => api.patch(`/books/${id}`, data)
export const getConfig     = ()         => api.get('/config')
export const saveConfig    = (data)     => api.put('/config', data)
export const zlibSearch          = (query) => api.post('/zlibrary/search', { query })
export const zlibRecommendations = ()      => api.get('/zlibrary/recommendations')
export const zlibRefresh         = ()      => api.post('/zlibrary/recommendations/refresh')
export const addLike       = (data) => api.post('/likes', data)
export const getLikeCounts = ()     => api.get('/likes/counts')
export const getLikeList   = ()     => api.get('/likes/list')
export const getTopLiked   = ()     => api.get('/likes/top')
export const clearAllLikes = ()     => api.delete('/likes/all')

export const addWish     = (data) => api.post('/wishes', data)
export const getWishList = ()     => api.get('/wishes')

export const deleteBook = (id) => api.delete(`/books/${id}`)
export const uploadBook = (formData) => api.post('/books', formData)
export const login = (username, password) =>
  api.post('/admin/login', { username, password })
export const getMe = () => api.get('/admin/me')

export default api
