import { useRef, useState } from "react";
import { ImageOff, Link2, Upload, X } from "lucide-react";
import { assetUrl } from "../../../config/api";

const tab = (active) =>
  `flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
    active
      ? "bg-brand-primary text-brand-primary-foreground"
      : "text-brand-muted-foreground hover:bg-brand-muted"
  }`;

export default function ImageField({ value, onChange, onUpload, uploading, error }) {
  const [mode, setMode] = useState("url");
  const [failed, setFailed] = useState(false);
  const inputRef = useRef(null);
  const preview = assetUrl(value);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await onUpload(file);
    if (url) {
      setFailed(false);
      onChange(url);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-xl border border-brand-border bg-brand-background p-1">
        <button type="button" onClick={() => setMode("url")} className={tab(mode === "url")}>
          <Link2 className="h-4 w-4" /> Por URL
        </button>
        <button type="button" onClick={() => setMode("file")} className={tab(mode === "file")}>
          <Upload className="h-4 w-4" /> Desde mi equipo
        </button>
      </div>

      {mode === "url" ? (
        <input
          type="url"
          value={value ?? ""}
          onChange={(e) => {
            setFailed(false);
            onChange(e.target.value);
          }}
          placeholder="https://ejemplo.com/imagen.jpg"
          className="h-11 w-full rounded-lg border border-brand-border bg-brand-card px-3.5 text-base text-brand-foreground placeholder:text-brand-muted-foreground transition-colors hover:border-brand-primary focus:border-brand-primary focus:outline-none sm:text-sm"
        />
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-brand-border bg-brand-card px-3 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-muted disabled:opacity-60"
          >
            <Upload className="h-4 w-4 shrink-0" />
            {uploading ? "Subiendo…" : "Elegir imagen (JPG, PNG o WEBP, máx. 5 MB)"}
          </button>
        </>
      )}

      {error && <p className="text-sm font-medium text-brand-danger">{error}</p>}

      <div className="relative flex h-40 items-center justify-center rounded-2xl border border-brand-border bg-white">
        {preview && !failed ? (
          <img
            src={preview}
            alt="Vista previa del producto"
            onError={() => setFailed(true)}
            className="h-full w-full rounded-2xl object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-brand-muted-foreground">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs">{failed ? "No se pudo cargar la imagen" : "Sin imagen"}</span>
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              onChange("");
            }}
            aria-label="Quitar imagen"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-card/90 text-brand-muted-foreground hover:text-brand-danger"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}