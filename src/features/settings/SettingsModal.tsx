import { X } from "lucide-react";
import { useState } from "react";

type SettingsModalProps = {
  model: string;
  onClose: () => void;
  onSave: (model: string) => void;
};

export function SettingsModal({ model, onClose, onSave }: SettingsModalProps) {
  const [draftModel, setDraftModel] = useState(model);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.28)] p-5 backdrop-blur-md" onClick={onClose}>
      <div className="apple-panel w-[460px] max-w-full overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <div className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xl font-semibold tracking-tight">AI settings</div>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white/65 text-[#6E6E73] backdrop-blur-xl hover:border-[#B9D9FF] hover:text-sci" onClick={onClose} aria-label="Close settings">
              <X size={22} />
            </button>
          </div>
          <p className="mb-5 text-sm font-medium leading-6 text-[#6E6E73]">
            OpenAI credentials are managed securely by the ClariFi server. Choose the model used for this workspace.
          </p>

          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#6E6E73]">Model</label>
          <select
            value={draftModel}
            onChange={(event) => setDraftModel(event.target.value)}
            className="field-input mb-5 w-full"
          >
            <option value="gpt-5.4-mini">gpt-5.4-mini (recommended)</option>
            <option value="gpt-5.5">gpt-5.5</option>
            <option value="gpt-5.4">gpt-5.4</option>
            <option value="gpt-5.4-nano">gpt-5.4-nano</option>
          </select>

          <button className="w-full rounded-lg bg-sci px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,113,227,.22)] hover:bg-[#0064C8]" onClick={() => onSave(draftModel)}>
            Save model
          </button>
        </div>
      </div>
    </div>
  );
}
