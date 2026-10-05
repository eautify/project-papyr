import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookHeart,
  BookOpen,
  Bookmark,
  Check,
  CheckCircle2,
  CircleHelp,
  Compass,
  Filter,
  Heart,
  LibraryBig,
  List,
  LogOut,
  Menu,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import type {
  CatalogBook,
  Collection,
  EditionDTO,
  ReadingStatus,
  SearchBookResult,
  SearchMode,
} from "./types/domain";
import {
  calculateProgress,
  categoryFromSubjects,
} from "./types/domain";
import { useAuth } from "./features/auth/AuthContext";
import { AuthPage, LandingPage } from "./features/auth/AuthScreens";
import { bookService } from "./services/books";
import { catalogApi } from "./services/catalog";
import {
  supabase,
  supabaseConfigIssue,
  supabaseConfigured,
} from "./utils/supabase";
import "./App.css";

const queryKeys = {
  library: ["library"],
  dashboard: ["dashboard"],
  collections: ["collections"],
  collection: (id: string) => ["collection", id],
  book: (id: string) => ["book", id],
  profile: ["profile"],
};
const statusLabels: Record<ReadingStatus, string> = {
  none: "Not started",
  want_to_read: "Want to read",
  currently_reading: "Currently reading",
  finished: "Finished",
  dnf: "Did not finish",
};
const statusStyles: Record<ReadingStatus, string> = {
  none: "status-none",
  want_to_read: "status-want",
  currently_reading: "status-reading",
  finished: "status-finished",
  dnf: "status-dnf",
};

function Protected() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="screen-loading">
        <span className="spinner" />
        Restoring your library...
      </div>
    );
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: window.location.pathname }} />
  );
}

