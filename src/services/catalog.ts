import { supabase } from "../utils/supabase";
import type {
  CatalogBook,
  Collection,
  ReadingRecord,
  ReadingStatus,
} from "../types/domain";

function client() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}
const bookSelect =
  "*, work:works!user_books_work_id_fkey(*, work_authors(position, author:authors(name))), edition:editions(*)";

async function fetchLibrary() {
  const { data, error } = await client()
    .from("user_books")
    .select(bookSelect)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CatalogBook[];
}

export const catalogApi = {
  library: fetchLibrary,
  async book(id: string) {
    const { data, error } = await client()
      .from("user_books")
      .select(`${bookSelect}, records:reading_records(*)`)
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as CatalogBook & { records: ReadingRecord[] };
  },
  async dashboard() {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    const [books, recordsResult, logsResult, streakResult] = await Promise.all([
      fetchLibrary(),
      client()
        .from("reading_records")
        .select(
          "id,user_book_id,started_at,finished_at,outcome,rating,review,personal_notes,is_spoiler",
        )
        .order("started_at", { ascending: false }),
      client()
        .from("reading_logs")
        .select("user_book_id,logged_on,pages_read,minutes_read,note")
        .gte("logged_on", yearStart)
        .order("logged_on", { ascending: false })
        .limit(5000),
      client().rpc("get_reading_streak", { p_today: today }),
    ]);
    if (recordsResult.error) throw recordsResult.error;
    if (logsResult.error) throw logsResult.error;
    if (streakResult.error) throw streakResult.error;
    return {
      books,
      records: (recordsResult.data ?? []) as ReadingRecord[],
      logs: logsResult.data ?? [],
      streak: streakResult.data ?? 0,
    };
  },
  async collections() {
    const { data, error } = await client()
      .from("collections")
      .select("*, collection_items(count)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      itemCount:
        (row.collection_items as Array<{ count: number }> | undefined)?.[0]
          ?.count ?? 0,
    })) as unknown as Collection[];
  },
  async collection(id: string) {
    const { data, error } = await client()
      .from("collections")
      .select(
        "*, items:collection_items(position, book:user_books(*, work:works!user_books_work_id_fkey(*, work_authors(position, author:authors(name))), edition:editions(*)))",
      )
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as unknown as Collection & {
      items: Array<{ position: number; book: CatalogBook }>;
    };
  },
  async profile() {
    const {
      data: { user },
    } = await client().auth.getUser();
    if (!user) throw new Error("Sign in to view settings.");
    const { data, error } = await client()
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw error;
    return data as {
      id: string;
      username: string | null;
      display_name: string;
      avatar_url: string | null;
    };
  },
  async changeStatus(book: CatalogBook, status: ReadingStatus) {
    const db = client();
    const { error } = await db.rpc("set_reading_status", {
      p_user_book_id: book.id,
      p_status: status,
    });
    if (error) throw error;
  },
  async updateProgress(
    book: CatalogBook,
    value: number,
    mode: "page" | "percent",
  ) {
    const pageCount = book.edition?.number_of_pages;
    const update =
      mode === "page" && pageCount
        ? {
            current_page: Math.round(
              Math.max(0, Math.min(value, pageCount)),
            ),
            progress_percent:
              Math.round(
                Math.max(
                  0,
                  Math.min((value / pageCount) * 100, 100),
                ) * 100,
              ) / 100,
          }
        : {
            progress_percent:
              Math.round(Math.max(0, Math.min(value, 100)) * 100) / 100,
          };
    const { error } = await client()
      .from("user_books")
      .update(update)
      .eq("id", book.id);
    if (error) throw error;
  },
  async updateFlags(
    id: string,
    values: Partial<
      Pick<CatalogBook, "want_to_buy" | "is_owned" | "is_favorite">
    >,
  ) {
    const { error } = await client()
      .from("user_books")
      .update(values)
      .eq("id", id);
    if (error) throw error;
  },
  async logReading(
    book: CatalogBook,
    values: { pages: number; minutes: number; note: string },
  ) {
    const db = client();
    const today = new Intl.DateTimeFormat("en-CA").format(new Date());
    const { error } = await db.rpc("log_reading_session", {
      p_user_book_id: book.id,
      p_logged_on: today,
      p_pages: values.pages,
      p_minutes: values.minutes,
      p_note: values.note || null,
    });
    if (error) throw error;
  },
  async saveReflection(
    book: CatalogBook,
    values: {
      rating: number | null;
      review: string;
      notes: string;
      spoiler: boolean;
    },
  ) {
    const db = client();
    const { data: record, error } = await db
      .from("reading_records")
      .select("id")
      .eq("user_book_id", book.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!record)
      throw new Error("Start reading before saving a rating or review.");
    const { error: updateError } = await db
      .from("reading_records")
      .update({
        rating: values.rating,
        review: values.review || null,
        personal_notes: values.notes || null,
        is_spoiler: values.spoiler,
      })
      .eq("id", record.id);
    if (updateError) throw updateError;
  },
  async removeBook(id: string) {
    const { error } = await client().from("user_books").delete().eq("id", id);
    if (error) throw error;
  },
  async createCollection(values: { name: string; description: string }) {
    const {
      data: { user },
    } = await client().auth.getUser();
    if (!user) throw new Error("Sign in to create a collection.");
    const { data, error } = await client()
      .from("collections")
      .insert({ ...values, user_id: user.id })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },
  async updateCollection(
    id: string,
    values: { name: string; description: string },
  ) {
    const { error } = await client()
      .from("collections")
      .update(values)
      .eq("id", id);
    if (error) throw error;
  },
  async deleteCollection(id: string) {
    const { error } = await client().from("collections").delete().eq("id", id);
    if (error) throw error;
  },
  async addToCollection(collectionId: string, bookId: string) {
    const db = client();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new Error("Sign in again.");
    const { data: last } = await db
      .from("collection_items")
      .select("position")
      .eq("collection_id", collectionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db.from("collection_items").insert({
      collection_id: collectionId,
      user_book_id: bookId,
      user_id: user.id,
      position: (last?.position ?? -1) + 1,
    });
    if (error && error.code !== "23505") throw error;
  },
  async removeFromCollection(collectionId: string, bookId: string) {
    const { error } = await client()
      .from("collection_items")
      .delete()
      .eq("collection_id", collectionId)
      .eq("user_book_id", bookId);
    if (error) throw error;
  },
  async moveCollectionItem(
    collectionId: string,
    bookId: string,
    direction: -1 | 1,
  ) {
    const db = client();
    const { data: items, error } = await db
      .from("collection_items")
      .select("user_book_id,position")
      .eq("collection_id", collectionId)
      .order("position");
    if (error) throw error;
    const current =
      items?.findIndex((item) => item.user_book_id === bookId) ?? -1;
    const target = current + direction;
    if (current < 0 || target < 0 || target >= (items?.length ?? 0)) return;
    const rows = [...(items ?? [])];
    [rows[current], rows[target]] = [rows[target], rows[current]];
    const updates = rows.map((item, position) =>
      db
        .from("collection_items")
        .update({ position })
        .eq("collection_id", collectionId)
        .eq("user_book_id", item.user_book_id),
    );
    const results = await Promise.all(updates);
    const failure = results.find((result) => result.error)?.error;
    if (failure) throw failure;
  },
  async updateProfile(values: {
    username: string | null;
    display_name: string;
  }) {
    const {
      data: { user },
    } = await client().auth.getUser();
    if (!user) throw new Error("Sign in to update your profile.");
    const { error } = await client()
      .from("profiles")
      .update(values)
      .eq("id", user.id);
    if (error) throw error;
  },
};
