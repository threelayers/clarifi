import { useState } from "react";
import { AdvisorClientSelector } from "@/features/advisor/AdvisorClientSelector";
import { AdvisorView } from "@/features/advisor/AdvisorView";
import { LoginPage } from "@/features/auth/LoginPage";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { SessionModal } from "@/features/sessions/SessionModal";
import { Header } from "@/shared/components/Header";
import { useClariFiApp } from "./useClariFiApp";

export function App() {
  const clarifi = useClariFiApp();
  const [advisorWorkspaceOpen, setAdvisorWorkspaceOpen] = useState(false);

  const handleLogout = () => {
    setAdvisorWorkspaceOpen(false);
    void clarifi.auth.logout();
  };

  if (!clarifi.auth.ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-sm font-bold text-sci">
        Loading ClariFi...
      </div>
    );
  }

  if (!clarifi.auth.currentUser || clarifi.auth.currentUser.role !== "advisor") {
    return (
      <LoginPage
        accounts={clarifi.auth.demoAccounts}
        loading={clarifi.auth.loading}
        error={clarifi.auth.error}
        onLogin={clarifi.auth.login}
      />
    );
  }

  if (clarifi.auth.currentUser.role === "advisor" && !advisorWorkspaceOpen) {
    return (
      <AdvisorClientSelector
        advisorName={clarifi.auth.currentUser.name}
        onOpenDemo={() => setAdvisorWorkspaceOpen(true)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <Header
        hasApiKey={clarifi.settings.hasApiKey}
        currentUser={clarifi.auth.currentUser}
        syncStatus={clarifi.sync.status}
        persistenceMode={clarifi.sync.persistenceMode}
        sessionTitle={clarifi.sync.session?.title || ""}
        onSettings={clarifi.settings.open}
        onLogout={handleLogout}
        onSession={clarifi.sync.open}
        onManageClients={
          clarifi.auth.currentUser.role === "advisor"
            ? () => setAdvisorWorkspaceOpen(false)
            : undefined
        }
      />
      <AdvisorView
        messages={clarifi.advisor.messages}
        loading={clarifi.advisor.loading}
        onSend={clarifi.advisor.send}
        recap={clarifi.advisor.recap}
        recapLoading={clarifi.advisor.recapLoading}
        recapApproved={clarifi.advisor.recapApproved}
        onGenerateRecap={clarifi.advisor.generateRecap}
        onApproveRecap={clarifi.advisor.approveRecap}
        coverageItems={clarifi.advisor.coverageItems}
        selectedCoverageIds={clarifi.advisor.selectedCoverageIds}
        onToggleCoverage={clarifi.advisor.toggleCoverage}
        decisionOptions={clarifi.advisor.decisionOptions}
        selectedDecisionIds={clarifi.advisor.selectedDecisionIds}
        onToggleDecision={clarifi.advisor.toggleDecision}
        policyDocuments={clarifi.advisor.policyDocuments}
        policyEvidence={clarifi.advisor.policyEvidence}
        policyUploading={clarifi.advisor.policyUploading}
        policyError={clarifi.advisor.policyError}
        onPolicyFile={clarifi.advisor.uploadPolicy}
        onPolicySearch={clarifi.advisor.searchPolicy}
        clientNotes={clarifi.advisor.clientNotes}
        onClientNotesChange={clarifi.advisor.updateClientNotes}
        sessionTranscript={clarifi.advisor.sessionTranscript}
        onSessionTranscriptChange={clarifi.advisor.updateSessionTranscript}
        handwrittenNoteImage={clarifi.advisor.handwrittenNoteImage}
        onHandwrittenNoteImageChange={
          clarifi.advisor.updateHandwrittenNoteImage
        }
        learningPoints={clarifi.advisor.learningPoints}
        sessionId={clarifi.sync.session?.id || ""}
      />
      {clarifi.settings.isOpen && (
        <SettingsModal
          model={clarifi.settings.model}
          onClose={clarifi.settings.close}
          onSave={clarifi.settings.save}
        />
      )}
      {clarifi.sync.isOpen && clarifi.auth.currentUser && (
        <SessionModal
          user={clarifi.auth.currentUser}
          current={clarifi.sync.session}
          sessions={clarifi.sync.sessions}
          persistenceMode={clarifi.sync.persistenceMode}
          loading={clarifi.sync.loading}
          error={clarifi.sync.error}
          onClose={clarifi.sync.close}
          onRefresh={clarifi.sync.refresh}
          onSelect={clarifi.sync.select}
          onCreate={clarifi.sync.create}
          onJoin={clarifi.sync.join}
        />
      )}
    </div>
  );
}
