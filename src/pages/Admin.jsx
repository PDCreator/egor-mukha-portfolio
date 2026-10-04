import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import contentService from '../services/contentService'
import { optimizeImage } from '../services/imageOptimizer'
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
  isPublished: true,
}

function Admin() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState('dashboard')
  const [works, setWorks] = useState([])
  const [editingWork, setEditingWork] = useState(null)
  const [artist, setArtist] = useState({ name: '', shortBio: '', biography: '', portraitPath: '' })
  const [contacts, setContacts] = useState({ title: 'Контакты', text: '', email: '', telegram: '' })
  const [settings, setSettings] = useState({ logoPath: '', logoAlt: '', backgroundPath: '' })
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const sortedWorks = useMemo(
    () => [...works].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [works],
  )
  const publishedCount = works.filter((work) => work.isPublished).length
  const featuredCount = works.filter((work) => work.isFeatured && work.isPublished).length

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
        const [loadedWorks, loadedContent] = await Promise.all([contentService.getWorks(), contentService.getContent()])
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
          logoAlt: loadedContent.logo.alt || '',
          backgroundPath: loadedContent.background.backgroundPath || '',
        })
      } catch (loadError) {
        fail(loadError)
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
    window.clearTimeout(window.__adminToastTimer)
    window.__adminToastTimer = window.setTimeout(() => setMessage(''), 2800)
  }

  const fail = (loadError) => {
    console.error(loadError)
    setError(loadError.message || 'Произошла ошибка')
    setMessage('')
  }

  const upload = async (file, folder) => {
    if (!file) return null
    const optimized = await optimizeImage(file, {
      maxDimension: folder === 'works' ? 1800 : folder === 'artist' ? 1600 : 2200,
      quality: folder === 'works' ? 0.82 : 0.84,
    })
    return contentService.uploadImage(optimized, folder)
  }

  const saveWork = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    let uploadedPath = null
    try {
      const file = event.currentTarget.elements.image.files[0]
      let imagePath = editingWork.imagePath
      const oldImagePath = imagePath
      if (file) {
        uploadedPath = await upload(file, 'works')
        imagePath = uploadedPath
      }
      if (!imagePath) throw new Error('Для работы нужно выбрать изображение.')
      const saved = await contentService.saveWork({ ...editingWork, imagePath })
      setWorks((current) => {
        const exists = current.some((item) => item.id === saved.id)
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]
      })
      setEditingWork(null)
      if (file && oldImagePath && oldImagePath !== imagePath) await contentService.removeImage(oldImagePath)
      notify('Работа сохранена')
    } catch (saveError) {
      if (uploadedPath) await contentService.removeImage(uploadedPath)
      fail(saveError)
    } finally {
      setSaving(false)
    }
  }

  const deleteWork = async (work) => {
    if (!window.confirm(`Удалить «${work.title}»? Это удалит запись и изображение из Storage.`)) return
    setSaving(true)
    try {
      await contentService.deleteWork(work)
      setWorks((current) => current.filter((item) => item.id !== work.id))
      if (editingWork?.id === work.id) setEditingWork(null)
      notify('Работа удалена')
    } catch (deleteError) {
      fail(deleteError)
    } finally {
      setSaving(false)
    }
  }

  const reorderWorks = async (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    const next = [...sortedWorks]
    const fromIndex = next.findIndex((work) => work.id === fromId)
    const toIndex = next.findIndex((work) => work.id === toId)
    if (fromIndex < 0 || toIndex < 0) return
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    const normalized = next.map((work, index) => ({ ...work, sortOrder: index }))
    setWorks(normalized)
    setDragOverId(null)
    try {
      await contentService.saveOrder(normalized)
      notify('Порядок сохранён')
    } catch (orderError) {
      fail(orderError)
      try { setWorks(await contentService.getWorks()) } catch (_) { /* keep local state */ }
    }
  }

  const saveArtist = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      const file = event.currentTarget.elements.portrait.files[0]
      let portraitPath = artist.portraitPath
      const oldPath = portraitPath
      let uploadedPath = null
      if (file) {
        uploadedPath = await upload(file, 'artist')
        portraitPath = uploadedPath
      }
      try {
        await contentService.saveArtist({ ...artist, portraitPath })
      } catch (saveError) {
        if (uploadedPath) await contentService.removeImage(uploadedPath)
        throw saveError
      }
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
    let uploadedPaths = []
    try {
      const files = event.currentTarget.elements
      let logoPath = settings.logoPath
      let backgroundPath = settings.backgroundPath
      const oldLogo = logoPath
      const oldBackground = backgroundPath
      if (files.logo.files[0]) {
        logoPath = await upload(files.logo.files[0], 'site')
        uploadedPaths.push(logoPath)
      }
      if (files.background.files[0]) {
        backgroundPath = await upload(files.background.files[0], 'site')
        uploadedPaths.push(backgroundPath)
      }
      try {
        await contentService.saveSettings({ ...settings, logoPath, backgroundPath })
      } catch (saveError) {
        await Promise.all(uploadedPaths.map((path) => contentService.removeImage(path)))
        throw saveError
      }
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
            ['dashboard', 'Обзор'],
            ['works', 'Работы'],
            ['artist', 'Об авторе'],
            ['contacts', 'Контакты'],
            ['settings', 'Настройки'],
          ].map(([key, label]) => (
            <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>
          ))}
        </nav>

        {message && <div className="admin-message">✓ {message}</div>}
        {error && <div className="admin-error">{error}</div>}

        {tab === 'dashboard' && (
          <section className="admin-section">
            <div className="admin-section__head">
              <div><div className="admin-eyebrow">Состояние</div><h2>Обзор</h2></div>
            </div>
            <div className="admin-stats">
              <button className="admin-stat" onClick={() => setTab('works')}>
                <span>Всего работ</span><strong>{works.length}</strong><small>Открыть галерею →</small>
              </button>
              <button className="admin-stat" onClick={() => setTab('works')}>
                <span>Опубликовано</span><strong>{publishedCount}</strong><small>Видны на сайте →</small>
              </button>
              <button className="admin-stat" onClick={() => setTab('works')}>
                <span>Избранное</span><strong>{featuredCount}</strong><small>На главном экране →</small>
              </button>
            </div>
            <div className="admin-dashboard-note">
              <strong>Подсказка</strong>
              <p>Перетаскивай работы мышкой, чтобы менять порядок. Снятая публикация остаётся в админке, но исчезает с публичного сайта.</p>
            </div>
          </section>
        )}

        {tab === 'works' && (
          <section className="admin-section">
            <div className="admin-section__head">
              <div><div className="admin-eyebrow">Галерея</div><h2>Работы</h2></div>
              <button className="admin-button admin-button--primary" onClick={() => setEditingWork({ ...emptyWork, sortOrder: works.length })}>+ Добавить работу</button>
            </div>
            <p className="admin-hint">Перетаскивай карточки мышкой для изменения порядка.</p>
            <div className="admin-work-list">
              {sortedWorks.map((work) => (
                <article
                  className={`admin-work-row ${dragOverId === work.id ? 'is-drag-over' : ''} ${draggedId === work.id ? 'is-dragging' : ''}`}
                  key={work.id}
                  draggable
                  onDragStart={() => setDraggedId(work.id)}
                  onDragEnd={() => { setDraggedId(null); setDragOverId(null) }}
                  onDragOver={(event) => { event.preventDefault(); if (dragOverId !== work.id) setDragOverId(work.id) }}
                  onDrop={(event) => { event.preventDefault(); reorderWorks(draggedId, work.id); setDraggedId(null) }}
                >
                  <img src={work.image} alt="" />
                  <div className="admin-work-row__main">
                    <strong>{work.title || 'Без названия'}</strong>
                    <span>{work.material || 'Материал не указан'}{work.year ? ` · ${work.year}` : ''}</span>
                  </div>
                  <div className="admin-work-badges">
                    <span className={`admin-badge ${work.isPublished ? 'is-published' : 'is-hidden'}`}>{work.isPublished ? 'Опубликовано' : 'Скрыто'}</span>
                    {work.isFeatured && <span className="admin-badge is-featured">Избранное</span>}
                  </div>
                  <div className="admin-row-actions">
                    <button onClick={() => setEditingWork({ ...work })}>Изменить</button>
                    <button className="is-danger" onClick={() => deleteWork(work)} disabled={saving}>Удалить</button>
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
            <Field label="Заголовок"><input value={contacts.title} onChange={(e) => setContacts({ ...contacts, title: e.target.value })} /></Field>
            <Field label="Текст"><textarea rows="5" value={contacts.text} onChange={(e) => setContacts({ ...contacts, text: e.target.value })} /></Field>
            <div className="admin-form__grid">
              <Field label="Email"><input type="email" value={contacts.email} onChange={(e) => setContacts({ ...contacts, email: e.target.value })} /></Field>
              <Field label="Telegram"><input value={contacts.telegram} onChange={(e) => setContacts({ ...contacts, telegram: e.target.value })} placeholder="@username" /></Field>
            </div>
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

      {editingWork && <WorkModal work={editingWork} saving={saving} onChange={setEditingWork} onClose={() => setEditingWork(null)} onSubmit={saveWork} />}
    </main>
  )
}

function WorkModal({ work, saving, onChange, onClose, onSubmit }) {
  const [preview, setPreview] = useState(work.image || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setPreview(work.image || '')
  }, [work.id, work.image])

  const onFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  return (
    <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="admin-modal" onSubmit={onSubmit}>
        <div className="admin-section__head">
          <div><div className="admin-eyebrow">Галерея</div><h2>{work.id ? 'Редактировать' : 'Новая работа'}</h2></div>
          <button type="button" className="admin-modal__close" onClick={onClose}>×</button>
        </div>
        <div className="admin-image-preview">
          {preview ? <img src={preview} alt="Предпросмотр" /> : <span>Выберите изображение</span>}
          <button type="button" onClick={() => inputRef.current?.click()}>{work.imagePath ? 'Заменить изображение' : 'Выбрать изображение'}</button>
        </div>
        <input ref={inputRef} className="admin-hidden-file" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" required={!work.imagePath} onChange={onFileChange} />
        {work.imagePath && <code className="admin-path">{work.imagePath}</code>}
        <Field label="Название"><input value={work.title} onChange={(e) => onChange({ ...work, title: e.target.value })} required /></Field>
        <div className="admin-form__grid">
          <Field label="Год"><input type="number" value={work.year} onChange={(e) => onChange({ ...work, year: e.target.value })} /></Field>
          <Field label="Порядок"><input type="number" value={work.sortOrder} onChange={(e) => onChange({ ...work, sortOrder: e.target.value })} /></Field>
        </div>
        <Field label="Материал"><input value={work.material} onChange={(e) => onChange({ ...work, material: e.target.value })} /></Field>
        <Field label="Описание"><textarea rows="8" value={work.description} onChange={(e) => onChange({ ...work, description: e.target.value })} /></Field>
        <label className="admin-checkbox"><input type="checkbox" checked={work.isPublished} onChange={(e) => onChange({ ...work, isPublished: e.target.checked, isFeatured: e.target.checked ? work.isFeatured : false })} /> Показывать работу на сайте</label>
        <label className="admin-checkbox"><input type="checkbox" checked={work.isFeatured} onChange={(e) => onChange({ ...work, isFeatured: e.target.checked })} disabled={!work.isPublished} /> Показывать в избранном</label>
        <div className="admin-modal__actions">
          <button type="button" className="admin-button" onClick={onClose}>Отмена</button>
          <button className="admin-button admin-button--primary" disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>
}

function ImageField({ label, name, currentPath }) {
  const [preview, setPreview] = useState(currentPath ? contentService.publicImageUrl(currentPath) : '')

  const onFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div className="admin-field">
      <span>{label}</span>
      {preview ? (
        <div className="admin-small-preview">
          <img src={preview} alt="Предпросмотр" />
        </div>
      ) : null}
      {currentPath && <code className="admin-path">{currentPath}</code>}
      <input name={name} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={onFileChange} />
    </div>
  )
}

export default Admin
