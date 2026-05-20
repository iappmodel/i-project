import { useCallback, useState } from "react";
import { AskIInput } from "../components/i/AskIInput";
import { IResponseCard } from "../components/i/IResponseCard";
import { runICommand } from "../lib/i/i-command-engine";
import { I_COPY } from "../lib/i/i-command-copy";
import type { ICommandEngineResult } from "../lib/i/i-command.types";

const DEMO_USER_ID = "demo-user";

const SAMPLE_COMMANDS = [
  "i need to calm down",
  "i want to earn today",
  "i pay Ana 10",
  "i protect this song",
  "i need a job",
  "i want to hurt myself",
] as const;

export function IHomeScreen() {
  const [result, setResult] = useState<ICommandEngineResult | null>(null);

  const submitCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const next = runICommand({
      raw: trimmed,
      userId: DEMO_USER_ID,
      source: "text",
      timestamp: new Date().toISOString(),
    });

    setResult(next);
  }, []);

  function handlePrimaryAction() {
    if (!result?.route.nextRoute) return;

    console.log("[i-command:navigate]", {
      route: result.route.nextRoute,
      actionType: result.route.actionType,
      payload: result.route.payload,
    });
  }

  function handleRemember() {
    console.log("[i-command:memory:remember]", { body: result?.parse.body });
  }

  function handleForget() {
    console.log("[i-command:memory:forget]", { body: result?.parse.body });
  }

  return (
    <main className="min-h-screen bg-[#070709] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md flex-col justify-center gap-6">
        <AskIInput onSubmitRaw={submitCommand} />

        {result && (
          <IResponseCard
            result={result}
            onPrimaryAction={handlePrimaryAction}
            onRemember={handleRemember}
            onForget={handleForget}
          />
        )}

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/25">
            {I_COPY.tryThese}
          </p>

          <div className="flex flex-col gap-2">
            {SAMPLE_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => submitCommand(cmd)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-white/75 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.99]"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
