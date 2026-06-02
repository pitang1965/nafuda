import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const current = personas.find((p) => p.id === currentPersonaId);
  const currentLabel = current?.label || current?.displayName || "なふだ";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
          <span>{currentLabel}</span>
          <span className="text-xs text-gray-400">▼</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {personas.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onSelect={() => onSwitch(p.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex flex-col">
              <span>{p.label || p.displayName}</span>
              {p.label && (
                <span className="text-xs text-muted-foreground font-normal">
                  {p.displayName}
                </span>
              )}
            </span>
            {p.id === currentPersonaId && (
              <span className="text-xs text-muted-foreground shrink-0">
                使用中
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onCreateNew}
          className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
        >
          ＋ なふだを追加
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
