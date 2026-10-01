import { useEffect, useState } from 'react'

import contentService from '../services/contentService'

import Header from '../components/Header'
import WorkCard from '../components/WorkCard'
import Lightbox from '../components/Lightbox'
import Reveal from '../components/Reveal'
import '../styles/home.css'


function Home() {
  const [content, setContent] = useState(null)

  const [activeIndex, setActiveIndex] = useState(null)


  useEffect(() => {
    const loadContent = async () => {
      const data = await contentService.getContent()

      setContent(data)
    }


    loadContent()
  }, [])


  if (!content) {
    return (
      <div className="loading">
        Загрузка...
      </div>
    )
  }


  const featuredWorks = content.works.filter((work) =>
    content.featuredWorks.includes(work.id)
  )


  const openLightbox = (work) => {
    const index = content.works.findIndex(
      (item) => item.id === work.id
    )

    setActiveIndex(index)
  }


  const closeLightbox = () => {
    setActiveIndex(null)
  }


  const nextWork = () => {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return null
      }

      return (
        (currentIndex + 1) %
        content.works.length
      )
    })
  }


  const previousWork = () => {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return null
      }

      return (
        (currentIndex - 1 + content.works.length) %
        content.works.length
      )
    })
  }


  return (
    <div
      className="site"
      id="top"
      style={{
        '--background-image': `url(${content.background.image})`,
      }}
    >

      <Header />


      <main>

        {/* =========================================
            HERO
        ========================================= */}

        <section className="hero">

          <div className="hero__logo">

            <img
              src={content.logo.image}
              alt={content.logo.alt}
            />

          </div>


          <p className="hero__bio">
            {content.artist.shortBio}
          </p>

        </section>


        {/* =========================================
            FEATURED WORKS
        ========================================= */}

        <section className="featured section">

          <div className="section-intro">

            <span className="section-intro__label">
              Избранное
            </span>

          </div>


          <div className="featured__grid">

            {featuredWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                onClick={openLightbox}
              />
            ))}

          </div>

        </section>


        {/* =========================================
            GALLERY
        ========================================= */}

        <section
          className="gallery section"
          id="works"
        >
          <Reveal>
            <div className="section-title">

              <span className="section-title__label">
                Работы
              </span>

              <h2>
                Галерея
              </h2>

            </div>
          </Reveal>
          <Reveal>
            <div className="gallery__grid">

              {content.works.map((work) => (
                <WorkCard
                  key={work.id}
                  work={work}
                  onClick={openLightbox}
                />
              ))}

            </div>
          </Reveal>
        </section>


        {/* =========================================
            ABOUT
        ========================================= */}

        <section
          className="about section"
          id="about"
        >

          <div className="about__portrait">

            <img
              src={content.artist.portrait}
              alt={content.artist.name}
              loading="lazy"
            />

          </div>


          <div className="about__content">

            <span className="section-title__label">
              Об авторе
            </span>

            <h2>
              {content.artist.name}
            </h2>


            <div className="about__text">

              {content.artist.biography
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>
                    {paragraph.trim()}
                  </p>
                ))}

            </div>

          </div>

        </section>


        {/* =========================================
            CONTACTS
        ========================================= */}

        <section
          className="contacts section"
          id="contacts"
        >

          <div className="section-title">

            <span className="section-title__label">
              Связь
            </span>

            <h2>
              {content.contacts.title}
            </h2>

          </div>


          <p className="contacts__text">
            {content.contacts.text}
          </p>


          <div className="contacts__links">

            <a
              href={`mailto:${content.contacts.email}`}
            >
              {content.contacts.email}
            </a>


            <a
              href={`https://t.me/${content.contacts.telegram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
            >
              {content.contacts.telegram}
            </a>

          </div>

        </section>

      </main>


      <Lightbox
        works={content.works}
        activeIndex={activeIndex}
        onClose={closeLightbox}
        onNext={nextWork}
        onPrevious={previousWork}
      />

    </div>
  )
}


export default Home