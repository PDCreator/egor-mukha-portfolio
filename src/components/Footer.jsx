function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__title">
          ЕГОР МУХА
        </div>

        <div className="footer__contact">
          Контактная информация появится здесь
        </div>

        <div className="footer__copyright">
          © {new Date().getFullYear()} Егор Муха
        </div>
      </div>
    </footer>
  )
}

export default Footer