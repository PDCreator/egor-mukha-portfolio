import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          ЕГОР МУХА
        </Link>

        <nav className="header__nav">
          <Link to="/">Главная</Link>
          <Link to="/gallery">Галерея</Link>
        </nav>
      </div>
    </header>
  )
}

export default Header