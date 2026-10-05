import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const limited = new Map<string, { start: number; count: number }>();
function defaultSecret(environment: string) {
  try {
    const values = JSON.parse(environment) as Record<string, string>;
    return values.default ?? Object.values(values)[0] ?? null;
  } catch {
    return null;
  }
}
const maxLimit = (value: unknown, fallback = 20) =>
  Math.min(40, Math.max(1, Number(value) || fallback));
const cleanKey = (value: unknown, kind: "works" | "editions" | "authors") => {
  if (typeof value !== "string") return null;
  const collection = kind === "editions" ? "books" : kind;
  const normalized = value.startsWith("/") ? value : `/${collection}/${value}`;
  const suffix = kind === "works" ? "W" : kind === "editions" ? "M" : "A";
  return new RegExp(`^/${collection}/OL[0-9]+${suffix}$`).test(normalized)
    ? normalized
    : null;
};
const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const year = (value: unknown) =>
  typeof value === "number" && value > 0 && value < 3000 ? value : null;
const isbnList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.replace(/[^0-9X]/gi, "").toUpperCase())
        .filter(Boolean)
    : [];

async function openLibrary(path: string) {
  const response = await fetch(`https://openlibrary.org${path}`, {
    headers: {
      "User-Agent":
        Deno.env.get("OPEN_LIBRARY_USER_AGENT") ??
        "Papyr/1.0 (book catalog application)",
    },
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Open Library is busy. Please try again shortly."
        : `Open Library returned ${response.status}.`,
    );
  return response.json();
}
function normalizeWork(
  work: Record<string, unknown>,
  authors: Array<Record<string, unknown>>,
) {
  const key = cleanKey(work.key, "works");
  if (!key || !text(work.title))
    throw new Error("Open Library returned an incomplete work.");
  const description =
    typeof work.description === "string"
      ? work.description
      : (work.description as { value?: string } | undefined)?.value;
  const coverIds = Array.isArray(work.covers) ? work.covers : [];
  return {
    id: key,
    title: text(work.title),
    subtitle: text(work.subtitle),
    description: text(description),
    firstPublishedYear: year(
      work.first_publish_date &&
        Number(String(work.first_publish_date).match(/\d{4}/)?.[0]),
    ),
    coverOlid: typeof coverIds[0] === "number" ? String(coverIds[0]) : null,
    url: `https://openlibrary.org${key}`,
    subjects: Array.isArray(work.subjects)
      ? work.subjects
          .filter((v): v is string => typeof v === "string")
          .slice(0, 40)
      : [],
    authors: authors
      .map((author) => ({
        id: author.key,
        name: text(author.name),
        photoOlid: Array.isArray(author.photos) && typeof author.photos[0] === "number"
          ? String(author.photos[0])
          : null,
        url: `https://openlibrary.org${author.key}`,
      }))
      .filter((author) => author.id && author.name),
  };
}
function normalizeEdition(edition: Record<string, unknown>, workId?: string) {
  const key = cleanKey(edition.key, "editions");
  const works = Array.isArray(edition.works) ? edition.works : [];
  const editionWorkId = (works[0] as { key?: unknown } | undefined)?.key;
  const coverIds = Array.isArray(edition.covers) ? edition.covers : [];
  if (!key || (typeof editionWorkId !== "string" && !workId))
    throw new Error("Open Library returned an incomplete edition.");
  const publishDate = text(edition.publish_date);
  const match = publishDate?.match(/\d{4}/);
  return {
    id: key,
    workId: workId ?? (editionWorkId as string),
    title: text(edition.title),
    subtitle: text(edition.subtitle),
    isbn10: isbnList(edition.isbn_10),
    isbn13: isbnList(edition.isbn_13),
    publisher: Array.isArray(edition.publishers)
      ? text(edition.publishers[0])
      : null,
    publishedDate: publishDate,
    publishedYear: match ? Number(match[0]) : null,
    pages: year(edition.number_of_pages),
    languageCode: Array.isArray(edition.languages)
      ? text((edition.languages[0] as { key?: string })?.key?.split("/").pop())
      : null,
    format: text(edition.physical_format),
    coverOlid: typeof coverIds[0] === "number" ? String(coverIds[0]) : null,
    url: `https://openlibrary.org${key}`,
  };
}
async function getAuthors(work: Record<string, unknown>) {
  const refs = Array.isArray(work.authors)
    ? (work.authors.slice(0, 8) as Array<{ author?: { key?: string } }>)
    : [];
  return Promise.all(
    refs.map(async (ref) => {
      const key = cleanKey(ref.author?.key, "authors");
      if (!key) return null;
      try {
        return (await openLibrary(`${key}.json`)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }),
  ).then((items) =>
    items.filter((item): item is Record<string, unknown> => item !== null),
  );
}
function normalizeSearch(doc: Record<string, unknown>) {
  const workId = cleanKey(doc.key, "works");
  if (!workId || !text(doc.title)) return null;
  const authors = Array.isArray(doc.author_name)
    ? doc.author_name
        .filter((v): v is string => typeof v === "string")
        .slice(0, 5)
    : [];
  const editionKeys = Array.isArray(doc.edition_key)
    ? doc.edition_key
        .map((key) => cleanKey(key, "editions"))
        .filter((key): key is string => Boolean(key))
    : [];
  return {
    workId,
    title: text(doc.title),
    authors,
    firstPublishedYear: year(doc.first_publish_year),
    coverOlid: typeof doc.cover_i === "number" ? String(doc.cover_i) : null,
    editionCount: Number(doc.edition_count) || 0,
    subjects: Array.isArray(doc.subject)
      ? doc.subject
          .filter((v): v is string => typeof v === "string")
          .slice(0, 5)
      : [],
    editionIds: editionKeys.slice(0, 10),
    url: `https://openlibrary.org${workId}`,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);
  const authorization = request.headers.get("Authorization");
  const apiKey = request.headers.get("apikey");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    defaultSecret(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    defaultSecret(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "");
  if (
    !supabaseUrl ||
    !publishableKey ||
    !serviceKey ||
    !authorization?.startsWith("Bearer ") ||
    !apiKey
  )
    return json({ error: "Service configuration or sign-in is missing." }, 503);
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization, apikey: apiKey } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return json({ error: "Please sign in again." }, 401);
  const now = Date.now();
  const bucket = limited.get(user.id);
  if (bucket && now - bucket.start < 60_000 && bucket.count >= 30)
    return json(
      {
        error: "You are searching a little too quickly. Try again in a minute.",
      },
      429,
    );
  if (!bucket || now - bucket.start >= 60_000)
    limited.set(user.id, { start: now, count: 1 });
  else bucket.count += 1;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const op = body.op;
    if (op === "search") {
      const query = text(body.query)?.slice(0, 160);
      if (!query)
        return json(
          { error: "Enter a title, author, or ISBN to search." },
          400,
        );
      const page = Math.min(100, Math.max(1, Number(body.page) || 1));
      const limit = maxLimit(body.limit);
      const mode = ["all", "title", "author", "isbn"].includes(
        String(body.mode),
      )
        ? String(body.mode)
        : "all";
      const normalizedIsbn = query.replace(/[-\s]/g, "").toUpperCase();
      if (mode === "isbn" && !/^(?:\d{9}[\dX]|\d{13})$/.test(normalizedIsbn)) {
        return json({ error: "Enter a valid 10 or 13 digit ISBN." }, 400);
      }
      const field =
        mode === "title"
          ? "title"
          : mode === "author"
            ? "author"
            : mode === "isbn"
              ? "q"
              : "q";
      const queryValue = mode === "isbn" ? `isbn:${normalizedIsbn}` : query;
      const params = new URLSearchParams({
        [field]: queryValue,
        page: String(page),
        limit: String(limit),
        fields:
          "key,title,author_name,first_publish_year,cover_i,edition_count,edition_key,subject",
      });
      const data = (await openLibrary(`/search.json?${params}`)) as {
        docs?: Array<Record<string, unknown>>;
        numFound?: number;
        num_found?: number;
      };
      const results = (data.docs ?? [])
        .map(normalizeSearch)
        .filter(
          (item): item is NonNullable<ReturnType<typeof normalizeSearch>> =>
            Boolean(item),
        );
      const total = data.numFound ?? data.num_found ?? results.length;
      return json({ results, total, page, hasNextPage: page * limit < total });
    }
    if (op === "work") {
      const workId = cleanKey(body.workId, "works");
      if (!workId) return json({ error: "Invalid work id." }, 400);
      const [work, editionsResponse] = (await Promise.all([
        openLibrary(`${workId}.json`),
        openLibrary(`${workId}/editions.json?limit=40`),
      ])) as [
        Record<string, unknown>,
        { entries?: Array<Record<string, unknown>> },
      ];
      const authors = await getAuthors(work);
      const editions = (editionsResponse.entries ?? []).flatMap((edition) => {
        try {
          return [normalizeEdition(edition, workId)];
        } catch (error) {
          console.warn("Skipping an incomplete Open Library edition", {
            workId,
            editionKey: edition.key,
            reason: error instanceof Error ? error.message : "Unknown error",
          });
          return [];
        }
      });
      return json({ work: normalizeWork(work, authors), editions });
    }
    if (op === "edition") {
      const editionId = cleanKey(body.editionId, "editions");
      if (!editionId) return json({ error: "Invalid edition id." }, 400);
      const edition = (await openLibrary(`${editionId}.json`)) as Record<
        string,
        unknown
      >;
      const normalized = normalizeEdition(edition);
      const work = (await openLibrary(`${normalized.workId}.json`)) as Record<
        string,
        unknown
      >;
      const authors = await getAuthors(work);
      return json({ work: normalizeWork(work, authors), edition: normalized });
    }
    if (op === "discover") {
      const section = ["new", "subject", "popular", "randomized"].includes(
        String(body.section),
      )
        ? String(body.section)
        : "popular";
      const subject = text(body.subject)
        ?.toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .slice(0, 50);
      const page = Math.min(50, Math.max(1, Number(body.page) || 1));
      const limit = maxLimit(body.limit, 12);
      const thisYear = new Date().getUTCFullYear();
      const query = subject
        ? `subject:${subject}`
        : section === "new"
          ? `first_publish_year:[${thisYear - 3} TO ${thisYear}]`
          : "subject:fiction";
      const sort = section === "new" ? "new" : section === "randomized" ? "random.daily" : "editions";
      const params = new URLSearchParams({
        q: query,
        page: String(page),
        limit: String(limit),
        fields:
          "key,title,author_name,first_publish_year,cover_i,edition_count,edition_key,subject",
        sort,
      });
      const data = (await openLibrary(`/search.json?${params}`)) as {
        docs?: Array<Record<string, unknown>>;
        numFound?: number;
      };
      const results = (data.docs ?? [])
        .map(normalizeSearch)
        .filter(
          (item): item is NonNullable<ReturnType<typeof normalizeSearch>> =>
            Boolean(item),
        );
      return json({
        results,
        total: data.numFound ?? results.length,
        page,
        hasNextPage: false,
      });
    }
    if (op === "import") {
      const workId = cleanKey(body.workId, "works");
      const hasEdition = body.editionId != null;
      const editionId = hasEdition
        ? cleanKey(body.editionId, "editions")
        : null;
      if (!workId || (hasEdition && !editionId)) {
        console.warn("Rejected invalid book import identifiers", {
          workId: body.workId,
          editionId: body.editionId,
          hasEdition,
        });
        return json({ error: "Select a valid work or edition." }, 400);
      }
      const normalizedEdition = editionId
        ? normalizeEdition(
            (await openLibrary(`${editionId}.json`)) as Record<string, unknown>,
          )
        : null;
      if (normalizedEdition && normalizedEdition.workId !== workId)
        return json(
          { error: "That edition does not belong to the selected work." },
          400,
        );
      const workSource = (await openLibrary(`${workId}.json`)) as Record<
        string,
        unknown
      >;
      const normalizedWork = normalizeWork(
        workSource,
        await getAuthors(workSource),
      );
      const workMetadata = {
        work_id: normalizedWork.id,
        title: normalizedWork.title,
        subtitle: normalizedWork.subtitle,
        description: normalizedWork.description,
        first_published_year: normalizedWork.firstPublishedYear,
        cover_olid: normalizedWork.coverOlid,
        work_url: normalizedWork.url,
        subjects: normalizedWork.subjects,
        authors: normalizedWork.authors.map((author) => ({
          id: author.id,
          name: author.name,
          photo_olid: author.photoOlid,
          url: author.url,
        })),
      };
      const metadata = {
        ...workMetadata,
        ...(normalizedEdition
          ? {
              edition_id: normalizedEdition.id,
              edition_title: normalizedEdition.title,
              edition_subtitle: normalizedEdition.subtitle,
              isbn10: normalizedEdition.isbn10,
              isbn13: normalizedEdition.isbn13,
              publisher: normalizedEdition.publisher,
              published_date: normalizedEdition.publishedDate,
              published_year: normalizedEdition.publishedYear,
              number_of_pages: normalizedEdition.pages,
              language_code: normalizedEdition.languageCode,
              format: normalizedEdition.format,
              edition_cover_olid: normalizedEdition.coverOlid,
              edition_url: normalizedEdition.url,
            }
          : {}),
      };
      const { data: persistedWork, error: persistError } = await admin
        .rpc(
          normalizedEdition ? "persist_book_metadata" : "persist_work_metadata",
          { payload: metadata },
        )
        .single();
      const persisted = persistedWork as
        | { work_id?: string; saved_work_id?: string; edition_id?: string }
        | string
        | null;
      const persistedWorkId =
        typeof persisted === "string"
          ? persisted
          : (persisted?.work_id ?? persisted?.saved_work_id);
      const persistedEditionId =
        typeof persisted === "string" ? null : persisted?.edition_id;
      console.info("Persisted book metadata", {
        hasError: Boolean(persistError),
        errorCode: persistError?.code,
        hasWorkId: Boolean(persistedWorkId),
        hasEditionId: Boolean(persistedEditionId),
        workOnly: !normalizedEdition,
      });
      if (
        persistError ||
        !persistedWorkId ||
        (normalizedEdition && !persistedEditionId)
      )
        throw new Error(
          "Could not save this book's metadata. Apply the database migration and try again.",
        );
      const allowedStatuses = [
        "none",
        "want_to_read",
        "currently_reading",
        "finished",
        "dnf",
      ];
      const readingStatus = allowedStatuses.includes(String(body.readingStatus))
        ? body.readingStatus
        : "none";
      const { data: userBookId, error: insertError } = await userClient.rpc(
        normalizedEdition ? "add_edition_to_library" : "add_work_to_library",
        {
          ...(normalizedEdition
            ? { p_edition_id: persistedEditionId }
            : { p_work_id: persistedWorkId }),
          p_status: readingStatus,
          p_want_to_buy: Boolean(body.wantToBuy),
          p_is_owned: Boolean(body.isOwned),
          p_is_favorite: Boolean(body.isFavorite),
        },
      );
      if (insertError?.code === "23505")
        return json(
          {
            error: "That edition is already in your library.",
            duplicate: true,
          },
          409,
        );
      if (insertError || !userBookId)
        throw new Error(
          "Book metadata was saved, but it could not be added to your library.",
        );
      return json({ userBookId });
    }
    return json({ error: "Unknown book service operation." }, 400);
  } catch (error) {
    console.error("Book service request failed:", error);
    const message =
      error instanceof Error ? error.message : "Book service request failed.";
    return json(
      {
        error: message.includes("Open Library")
          ? message
          : "The book service is temporarily unavailable. Please try again.",
      },
      502,
    );
  }
});
