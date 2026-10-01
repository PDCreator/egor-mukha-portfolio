import { useState } from 'react'

import '../styles/header.css'


function Header() {
  const [menuOpen, setMenuOpen] = useState(false)


  const scrollToSection = (id) => {
    const element = document.getElementById(id)

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
      })
    }

    setMenuOpen(false)
  }


  return (
    <header className="site-header">

      <nav
        className={`site-header__nav ${
          menuOpen ? 'is-open' : ''
        }`}
      >

        <button
          type="button"
          onClick={() => scrollToSection('about')}
        >
          Об авторе
        </button>


        <button
          type="button"
          onClick={() => scrollToSection('works')}
        >
          Галерея
        </button>


        <button
          type="button"
          onClick={() => scrollToSection('contacts')}
        >
          Контакты
        </button>

      </nav>


      <button
        className={`site-header__menu-button ${
          menuOpen ? 'is-active' : ''
        }`}
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Открыть меню"
      >

        <span />
        <span />

      </button>

    </header>
  )
}


export default Header