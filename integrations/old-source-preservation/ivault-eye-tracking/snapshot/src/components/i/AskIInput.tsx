import { useState } from "react";
import { I_COPY } from "../../lib/i/i-command-copy";

interface AskIInputProps {
  /** Trimmed command text; parent runs runICommand + state update. */
  onSubmitRaw: (trimmedRaw: string) => void;
}

export function AskIInput({ onSubmitRaw }: AskIInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmitRaw(trimmed);
  }

  return (
    <div className="w-full">
      <div className="mb-3 text-center">
        <div className="font-display text-4xl font-bold tracking-tight text-white">
          i
        </div>
        <p className="mt-2 text-sm text-white/40">{I_COPY.emptyInput}</p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder={focused ? I_COPY.focusedInput : I_COPY.emptyInput}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
        />

        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-white px-4 py-3 font-display text-sm font-bold text-black active:scale-[0.97]"
        >
          Ask
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-white/25">
        {I_COPY.notSearch}
      </p>
    </div>
  );
}
