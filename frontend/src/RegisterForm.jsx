import { useState } from 'react';
import logo from './assets/lumi-logo.png';

const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'parent'
}

function RegisterForm() {
    const [form, setForm] = useState(initialForm)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    function handleChange(event) {
        const { name, value } = event.target
        setForm ((previous) => ({
            ...previous,
            [name]: value
        }))
    }

    async function handleSubmit(event) {
        event.preventDefault()

        if (isSubmitting) return

        setError('')
        setSuccess('')

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsSubmitting(true)
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    password: form.password,
                    role: form.role
                }),
        })

        const  data = await response.json()

        if (!response.ok) {
            setError(data.error || 'Registration Failed')
            return
        }

        setSuccess('Account created successfully! You can now log in.')
        setForm( {...initialForm})
    } catch {
        setError('Could not complete registration. Please try again later.')
    } finally {
        setIsSubmitting(false)
    }
}

return (
    <main className="dashboard registration-page">
        <header className="dashboard-header">
            <img className="brand-logo" src={logo} alt="Lumi" />
            <span className="account-label">Create an Account</span>
        </header>

        <section className="welcome-card">
    <p className="eyebrow">A little support, every day</p>
    <h1>Create an account</h1>
    <p className="intro">
        Join Lumi to support your child’s development.
    </p>

    <form
        className="child-form registration-form"
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
    >
            <fieldset disabled={isSubmitting}>
                <legend>Account details</legend>

                <label>
                    First Name
                    <input 
                        name="first_name"
                        value={form.first_name}
                        onChange={handleChange}
                        autoComplete="given-name"
                        required
                    />
                </label>

                <label>
                    Last Name
                    <input
                        name="last_name"
                        value={form.last_name}
                        onChange={handleChange}
                        autoComplete="family-name"
                        required
                    />
                </label>

                <label>
                    Email
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                        required
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                    />
                </label>

                <label>
                    Confirm Password
                    <input
                        type="password"
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        autoComplete="new-password"
                        required
                    />
                </label>

                <label>
                    Account Role
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        >
                            <option value="parent">Parent</option>
                            <option value="specialist">Specialist</option>
                    </select>
                </label>

                <button type="submit" className="primary-button"> 
                    {isSubmitting ? 'Creating account...' : 'Register'}
                </button>
            </fieldset>

            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
        </form>
    </section>
</main>
)
}

export default RegisterForm