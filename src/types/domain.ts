export type ReadingStatus =
  "none" | "want_to_read" | "currently_reading" | "finished" | "dnf";
export type SearchMode = "all" | "title" | "author" | "isbn";

export type SearchBookResult = {
  workId: string;
  title: string;
  authors: string[];
  firstPublishedYear: number | null;
  coverOlid: string | null;
  editionCount: number;
  subjects: string[];
  editionIds: string[];
  url: string;
};

export type WorkDTO = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  firstPublishedYear: number | null;
  coverOlid: string | null;
  url: string;
  subjects: string[];
  authors: Array<{
    id: string;
    name: string;
    photoOlid: string | null;
    url: string;
  }>;
};

export type EditionDTO = {
  id: string;
  workId: string;
  title: string | null;
  subtitle: string | null;
  isbn10: string[];
  isbn13: string[];
  publisher: string | null;
  publishedDate: string | null;
  publishedYear: number | null;
  pages: number | null;
  languageCode: string | null;
  format: string | null;
  coverOlid: string | null;
  url: string;
};

export type CatalogBook = {
  id: string;
  user_id: string;
  work_id: string;
  edition_id: string | null;
  reading_status: ReadingStatus;
  want_to_buy: boolean;
  is_owned: boolean;
  is_favorite: boolean;
  current_page: number | null;
  progress_percent: number | null;
  created_at: string;
  updated_at: string;
  edition: {
    id: string;
    openlibrary_edition_id: string;
    title: string | null;
    subtitle: string | null;
    isbn10: string[];
    isbn13: string[];
    publisher: string | null;
    published_date: string | null;
    published_year: number | null;
    number_of_pages: number | null;
    language_code: string | null;
    format: string | null;
    cover_olid: string | null;
  } | null;
  work: {
    id: string;
    openlibrary_work_id: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    first_published_year: number | null;
    cover_olid: string | null;
    subjects: string[];
    work_authors?: Array<{ author: { name: string } }>;
  };
  records?: ReadingRecord[];
};

export type ReadingRecord = {
  id: string;
  user_book_id: string;
  started_at: string;
  finished_at: string | null;
  outcome: "reading" | "finished" | "dnf";
  start_page: number | null;
  finish_page: number | null;
  rating: number | null;
  review: string | null;
  personal_notes: string | null;
  is_spoiler: boolean;
};

export type Collection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  accent: string | null;
  itemCount?: number;
};

export function calculateProgress(
  currentPage: number | null | undefined,
  pageCount: number | null | undefined,
) {
  if (!pageCount || pageCount <= 0 || currentPage == null) return null;
  const page = Math.max(0, Math.min(currentPage, pageCount));
  return Math.round((page / pageCount) * 10000) / 100;
}

export function clampProgress(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function normalizeIsbn(value: string) {
  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return /^(?:\d{9}[\dX]|\d{13})$/.test(normalized) ? normalized : null;
}

export function categoryFromSubjects(subjects: string[]) {
  const text = subjects.join(" ").toLowerCase();
  const mappings: Array<[string, string[]]> = [
    ["Fantasy", ["fantasy"]],
    ["Science fiction", ["science fiction", "sci-fi"]],
    ["Mystery", ["mystery", "detective"]],
    ["Romance", ["romance"]],
    ["Biography", ["biography", "autobiography"]],
    ["History", ["history"]],
    ["Children", ["juvenile", "children"]],
    ["Poetry", ["poetry"]],
  ];
  return (
    mappings.find(([, terms]) =>
      terms.some((term) => text.includes(term)),
    )?.[0] ?? "Other topics"
  );
}

export function calculateStreak(
  activityDates: string[],
  localDate = new Intl.DateTimeFormat("en-CA").format(new Date()),
) {
  const dates = new Set(activityDates);
  const yesterday = new Date(`${localDate}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const cursor = dates.has(localDate)
    ? new Date(`${localDate}T00:00:00.000Z`)
    : yesterday;
  if (!dates.has(cursor.toISOString().slice(0, 10))) return 0;
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
