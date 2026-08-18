import { useState } from 'react'

import { works } from '../data/works'
import WorkCard from '../components/WorkCard'
import Lightbox from '../components/Lightbox'

import '../styles/gallery.css'

function Gallery() {
  const [activeIndex, setActiveIndex] = useState(null)


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
    <div className="gallery-page">

      <section className="gallery-header">

        <p className="section-heading__label">
          КОЛЛЕКЦИЯ
        </p>

        <h1>
          Галерея работ
        </h1>

        <p>
          Все работы Егора Мухи
        </p>

      </section>


      <section className="gallery-grid">

        {works.map((work) => (
          <WorkCard
            key={work.id}
            work={work}
            onClick={openLightbox}
          />
        ))}

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

export default Gallery