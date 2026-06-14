import { create } from "zustand";

interface AppState {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  searchType: "docpic" | "doc" | "comp";
  setSearchType: (type: "docpic" | "doc" | "comp") => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
  searchType: "docpic",
  setSearchType: (searchType) => set({ searchType }),
  searchKeyword: "",
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),
}));
