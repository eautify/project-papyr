import { useMemo, useState } from 'react'
import './App.css'

type Book = {
  title: string
  author: string
  cover: string
  tone: string
  status: 'Reading' | 'Want to read' | 'Finished'
  progress?: number
  pages?: number
  year?: string
}

const books: Book[] = [
  { title: 'The Midnight Library', author: 'Matt Haig', cover: 'https://covers.openlibrary.org/b/isbn/9780525559474-L.jpg', tone: 'lavender', status: 'Reading', progress: 62, pages: 304 },
  { title: 'Crying in H Mart', author: 'Michelle Zauner', cover: 'https://covers.openlibrary.org/b/isbn/9780525657743-L.jpg', tone: 'peach', status: 'Finished', year: '2024' },
  { title: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', cover: 'https://covers.openlibrary.org/b/isbn/9780593321201-L.jpg', tone: 'mint', status: 'Want to read' },
  { title: 'Piranesi', author: 'Susanna Clarke', cover: 'https://covers.openlibrary.org/b/isbn/9781635575637-L.jpg', tone: 'blue', status: 'Finished', year: '2024' },
  { title: 'The Creative Act', author: 'Rick Rubin', cover: 'https://covers.openlibrary.org/b/isbn/9780593652886-L.jpg', tone: 'cream', status: 'Want to read' },
  { title: 'Lessons in Chemistry', author: 'Bonnie Garmus', cover: 'https://covers.openlibrary.org/b/isbn/9780385547345-L.jpg', tone: 'rose', status: 'Finished', year: '2023' },
]

const navItems = [
  { label: 'My library', icon: '▤' },
  { label: 'Discover', icon: '⌕' },
  { label: 'Collections', icon: '▧' },
]

function App() {
  const [activeNav, setActiveNav] = useState('My library')
  const [activeFilter, setActiveFilter] = useState('All books')
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState(false)

  const visibleBooks = useMemo(() => books.filter((book) => {
    const matchesFilter = activeFilter === 'All books' || book.status === activeFilter
    const matchesQuery = `${book.title} ${book.author}`.toLowerCase().includes(query.toLowerCase())
    return matchesFilter && matchesQuery
  }), [activeFilter, query])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Papyr home"><span className="brand-mark">p</span><span>papyr<span className="brand-period">.</span></span></a>
        <div className="profile-card">
          <div className="avatar">J</div>
          <div><strong>Jamie’s library</strong><span>Personal space</span></div>
          <span className="chevron">⌄</span>
        </div>
        <p className="nav-caption">YOUR SPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.label} className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => setActiveNav(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === 'My library' && <span className="nav-count">24</span>}</button>)}
        </nav>
        <p className="nav-caption collection-caption">YOUR COLLECTIONS <button aria-label="Add collection" className="tiny-add">+</button></p>
        <button className="collection-link"><span className="collection-dot dot-coral" />Want to read <span className="collection-num">8</span></button>
        <button className="collection-link"><span className="collection-dot dot-purple" />Favorites <span className="collection-num">6</span></button>
        <button className="collection-link"><span className="collection-dot dot-green" />Book club <span className="collection-num">4</span></button>
        <div className="sidebar-bottom"><div className="upgrade-card"><span className="sparkle">✳</span><strong>Your reading, in bloom.</strong><p>A little space for all the stories you love.</p><button onClick={() => setActiveNav('Discover')}>Explore books <span>↗</span></button></div><button className="settings-link"><span>⚙</span> Settings</button><div className="sidebar-footer">Made for your next chapter <span>♡</span></div></div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb">My space <span>/</span> <strong>{activeNav}</strong></div><div className="top-actions"><label className="search-box"><span>⌕</span><input aria-label="Search your library" placeholder="Search your library..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label><button className="icon-button" aria-label="Notifications">♧<i /></button><div className="small-avatar">J</div></div></header>
        <div className="content-wrap">
          <section className="welcome-row"><div><p className="date-label">MONDAY, OCTOBER 5 <span>✳</span></p><h1>Your library, <em>your story.</em></h1><p className="welcome-copy">A little progress is still progress. Keep turning pages.</p></div><button className="add-book" onClick={() => setSaved(true)}><span>＋</span> Add a book</button></section>
          {saved && <div role="status" className="inline-note">Book search is coming next. Your library is ready for its first addition. <button onClick={() => setSaved(false)} aria-label="Dismiss">×</button></div>}

          <section className="stats-grid" aria-label="Reading summary">
            <article className="stat-card stat-featured"><div className="stat-top"><span className="stat-icon book-icon">▤</span><span className="stat-trend">THIS YEAR <b>↗</b></span></div><strong>12</strong><span className="stat-label">books finished</span><div className="mini-bars" aria-label="Monthly reading activity"><i style={{height:'30%'}}/><i style={{height:'45%'}}/><i style={{height:'36%'}}/><i style={{height:'66%'}}/><i style={{height:'52%'}}/><i style={{height:'88%'}}/><i style={{height:'60%'}}/><i style={{height:'74%'}}/><i style={{height:'48%'}}/><i style={{height:'100%'}}/><i style={{height:'64%'}}/><i style={{height:'82%'}}/></div><div className="month-labels"><span>JAN</span><span>JUN</span><span>DEC</span></div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon coral-icon">◷</span><span className="stat-label">IN PROGRESS</span></div><strong>3</strong><span className="stat-foot">books on your nightstand</span><div className="stat-decoration decoration-coral">◌</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon purple-icon">♡</span><span className="stat-label">ON YOUR LIST</span></div><strong>8</strong><span className="stat-foot">stories for another day</span><div className="stat-decoration decoration-purple">✳</div></article>
            <article className="stat-card"><div className="stat-top"><span className="stat-icon green-icon">▧</span><span className="stat-label">IN YOUR LIBRARY</span></div><strong>24</strong><span className="stat-foot">books and counting</span><div className="stat-decoration decoration-green">✿</div></article>
          </section>

          <section className="reading-section"><div className="section-heading"><div><p className="section-kicker">PICK UP WHERE YOU LEFT OFF</p><h2>On your nightstand <span>☼</span></h2></div><button className="text-link" onClick={() => setActiveFilter('Reading')}>See all <span>↗</span></button></div><article className="continue-card"><img className="continue-cover" src={books[0].cover} alt="The Midnight Library book cover" /><div className="continue-details"><span className="reading-pill"><i /> CURRENTLY READING</span><h3>The Midnight Library</h3><p className="book-author">Matt Haig</p><p className="book-edition">Paperback · 304 pages</p><div className="progress-row"><div className="progress-track"><span style={{width:'62%'}} /></div><span>62%</span></div><p className="progress-caption">You’re 189 pages in. Keep going, you’re doing lovely.</p></div><div className="continue-actions"><button className="progress-button" onClick={() => setSaved(true)}>Update progress <span>→</span></button><button className="more-button" aria-label="More options">···</button></div><span className="card-flower">✿</span></article></section>

          <section className="books-section"><div className="section-heading book-heading"><div><p className="section-kicker">THE STORIES YOU’RE KEEPING</p><h2>Your bookshelf <span>✳</span></h2></div><button className="text-link" onClick={() => setActiveFilter('All books')}>View library <span>↗</span></button></div><div className="filter-row"><div className="filter-tabs" role="group" aria-label="Filter books">{['All books', 'Reading', 'Want to read', 'Finished'].map((filter) => <button key={filter} className={activeFilter === filter ? 'selected' : ''} onClick={() => setActiveFilter(filter)}>{filter}{filter === 'All books' && <span>24</span>}</button>)}</div><button className="sort-button">Recently added <span>⌄</span></button></div><div className="book-grid">{visibleBooks.length ? visibleBooks.map((book) => <article className="book-card" key={book.title}><div className={`cover-wrap ${book.tone}`}><img src={book.cover} alt={`${book.title} cover`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className="cover-fallback">{book.title.split(' ').map((word) => word[0]).slice(0, 2).join('')}</span><button className="favorite-button" aria-label={`Favorite ${book.title}`}>♡</button></div><h3>{book.title}</h3><p>{book.author}</p><div className="book-meta"><span className={`status-tag ${book.status === 'Reading' ? 'tag-reading' : book.status === 'Finished' ? 'tag-finished' : 'tag-want'}`}>{book.status}</span>{book.year && <span>{book.year}</span>}</div></article>) : <div className="empty-state">No books match that search. Try another title or author.</div>}</div></section>
          <footer className="page-footer"><span>Every book leaves a little magic behind.</span><span>✳ &nbsp; PAPYR</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
