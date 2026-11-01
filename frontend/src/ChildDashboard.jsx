import logo from './assets/lumi-logo.png';

function ChildDashboard({ user }) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <img className="brand-logo" src={logo} alt="Lumi" />
                <span className="account-label">My Dashboard</span>
            </header>

            <section className="welcome-card">
                <p className="eyebrow">A little support, every day</p>
                <h1>Welcome, {fullName}!</h1>
                <p className="intro">
                    Welcome to your Lumi account.
                </p>
            </section>
        </main>
    )
}

export default ChildDashboard