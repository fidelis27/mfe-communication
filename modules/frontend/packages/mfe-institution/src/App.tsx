import { FormEvent, useCallback, useEffect, useState } from "react";
import { type Institution } from "@mfe/shared";
import {
  createInstitution as createInstitutionApi,
  getInstitutions,
} from "./features/institution/api";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export default function App() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const loadInstitutions = useCallback(async () => {
    setState("loading");
    setMessage("");
    try {
      const result = await getInstitutions(apiUrl);
      setInstitutions(result);
      setState(result.length ? "success" : "empty");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createInstitutionApi(apiUrl, { name, cnpj });
      setName("");
      setCnpj("");
      setMessage("Instituição cadastrada.");
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
          <div className="section-heading">
            <span>01</span>
            <h2>Nova instituição</h2>
          </div>
          <label htmlFor="institution-name">
            Nome
            <input
              id="institution-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Instituto Central"
              required
            />
          </label>
          <label htmlFor="institution-cnpj">
            CNPJ <small>opcional</small>
            <input
              id="institution-cnpj"
              value={cnpj}
              onChange={(event) => setCnpj(event.target.value)}
              placeholder="00.000.000/0000-00"
            />
          </label>
          <button type="submit">
            Adicionar instituição <b>→</b>
          </button>
          {message && <p className={state === "error" ? "message error" : "message"}>{message}</p>}
        </form>
        <section className="institution-list" aria-live="polite" aria-busy={state === "loading"}>
          <div className="section-heading">
            <span>02</span>
            <h2>Instituições ativas</h2>
            <strong>{institutions.length.toString().padStart(2, "0")}</strong>
          </div>
          {state === "loading" && <p className="empty">Carregando instituições...</p>}
          {state === "error" && (
            <div className="empty error-state">
              <p>{message}</p>
              <button type="button" onClick={() => void loadInstitutions()}>
                Tentar novamente
              </button>
            </div>
          )}
          {state === "empty" && <p className="empty">Nenhuma instituição cadastrada.</p>}
          {institutions.map((institution) => (
            <article className="institution-row" key={institution.id}>
              <span className="crest">{institution.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <h3>{institution.name}</h3>
                <p>{institution.cnpj || "CNPJ não informado"}</p>
              </div>
              <em>{institution.status}</em>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
