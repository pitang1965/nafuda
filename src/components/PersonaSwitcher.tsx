import { useState } from "react";

interface Persona {
  id: string;
  displayName: string;
  label?: string | null;
  isDefault: boolean;
}

interface PersonaSwitcherProps {
  personas: Persona[];
  currentPersonaId: string;
  onSwitch: (personaId: string) => void;
  onCreateNew: () => void;
}

export function PersonaSwitcher({
  personas,
  currentPersonaId,
  onSwitch,
  onCreateNew,
}: PersonaSwitcherProps) {
  const [open, setOpen] = useState(false);
  const current = personas.find((p) => p.id === currentPersonaId);
  const currentLabel = current?.label || current?.displayName || "なふだ";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-medium"
      >
        <span>{currentLabel}</span>
        <span className="text-xs text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 min-w-48 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSwitch(p.id);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center justify-between gap-2
                ${p.id === currentPersonaId ? "font-semibold" : ""}`}
            >
              <span className="flex flex-col">
                <span>{p.label || p.displayName}</span>
                {p.label && (
                  <span className="text-xs text-gray-400 font-normal">
                    {p.displayName}
                  </span>
                )}
              </span>
              {p.id === currentPersonaId && (
                <span className="text-xs text-gray-400 shrink-0">使用中</span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              onCreateNew();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 border-t"
          >
            ＋ なふだを追加
          </button>
        </div>
      )}
    </div>
  );
}
