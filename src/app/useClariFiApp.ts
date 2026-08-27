import { useCallback, useEffect, useRef, useState } from "react";
import { coverageItems, decisionOptions, myInfoSections } from "@/domain/sessionData";
import {
  getCurrentSession,
  getCurrentUser,
  getDemoAccounts,
  getSession,
  createSession,
  joinSession,
  listSessions,
  loginDemoAccount,
  logout,
  patchSessionState,
  requestPreMeetingPrep,
  requestRecap,
  searchPolicyDocument,
  sendAdvisorMessage,
  sendClientMessage,
  uploadPolicyDocument
} from "@/services/clarifiApi";
import type {
  AdvisorMessage,
  AuthUser,
  ClientMessage,
  DemoAccount,
  PolicyEvidence,
  PreMeetingPrep,
  Recap,
  SessionRecord,
  SessionSummary,
  SessionState
} from "@/types/clarifi";
import {
  DEFAULT_COVERAGE_IDS,
  DEFAULT_DECISION_IDS,
  DEFAULT_MODEL,
  defaultPreMeetingPrep,
  initialAdvisorMessage,
  initialClientMessage,
  type ClariFiView
} from "./appDefaults";
import { readStoredIds, readString, removeValue, savedModelOrDefault, storageKeys, writeStoredIds, writeString } from "./clientStorage";

type LoginPayload = { accountId?: string; email?: string; password?: string };
type SyncStatus = "local" | "loading" | "saved" | "saving" | "error";

const createId = () => crypto.randomUUID();

