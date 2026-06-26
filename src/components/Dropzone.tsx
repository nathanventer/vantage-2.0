import { useRef, useState } from "react";
import { UploadCloud, FileCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

type Uploaded = { name: string; size: string; status: "Verified" | "Pending" };

export function Dropzone({
  label = "Drop files here, or click to upload",
  hint = "PDF, PNG, JPG up to 10 MB",
  onFile,
}: {
  label?: string;
  hint?: string;
  onFile?: (name: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (names: string[]) => {
    const next = names.map((n) => ({ name: n, size: `${(Math.random() * 2 + 0.3).toFixed(1)} MB`, status: "Pending" as const }));
    setFiles((f) => [...f, ...next]);
    next.forEach((nf, i) => {
      setTimeout(() => {
        setFiles((cur) => cur.map((x) => x.name === nf.name ? { ...x, status: "Verified" } : x));
        onFile?.(nf.name);
      }, 600 + i * 200);
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          const names = Array.from(e.dataTransfer.files).map((f) => f.name);
          if (names.length) addFiles(names);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-6 py-10 text-center transition",
          "hover:bg-muted/50 hover:border-accent/50",
          dragging && "border-accent bg-accent/5",
        )}
      >
        <div className="rounded-full bg-accent/10 p-3 text-accent">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(e) => {
          const names = Array.from(e.target.files ?? []).map((f) => f.name);
          if (names.length) addFiles(names);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.name} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileCheck className={cn("h-4 w-4 shrink-0", f.status === "Verified" ? "text-success" : "text-muted-foreground")} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground">{f.size}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status} />
                <Button size="icon" variant="ghost" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((x) => x.name !== f.name))}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
