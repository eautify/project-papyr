import { supabase } from "../utils/supabase";
import type {
  EditionDTO,
  SearchBookResult,
  SearchMode,
  WorkDTO,
} from "../types/domain";

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  if (!supabase)
    throw new Error(
      "Supabase is not configured. Add the project URL and publishable key.",
    );
  const { data, error } = await supabase.functions.invoke("book-service", {
    body,
  });
  if (error) {
    const response = error.context;
    if (response instanceof Response) {
      const detail = await response.clone().json().catch(() => null);
      if (typeof detail?.error === "string") throw new Error(detail.error);
    }
    throw new Error(error.message || "Book service is unavailable.");
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const bookService = {
  search: (query: string, mode: SearchMode = "all", page = 1) =>
    invoke<{
      results: SearchBookResult[];
      total: number;
      page: number;
      hasNextPage: boolean;
    }>({ op: "search", query, mode, page }),
  work: (workId: string) =>
    invoke<{ work: WorkDTO; editions: EditionDTO[] }>({ op: "work", workId }),
  edition: (editionId: string) =>
    invoke<{ work: WorkDTO; edition: EditionDTO }>({
      op: "edition",
      editionId,
    }),
  discover: (
    section: "new" | "subject" | "popular" | "randomized",
    subject?: string,
  ) =>
    invoke<{ results: SearchBookResult[]; total: number }>({
      op: "discover",
      section,
      subject,
      limit: 12,
    }),
  import: (
    workId: string,
    editionId: string | null,
    state: {
      readingStatus: string;
      wantToBuy: boolean;
      isOwned: boolean;
      isFavorite: boolean;
    },
  ) =>
    invoke<{ userBookId: string }>({
      op: "import",
      workId,
      editionId,
      ...state,
    }),
};
