import { FormEvent, useState } from "react";
import {
  Pagination,
  Field,
  PageHeader,
  useDomainEventSync,
  useDomainEvents,
  useHostReady,
  usePaginatedItems,
} from "@mfe/shared";
import { Field, PageHeader } from "@mfe/shared/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  institutionQueryKeys,
  useCreateInstitution,
  useInstitutions,
} from "./features/institution/hooks";
import styles from "./App.module.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export default function App() {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const hostReady = useHostReady();
  const { events } = useDomainEvents(hostReady ? "" : apiUrl);
  const institutionsQuery = useInstitutions(apiUrl);
  const createInstitutionMutation = useCreateInstitution(apiUrl);
  const institutions = institutionsQuery.data ?? [];
  const institutionPagination = usePaginatedItems(institutions);
  const state = institutionsQuery.isFetching
    ? "loading"
    : institutionsQuery.isError
      ? "error"
      : institutions.length
        ? "success"
        : "empty";

  useDomainEventSync(events, (event) => {
    if (
      event.type === "INSTITUTION_CREATED" ||
      event.type === "INSTITUTION_UPDATED" ||
      event.type === "INSTITUTION_INACTIVATED"
    ) {
      institutionPagination.setPage(1);
      void queryClient.invalidateQueries({
        queryKey: institutionQueryKeys.institutions(apiUrl),
      });
    }
  });

  async function createInstitution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createInstitutionMutation.mutateAsync({ name, cnpj });
      institutionPagination.setPage(1);
      setName("");
      setCnpj("");
      setMessage("Instituição cadastrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <div className={styles.appRoot}>
      <main className="institution-shell">
        <section className="institution-hero">
          <PageHeader
            description={
              <p className="lede">Organize as unidades que sustentam cada vínculo acadêmico.</p>
            }
            eyebrow="Secretaria escolar · estrutura"
            title="Uma rede de instituições, um só lugar."
          />
        </section>
        <section className="institution-grid">
          <form className="institution-form" onSubmit={createInstitution}>
            <div className="section-heading">
              <span>01</span>
              <h2>Nova instituição</h2>
            </div>
            <Field
              id="institution-name"
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Instituto Central"
              required
            />
            <Field
              id="institution-cnpj"
              label="CNPJ"
              help="opcional"
              value={cnpj}
              onChange={(event) => setCnpj(event.target.value)}
              placeholder="00.000.000/0000-00"
            />
            <button type="submit" disabled={createInstitutionMutation.isPending}>
              {createInstitutionMutation.isPending ? "Salvando..." : "Adicionar instituição"}{" "}
              <b>→</b>
            </button>
            {message && (
              <p className={createInstitutionMutation.isError ? "message error" : "message"}>
                {message}
              </p>
            )}
          </form>
          <section
            className="institution-list"
            aria-live="polite"
            aria-busy={institutionsQuery.isFetching}
          >
            <div className="section-heading">
              <span>02</span>
              <h2>Instituições ativas</h2>
              <strong>{institutions.length.toString().padStart(2, "0")}</strong>
            </div>
            {state === "loading" && <p className="empty">Carregando instituições...</p>}
            {institutionsQuery.isError && (
              <div className="empty error-state">
                <p>
                  {institutionsQuery.error instanceof Error
                    ? institutionsQuery.error.message
                    : "Erro inesperado."}
                </p>
                <button type="button" onClick={() => void institutionsQuery.refetch()}>
                  Tentar novamente
                </button>
              </div>
            )}
            {state === "empty" && <p className="empty">Nenhuma instituição cadastrada.</p>}
            {institutionPagination.pageItems.map((institution) => (
              <article className="institution-row" key={institution.id}>
                <span className="crest">{institution.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <h3>{institution.name}</h3>
                  <p>{institution.cnpj || "CNPJ não informado"}</p>
                </div>
                <em>{institution.status}</em>
              </article>
            ))}
            <Pagination
              label="instituições"
              page={institutionPagination.page}
              pageCount={institutionPagination.pageCount}
              totalItems={institutions.length}
              onPageChange={institutionPagination.setPage}
            />
          </section>
        </section>
      </main>
    </div>
  );
}
