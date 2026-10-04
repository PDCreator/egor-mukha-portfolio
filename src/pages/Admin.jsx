import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import contentService from '../services/contentService'
import '../styles/admin.css'

const emptyWork = {
  id: null,
  title: '',
  year: '',
  material: '',
  description: '',
  imagePath: '',
  image: '',
  sortOrder: 0,
  isFeatured: false,
}

function Admin() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('works')
  const [works, setWorks] = useState([])
  const [editingWork, setEditingWork] = useState(null)
  const [artist, setArtist] = useState({ name: '', shortBio: '', biography: '', portraitPath: '' })
  const [contacts, setContacts] = useState({ title: 'Контакты', text: '', email: '', telegram: '' })
  const [settings, setSettings] = useState({ logoPath: '', logoAlt: '', backgroundPath: '' })

  const sortedWorks = useMemo(
    () => [...works].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [works],
  )

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/admin/login', { replace: true })
        return
      }

      if (!mounted) return
      setSession(data.session)

      try {
        const [loadedWorks, loadedContent] = await Promise.all([
          contentService.getWorks(),
          contentService.getContent(),
        ])

        if (!mounted) return
        setWorks(loadedWorks)
        setArtist({
          name: loadedContent.artist.name,
          shortBio: loadedContent.artist.shortBio,
          biography: loadedContent.artist.biography,
          portraitPath: loadedContent.artist.portraitPath || '',
        })
        setContacts({ ...loadedContent.contacts })
        setSettings({
          logoPath: loadedContent.logo.logoPath || '',
          logoAlt: loadedContent.logo.alt,
          backgroundPath: loadedContent.background.backgroundPath || '',
        })
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        if (mounted) setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) navigate('/admin/login', { replace: true })
      setSession(nextSession)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [navigate])

  const notify = (text) => {
    setMessage(text)
    setError('')
    window.setTimeout(() => setMessage(''), 2500)
  }

  const fail = (loadError) => {
    console.error(loadError)
    setError(loadError.message || 'Произошла ошибка')
    setMessage('')
  }

  const upload = async (file, folder) => {
    if (!file) return null
    return contentService.uploadImage(file, folder)
  }

  const saveWork = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const file = event.currentTarget.elements.image.files[0]
      let imagePath = editingWork.imagePath
      const oldImagePath = imagePath

      if (file) imagePath = await upload(file, 'works')
      if (!imagePath) throw new Error('Для работы нужно выбрать изображение.')

      const saved = await contentService.saveWork({ ...editingWork, imagePath })
      setWorks((current) => {
        const exists = current.some((item) => item.id === saved.id)
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]
      })
      setEditingWork(null)

      if (file && oldImagePath && oldImagePath !== imagePath) {
        await contentService.removeImage(oldImagePath)
      }

      notify('Работа сохранена')
    } catch (saveError) {
      fail(saveError)
    } finally {
      setSaving(false)
    }
  }

  const deleteWork = async (work) => {
    if (!window.confirm(`Удалить «${work.title}»?`)) return

    try {
      await contentService.deleteWork(work)
      setWorks((current) => current.filter((item) => item.id !== work.id))
      if (editingWork?.id === work.id) setEditingWork(null)
      notify('Работа удалена')
    } catch (deleteError) {
      fail(deleteError)
    }
  }

  const moveWork = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= sortedWorks.length) return

    const next = [...sortedWorks]
    ;[next[index], next[target]] = [next[target], next[index]]
    next.forEach((work, order) => { work.sortOrder = order })
    setWorks(next)

    try {
      await contentService.saveOrder(next)
    } catch (orderError) {
      fail(orderError)
    }
  }

  const saveArtist = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const file = event.currentTarget.elements.portrait.files[0]
      let portraitPath = artist.portraitPath
      const oldPath = portraitPath
      if (file) portraitPath = await upload(file, 'artist')

      await contentService.saveArtist({ ...artist, portraitPath })
      setArtist((current) => ({ ...current, portraitPath }))
      if (file && oldPath && oldPath !== portraitPath) await contentService.removeImage(oldPath)
      notify('Данные автора сохранены')
    } catch (saveError) {
      fail(saveError)
    } finally {
      setSaving(false)
    }
  }

  const saveContacts = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await contentService.saveContacts(contacts)
      notify('Контакты сохранены')
    } catch (saveError) {
      fail(saveError)
    } finally {
      setSaving(false)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const files = event.currentTarget.elements
      let logoPath = settings.logoPath
      let backgroundPath = settings.backgroundPath
      const oldLogo = logoPath
      const oldBackground = backgroundPath

      if (files.logo.files[0]) logoPath = await upload(files.logo.files[0], 'site')
      if (files.background.files[0]) backgroundPath = await upload(files.background.files[0], 'site')

      await contentService.saveSettings({ ...settings, logoPath, backgroundPath })
      setSettings((current) => ({ ...current, logoPath, backgroundPath }))
      if (oldLogo && oldLogo !== logoPath) await contentService.removeImage(oldLogo)
      if (oldBackground && oldBackground !== backgroundPath) await contentService.removeImage(oldBackground)
      notify('Настройки сохранены')
    } catch (saveError) {
      fail(saveError)
    } finally {
      setSaving(false)
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  if (loading || !session) return <div className="admin-page admin-page--center">Загрузка админки...</div>

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <div className="admin-eyebrow">Егор Муха</div>
            <h1>Управление сайтом</h1>
          </div>
          <div className="admin-header__actions">
            <a className="admin-button" href="/" target="_blank" rel="noreferrer">Открыть сайт</a>
            <button className="admin-button" onClick={logout}>Выйти</button>
          </div>
        </header>

        <nav className="admin-tabs">
          {[
            ['works', 'Работы'],
            ['artist', 'Об авторе'],
            ['contacts', 'Контакты'],
            ['settings', 'Настройки'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? 'is-active' : ''}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        {message && <div className="admin-message">{message}</div>}
        {error && <div className="admin-error">{error}</div>}

        {tab === 'works' && (
          <section className="admin-section">
            <div className="admin-section__head">
              <div>
                <div className="admin-eyebrow">Галерея</div>
                <h2>Работы</h2>
              </div>
              <button className="admin-button admin-button--primary" onClick={() => setEditingWork({ ...emptyWork, sortOrder: works.length })}>
                + Добавить работу
              </button>
            </div>

            <div className="admin-work-list">
              {sortedWorks.map((work, index) => (
                <article className="admin-work-row" key={work.id}>
                  <img src={work.image} alt="" />
                  <div className="admin-work-row__main">
                    <strong>{work.title}</strong>
                    <span>{work.material}{work.year ? ` · ${work.year}` : ''}</span>
                  </div>
                  <span className={`admin-badge ${work.isFeatured ? 'is-featured' : ''}`}>
                    {work.isFeatured ? 'Избранное' : 'Обычная'}
                  </span>
                  <div className="admin-row-actions">
                    <button onClick={() => moveWork(index, -1)} disabled={index === 0}>↑</button>
                    <button onClick={() => moveWork(index, 1)} disabled={index === sortedWorks.length - 1}>↓</button>
                    <button onClick={() => setEditingWork({ ...work })}>Изменить</button>
                    <button className="is-danger" onClick={() => deleteWork(work)}>Удалить</button>
                  </div>
                </article>
              ))}
              {!sortedWorks.length && <div className="admin-empty">Работ пока нет.</div>}
            </div>
          </section>
        )}

        {tab === 'artist' && (
          <form className="admin-form" onSubmit={saveArtist}>
            <div className="admin-section__head"><div><div className="admin-eyebrow">Профиль</div><h2>Об авторе</h2></div></div>
            <Field label="Имя"><input value={artist.name} onChange={(e) => setArtist({ ...artist, name: e.target.value })} required /></Field>
            <Field label="Краткое описание"><textarea rows="4" value={artist.shortBio} onChange={(e) => setArtist({ ...artist, shortBio: e.target.value })} /></Field>
            <Field label="Биография"><textarea rows="14" value={artist.biography} onChange={(e) => setArtist({ ...artist, biography: e.target.value })} /></Field>
            <ImageField label="Портрет" name="portrait" currentPath={artist.portraitPath} />
            <button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </form>
        )}

        {tab === 'contacts' && (
          <form className="admin-form" onSubmit={saveContacts}>
            <div className="admin-section__head"><div><div className="admin-eyebrow">Связь</div><h2>Контакты</h2></div></div>
            <Field label="Заголовок"><input value={contacts.title} onChange={(e) => setContacts({ ...contacts, title: e.target.value })} required /></Field>
            <Field label="Текст"><textarea rows="6" value={contacts.text} onChange={(e) => setContacts({ ...contacts, text: e.target.value })} /></Field>
            <Field label="Email"><input type="email" value={contacts.email} onChange={(e) => setContacts({ ...contacts, email: e.target.value })} /></Field>
            <Field label="Telegram"><input value={contacts.telegram} onChange={(e) => setContacts({ ...contacts, telegram: e.target.value })} placeholder="@username" /></Field>
            <button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </form>
        )}

        {tab === 'settings' && (
          <form className="admin-form" onSubmit={saveSettings}>
            <div className="admin-section__head"><div><div className="admin-eyebrow">Сайт</div><h2>Настройки</h2></div></div>
            <ImageField label="Логотип" name="logo" currentPath={settings.logoPath} />
            <Field label="Alt логотипа"><input value={settings.logoAlt} onChange={(e) => setSettings({ ...settings, logoAlt: e.target.value })} /></Field>
            <ImageField label="Фоновое изображение" name="background" currentPath={settings.backgroundPath} />
            <button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
          </form>
        )}
      </div>

      {editingWork && (
        <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditingWork(null)}>
          <form className="admin-modal" onSubmit={saveWork}>
            <div className="admin-section__head">
              <div><div className="admin-eyebrow">Галерея</div><h2>{editingWork.id ? 'Редактировать' : 'Новая работа'}</h2></div>
              <button type="button" className="admin-modal__close" onClick={() => setEditingWork(null)}>×</button>
            </div>
            <Field label="Название"><input value={editingWork.title} onChange={(e) => setEditingWork({ ...editingWork, title: e.target.value })} required /></Field>
            <div className="admin-form__grid">
              <Field label="Год"><input type="number" value={editingWork.year} onChange={(e) => setEditingWork({ ...editingWork, year: e.target.value })} /></Field>
              <Field label="Порядок"><input type="number" value={editingWork.sortOrder} onChange={(e) => setEditingWork({ ...editingWork, sortOrder: e.target.value })} /></Field>
            </div>
            <Field label="Материал"><input value={editingWork.material} onChange={(e) => setEditingWork({ ...editingWork, material: e.target.value })} /></Field>
            <Field label="Описание"><textarea rows="8" value={editingWork.description} onChange={(e) => setEditingWork({ ...editingWork, description: e.target.value })} /></Field>
            <ImageField label="Изображение" name="image" currentPath={editingWork.imagePath} required={!editingWork.imagePath} />
            <label className="admin-checkbox"><input type="checkbox" checked={editingWork.isFeatured} onChange={(e) => setEditingWork({ ...editingWork, isFeatured: e.target.checked })} /> Показывать в избранном</label>
            <div className="admin-modal__actions">
              <button type="button" className="admin-button" onClick={() => setEditingWork(null)}>Отмена</button>
              <button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

function Field({ label, children }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>
}

function ImageField({ label, name, currentPath, required = false }) {
  return (
    <div className="admin-field">
      <span>{label}</span>
      {currentPath && <code className="admin-path">{currentPath}</code>}
      <input name={name} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" required={required} />
    </div>
  )
}

export default Admin