export function useClariFiApp() {
  const [view, setViewState] = useState<ClariFiView>("client");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSession, setActiveSession] = useState<SessionRecord | null>(null);
  const [sessionList, setSessionList] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [persistenceMode, setPersistenceMode] = useState<"postgres" | "memory">("memory");
  const [policyFileName, setPolicyFileName] = useState("");
  const [policyUploading, setPolicyUploading] = useState(false);
  const [policyError, setPolicyError] = useState("");
  const [policyEvidence, setPolicyEvidence] = useState<PolicyEvidence[]>([]);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([initialClientMessage]);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([initialAdvisorMessage]);
  const [clientLoading, setClientLoading] = useState(false);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapApproved, setRecapApproved] = useState(false);
  const [preMeetingPrep, setPreMeetingPrep] = useState<PreMeetingPrep>(defaultPreMeetingPrep);
  const [preMeetingLoading, setPreMeetingLoading] = useState(false);
  const [clientNotes, setClientNotes] = useState("");
  const [sessionTranscript, setSessionTranscript] = useState("");
  const [handwrittenNoteImage, setHandwrittenNoteImage] = useState("");
  const [selectedCoverageIds, setSelectedCoverageIds] = useState<string[]>(DEFAULT_COVERAGE_IDS);
  const [selectedDecisionIds, setSelectedDecisionIds] = useState<string[]>(DEFAULT_DECISION_IDS);
  const sessionIdRef = useRef("");
  const sessionVersionRef = useRef(0);
  const dirtyRef = useRef(false);
  const queuedPatchRef = useRef<Partial<SessionState>>({});
  const patchTimerRef = useRef<number | null>(null);

  const setView = (nextView: ClariFiView) => {
    if (nextView === "advisor" && currentUser?.role !== "advisor") return;
    setViewState(nextView);
  };

  const hydrateSession = useCallback((session: SessionRecord) => {
    sessionIdRef.current = session.id;
    sessionVersionRef.current = session.version;
    setActiveSession(session);
    setClientMessages(session.state.clientMessages.length ? session.state.clientMessages : [initialClientMessage]);
    if (session.state.advisorMessages.length) setAdvisorMessages(session.state.advisorMessages);
    setClientNotes(session.state.clientNotes);
    setSessionTranscript(session.state.sessionTranscript);
    setHandwrittenNoteImage(session.state.handwrittenNoteImage);
    setSelectedCoverageIds(session.state.selectedCoverageIds);
    setSelectedDecisionIds(session.state.selectedDecisionIds);
    setRecap(session.state.recap);
    setRecapApproved(session.state.recapApproved);
    setPreMeetingPrep(session.state.preMeetingPrep);
    setPolicyFileName(session.policyDocuments[0]?.fileName || "");
    setSyncStatus("saved");
  }, []);

  const loadCurrentSession = useCallback(async () => {
    setSyncStatus("loading");
    try {
      const result = await getCurrentSession();
      setPersistenceMode(result.persistenceMode);
      hydrateSession(result.session);
    } catch {
      setSyncStatus("local");
    }
  }, [hydrateSession]);

  const refreshSessions = useCallback(async () => {
    setSessionLoading(true);
    setSessionError("");
    try {
      const result = await listSessions();
      setSessionList(result.sessions);
      setPersistenceMode(result.persistenceMode);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not load sessions");
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    setModel(savedModelOrDefault());
    setPolicyFileName(readString(storageKeys.policyFile));
    setClientNotes(readString(storageKeys.clientNotes));
    setSessionTranscript(readString(storageKeys.sessionTranscript));
    setHandwrittenNoteImage(readString(storageKeys.handwrittenNoteImage));
    setSelectedCoverageIds(readStoredIds(storageKeys.coverageIds, DEFAULT_COVERAGE_IDS));
    setSelectedDecisionIds(readStoredIds(storageKeys.decisionIds, DEFAULT_DECISION_IDS));
    void loadAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    void Promise.all([loadCurrentSession(), refreshSessions()]);
  }, [currentUser?.id, loadCurrentSession, refreshSessions]);

  useEffect(() => {
    if (!activeSession?.id) return;
    const interval = window.setInterval(async () => {
      if (dirtyRef.current || clientLoading || advisorLoading || document.hidden) return;
      try {
        const result = await getSession(activeSession.id);
        setPersistenceMode(result.persistenceMode);
        if (result.session.version > sessionVersionRef.current) hydrateSession(result.session);
      } catch {
        setSyncStatus("error");
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeSession?.id, advisorLoading, clientLoading, hydrateSession]);

  useEffect(() => () => {
    if (patchTimerRef.current) window.clearTimeout(patchTimerRef.current);
  }, []);

  const loadAuth = async () => {
    const [accounts, current] = await Promise.allSettled([getDemoAccounts(), getCurrentUser()]);
    setDemoAccounts(accounts.status === "fulfilled" ? accounts.value.accounts : []);
    if (current.status === "fulfilled") {
      setCurrentUser(current.value.user);
      setViewState(current.value.user.role === "client" ? "client" : "advisor");
    } else {
      setCurrentUser(null);
    }
    setAuthReady(true);
  };

  const handleLogin = async (payload: LoginPayload) => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await loginDemoAccount(payload);
      setCurrentUser(result.user);
      setViewState(result.user.role === "client" ? "client" : "advisor");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCurrentUser(null);
      setActiveSession(null);
      sessionIdRef.current = "";
      setViewState("client");
    }
  };

  const selectSession = async (sessionId: string) => {
    setSessionLoading(true);
    setSessionError("");
    try {
      const result = await getSession(sessionId);
      hydrateSession(result.session);
      setPersistenceMode(result.persistenceMode);
      setShowSessions(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not open session");
    } finally {
      setSessionLoading(false);
    }
  };

  const createNewSession = async (title: string) => {
    setSessionLoading(true);
    setSessionError("");
    try {
      const result = await createSession(title);
      hydrateSession(result.session);
      await refreshSessions();
      setShowSessions(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not create session");
      setSessionLoading(false);
    }
  };

  const joinExistingSession = async (code: string) => {
    setSessionLoading(true);
    setSessionError("");
    try {
      const result = await joinSession(code);
      hydrateSession(result.session);
      await refreshSessions();
      setShowSessions(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : "Could not join session");
      setSessionLoading(false);
    }
  };

  const savePatch = useCallback(async (patch: Partial<SessionState>) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    dirtyRef.current = true;
    setSyncStatus("saving");
    try {
      const result = await patchSessionState(sessionId, patch);
      sessionVersionRef.current = result.session.version;
      setActiveSession(result.session);
      setSyncStatus("saved");
    } catch {
      setSyncStatus("error");
    } finally {
      dirtyRef.current = false;
    }
  }, []);

  const queuePatch = useCallback((patch: Partial<SessionState>) => {
    queuedPatchRef.current = { ...queuedPatchRef.current, ...patch };
    dirtyRef.current = true;
    setSyncStatus("saving");
    if (patchTimerRef.current) window.clearTimeout(patchTimerRef.current);
    patchTimerRef.current = window.setTimeout(() => {
      const queued = queuedPatchRef.current;
      queuedPatchRef.current = {};
      void savePatch(queued);
    }, 650);
  }, [savePatch]);

  const saveSettings = (newModel: string) => {
    writeString(storageKeys.model, newModel);
    setModel(newModel);
    setShowSettings(false);
  };

  const sessionContext = () => ({
    sessionId: sessionIdRef.current || undefined,
    clientNotes,
    sessionTranscript,
    handwrittenNoteImage
  });

  const sendClient = async (text: string) => {
    if (clientLoading) return;
    const userMessage: ClientMessage = { id: createId(), role: "user", text, createdAt: new Date().toISOString() };
    const nextMessages = [...clientMessages, userMessage];
    setClientMessages(nextMessages);
    setClientLoading(true);
    try {
      const response = await sendClientMessage(nextMessages, { model }, sessionContext());
      const validIds = (response.evidenceIds || []).filter(Boolean);
      if (response.documentEvidence?.length) setPolicyEvidence(response.documentEvidence);
      const bot: ClientMessage = {
        id: createId(),
        role: "assistant",
        text: response.reply,
        detected: response.detected,
        misunderstanding: response.misunderstanding || "",
        evidenceIds: validIds,
        teachBack: response.teachBack || "",
        understanding: response.understanding || [],
        createdAt: new Date().toISOString()
      };
      const completeMessages = [...nextMessages, bot];
      setClientMessages(completeMessages);
      setActiveClauseId((current) => validIds[0] || current);
    } catch (error) {
      setClientMessages((current) => [...current, {
        id: createId(),
        role: "assistant",
        text: `I could not reach the AI service just now. Please try again.\n\n(${error instanceof Error ? error.message : "Unknown error"})`,
        evidenceIds: [],
        understanding: [],
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setClientLoading(false);
    }
  };

  const sendAdvisor = async (text: string) => {
    if (advisorLoading) return;
    const userMessage: AdvisorMessage = { id: createId(), role: "user", text, createdAt: new Date().toISOString() };
    const nextMessages = [...advisorMessages, userMessage];
    setAdvisorMessages(nextMessages);
    setAdvisorLoading(true);
    try {
      const response = await sendAdvisorMessage(nextMessages, clientMessages, { model }, sessionContext());
      if (response.documentEvidence?.length) setPolicyEvidence(response.documentEvidence);
      const completeMessages: AdvisorMessage[] = [...nextMessages, {
        id: createId(),
        role: "assistant",
        text: response.reply,
        citations: response.citations || [],
        createdAt: new Date().toISOString()
      }];
      setAdvisorMessages(completeMessages);
    } catch (error) {
      setAdvisorMessages((current) => [...current, {
        id: createId(),
        role: "assistant",
        text: `Could not reach the AI service. Please try again.\n\n(${error instanceof Error ? error.message : "Unknown error"})`,
        citations: [],
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const generateRecap = async () => {
    setRecapLoading(true);
    try {
      const nextRecap = await requestRecap(clientMessages, { model }, sessionContext());
      setRecap(nextRecap);
      setRecapApproved(false);
      setViewState("advisor");
    } catch (error) {
      setRecap({ covered: [], notCovered: [`Could not generate recap: ${error instanceof Error ? error.message : "Unknown error"}`], followUps: ["Try again shortly"] });
    } finally {
      setRecapLoading(false);
    }
  };

  const generatePreMeeting = async () => {
    if (preMeetingLoading) return;
    setPreMeetingLoading(true);
    try {
      const prep = await requestPreMeetingPrep({ model }, sessionIdRef.current || undefined);
      setPreMeetingPrep(prep);
    } catch (error) {
      setPreMeetingPrep({ ...defaultPreMeetingPrep, advisorBrief: `Could not generate live pre-meeting prep: ${error instanceof Error ? error.message : "Unknown error"}` });
    } finally {
      setPreMeetingLoading(false);
    }
  };

  const updatePolicyFile = async (file: File) => {
    if (!sessionIdRef.current || !file) return;
    setPolicyUploading(true);
    setPolicyError("");
    try {
      const result = await uploadPolicyDocument(sessionIdRef.current, file);
      setPolicyFileName(result.document.fileName);
      writeString(storageKeys.policyFile, result.document.fileName);
      await loadCurrentSession();
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : "Policy upload failed");
    } finally {
      setPolicyUploading(false);
    }
  };

  const searchPolicy = async (query: string) => {
    if (!sessionIdRef.current || query.trim().length < 2) return;
    setPolicyError("");
    try {
      const result = await searchPolicyDocument(sessionIdRef.current, query.trim());
      setPolicyEvidence(result.evidence);
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : "Policy search failed");
    }
  };

  const updateClientNotes = (notes: string) => {
    setClientNotes(notes);
    writeString(storageKeys.clientNotes, notes);
    queuePatch({ clientNotes: notes });
  };

  const updateSessionTranscript = (transcript: string) => {
    setSessionTranscript(transcript);
    writeString(storageKeys.sessionTranscript, transcript);
    queuePatch({ sessionTranscript: transcript });
  };

  const updateHandwrittenNoteImage = (image: string) => {
    setHandwrittenNoteImage(image);
    if (image) writeString(storageKeys.handwrittenNoteImage, image);
    else removeValue(storageKeys.handwrittenNoteImage);
    queuePatch({ handwrittenNoteImage: image });
  };

  const toggleCoverage = (id: string) => {
    setSelectedCoverageIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeStoredIds(storageKeys.coverageIds, next);
      void savePatch({ selectedCoverageIds: next });
      return next;
    });
  };

  const toggleDecision = (id: string) => {
    setSelectedDecisionIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeStoredIds(storageKeys.decisionIds, next);
      void savePatch({ selectedDecisionIds: next });
      return next;
    });
  };

  const approveRecap = () => {
    setRecapApproved((current) => {
      const next = !current;
      void savePatch({ recapApproved: next });
      return next;
    });
  };

  return {
    view,
    setView,
    auth: { ready: authReady, currentUser, demoAccounts, loading: authLoading, error: authError, login: handleLogin, logout: handleLogout },
    sync: {
      session: activeSession,
      sessions: sessionList,
      status: syncStatus,
      persistenceMode,
      isOpen: showSessions,
      loading: sessionLoading,
      error: sessionError,
      open: () => setShowSessions(true),
      close: () => setShowSessions(false),
      refresh: refreshSessions,
      select: selectSession,
      create: createNewSession,
      join: joinExistingSession
    },
    settings: {
      model,
      hasApiKey: true,
      isOpen: showSettings,
      open: () => setShowSettings(true),
      close: () => setShowSettings(false),
      save: saveSettings
    },
    client: {
      messages: clientMessages,
      loading: clientLoading,
      send: sendClient,
      activeClauseId,
      setActiveClauseId,
      policyFileName,
      preMeetingPrep,
      clientNotes,
      updateClientNotes,
      sessionTranscript,
      updateSessionTranscript,
      handwrittenNoteImage,
      updateHandwrittenNoteImage,
      decisionOptions,
      selectedDecisionIds,
      policyEvidence
    },
    advisor: {
      messages: advisorMessages,
      loading: advisorLoading,
      send: sendAdvisor,
      recap,
      recapLoading,
      recapApproved,
      generateRecap,
      approveRecap,
      preMeetingPrep,
      preMeetingLoading,
      generatePreMeeting,
      myInfoSections,
      coverageItems,
      selectedCoverageIds,
      toggleCoverage,
      decisionOptions,
      selectedDecisionIds,
      toggleDecision,
      policyDocuments: activeSession?.policyDocuments || [],
      policyEvidence,
      policyUploading,
      policyError,
      uploadPolicy: updatePolicyFile,
      searchPolicy
    }
  };
}
