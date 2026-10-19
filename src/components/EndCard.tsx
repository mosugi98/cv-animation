export function EndCard() {
  return (
    <section className="card endcard" aria-label="Closing card">
      <svg className="endcard__icon" viewBox="0 0 24 32" role="img" aria-label="Bookmark">
        <path d="M2 2h20v28l-10-7-10 7z" />
      </svg>
      <p className="endcard__title">Save this</p>
      <p className="endcard__sub">for your next strip.</p>
      <p className="endcard__note">Share it with someone learning to read ECGs.</p>
    </section>
  );
}
