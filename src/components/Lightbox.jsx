import { useEffect } from 'react'

import '../styles/lightbox.css'


function Lightbox({
  works,
  activeIndex,
  onClose,
  onNext,
  onPrevious,
}) {

  const work = works[activeIndex]


  useEffect(() => {

    if (activeIndex === null) {
      return
    }


    const handleKeyDown = (event) => {

      if (event.key === 'Escape') {
        onClose()
      }


      if (event.key === 'ArrowRight') {
        onNext()
      }


      if (event.key === 'ArrowLeft') {
        onPrevious()
      }

    }


    document.addEventListener(
      'keydown',
      handleKeyDown
    )


    document.body.style.overflow = 'hidden'


    return () => {

      document.removeEventListener(
        'keydown',
        handleKeyDown
      )


      document.body.style.overflow = ''

    }

  }, [
    activeIndex,
    onClose,
    onNext,
    onPrevious,
  ])


  if (
    activeIndex === null ||
    !work
  ) {
    return null
  }


  const currentNumber = String(
    activeIndex + 1
  ).padStart(2, '0')


  const totalNumber = String(
    works.length
  ).padStart(2, '0')


  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={work.title}
      onMouseDown={(event) => {

        if (
          event.target === event.currentTarget
        ) {
          onClose()
        }

      }}
    >

      <button
        className="lightbox__close"
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
      >
        ×
      </button>


      <button
        className="lightbox__arrow lightbox__arrow--left"
        type="button"
        onClick={onPrevious}
        aria-label="Предыдущая работа"
      >
        ←
      </button>


      <div className="lightbox__content">

        <div className="lightbox__image-wrapper">

          <img
            className="lightbox__image"
            src={work.image}
            alt={work.title}
          />

        </div>


        <div className="lightbox__info">

          <div className="lightbox__counter">
            {currentNumber} / {totalNumber}
          </div>


          <h2>
            {work.title}
          </h2>


          <div className="lightbox__meta">

            <span>
              {work.material}
            </span>

            <span>
              {work.year}
            </span>

          </div>


          <p>
            {work.description}
          </p>

        </div>

      </div>


      <button
        className="lightbox__arrow lightbox__arrow--right"
        type="button"
        onClick={onNext}
        aria-label="Следующая работа"
      >
        →
      </button>

    </div>
  )
}


export default Lightbox