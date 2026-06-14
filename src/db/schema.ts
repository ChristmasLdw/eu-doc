import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ==================== Users ====================

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name"),
    avatar: text("avatar"),
    role: text("role", { enum: ["USER", "ADMIN"] }).default("USER").notNull(),
    emailVerified: integer("email_verified", { mode: "timestamp" }),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
  })
);

// ==================== Accounts (for OAuth) ====================

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    providerAccountIdx: index("provider_account_idx").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

// ==================== Sessions ====================

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
});

// ==================== Categories ====================

export const categories = sqliteTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    nameZh: text("name_zh"),
    slug: text("slug").notNull().unique(),
    parentId: text("parent_id"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    categoryParentIdx: index("category_parent_idx").on(table.parentId),
    categorySlugIdx: index("category_slug_idx").on(table.slug),
  })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "CategoryTree",
  }),
  children: many(categories, { relationName: "CategoryTree" }),
  certificates: many(certificates),
}));

// ==================== Companies ====================

export const companies = sqliteTable(
  "companies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    country: text("country"),
    logo: text("logo"),
    website: text("website"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    companyNameIdx: index("company_name_idx").on(table.name),
  })
);

export const companiesRelations = relations(companies, ({ many }) => ({
  certificates: many(certificates),
}));

// ==================== Certificates ====================

export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    nameZh: text("name_zh"),
    certifiedType: text("certified_type").notNull(),
    description: text("description"),
    descriptionZh: text("description_zh"),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    companyId: text("company_id").references(() => companies.id),
    pdfUrl: text("pdf_url"),
    imageUrl: text("image_url"),
    languages: text("languages"), // Store as JSON string
    status: text("status", { enum: ["ACTIVE", "EXPIRED", "PENDING"] }).default("ACTIVE").notNull(),
    expiryDate: integer("expiry_date", { mode: "timestamp" }),
    viewCount: integer("view_count").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    certCategoryIdx: index("cert_category_idx").on(table.categoryId),
    certCompanyIdx: index("cert_company_idx").on(table.companyId),
    certTypeIdx: index("cert_type_idx").on(table.certifiedType),
    certStatusIdx: index("cert_status_idx").on(table.status),
  })
);

export const certificatesRelations = relations(
  certificates,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [certificates.categoryId],
      references: [categories.id],
    }),
    company: one(companies, {
      fields: [certificates.companyId],
      references: [companies.id],
    }),
    favorites: many(favorites),
  })
);

// ==================== Favorites ====================

export const favorites = sqliteTable(
  "favorites",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    certificateId: text("certificate_id")
      .notNull()
      .references(() => certificates.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  },
  (table) => ({
    userCertFavIdx: index("user_cert_fav_idx").on(table.userId, table.certificateId),
  })
);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  certificate: one(certificates, {
    fields: [favorites.certificateId],
    references: [certificates.id],
  }),
}));

// ==================== Search History ====================

export const searchHistory = sqliteTable("search_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  searchType: text("search_type", { enum: ["docpic", "doc", "comp"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

// ==================== Relations (back-references) ====================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  favorites: many(favorites),
  searchHistory: many(searchHistory),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));
