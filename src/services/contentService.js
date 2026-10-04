import content from '../data/content'
import { supabase } from '../lib/supabase'

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'portfolio'

const publicImageUrl = (path) => {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  if (path.startsWith('/')) return path
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

const mapArtist = (row) => ({
  id: row.id,
  name: row.name,
  shortBio: row.short_bio,
  biography: row.biography,
  portrait: publicImageUrl(row.portrait_path),
  portraitPath: row.portrait_path,
  updatedAt: row.updated_at,
})

const mapContacts = (row) => ({
  id: row.id,
  title: row.title,
  text: row.text,
  email: row.email,
  telegram: row.telegram,
  updatedAt: row.updated_at,
})

const mapSettings = (row) => ({
  id: row.id,
  logo: publicImageUrl(row.logo_path),
  logoPath: row.logo_path,
  logoAlt: row.logo_alt,
  background: publicImageUrl(row.background_path),
  backgroundPath: row.background_path,
  updatedAt: row.updated_at,
})

const mapWork = (row) => ({
  id: row.id,
  title: row.title,
  year: row.year,
  material: row.material,
  description: row.description,
  image: publicImageUrl(row.image_path),
  imagePath: row.image_path,
  sortOrder: row.sort_order,
  isFeatured: row.is_featured,
  isPublished: row.is_published ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const contentService = {
  async getContent() {
    const [artistResult, contactsResult, settingsResult, worksResult] = await Promise.all([
      supabase.from('artist').select('*').order('id').limit(1).maybeSingle(),
      supabase.from('contacts').select('*').order('id').limit(1).maybeSingle(),
      supabase.from('site_settings').select('*').order('id').limit(1).maybeSingle(),
      supabase.from('works').select('*').eq('is_published', true).order('sort_order').order('id'),
    ])

    const error = artistResult.error || contactsResult.error || settingsResult.error || worksResult.error
    if (error) {
      console.error('Supabase content loading failed:', error)
      return content
    }

    const works = (worksResult.data || []).map(mapWork)
    return {
      artist: artistResult.data ? mapArtist(artistResult.data) : content.artist,
      logo: settingsResult.data
        ? { image: publicImageUrl(settingsResult.data.logo_path), alt: settingsResult.data.logo_alt }
        : content.logo,
      background: settingsResult.data
        ? { image: publicImageUrl(settingsResult.data.background_path) }
        : content.background,
      featuredWorks: works.filter((work) => work.isFeatured).map((work) => work.id),
      works: works.length ? works : content.works,
      contacts: contactsResult.data ? mapContacts(contactsResult.data) : content.contacts,
    }
  },

  async uploadImage(file, folder) {
    const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg'
    const path = `${folder}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    })
    if (error) throw error
    return path
  },

  async removeImage(path) {
    if (!path || path.startsWith('/')) return
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path])
    if (error) console.warn('Could not remove storage file:', error)
  },

  async saveArtist(values) {
    const { data: existing } = await supabase.from('artist').select('id').order('id').limit(1).maybeSingle()
    const payload = {
      name: values.name,
      short_bio: values.shortBio,
      biography: values.biography,
      portrait_path: values.portraitPath || null,
    }
    const query = existing
      ? supabase.from('artist').update(payload).eq('id', existing.id).select().single()
      : supabase.from('artist').insert(payload).select().single()
    const { data, error } = await query
    if (error) throw error
    return mapArtist(data)
  },

  async saveContacts(values) {
    const { data: existing } = await supabase.from('contacts').select('id').order('id').limit(1).maybeSingle()
    const payload = { title: values.title, text: values.text, email: values.email, telegram: values.telegram }
    const query = existing
      ? supabase.from('contacts').update(payload).eq('id', existing.id).select().single()
      : supabase.from('contacts').insert(payload).select().single()
    const { data, error } = await query
    if (error) throw error
    return mapContacts(data)
  },

  async saveSettings(values) {
    const { data: existing } = await supabase.from('site_settings').select('id').order('id').limit(1).maybeSingle()
    const payload = {
      logo_path: values.logoPath || null,
      logo_alt: values.logoAlt,
      background_path: values.backgroundPath || null,
    }
    const query = existing
      ? supabase.from('site_settings').update(payload).eq('id', existing.id).select().single()
      : supabase.from('site_settings').insert(payload).select().single()
    const { data, error } = await query
    if (error) throw error
    return mapSettings(data)
  },

  async getWorks() {
    const { data, error } = await supabase.from('works').select('*').order('sort_order').order('id')
    if (error) throw error
    return (data || []).map(mapWork)
  },

  async saveWork(values) {
    const payload = {
      title: values.title.trim(),
      year: values.year === '' ? null : Number(values.year),
      material: values.material.trim(),
      description: values.description.trim(),
      image_path: values.imagePath,
      sort_order: Number(values.sortOrder) || 0,
      is_featured: Boolean(values.isFeatured),
      is_published: values.isPublished !== false,
    }
    const query = values.id
      ? supabase.from('works').update(payload).eq('id', values.id).select().single()
      : supabase.from('works').insert(payload).select().single()
    const { data, error } = await query
    if (error) throw error
    return mapWork(data)
  },

  async deleteWork(work) {
    const { error } = await supabase.from('works').delete().eq('id', work.id)
    if (error) throw error
    await this.removeImage(work.imagePath)
  },

  async saveOrder(works) {
    for (const [index, work] of works.entries()) {
      const { error } = await supabase.from('works').update({ sort_order: index }).eq('id', work.id)
      if (error) throw error
    }
  },

  publicImageUrl,
}

export default contentService
