import logo from './assets/lumi-logo.png'

function SpecialistDashboard({ user}) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <img className="brand-logo" src={logo} alt="Lumi" />
                <span className="account-label">Specialist Dashboard</span>
            </header>

            <section className="welcome-card">
                <p className="eyebrow">A little support, every day</p>
                <h1>Welcome, {fullName}!</h1>
                <p className="intro">
                    Follow the development of children linked to your account.
                </p>

                <dl className="account-details">
                    <div>
                        <dt>name</dt>
                        <dd>{fullName}</dd>
                    </div>

                    <div>
                        <dt>email</dt>
                        <dd>{user.email}</dd>
                    </div>
                </dl>
            </section>
            </main>
    )
}

export default SpecialistDashboard