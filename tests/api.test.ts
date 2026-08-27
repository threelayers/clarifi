import { PDFDocument, StandardFonts } from "pdf-lib";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { resetMemoryStore } from "../server/repositories/appStore.js";

beforeEach(() => {
  delete process.env.DATABASE_URL;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.S3_BUCKET;
  delete process.env.OPENAI_API_KEY;
  resetMemoryStore();
});

describe("ClariFi API", () => {
  it("authenticates credentials and returns a role-safe persistent session", async () => {
    const credentialAgent = request.agent(app);
    const credentialLogin = await credentialAgent
      .post("/api/auth/login")
      .send({ email: "advisor@clarifi.demo", password: "clarifi-advisor" })
      .expect(200);
    expect(credentialLogin.body.user.role).toBe("advisor");

    const agent = request.agent(app);
    const login = await agent.post("/api/auth/demo-login").send({ accountId: "client-demo" }).expect(200);
    expect(login.body.user.role).toBe("client");

    const current = await agent.get("/api/sessions/current").expect(200);
    expect(current.body.session.title).toContain("Tan Li Wen");
    expect(current.body.session.state.advisorMessages).toEqual([]);
    expect(current.body.persistenceMode).toBe("memory");
  });

  it("persists client notes and blocks client access to advisor audit data", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo-login").send({ accountId: "client-demo" }).expect(200);
    const current = await agent.get("/api/sessions/current").expect(200);
    const sessionId = current.body.session.id;

    await agent.patch(`/api/sessions/${sessionId}/state`).send({ clientNotes: "Income while recovering matters to me." }).expect(200);
    const saved = await agent.get(`/api/sessions/${sessionId}`).expect(200);
    expect(saved.body.session.state.clientNotes).toContain("Income");
    await agent.get(`/api/sessions/${sessionId}/audit`).expect(403);
  });

  it("extracts an uploaded PDF and returns page-level evidence", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 800]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    page.drawText("Hospitalisation policy covers eligible inpatient hospital bills.", { x: 50, y: 720, size: 14, font });
    page.drawText("Loss of income is not covered by this hospital plan.", { x: 50, y: 690, size: 14, font });
    const bytes = await pdf.save();

    const agent = request.agent(app);
    await agent.post("/api/auth/demo-login").send({ accountId: "advisor-demo" }).expect(200);
    const current = await agent.get("/api/sessions/current").expect(200);
    const sessionId = current.body.session.id;

    const upload = await agent
      .post(`/api/policies/${sessionId}/upload`)
      .attach("policy", Buffer.from(bytes), { filename: "demo-policy.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(upload.body.document.pageCount).toBe(1);

    const search = await agent.get(`/api/policies/${sessionId}/search`).query({ q: "loss income" }).expect(200);
    expect(search.body.evidence[0].pageNumber).toBe(1);
    expect(search.body.evidence[0].quote).toContain("Loss of income");
    const download = await agent
      .get(`/api/policies/${sessionId}/documents/${upload.body.document.id}/download`)
      .expect(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
  }, 20_000);

  it("persists a generated client response and learning points", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo-login").send({ accountId: "client-demo" }).expect(200);
    const current = await agent.get("/api/sessions/current").expect(200);
    const sessionId = current.body.session.id;
    const chat = await agent.post("/api/chat/client").send({
      sessionId,
      history: [{ id: "question-1", role: "user", content: "Will this replace my income if I cannot work?" }],
      clientNotes: "Income matters while recovering.",
      sessionTranscript: "[Client] I am worried about missing work."
    }).expect(200);
    expect(chat.body.reply).toContain("income");

    const saved = await agent.get(`/api/sessions/${sessionId}`).expect(200);
    expect(saved.body.session.state.clientMessages.at(-1).role).toBe("assistant");
    expect(saved.body.session.state.learningPoints.length).toBeGreaterThan(0);
  });

  it("prevents clients from updating advisor-only decisions", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/demo-login").send({ accountId: "client-demo" }).expect(200);
    const current = await agent.get("/api/sessions/current").expect(200);
    await agent
      .patch(`/api/sessions/${current.body.session.id}/state`)
      .send({ selectedDecisionIds: ["income-protection-gap"] })
      .expect(403);
  });
});
