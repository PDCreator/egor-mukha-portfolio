function WorkCard({ work, onClick }) {
  return (
    <article
      className="work-card"
      onClick={() => onClick(work)}
    >

      <div className="work-card__image">

        <img
          src={work.image}
          alt={work.title}
          loading="lazy"
        />

      </div>


      <div className="work-card__info">

        <h3>
          {work.title}
        </h3>


        <div className="work-card__meta">

          <span>
            {work.material}
          </span>

          <span>
            {work.year}
          </span>

        </div>

      </div>

    </article>
  )
}

export default WorkCard