"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { renderPromptPreview } from "@/lib/prompt-render";

type PromptRow = {
  id: number;
  stage: "image_gen" | "video_gen";
  scope: string;
  version: number;
  body: string;
  active: boolean;
  createdAt: string | Date;
};

export function PromptsClient({ initialPrompts }: { initialPrompts: PromptRow[] }) {
  const router = useRouter();
  const [prompts, setPrompts] = useState(initialPrompts);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialPrompts.find((p) => p.stage === "image_gen")?.id ?? initialPrompts[0]?.id ?? null,
  );
  const [adding, setAdding] = useState(false);
  const [stage, setStage] = useState<"image_gen" | "video_gen">("image_gen");
  const [body, setBody] = useState("");
  const [testModel, setTestModel] = useState("Demo Model");
  const [testShortcode, setTestShortcode] = useState("demo-vertical-1");
  const [message, setMessage] = useState<string | null>(null);

  const selected = useMemo(() => prompts.find((p) => p.id === selectedId) ?? null, [prompts, selectedId]);

  const preview = selected
    ? renderPromptPreview(selected.body, {
        modelDisplayName: testModel,
        sourceReelShortcode: testShortcode,
        operatorInstruction: "Keep background unchanged.",
      })
    : "";

  async function createPrompt(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage, body, scope: "global" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Failed to create prompt");
      return;
    }

    setPrompts([data.prompt, ...prompts]);
    setSelectedId(data.prompt.id);
    setAdding(false);
    setBody("");
    router.refresh();
  }

  async function activatePrompt(id: number) {
    setMessage(null);
    const response = await fetch(`/api/prompts/${id}/activate`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Activation failed");
      return;
    }

    const target = prompts.find((p) => p.id === id)!;
    setPrompts(
      prompts.map((p) =>
        p.stage === target.stage && p.scope === target.scope
          ? { ...p, active: p.id === id }
          : p,
      ),
    );
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="panel p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase">Active prompts</h2>
          <button type="button" className="btn-secondary" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {adding ? (
          <form onSubmit={createPrompt} className="mb-4 space-y-2">
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value as "image_gen" | "video_gen")}>
              <option value="image_gen">Image generation</option>
              <option value="video_gen">Video generation</option>
            </select>
            <textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} required />
            <button type="submit" className="btn-primary w-full justify-center">Save version</button>
          </form>
        ) : null}

        <ul className="space-y-2">
          {prompts.map((prompt) => (
            <li key={prompt.id}>
              <button
                type="button"
                onClick={() => setSelectedId(prompt.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selectedId === prompt.id ? "bg-[#f487b7]/10" : "hover:bg-[var(--bg-hover)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs">
                    {prompt.stage === "image_gen" ? "Image generation" : "Video generation"}
                  </span>
                  <span className="badge badge-ok">active</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-5">
        {!selected ? (
          <p className="text-sm text-[var(--text-muted)]">Select a prompt version.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {selected.stage === "image_gen" ? "Image generation prompt" : "Video generation prompt"}
              </h2>
              {!selected.active ? (
                <button type="button" className="btn-primary" onClick={() => activatePrompt(selected.id)}>
                  <Check className="h-4 w-4" /> Activate
                </button>
              ) : null}
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <input className="input" value={testModel} onChange={(e) => setTestModel(e.target.value)} placeholder="Model display name (preview only)" />
              <input className="input" value={testShortcode} onChange={(e) => setTestShortcode(e.target.value)} placeholder="Reel shortcode" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Template</h3>
                <pre className="panel-inset overflow-auto p-3 text-xs whitespace-pre-wrap">{selected.body}</pre>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase text-[var(--text-muted)]">Rendered preview</h3>
                <pre className="panel-inset overflow-auto p-3 text-xs whitespace-pre-wrap">{preview}</pre>
              </div>
            </div>
          </>
        )}
        {message ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
      </div>
    </div>
  );
}
