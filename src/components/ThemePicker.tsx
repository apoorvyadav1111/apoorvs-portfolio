"use client";

interface ThemeOption {
  id: string;
  name: string;
  swatch: [string, string]; // background, accent
}

export default function ThemePicker({ themes }: { themes: ThemeOption[] }) {
  const pick = (id: string) => {
    document.documentElement.setAttribute("data-palette", id);
    try {
      localStorage.setItem("palette", id);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted">Theme</span>
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t.id)}
          title={t.name}
          aria-label={`Use ${t.name} theme`}
          className="group relative h-5 w-5 overflow-hidden rounded-full border border-line transition-transform hover:scale-110"
          style={{ background: t.swatch[0] }}
        >
          <span
            className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
            style={{ background: t.swatch[1] }}
          />
        </button>
      ))}
    </div>
  );
}