function BookCover({
  book,
  size = "card",
}: {
  book:
    | Pick<CatalogBook, "edition" | "work">
    | SearchBookResult
    | { cover_olid: string | null; title: string };
  size?: "card" | "detail";
}) {
  const [failed, setFailed] = useState(false);
  const edition = "edition" in book ? book.edition : undefined;
  const work = "work" in book ? book.work : undefined;
  const cover = edition
    ? (edition.cover_olid ?? work?.cover_olid)
    : work?.cover_olid ??
      ("coverOlid" in book
        ? book.coverOlid
        : "cover_olid" in book
          ? book.cover_olid
          : null);
  const title = edition
    ? (work?.title ?? edition.title ?? "Untitled")
    : work?.title ??
      ("title" in book ? book.title : "Untitled");
  const isbn = edition?.isbn13?.[0] ?? edition?.isbn10?.[0];
  const src = isbn
    ? `https://covers.openlibrary.org/b/isbn/${isbn}-${size === "detail" ? "L" : "M"}.jpg?default=false`
    : cover
      ? `https://covers.openlibrary.org/b/id/${cover}-${size === "detail" ? "L" : "M"}.jpg?default=false`
      : null;
  return (
    <div
      className={`book-cover ${size} ${failed || !src ? "cover-missing" : ""}`}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={`${title} cover`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="cover-placeholder">
          <BookOpen />
          <span>{title}</span>
        </div>
      )}
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function useEscapeToClose(onClose?: () => void) {
  useEffect(() => {
    if (!onClose) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);
}

function AppShell() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: catalogApi.profile,
  });
  const signOut = async () => {
    await supabase?.auth.signOut();
    queryClient.clear();
    navigate("/");
  };
  const nav = [
    { to: "/app", label: "Overview", icon: <Activity /> },
    { to: "/app/library", label: "My library", icon: <LibraryBig /> },
    { to: "/app/discover", label: "Discover", icon: <Compass /> },
    { to: "/app/collections", label: "Collections", icon: <Bookmark /> },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" to="/app">
          <span className="brand-mark">p</span>
          <span>
            papyr<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="profile-card">
          <div className="avatar">
            {(profile?.display_name || user?.email || "R")[0].toUpperCase()}
          </div>
          <div>
            <strong>
              {profile?.display_name ||
                user?.email?.split("@")[0] ||
                "My library"}
            </strong>
            <span>Personal space</span>
          </div>
        </div>
        <p className="nav-caption">YOUR SPACE</p>
        <nav className="primary-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              end={item.to === "/app"}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <Sparkles />
            <strong>Your reading, in bloom.</strong>
            <p>A little space for all the stories you love.</p>
            <Link to="/app/discover">
              Explore books <ArrowRight />
            </Link>
          </div>
          <NavLink
            className="settings-link"
            to="/app/settings"
            onClick={() => setMenuOpen(false)}
          >
            <Settings /> Settings
          </NavLink>
          <button
            className="settings-link logout-button"
            onClick={() => void signOut()}
          >
            <LogOut /> Log out
          </button>
          <div className="sidebar-footer">
            Made for your next chapter <span>♥</span>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            My space <span>/</span>
            <strong>Personal library</strong>
          </div>
          <div className="top-actions">
            <Link className="search-box" to="/app/search">
              <Search />
              <span>Search books...</span>
              <kbd>⌘ K</kbd>
            </Link>
            <button
              className="small-avatar"
              title={user?.email ?? "Account"}
              onClick={() => navigate("/app/settings")}
            >
              {(profile?.display_name || user?.email || "R")[0].toUpperCase()}
            </button>
          </div>
        </header>
        {menuOpen && (
          <button
            className="mobile-scrim"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <div className="content-wrap">
          <Outlet />
          <footer className="page-footer">
            <span>Every book leaves a little magic behind.</span>
            <span>
              <a
                href="https://openlibrary.org"
                target="_blank"
                rel="noreferrer"
              >
                Book data by Open Library
              </a>{" "}
              ✳ PAPYR
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function useLibrary() {
  return useQuery({ queryKey: queryKeys.library, queryFn: catalogApi.library });
}
function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: catalogApi.dashboard,
  });
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
function authorNames(book: CatalogBook) {
  return (
    book.work.work_authors
      ?.map((item) => item.author.name)
      .join(", ") || "Author unknown"
  );
}
function progressOf(book: CatalogBook) {
  return book.edition?.number_of_pages
    ? calculateProgress(book.current_page, book.edition.number_of_pages)
    : book.progress_percent;
}

function BookCard({
  book,
  compact = false,
}: {
  book: CatalogBook;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const favorite = useMutation({
    mutationFn: () =>
      catalogApi.updateFlags(book.id, { is_favorite: !book.is_favorite }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
  return (
    <article className={`book-card ${compact ? "book-card-compact" : ""}`}>
      <Link to={`/app/book/${book.id}`} className="book-card-main">
        <BookCover book={book} />
        <div className="book-card-copy">
          <h3>{book.edition?.title || book.work.title}</h3>
          <p>{authorNames(book)}</p>
          {!compact && (
            <span className={`status-tag ${statusStyles[book.reading_status]}`}>
              {statusLabels[book.reading_status]}
            </span>
          )}
          {book.reading_status === "currently_reading" && (
            <div className="tiny-progress">
              <span style={{ width: `${progressOf(book) ?? 0}%` }} />
            </div>
          )}
          <small className="edition-line">
            {book.edition?.format || "Work only · no edition listed"}
            {book.edition?.published_year
              ? ` · ${book.edition.published_year}`
              : ""}
          </small>
        </div>
      </Link>
      <button
        className={`favorite-button ${book.is_favorite ? "favorited" : ""}`}
        aria-label={book.is_favorite ? "Remove favorite" : "Add to favorites"}
        onClick={() => favorite.mutate()}
      >
        <Heart fill={book.is_favorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}

function LoadingState({
  label = "Loading your library...",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state">
      <span className="spinner" />
      {label}
    </div>
  );
}
function ErrorState({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="error-state">
      <CircleHelp />
      <div>
        <strong>We couldn’t load this right now.</strong>
        <p>{error instanceof Error ? error.message : "Please try again."}</p>
      </div>
      <button className="button button-secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
function EmptyState({
  title,
  copy,
  action,
}: {
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <BookHeart />
      </div>
      <h2>{title}</h2>
      <p>{copy}</p>
      {action}
    </div>
  );
}

function DashboardPage() {
  const query = useDashboard();
  if (query.isLoading)
    return <LoadingState label="Gathering your reading stats..." />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const { books, records, logs, streak } = query.data!;
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearRecords = records.filter(
    (record) =>
      record.outcome === "finished" &&
      Boolean(record.finished_at) &&
      record.finished_at!.slice(0, 10) >= yearStart,
  );
  const reading = books.filter(
    (book) => book.reading_status === "currently_reading",
  );
  const finishedCount = books.filter(
    (book) => book.reading_status === "finished",
  ).length;
  const wantCount = books.filter(
    (book) => book.reading_status === "want_to_read",
  ).length;
  const wantBuy = books.filter((book) => book.want_to_buy).length;
  const owned = books.filter((book) => book.is_owned).length;
  const pages = logs
    .filter((log) => log.logged_on >= yearStart)
    .reduce((sum, log) => sum + log.pages_read, 0);
  const rated = yearRecords.filter((record) => record.rating);
  const average = rated.length
    ? (
        rated.reduce((sum, record) => sum + (record.rating ?? 0), 0) /
        rated.length
      ).toFixed(1)
    : "No ratings";
  const durationRecords = yearRecords.filter((record) => record.finished_at);
  const averageDays = durationRecords.length
    ? Math.round(
        durationRecords.reduce(
          (sum, record) =>
            sum +
            (new Date(record.finished_at!).getTime() -
              new Date(record.started_at).getTime()) /
              86400000,
          0,
        ) / durationRecords.length,
      )
    : null;
  const monthly = Array.from({ length: 12 }, (_, month) => ({
    name: new Intl.DateTimeFormat(undefined, { month: "short" }).format(
      new Date(year, month, 1),
    ),
    pages: logs
      .filter(
        (log) =>
          log.logged_on.startsWith(String(year)) &&
          Number(log.logged_on.slice(5, 7)) === month + 1,
      )
      .reduce((sum, log) => sum + log.pages_read, 0),
  }));
  const maxMonthly = Math.max(1, ...monthly.map((item) => item.pages));

  const categories = new Map<string, number>();
  books.forEach((book) => {
    const key = categoryFromSubjects(book.work.subjects ?? []);
    categories.set(key, (categories.get(key) ?? 0) + 1);
  });
  const authors = new Map<string, number>();
  books.forEach((book) =>
    authors.set(authorNames(book), (authors.get(authorNames(book)) ?? 0) + 1),
  );
  const recent = records
    .filter((record) => record.outcome === "finished" && record.finished_at)
    .sort((a, b) => b.finished_at!.localeCompare(a.finished_at!))
    .slice(0, 4);
  const recentLogs = [...logs]
    .sort((a, b) => b.logged_on.localeCompare(a.logged_on))
    .slice(0, 4);
  const byId = new Map(books.map((book) => [book.id, book]));
  return (
    <>
      <section className="welcome-row">
        <div>
          <p className="date-label">
            {new Intl.DateTimeFormat(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
              .format(now)
              .toUpperCase()}{" "}
            <span>✳</span>
          </p>
          <h1>
            Your library, <em>your story.</em>
          </h1>
          <p className="welcome-copy">
            A little progress is still progress. Keep turning pages.
          </p>
        </div>
        <AddBookButton />
      </section>
      <section className="stats-grid" aria-label="Reading summary">
        <StatCard
          label="Books finished this year"
          value={yearRecords.length}
          icon={<TrendingUp />}
          tone="pink"
        />
        <StatCard
          label="Currently reading"
          value={reading.length}
          icon={<BookOpen />}
          tone="coral"
        />
        <StatCard
          label="Want to read"
          value={wantCount}
          icon={<Bookmark />}
          tone="purple"
        />
        <StatCard
          label="In your library"
          value={books.length}
          icon={<LibraryBig />}
          tone="green"
        />
      </section>
      <div className="dashboard-grid">
        <section className="panel activity-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR READING RHYTHM</p>
              <h2>Pages & progress</h2>
            </div>
            <span className="year-chip">{year}</span>
          </div>
          <div className="metric-row">
            <div>
              <strong>{pages.toLocaleString()}</strong>
              <span>pages read</span>
            </div>
            <div>
              <strong>
                {average}
                <small>{average === "No ratings" ? "" : " / 5"}</small>
              </strong>
              <span>average rating this year</span>
            </div>
            <div>
              <strong>
                {averageDays ?? "—"}
                <small>{averageDays === null ? "" : " days"}</small>
              </strong>
              <span>average time to finish</span>
            </div>
            <div>
              <strong>
                {streak}
                <small> days</small>
              </strong>
              <span>reading streak</span>
            </div>
          </div>
          <div
            className="monthly-chart"
            aria-label={`Monthly pages read in ${year}`}
          >
            {monthly.map((item, index) => (
              <div
                className="month-bar"
                key={item.name}
                title={`${item.pages} pages read`}
              >
                <span className="bar-value">{item.pages || ""}</span>
                <i
                  style={{
                    height: `${Math.max(item.pages ? 12 : 4, (item.pages / maxMonthly) * 100)}%`,
                  }}
                  className={index === now.getMonth() ? "current-month" : ""}
                />
                <small>{item.name}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel reading-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">PICK UP WHERE YOU LEFT OFF</p>
              <h2>On your nightstand</h2>
            </div>
            <Link
              className="text-link"
              to="/app/library?status=currently_reading"
            >
              See all <ArrowRight />
            </Link>
          </div>
          {reading.length ? (
            reading.slice(0, 3).map((book) => (
              <Link
                className="reading-row"
                to={`/app/book/${book.id}`}
                key={book.id}
              >
                <BookCover book={book} />
                <span>
                  <b>{book.work.title}</b>
                  <small>{authorNames(book)}</small>
                  <i className="tiny-progress">
                    <span style={{ width: `${progressOf(book) ?? 0}%` }} />
                  </i>
                </span>
                <strong>{progressOf(book) ?? 0}%</strong>
              </Link>
            ))
          ) : (
            <EmptyState
              title="A fresh page"
              copy="Start a book to see it here."
              action={
                <Link className="text-link" to="/app/search">
                  Find a book <ArrowRight />
                </Link>
              }
            />
          )}
        </section>
        <section className="panel stats-breakdown">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR SHELF</p>
              <h2>Little details</h2>
            </div>
          </div>
          <div className="stat-detail-row">
            <span>Finished in library</span>
            <b>{finishedCount}</b>
          </div>
          <div className="stat-detail-row">
            <span>Did not finish</span>
            <b>
              {books.filter((book) => book.reading_status === "dnf").length}
            </b>
          </div>
          <div className="stat-detail-row">
            <span>Want to buy</span>
            <b>{wantBuy}</b>
          </div>
          <div className="stat-detail-row">
            <span>Owned editions</span>
            <b>{owned}</b>
          </div>
          <div className="breakdown-title">
            Category <small>(derived from book topics)</small>
          </div>
          {[...categories.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name, count]) => (
              <div className="breakdown-row" key={name}>
                <span>{name}</span>
                <i>
                  <span
                    style={{
                      width: `${(count / Math.max(1, books.length)) * 100}%`,
                    }}
                  />
                </i>
                <b>{count}</b>
              </div>
            ))}
          <div className="breakdown-title">Authors</div>
          {[...authors.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => (
              <div className="breakdown-row" key={name}>
                <span>{name}</span>
                <i>
                  <span
                    style={{
                      width: `${(count / Math.max(1, books.length)) * 100}%`,
                    }}
                  />
                </i>
                <b>{count}</b>
              </div>
            ))}
        </section>
        <section className="panel recent-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">THE STORIES THAT STAY</p>
              <h2>Recently finished</h2>
            </div>
            <Link className="text-link" to="/app/library?status=finished">
              Your library <ArrowRight />
            </Link>
          </div>
          {recent.length ? (
            recent.map((record) => (
              <Link
                className="recent-row"
                key={record.id}
                to={`/app/book/${record.user_book_id}`}
              >
                <span className="recent-check">
                  <Check />
                </span>
                <span>
                  <b>
                    {byId.get(record.user_book_id)?.work.title ??
                      "Book"}
                  </b>
                  <small>
                    {record.finished_at
                      ? formatDate(record.finished_at)
                      : "Finished"}
                    {record.rating ? ` · ${"★".repeat(record.rating)}` : ""}
                  </small>
                </span>
                <ArrowRight />
              </Link>
            ))
          ) : (
            <p className="muted-copy">
              Your finished books will find a home here.
            </p>
          )}
          <div className="activity-heading">Recent reading activity</div>
          {recentLogs.length ? (
            recentLogs.map((log, index) => (
              <Link
                className="recent-row"
                key={`${log.user_book_id}-${log.logged_on}-${index}`}
                to={`/app/book/${log.user_book_id}`}
              >
                <span className="recent-check activity-check">
                  <NotebookPen />
                </span>
                <span>
                  <b>
                    {byId.get(log.user_book_id)?.work.title ??
                      "Reading session"}
                  </b>
                  <small>
                    {formatDate(log.logged_on)} · {log.pages_read} pages ·{" "}
                    {log.minutes_read} min
                  </small>
                </span>
                <ArrowRight />
              </Link>
            ))
          ) : (
            <p className="muted-copy">
              Reading sessions you log will appear here.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <span className="stat-decoration">✳</span>
    </article>
  );
}

function AddBookButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="button button-primary add-book"
        onClick={() => setOpen(true)}
      >
        <Plus /> Add a book
      </button>
      {open && <BookSearchDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function BookSearchDialog({
  onClose,
  inline = false,
  initialWorkId = "",
}: {
  onClose?: () => void;
  inline?: boolean;
  initialWorkId?: string;
}) {
  useEscapeToClose(onClose);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const [page, setPage] = useState(1);
  const [workId, setWorkId] = useState(initialWorkId);
  const [readingStatus, setReadingStatus] =
    useState<ReadingStatus>("want_to_read");
  const [wantToBuy, setWantToBuy] = useState(false);
  const [isOwned, setIsOwned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTerm(term), 350);
    return () => window.clearTimeout(timer);
  }, [term]);
  const queryClient = useQueryClient();
  const search = useQuery({
    queryKey: ["book-search", debouncedTerm, mode, page],
    queryFn: () => bookService.search(debouncedTerm, mode, page),
    enabled: debouncedTerm.trim().length > 1,
    retry: 1,
  });
  const detail = useQuery({
    queryKey: ["open-work", workId],
    queryFn: () => bookService.work(workId),
    enabled: Boolean(workId),
    staleTime: 10 * 60_000,
  });
  const add = useMutation({
    mutationFn: (edition: EditionDTO | null) => {
      return bookService.import(detail.data!.work.id, edition?.id ?? null, {
        readingStatus,
        wantToBuy,
        isOwned,
        isFavorite,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.library });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      setNotice("Added to your library.");
      setWorkId("");
    },
    onError: (error) => setNotice(error.message),
  });
  const body = (
    <div className="search-dialog-content">
      <div className="dialog-title">
        <div>
          <p className="section-kicker">FIND YOUR NEXT READ</p>
          <h2>Add a book</h2>
          <p>Search works, then choose the exact edition for your shelf.</p>
        </div>
        {onClose && (
          <button
            className="icon-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X />
          </button>
        )}
      </div>
      <div className="search-controls">
        <label className="search-input">
          <Search />
          <input
            autoFocus
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose?.();
            }}
            placeholder="Title, author, or ISBN"
            aria-label="Search books"
          />
          <button
            onClick={() => {
              setTerm("");
              setPage(1);
            }}
            aria-label="Clear search"
          >
            <X />
          </button>
        </label>
        <select
          aria-label="Search by"
          value={mode}
          onChange={(e) => setMode(e.target.value as SearchMode)}
        >
          <option value="all">All fields</option>
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="isbn">ISBN</option>
        </select>
      </div>
      {notice && (
        <p
          className={notice.startsWith("Added") ? "form-success" : "form-error"}
          role="status"
        >
          {notice}
        </p>
      )}
      {workId ? (
        <div className="edition-picker">
          <button
            className="back-link"
            onClick={() => {
              setWorkId("");
              add.reset();
              setNotice("");
            }}
          >
            <ArrowLeft /> Search results
          </button>
          {detail.isLoading ? (
            <LoadingState label="Finding editions..." />
          ) : detail.error ? (
            <ErrorState
              error={detail.error}
              retry={() => void detail.refetch()}
            />
          ) : (
            <>
              <div className="selected-work">
                <BookCover
                  book={detail.data!.work as unknown as SearchBookResult}
                />
                <div>
                  <p className="section-kicker">SELECTED WORK</p>
                  <h3>{detail.data!.work.title}</h3>
                  <p>
                    {detail.data!.work.authors.map((a) => a.name).join(", ") ||
                      "Author unknown"}
                  </p>
                  <small>
                    {detail.data!.work.firstPublishedYear ??
                      "Publication date unknown"}
                    {" · "}
                    {detail.data!.editions.length} editions
                  </small>
                </div>
              </div>
              <div className="edition-preferences">
                <label>
                  Reading status
                  <select
                    value={readingStatus}
                    onChange={(e) =>
                      setReadingStatus(e.target.value as ReadingStatus)
                    }
                  >
                    <option value="none">Not started</option>
                    <option value="want_to_read">Want to read</option>
                    <option value="currently_reading">Currently reading</option>
                    <option value="finished">Finished</option>
                    <option value="dnf">Did not finish</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={wantToBuy}
                    onChange={(e) => setWantToBuy(e.target.checked)}
                  />{" "}
                  Want to buy
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={isOwned}
                    onChange={(e) => setIsOwned(e.target.checked)}
                  />{" "}
                  I own it
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={isFavorite}
                    onChange={(e) => setIsFavorite(e.target.checked)}
                  />{" "}
                  Favorite
                </label>
              </div>
              <div className="edition-list">
                {detail.data!.editions.length ? (
                  <>
                    {detail.data!.editions.map((edition) => (
                      <article className="edition-option" key={edition.id}>
                        <BookCover
                          book={{
                            cover_olid: edition.coverOlid,
                            title: edition.title ?? detail.data!.work.title,
                          }}
                        />
                        <span>
                          <b>{edition.title || detail.data!.work.title}</b>
                          <small>
                            {[
                              edition.format,
                              edition.publisher,
                              edition.publishedDate,
                              edition.pages ? `${edition.pages} pages` : null,
                              edition.languageCode,
                              edition.isbn13[0] ?? edition.isbn10[0],
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Edition details unavailable"}
                          </small>
                        </span>
                        <button
                          className="button button-secondary"
                          disabled={add.isPending}
                          onClick={() => add.mutate(edition)}
                        >
                          {add.isPending ? "Saving..." : "Add edition"}
                        </button>
                      </article>
                    ))}
                    <button
                      className="text-link work-only-action"
                      disabled={add.isPending}
                      onClick={() => add.mutate(null)}
                    >
                      Can’t find your edition? Add this work without one.
                    </button>
                  </>
                ) : (
                  <EmptyState
                    title="No editions listed"
                    copy="Open Library has no selectable edition for this work. You can still add and track it without edition details."
                    action={
                      <button
                        className="button button-primary"
                        onClick={() => add.mutate(null)}
                        disabled={add.isPending}
                      >
                        {add.isPending ? "Saving..." : "Add work without an edition"}
                      </button>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      ) : term.trim().length > 1 &&
        (debouncedTerm !== term || search.isLoading) ? (
        <LoadingState label="Searching Open Library..." />
      ) : search.isLoading ? (
        <LoadingState label="Searching Open Library..." />
      ) : search.error ? (
        <div className="api-unavailable">
          <CircleHelp />
          <h3>Book search is having a moment</h3>
          <p>
            {search.error instanceof Error
              ? search.error.message
              : "Try again in a little while. Your saved library is still here."}
          </p>
          <button
            className="button button-secondary"
            onClick={() => void search.refetch()}
          >
            Retry search
          </button>
        </div>
      ) : term.trim().length < 2 ? (
        <div className="search-empty">
          <Search />
          <b>What are you in the mood to read?</b>
          <span>Try a title, author, or ISBN. Your catalog stays private.</span>
        </div>
      ) : search.data?.results.length ? (
        <>
          <p className="result-count">
            {search.data.total.toLocaleString()} works found · choose a work
            to view its editions
          </p>
          <div className="search-results">
            {search.data.results.map((result) => (
              <button
                className="search-result"
                key={result.workId}
                onClick={() => {
                  setWorkId(result.workId);
                  setNotice("");
                }}
              >
                <BookCover book={result} />
                <span>
                  <b>{result.title}</b>
                  <small>{result.authors.join(", ") || "Author unknown"}</small>
                  <small>
                    {result.firstPublishedYear ?? "Year unknown"}
                    {" · "}
                    {result.editionCount} editions
                  </small>
                </span>
                <ArrowRight />
              </button>
            ))}
          </div>
          <div className="pagination">
            <button
              className="button button-secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="button button-secondary"
              disabled={!search.data.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="search-empty">
          <BookOpen />
          <b>No books found for &quot;{term}&quot;</b>
          <span>Try a different spelling or search by author.</span>
        </div>
      )}
    </div>
  );
  return inline ? (
    <section className="search-page">{body}</section>
  ) : (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className="modal book-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
      >
        {body}
      </section>
    </div>
  );
}

function LibraryPage() {
  const { data: books = [], isLoading, error, refetch } = useLibrary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("status") ?? "all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const effective = filter;
  const visible = books
    .filter((book) => {
      const q = search.toLowerCase();
      const text =
        `${book.work.title} ${authorNames(book)} ${book.edition?.isbn13.join(" ") ?? ""}`.toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (effective === "all" ||
          book.reading_status === effective ||
          (effective === "want_to_buy" && book.want_to_buy) ||
          (effective === "owned" && book.is_owned) ||
          (effective === "favorites" && book.is_favorite))
      );
    })
    .sort((a, b) =>
      sort === "title"
        ? a.work.title.localeCompare(b.work.title)
        : sort === "created"
          ? b.created_at.localeCompare(a.created_at)
          : b.updated_at.localeCompare(a.updated_at),
    );
  const filters = [
    ["all", "All books"],
    ["currently_reading", "Reading"],
    ["want_to_read", "Want to read"],
    ["finished", "Finished"],
    ["dnf", "DNF"],
    ["want_to_buy", "Want to buy"],
    ["owned", "Owned"],
    ["favorites", "Favorites"],
  ];
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={() => void refetch()} />;
  return (
    <>
      <PageTitle
        eyebrow="THE STORIES YOU KEEP"
        title="Your bookshelf"
        description={`${books.length} ${books.length === 1 ? "edition" : "editions"} in your private library.`}
        action={<AddBookButton />}
      />
      <div className="library-toolbar">
        <label className="local-search">
          <Search />
          <input
            aria-label="Search your library"
            placeholder="Search title, author, ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X />
            </button>
          )}
        </label>
        <label className="sort-control">
          <Filter />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="updated">Recently updated</option>
            <option value="created">Recently added</option>
            <option value="title">Title A to Z</option>
          </select>
        </label>
        <div className="view-switch" aria-label="Layout">
          <button
            className={layout === "grid" ? "active" : ""}
            aria-label="Grid view"
            onClick={() => setLayout("grid")}
          >
            <LibraryBig />
          </button>
          <button
            className={layout === "list" ? "active" : ""}
            aria-label="List view"
            onClick={() => setLayout("list")}
          >
            <List />
          </button>
        </div>
      </div>
      <div className="filter-tabs" role="group" aria-label="Filter library">
        {filters.map(([key, label]) => (
          <button
            key={key}
            className={effective === key ? "selected" : ""}
            onClick={() => {
              setFilter(key);
              setSearchParams(key === "all" ? {} : { status: key });
            }}
          >
            {label}
            {key === "all" && <span>{books.length}</span>}
          </button>
        ))}
      </div>
      {visible.length ? (
        <div className={`book-grid ${layout === "list" ? "list-layout" : ""}`}>
          {visible.map((book) => (
            <BookCard key={book.id} book={book} compact={layout === "list"} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={search ? "No matching books" : "Your shelf is waiting"}
          copy={
            search
              ? "Try another title, author, or ISBN."
              : "Search for an edition to begin your personal library."
          }
          action={
            search ? (
              <button
                className="button button-secondary"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            ) : (
              <AddBookButton />
            )
          }
        />
      )}
    </>
  );
}

function SearchPage() {
  return (
    <>
      <PageTitle
        eyebrow="DISCOVER SOMETHING NEW"
        title="Find your next read"
        description="Search by title, author, or ISBN, then choose the edition that belongs on your shelf."
      />
      <BookSearchDialog inline />
    </>
  );
}

function DiscoverPage() {
  const [subject, setSubject] = useState("fantasy");
  const sections = [
    { label: "Recently published", kind: "new" as const, subject: undefined },
    { label: "Fantasy", kind: "subject" as const, subject: "fantasy" },
    {
      label: "Science fiction",
      kind: "subject" as const,
      subject: "science fiction",
    },
    { label: "Popular works", kind: "popular" as const, subject: undefined },
    { label: "A little unexpected", kind: "randomized" as const, subject: undefined },
  ];
  return (
    <>
      <PageTitle
        eyebrow="A WORLD OF STORIES"
        title="Discover"
        description="Explore new subjects and well-loved books from Open Library."
        action={
          <Link to="/app/search" className="button button-primary">
            <Search /> Search books
          </Link>
        }
      />
      <div className="subject-chips">
        <span>Browse topics</span>
        {["fantasy", "science fiction", "mystery", "romance", "history"].map(
          (item) => (
            <button
              className={subject === item ? "active" : ""}
              key={item}
              onClick={() => setSubject(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <div className="discover-sections">
        {sections.map((section) => {
          const activeSubject =
            section.kind === "subject" ? subject : section.subject;
          return (
            <DiscoverShelf
              key={section.label + String(activeSubject)}
              label={
                section.kind === "subject"
                  ? (activeSubject ?? section.label)
                  : section.label
              }
              kind={section.kind}
              subject={activeSubject}
            />
          );
        })}
      </div>
      <p className="attribution-note">
        Bibliographic data and cover images are provided by{" "}
        <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
          Open Library
        </a>
        . Subject labels are derived from catalog topics.
      </p>
    </>
  );
}

function DiscoverShelf({
  label,
  kind,
  subject,
}: {
  label: string;
  kind: "new" | "subject" | "popular" | "randomized";
  subject?: string;
}) {
  const q = useQuery({
    queryKey: ["discover", kind, subject],
    queryFn: () => bookService.discover(kind, subject),
    staleTime: 15 * 60_000,
    retry: 1,
  });
  const [work, setWork] = useState("");
  return (
    <section className="discover-shelf">
      <div className="section-heading">
        <div>
          <p className="section-kicker">
              {kind === "new"
              ? "FRESH ON THE SHELF"
                : kind === "randomized"
                  ? "A SURPRISE PICK"
                  : kind === "popular"
                ? "MANY READERS LOVE"
                : "BROWSE BY TOPIC"}
          </p>
          <h2>{label}</h2>
        </div>
      </div>
      {q.isLoading ? (
        <LoadingState label="Gathering recommendations..." />
      ) : q.error ? (
        <div className="api-unavailable compact-error">
          <p>Open Library discovery is temporarily unavailable.</p>
          <button className="text-link" onClick={() => void q.refetch()}>
            Try again <ArrowRight />
          </button>
        </div>
      ) : q.data?.results.length ? (
        <div className="discover-row">
          {q.data.results.map((result) => (
            <button
              className="discover-book"
              key={result.workId}
              onClick={() => setWork(result.workId)}
            >
              <BookCover book={result} />
              <b>{result.title}</b>
              <small>{result.authors[0] ?? "Author unknown"}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No titles in this section yet.</p>
      )}
      {work && (
        <BookSearchDialog initialWorkId={work} onClose={() => setWork("")} />
      )}
    </section>
  );
}

function ConfirmDialog({
  title,
  copy,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
  busy = false,
}: {
  title: string;
  copy: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  useEscapeToClose(onClose);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="auth-icon danger-icon">
          <Trash2 />
        </div>
        <h2 id="confirm-title">{title}</h2>
        <p>{copy}</p>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button button-danger"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? "Removing..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function CollectionEditor({
  initial,
  onClose,
  onSave,
  busy = false,
}: {
  initial?: Pick<Collection, "name" | "description">;
  onClose: () => void;
  onSave: (values: { name: string; description: string }) => void;
  busy?: boolean;
}) {
  useEscapeToClose(onClose);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim())
      onSave({ name: name.trim(), description: description.trim() });
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-title"
      >
        <div className="dialog-title">
          <div>
            <p className="section-kicker">A PLACE FOR A FEW FAVORITES</p>
            <h2 id="collection-title">
              {initial ? "Edit collection" : "Create a collection"}
            </h2>
          </div>
          <button className="icon-close" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            Collection name
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Favorite fantasy"
            />
          </label>
          <label>
            Description <span className="optional-label">optional</span>
            <textarea
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What brings these books together?"
              rows={3}
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={busy || !name.trim()}
            >
              {busy
                ? "Saving..."
                : initial
                  ? "Save changes"
                  : "Create collection"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function CollectionsPage() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.collections,
    queryFn: catalogApi.collections,
  });
  const client = useQueryClient();
  const [editing, setEditing] = useState<Collection | null | false>(false);
  const [deleting, setDeleting] = useState<Collection | null>(null);
  const create = useMutation({
    mutationFn: catalogApi.createCollection,
    onSuccess: (id) => {
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      setEditing(false);
      navigate(`/app/collections/${id}`);
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: { name: string; description: string };
    }) => catalogApi.updateCollection(id, values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      setEditing(false);
    },
  });
  const remove = useMutation({
    mutationFn: catalogApi.deleteCollection,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      setDeleting(null);
    },
  });
  if (query.isLoading)
    return <LoadingState label="Opening your collections..." />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const collections = query.data ?? [];
  return (
    <>
      <PageTitle
        eyebrow="YOUR BOOKS, YOUR WAY"
        title="Collections"
        description="Group editions into private shelves that make sense to you."
        action={
          <button
            className="button button-primary"
            onClick={() => setEditing(null)}
          >
            <Plus /> New collection
          </button>
        }
      />
      {collections.length ? (
        <div className="collection-grid">
          {collections.map((collection) => (
            <article className="collection-card" key={collection.id}>
              <span className="collection-art">
                <Bookmark />
              </span>
              <p className="section-kicker">PRIVATE COLLECTION</p>
              <h2>{collection.name}</h2>
              <p>{collection.description || "A little shelf of its own."}</p>
              <div className="collection-card-bottom">
                <span>
                  {collection.itemCount ?? 0}{" "}
                  {(collection.itemCount ?? 0) === 1 ? "book" : "books"}
                </span>
                <Link to={`/app/collections/${collection.id}`}>
                  Open shelf <ArrowRight />
                </Link>
              </div>
              <div className="collection-actions">
                <button
                  aria-label={`Edit ${collection.name}`}
                  onClick={() => setEditing(collection)}
                >
                  <Settings />
                </button>
                <button
                  aria-label={`Delete ${collection.name}`}
                  onClick={() => setDeleting(collection)}
                >
                  <Trash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Make your own little shelf"
          copy="Create a collection for your book club, favorite authors, or whatever you are reading next."
          action={
            <button
              className="button button-primary"
              onClick={() => setEditing(null)}
            >
              <Plus /> Create collection
            </button>
          }
        />
      )}
      {editing !== false && (
        <CollectionEditor
          initial={editing || undefined}
          onClose={() => setEditing(false)}
          onSave={(values) =>
            editing
              ? update.mutate({ id: editing.id, values })
              : create.mutate(values)
          }
          busy={create.isPending || update.isPending}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          copy="The collection will be deleted, but the books in your library will remain."
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id)}
          busy={remove.isPending}
        />
      )}
    </>
  );
}

function CollectionDetailPage() {
  const { collectionId: id = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.collection(id),
    queryFn: () => catalogApi.collection(id),
    enabled: Boolean(id),
  });
  const client = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const update = useMutation({
    mutationFn: (values: { name: string; description: string }) =>
      catalogApi.updateCollection(id, values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collection(id) });
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      setEditing(false);
    },
  });
  const move = useMutation({
    mutationFn: ({
      bookId,
      direction,
    }: {
      bookId: string;
      direction: -1 | 1;
    }) => catalogApi.moveCollectionItem(id, bookId, direction),
    onSuccess: () =>
      void client.invalidateQueries({ queryKey: queryKeys.collection(id) }),
  });
  const remove = useMutation({
    mutationFn: (bookId: string) => catalogApi.removeFromCollection(id, bookId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collection(id) });
      void client.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });
  const del = useMutation({
    mutationFn: () => catalogApi.deleteCollection(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      window.location.assign("/app/collections");
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const collection = query.data!;
  const items = [...collection.items].sort((a, b) => a.position - b.position);
  return (
    <>
      <Link to="/app/collections" className="back-link">
        <ArrowLeft /> All collections
      </Link>
      <PageTitle
        eyebrow="PRIVATE COLLECTION"
        title={collection.name}
        description={
          collection.description || `${items.length} books in this shelf.`
        }
        action={
          <>
            <button
              className="button button-secondary"
              onClick={() => setEditing(true)}
            >
              <Settings /> Edit
            </button>
            <button
              className="button button-secondary"
              onClick={() => setDeleting(true)}
            >
              <Trash2 /> Delete
            </button>
          </>
        }
      />
      {items.length ? (
        <div className="collection-items">
          {items.map((item, index) => (
            <div className="collection-item" key={item.book.id}>
              <span className="position-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <BookCard book={item.book} compact />
              <div className="reorder-actions">
                <button
                  aria-label="Move book up"
                  disabled={index === 0}
                  onClick={() =>
                    move.mutate({ bookId: item.book.id, direction: -1 })
                  }
                >
                  <ArrowUp />
                </button>
                <button
                  aria-label="Move book down"
                  disabled={index === items.length - 1}
                  onClick={() =>
                    move.mutate({ bookId: item.book.id, direction: 1 })
                  }
                >
                  <ArrowDown />
                </button>
                <button
                  aria-label="Remove book from collection"
                  onClick={() => remove.mutate(item.book.id)}
                >
                  <X />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="This collection is empty"
          copy="Add books from your library when you find the right ones."
          action={
            <Link to="/app/library" className="button button-secondary">
              Browse library <ArrowRight />
            </Link>
          }
        />
      )}
      {editing && (
        <CollectionEditor
          initial={collection}
          onClose={() => setEditing(false)}
          onSave={(values) => update.mutate(values)}
          busy={update.isPending}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${collection.name}?`}
          copy="The collection will be deleted, but the books in your library will remain."
          onClose={() => setDeleting(false)}
          onConfirm={() => del.mutate()}
          busy={del.isPending}
        />
      )}
    </>
  );
}

function BookDetailPage() {
  const { userBookId: id = "" } = useParams();
  const query = useQuery({
    queryKey: queryKeys.book(id),
    queryFn: () => catalogApi.book(id),
    enabled: Boolean(id),
  });
  const client = useQueryClient();
  const [pageValue, setPageValue] = useState("");
  const [percentValue, setPercentValue] = useState("");
  const [pages, setPages] = useState("");
  const [minutes, setMinutes] = useState("");
  const [logNote, setLogNote] = useState("");
  const [message, setMessage] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [collectionId, setCollectionId] = useState("");
  const [reflection, setReflection] = useState<{
    rating: number;
    review: string | null;
    notes: string | null;
    spoiler: boolean;
  }>({
    rating: 0,
    review: null,
    notes: null,
    spoiler: false,
  });
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: queryKeys.book(id) });
    void client.invalidateQueries({ queryKey: queryKeys.library });
    void client.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      invalidate();
      setMessage("Saved.");
    },
    onError: (e) =>
      setMessage(e instanceof Error ? e.message : "Could not save changes."),
  });
  const deleteBook = useMutation({
    mutationFn: () => catalogApi.removeBook(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.library });
      window.location.assign("/app/library");
    },
  });
  const collections = useQuery({
    queryKey: queryKeys.collections,
    queryFn: catalogApi.collections,
  });
  const addCollection = useMutation({
    mutationFn: (collection: string) =>
      catalogApi.addToCollection(collection, id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.collections });
      setMessage("Added to collection.");
    },
  });
  if (query.isLoading) return <LoadingState label="Opening your book..." />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const book = query.data!;
  const records = [...(book.records ?? [])].sort((a, b) =>
    b.started_at.localeCompare(a.started_at),
  );
  const latest = records[0];
  const progress = progressOf(book);
  const pageCount = book.edition?.number_of_pages ?? null;
  return (
    <>
      <Link to="/app/library" className="back-link">
        <ArrowLeft /> Your library
      </Link>
      <section className="book-detail-hero">
        <BookCover book={book} size="detail" />
        <div className="book-detail-copy">
          <p className="section-kicker">
            {book.edition ? `YOUR EDITION · ${book.edition.format || "EDITION"}` : "WORK · EDITION NOT SPECIFIED"}
          </p>
          <h1>{book.edition?.title || book.work.title}</h1>
          {book.edition?.title &&
            book.edition.title !== book.work.title && (
              <p className="detail-work-title">
                Work: {book.work.title}
              </p>
            )}
          <p className="detail-author">{authorNames(book)}</p>
          <div className="detail-tags">
            <span className={`status-tag ${statusStyles[book.reading_status]}`}>
              {statusLabels[book.reading_status]}
            </span>
            {book.is_owned && (
              <span className="detail-tag">
                <CheckCircle2 /> Owned
              </span>
            )}
            {book.want_to_buy && (
              <span className="detail-tag">
                <Tag /> Want to buy
              </span>
            )}
            {book.is_favorite && (
              <span className="detail-tag">
                <Heart /> Favorite
              </span>
            )}
          </div>
          <div className="state-controls">
            <label>
              Reading status
              <select
                value={book.reading_status}
                onChange={(e) =>
                  mutate.mutate(() =>
                    catalogApi.changeStatus(
                      book,
                      e.target.value as ReadingStatus,
                    ),
                  )
                }
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={book.is_owned}
                onChange={(e) =>
                  mutate.mutate(() =>
                    catalogApi.updateFlags(id, { is_owned: e.target.checked }),
                  )
                }
              />{" "}
              Owned
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={book.want_to_buy}
                onChange={(e) =>
                  mutate.mutate(() =>
                    catalogApi.updateFlags(id, {
                      want_to_buy: e.target.checked,
                    }),
                  )
                }
              />{" "}
              Want to buy
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={book.is_favorite}
                onChange={(e) =>
                  mutate.mutate(() =>
                    catalogApi.updateFlags(id, {
                      is_favorite: e.target.checked,
                    }),
                  )
                }
              />{" "}
              Favorite
            </label>
          </div>
          {message && (
            <p
              className={
                message === "Saved." || message === "Added to collection."
                  ? "form-success"
                  : "form-error"
              }
              role="status"
            >
              {message}
            </p>
          )}
          {book.reading_status === "finished" && (
            <button
              className="button button-secondary"
              onClick={() =>
                mutate.mutate(() =>
                  catalogApi.changeStatus(book, "currently_reading"),
                )
              }
            >
              Start a reread <ArrowRight />
            </button>
          )}
        </div>
      </section>
      <div className="detail-grid">
        <section className="panel detail-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR TRACKING</p>
              <h2>Reading progress</h2>
            </div>
          </div>
          {book.reading_status === "currently_reading" ? (
            <>
              <div className="progress-summary">
                <strong>
                  {progress ?? 0}
                  <small>%</small>
                </strong>
                <span>
                  {pageCount && book.current_page != null
                    ? `${book.current_page} of ${pageCount} pages`
                    : "Progress so far"}
                </span>
                <i className="progress-track">
                  <span style={{ width: `${progress ?? 0}%` }} />
                </i>
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = pageCount
                    ? pageValue === ""
                      ? (book.current_page ?? 0)
                      : Number(pageValue)
                    : percentValue === ""
                      ? (progress ?? 0)
                      : Number(percentValue);
                  mutate.mutate(() =>
                    catalogApi.updateProgress(
                      book,
                      value,
                      pageCount ? "page" : "percent",
                    ),
                  );
                }}
              >
                <label>
                  {pageCount ? "Current page" : "Percentage"}
                  <span className="input-with-unit">
                    <input
                      type="number"
                      min="0"
                      max={pageCount ?? 100}
                      value={pageCount ? pageValue : percentValue}
                      onChange={(e) =>
                        pageCount
                          ? setPageValue(e.target.value)
                          : setPercentValue(e.target.value)
                      }
                      placeholder={String(
                        pageCount ? (book.current_page ?? 0) : (progress ?? 0),
                      )}
                    />
                    <i>{pageCount ? "pages" : "%"}</i>
                  </span>
                </label>
                <button className="button button-secondary">Update</button>
              </form>
              <form
                className="log-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const pagesRead = Number(pages) || 0;
                  const minutesRead = Number(minutes) || 0;
                  if (pagesRead === 0 && minutesRead === 0) {
                    setMessage("Enter pages read or minutes spent.");
                    return;
                  }
                  mutate.mutate(() =>
                    catalogApi.logReading(book, {
                      pages: pagesRead,
                      minutes: minutesRead,
                      note: logNote,
                    }),
                  );
                  setPages("");
                  setMinutes("");
                  setLogNote("");
                }}
              >
                <h3>
                  <NotebookPen /> Log a reading session
                </h3>
                <div className="log-fields">
                  <label>
                    Pages read
                    <input
                      type="number"
                      min="0"
                      value={pages}
                      onChange={(e) => setPages(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label>
                    Minutes
                    <input
                      type="number"
                      min="0"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>
                <label>
                  Note <span className="optional-label">optional</span>
                  <input
                    maxLength={500}
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    placeholder="A quick note about today..."
                  />
                </label>
                <button className="button button-primary">
                  Save reading log
                </button>
              </form>
            </>
          ) : (
            <p className="muted-copy">
              Set this book to Currently reading to track your progress and
              log sessions.
            </p>
          )}
        </section>
        <section className="panel detail-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">BOOK INFORMATION</p>
              <h2>{book.edition ? "Edition details" : "Edition not specified"}</h2>
            </div>
          </div>
          <dl className="metadata-list">
            {[
              ["Publisher", book.edition?.publisher],
              ["Published", book.edition?.published_date],
              ["ISBN-13", book.edition?.isbn13.join(", ")],
              ["ISBN-10", book.edition?.isbn10.join(", ")],
              ["Language", book.edition?.language_code],
              ["Format", book.edition?.format],
              ["Pages", pageCount ? String(pageCount) : null],
              [
                "First published",
                book.work.first_published_year
                  ? String(book.work.first_published_year)
                  : null,
              ],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label as string}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
          <a
            className="external-book-link"
            href={`https://openlibrary.org${book.edition?.openlibrary_edition_id ?? book.work.openlibrary_work_id}`}
            target="_blank"
            rel="noreferrer"
          >
            View on Open Library <ArrowRight />
          </a>
          <div className="collection-add">
            <label>
              Add to a collection
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              >
                <option value="">Choose a collection</option>
                {(collections.data ?? []).map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-secondary"
              disabled={!collectionId || addCollection.isPending}
              onClick={() => collectionId && addCollection.mutate(collectionId)}
            >
              Add
            </button>
          </div>
        </section>
        <section className="panel detail-panel wide-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ABOUT THE WORK</p>
              <h2>Story & topics</h2>
            </div>
          </div>
          {book.work.description ? (
            <p className="work-description">{book.work.description}</p>
          ) : (
            <p className="muted-copy">
              No description is available for this work.
            </p>
          )}
          {book.work.subjects?.length > 0 && (
            <>
              <div className="breakdown-title">
                Category <small>(derived from book topics)</small>
              </div>
              <div className="subject-tags">
                {book.work.subjects.slice(0, 12).map((subject) => (
                  <span key={subject}>{subject}</span>
                ))}
              </div>
            </>
          )}
        </section>
        <section className="panel detail-panel wide-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR NOTES & REVIEW</p>
              <h2>A little reflection</h2>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate.mutate(() =>
                catalogApi.saveReflection(book, {
                  rating: reflection.rating || null,
                  review: reflection.review ?? latest?.review ?? "",
                  notes: reflection.notes ?? latest?.personal_notes ?? "",
                  spoiler: reflection.spoiler,
                }),
              );
            }}
          >
            <label>
              Your rating
              <div
                className="rating-stars"
                role="radiogroup"
                aria-label="Rating out of five"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    type="button"
                    key={rating}
                    aria-label={`${rating} stars`}
                    aria-checked={reflection.rating === rating}
                    role="radio"
                    onClick={() => setReflection({ ...reflection, rating })}
                  >
                    <Star
                      fill={
                        rating <= (reflection.rating || (latest?.rating ?? 0))
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                ))}
              </div>
            </label>
            <label>
              Your review <span className="optional-label">private</span>
              <textarea
                maxLength={10000}
                rows={3}
                value={reflection.review ?? latest?.review ?? ""}
                onChange={(e) =>
                  setReflection({ ...reflection, review: e.target.value })
                }
                placeholder="What did you think of this book?"
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={reflection.spoiler || latest?.is_spoiler || false}
                onChange={(e) =>
                  setReflection({ ...reflection, spoiler: e.target.checked })
                }
              />{" "}
              This review contains spoilers
            </label>
            <label>
              Personal notes
              <textarea
                rows={3}
                value={reflection.notes ?? latest?.personal_notes ?? ""}
                onChange={(e) =>
                  setReflection({ ...reflection, notes: e.target.value })
                }
                placeholder="Private notes and passages to remember"
              />
            </label>
            {!latest && (
              <p className="muted-copy">
                Start reading to save a private review or note with its reading
                history.
              </p>
            )}
            <button className="button button-primary" disabled={!latest}>
              Save reflection
            </button>
          </form>
        </section>
        <section className="panel detail-panel wide-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR READING LIFE</p>
              <h2>Reading history</h2>
            </div>
          </div>
          {records.length ? (
            records.map((record, index) => (
              <article className="history-row" key={record.id}>
                <span className="history-dot">
                  {record.outcome === "finished" ? (
                    <Check />
                  ) : record.outcome === "dnf" ? (
                    <X />
                  ) : (
                    <BookOpen />
                  )}
                </span>
                <div>
                  <b>
                    {record.outcome === "reading"
                      ? "Reading"
                      : record.outcome === "finished"
                        ? "Finished"
                        : "Did not finish"}
                    {records.filter((r) => r.outcome === "finished").length > 1
                      ? `Read #${records.length - index}`
                      : ""}
                  </b>
                  <p>
                    {formatDate(record.started_at)}
                    {record.finished_at
                      ? ` - ${formatDate(record.finished_at)}`
                      : " - in progress"}
                  </p>
                  {record.finish_page != null && (
                    <small>Stopped at page {record.finish_page}</small>
                  )}
                  {record.rating && (
                    <small className="history-rating">
                      {"★".repeat(record.rating)}
                    </small>
                  )}
                  {record.review && (
                    <p className="history-review">
                      {record.is_spoiler && <span>Spoiler · </span>}
                      {record.review}
                    </p>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="muted-copy">
              Your first reading session will appear here.
            </p>
          )}
        </section>
        <section className="remove-book-row">
          <p>
            Removing this edition deletes your personal tracking and reading
            history for it.
          </p>
          <button
            className="button button-danger"
            onClick={() => setRemoveConfirm(true)}
          >
            <Trash2 /> Remove from library
          </button>
        </section>
      </div>
      {removeConfirm && (
        <ConfirmDialog
          title="Remove this edition?"
          copy="Removing this book deletes your personal tracking and reading history for this catalog entry."
          onClose={() => setRemoveConfirm(false)}
          onConfirm={() => deleteBook.mutate()}
          busy={deleteBook.isPending}
        />
      )}
    </>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: queryKeys.profile,
    queryFn: catalogApi.profile,
  });
  const client = useQueryClient();
  const [username, setUsername] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const save = useMutation({
    mutationFn: catalogApi.updateProfile,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.profile });
      setMessage("Your profile is saved.");
    },
    onError: (error) =>
      setMessage(
        error instanceof Error ? error.message : "Could not save your profile.",
      ),
  });
  if (query.isLoading)
    return <LoadingState label="Loading account settings..." />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const profile = query.data!;
  return (
    <>
      <PageTitle
        eyebrow="YOUR SPACE, YOUR SETTINGS"
        title="Settings"
        description="Manage your account and personal profile."
      />
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">PERSONAL PROFILE</p>
              <h2>About you</h2>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                display_name: (name ?? profile.display_name).trim(),
                username: (username ?? profile.username)?.trim() || null,
              });
            }}
          >
            <label>
              Display name
              <input
                maxLength={80}
                value={name ?? profile.display_name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label>
              Username
              <input
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_]+"
                value={username ?? profile.username ?? ""}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="reader_name"
              />
              <small>3 to 24 letters, numbers, or underscores.</small>
            </label>
            {message && (
              <p
                className={
                  message.startsWith("Your") ? "form-success" : "form-error"
                }
                role="status"
              >
                {message}
              </p>
            )}
            <button className="button button-primary" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save profile"}
            </button>
          </form>
        </section>
        <section className="panel settings-panel">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ACCOUNT</p>
              <h2>Sign-in details</h2>
            </div>
          </div>
          <p className="account-email">{user?.email}</p>
          <p className="muted-copy">
            Your account uses Supabase email authentication. You can sign out
            from any device here.
          </p>
          <button
            className="button button-secondary"
            onClick={() => void supabase?.auth.signOut()}
          >
            Sign out
          </button>
        </section>
      </div>
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route element={<Protected />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route
            path="collections/:collectionId"
            element={<CollectionDetailPage />}
          />
          <Route path="book/:userBookId" element={<BookDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!supabaseConfigured)
    return (
      <main className="setup-page">
        <div className="setup-card">
          <Link to="/" className="brand">
            <span className="brand-mark">p</span>
            <span>
              papyr<span className="brand-period">.</span>
            </span>
          </Link>
          <div className="auth-icon">
            <Settings />
          </div>
          <h1>Connect your library</h1>
          <p>{supabaseConfigIssue}</p>
          <ol>
            <li>
              Open your Supabase project&apos;s <b>Connect</b> dialog.
            </li>
            <li>
              Copy its project URL into <code>VITE_SUPABASE_URL</code>.
            </li>
            <li>
              Copy the browser-safe <b>publishable key</b> (
              <code>sb_publishable_...</code>) into{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.
            </li>
            <li>Restart the Vite dev server.</li>
          </ol>
          <p className="setup-note">
            Never put a secret key in a <code>VITE_</code> variable. Secret keys
            are server-only.
          </p>
        </div>
      </main>
    );
  return <AppRoutes />;
}
