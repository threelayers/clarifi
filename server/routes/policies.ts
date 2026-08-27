import Router from "express-promise-router";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import { getAppStore } from "../repositories/appStore.js";
import { extractPdfPages } from "../services/pdf.js";
import { readPolicyFile, storePolicyFile } from "../services/storage.js";

export const policiesRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "application/pdf") return callback(new Error("Only PDF policy documents are accepted"));
    callback(null, true);
  }
});

policiesRouter.use(requireAuth);

policiesRouter.post("/:sessionId/upload", requireRole("advisor"), uploadLimiter, upload.single("policy"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A PDF policy document is required" });
  if (!req.file.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return res.status(400).json({ error: "The uploaded file is not a valid PDF" });
  }
  const session = await getAppStore().getSession(req.user!, req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const pages = await extractPdfPages(req.file.buffer);
  if (!pages.some((page) => page.content)) {
    return res.status(422).json({ error: "No searchable text was found. Scanned PDFs require OCR." });
  }
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100);
  const stored = await storePolicyFile(`policies/${session.id}/${nanoid(10)}-${safeName}`, req.file.buffer, req.file.mimetype);
  const document = await getAppStore().savePolicyDocument({
    user: req.user!,
    sessionId: session.id,
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    byteSize: req.file.size,
    storageProvider: stored.provider,
    storageKey: stored.key,
    pages
  });
  if (!document) return res.status(403).json({ error: "Only the assigned advisor can upload policy documents" });
  res.status(201).json({ document });
});

policiesRouter.get("/:sessionId/search", async (req, res) => {
  const query = z.string().trim().min(2).max(300).parse(req.query.q);
  const evidence = await getAppStore().searchPolicy(req.user!, req.params.sessionId, query);
  res.json({ evidence });
});

policiesRouter.get("/:sessionId/documents/:documentId/download", async (req, res) => {
  const document = await getAppStore().getPolicyDocument(req.user!, req.params.sessionId, req.params.documentId);
  if (!document) return res.status(404).json({ error: "Policy document not found" });
  const file = await readPolicyFile(document.storageProvider, document.storageKey);
  if (!file) return res.status(404).json({ error: "Stored policy file is unavailable" });
  res.setHeader("Content-Type", file.contentType);
  res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`);
  res.setHeader("Content-Length", String(file.body.length));
  res.send(file.body);
});
