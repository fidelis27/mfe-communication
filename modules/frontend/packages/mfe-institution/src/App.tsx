import { FormEvent, useEffect, useState } from "react";
import "./App.css";

type Institution = { id: string; name: string; cnpj?: string; status: string };
const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const demoUser = import.meta.env.VITE_DEMO_USER ?? "demo-active";

export default function App() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  async function loadInstitutions() {
    try {
      const response = await fetch(`${apiUrl}/institutions`, { headers: { "x-demo-user": demoUser } });
      if (!response.ok) throw new Error("Não foi possível carregar as instituições.");
      const result = await response.json() as Institution[];
      setInstitutions(result);
      setState(result.length ? "success" : "empty");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  useEffect(() => { void loadInstitutions(); }, []);

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${apiUrl}/institutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-user": demoUser },
        body: JSON.stringify({ name, cnpj }),
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        throw new Error(body.error ?? "Não foi possível cadastrar a instituição.");
      }
      setName(""); setCnpj(""); setMessage("Instituição cadastrada.");
      await loadInstitutions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }

  return (
    <main className="institution-shell">
      <section className="institution-hero">
        <p className="eyebrow">Secretaria escolar · estrutura</p>
        <h1>Uma rede de instituições, um só lugar.</h1>
        <p className="lede">Organize as unidades que sustentam cada vínculo acadêmico.</p>
      </section>
      <section className="institution-grid">
        <form className="institution-form" onSubmit={createInstitution}>
          <div className="section-heading"><span>01</span><h2>Nova instituição</h2></div>
          <label>Nome<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Instituto Central" required /></label>
          <label>CNPJ <small>opcional</small><input value={cnpj} onChange={(event) => setCnpj(event.target.value)} placeholder="00.000.000/0000-00" /></label>
          <button type="submit">Adicionar instituição <b>→</b></button>
          {message && <p className={state === "error" ? "message error" : "message"}>{message}</p>}
        </form>
        <section className="institution-list" aria-live="polite">
          <div className="section-heading"><span>02</span><h2>Instituições ativas</h2><strong>{institutions.length.toString().padStart(2, "0")}</strong></div>
          {state === "loading" && <p className="empty">Carregando instituições...</p>}
          {state === "error" && <p className="empty error">{message}</p>}
          {state === "empty" && <p className="empty">Nenhuma instituição cadastrada.</p>}
          {institutions.map((institution) => <article className="institution-row" key={institution.id}><span className="crest">{institution.name.slice(0, 1).toUpperCase()}</span><div><h3>{institution.name}</h3><p>{institution.cnpj || "CNPJ não informado"}</p></div><em>{institution.status}</em></article>)}
        </section>
      </section>
    </main>
  );
}