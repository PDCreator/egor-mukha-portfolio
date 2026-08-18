import { useState } from 'react'
import { Link } from 'react-router-dom'

import { works } from '../data/works'
import WorkCard from '../components/WorkCard'
import Lightbox from '../components/Lightbox'

import '../styles/home.css'

function Home() {
  const [activeIndex, setActiveIndex] = useState(null)

  const featuredWorks = works
    .filter((work) => work.featured)
    .slice(0, 3)


  const openLightbox = (work) => {
    const index = works.findIndex(
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

      return (currentIndex + 1) % works.length
    })
  }


  const previousWork = () => {
    setActiveIndex((currentIndex) => {
      if (currentIndex === null) {
        return null
      }

      return (
        (currentIndex - 1 + works.length) %
        works.length
      )
    })
  }


  return (
    <div className="home">

      <section className="hero">

        <div className="hero__content">

          <p className="hero__label">
            СКУЛЬПТОР
          </p>

          <h1 className="hero__title">
            Егор Муха
          </h1>

          <p className="hero__description">
            Информация о художнике появится здесь.
            Это временный текст, который позже будет
            заменён на настоящий.
          </p>

        </div>

      </section>


      <section className="featured">

        <div className="section-heading">

          <p className="section-heading__label">
            ИЗБРАННЫЕ РАБОТЫ
          </p>

          <h2 className="section-heading__title">
            Из коллекции
          </h2>

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


        <div className="featured__link">

          <Link to="/gallery">
            Смотреть все работы
          </Link>

        </div>

      </section>


      <section className="about">

        <div className="about__content">

          <p className="section-heading__label">
            ОБ АВТОРЕ
          </p>

          <h2>
            Егор Муха
          </h2>

          <p>
            Здесь появится информация о Егоре,
            его творчестве, подходе к работе
            и художественном направлении.
          </p>

        </div>


        <div className="about__image">
          <span>
            Фотография
          </span>
        </div>

      </section>


      <section className="fixed-images">

        <div className="fixed-image">
          <span>
            Фотография
          </span>
        </div>

        <div className="fixed-image">
          <span>
            Фотография
          </span>
        </div>

      </section>


      <Lightbox
        works={works}
        activeIndex={activeIndex}
        onClose={closeLightbox}
        onNext={nextWork}
        onPrevious={previousWork}
      />

    </div>
  )
}

export default Home