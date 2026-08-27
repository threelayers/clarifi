import { AdvisorView } from "@/features/advisor/AdvisorView";
import { LoginPage } from "@/features/auth/LoginPage";
import { ClientView } from "@/features/client/ClientView";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { SessionModal } from "@/features/sessions/SessionModal";
import { Header } from "@/shared/components/Header";
import { useClariFiApp } from "./useClariFiApp";

export function App() {
  const clarifi = useClariFiApp();

  if (!clarifi.auth.ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-sm font-bold text-sci">
        Loading ClariFi...
      </div>
    );
  }

  if (!clarifi.auth.currentUser) {
    return (
      <LoginPage
        accounts={clarifi.auth.demoAccounts}
        loading={clarifi.auth.loading}
        error={clarifi.auth.error}
        onLogin={clarifi.auth.login}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-paper text-ink">
      <Header
        view={clarifi.view}
        hasApiKey={clarifi.settings.hasApiKey}
        currentUser={clarifi.auth.currentUser}
        syncStatus={clarifi.sync.status}
        persistenceMode={clarifi.sync.persistenceMode}
        sessionTitle={clarifi.sync.session?.title || ""}
        onViewChange={clarifi.setView}
        onSettings={clarifi.settings.open}
        onLogout={clarifi.auth.logout}
        onSession={clarifi.sync.open}
      />
      {clarifi.view === "client" ? (
        <ClientView
          messages={clarifi.client.messages}
          loading={clarifi.client.loading}
          onSend={clarifi.client.send}
          activeClauseId={clarifi.client.activeClauseId}
          setActiveClauseId={clarifi.client.setActiveClauseId}
          policyFileName={clarifi.client.policyFileName}
          preMeetingPrep={clarifi.client.preMeetingPrep}
          clientNotes={clarifi.client.clientNotes}
          onClientNotesChange={clarifi.client.updateClientNotes}
          sessionTranscript={clarifi.client.sessionTranscript}
          onSessionTranscriptChange={clarifi.client.updateSessionTranscript}
          handwrittenNoteImage={clarifi.client.handwrittenNoteImage}
          onHandwrittenNoteImageChange={clarifi.client.updateHandwrittenNoteImage}
          decisionOptions={clarifi.client.decisionOptions}
          selectedDecisionIds={clarifi.client.selectedDecisionIds}
          policyEvidence={clarifi.client.policyEvidence}
          sessionId={clarifi.sync.session?.id || ""}
        />
      ) : (
        <AdvisorView
          messages={clarifi.advisor.messages}
          loading={clarifi.advisor.loading}
          onSend={clarifi.advisor.send}
          recap={clarifi.advisor.recap}
          recapLoading={clarifi.advisor.recapLoading}
          recapApproved={clarifi.advisor.recapApproved}
          onGenerateRecap={clarifi.advisor.generateRecap}
          onApproveRecap={clarifi.advisor.approveRecap}
          preMeetingPrep={clarifi.advisor.preMeetingPrep}
          preMeetingLoading={clarifi.advisor.preMeetingLoading}
          onGeneratePreMeeting={clarifi.advisor.generatePreMeeting}
          myInfoSections={clarifi.advisor.myInfoSections}
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
          sessionId={clarifi.sync.session?.id || ""}
        />
      )}
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
