import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import '../styles/admin.css'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin', { replace: true })
      setLoading(false)
    })
  }, [navigate])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setSubmitting(false)
      return
    }

    navigate('/admin', { replace: true })
  }

  if (loading) return <div className="admin-page admin-page--center">Загрузка...</div>

  return (
    <main className="admin-page admin-page--center">
      <form className="admin-login" onSubmit={submit}>
        <div className="admin-eyebrow">Егор Муха</div>
        <h1>Админка</h1>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <div className="admin-error">Не удалось войти: {error}</div>}

        <button className="admin-button admin-button--primary" disabled={submitting}>
          {submitting ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </main>
  )
}

export default AdminLogin
