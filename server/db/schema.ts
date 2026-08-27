import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["advisor", "client"] }).notNull(),
    demoAccountId: text("demo_account_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    demoAccountUnique: uniqueIndex("users_demo_account_unique").on(table.demoAccountId)
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    advisorId: uuid("advisor_id").notNull().references(() => users.id),
    clientId: uuid("client_id").references(() => users.id),
    title: text("title").notNull(),
    joinCode: text("join_code").notNull(),
    status: text("status", { enum: ["active", "closed"] }).notNull().default("active"),
    state: jsonb("state").notNull(),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    advisorIndex: index("conversations_advisor_idx").on(table.advisorId),
    clientIndex: index("conversations_client_idx").on(table.clientId),
    joinCodeUnique: uniqueIndex("conversations_join_code_unique").on(table.joinCode)
  })
);

export const policyDocuments = pgTable(
  "policy_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by").notNull().references(() => users.id),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageProvider: text("storage_provider", { enum: ["vercel-blob", "s3", "memory"] }).notNull(),
    storageKey: text("storage_key").notNull(),
    pageCount: integer("page_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    conversationIndex: index("policy_documents_conversation_idx").on(table.conversationId)
  })
);

export const policyPages = pgTable(
  "policy_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").notNull().references(() => policyDocuments.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    content: text("content").notNull(),
    searchText: text("search_text").notNull()
  },
  (table) => ({
    documentPageUnique: uniqueIndex("policy_pages_document_page_unique").on(table.documentId, table.pageNumber),
    documentIndex: index("policy_pages_document_idx").on(table.documentId)
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    success: boolean("success").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    conversationIndex: index("audit_events_conversation_idx").on(table.conversationId),
    actorIndex: index("audit_events_actor_idx").on(table.actorId)
  })
);
