import { useState } from 'react'
import logo from './assets/lumi-logo.png'

function LoginForm({ onLogin, onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          response.status === 401
            ? 'Invalid email or password.'
            : 'Could not log in. Please try again.'
        )
        return
      }

      if (
        typeof data.token !== 'string' ||
        !data.token ||
        !data.user ||
        !Number.isSafeInteger(data.user.id) ||
        !['parent', 'specialist', 'child'].includes(data.user.role)
      ) {
        setError('Invalid server response. Please try again.')
        return
      }

      onLogin({
        user: data.user,
        token: data.token,
      })
    } catch {
      setError('Could not complete login. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="dashboard registration-page">
      <header className="dashboard-header">
        <img className="brand-logo" src={logo} alt="Lumi" />
        <span className="account-label">Log in</span>
      </header>

      <section className="welcome-card">
        <p className="eyebrow">A little support, every day</p>
        <h1>Welcome back</h1>
        <p className="intro">Log in to your Lumi account.</p>

        <form
          className="child-form registration-form login-form"
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
        >
          <fieldset disabled={isSubmitting}>
            <legend>Login details</legend>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <button type="submit" className="primary-button">
              {isSubmitting ? 'Logging in...' : 'Log in'}
            </button>
          </fieldset>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>

        <button
          type="button"
          className="secondary-button"
          onClick={onRegister}
          disabled={isSubmitting}
        >
          Create an account
        </button>
      </section>
    </main>
  )
}

export default LoginForm