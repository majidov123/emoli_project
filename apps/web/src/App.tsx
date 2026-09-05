import { useEffect, useState } from "react";

type HealthState = "checking" | "online" | "offline";

export function App() {
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        const data = (await response.json()) as { status?: string };
        setHealth(response.ok && data.status === "ok" ? "online" : "offline");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setHealth("offline");
        }
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, []);

  return (
    <main className="dashboard">
      <section className="card">
        <p className="eyebrow">Price management</p>
        <h1>Birmarket Price Bot</h1>
        <div className={`status status--${health}`} role="status" aria-live="polite">
          <span className="status__dot" aria-hidden="true" />
          Backend {health === "checking" ? "checking…" : health}
        </div>
      </section>
    </main>
  );
}
