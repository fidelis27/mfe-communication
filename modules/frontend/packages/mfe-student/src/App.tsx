import { FormEvent, useEffect, useState } from "react";
import {
  Pagination,
  type Student,
  useDomainEventSync,
  useDomainEvents,
  useHostReady,
  usePaginatedItems,
} from "@mfe/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  studentQueryKeys,
  useCreateStudent,
  useInstitutions,
  useStudents,
} from "./features/student/hooks";
import "./App.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const EMPTY_LIST: never[] = [];

export default function App() {
  const [name, setName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const hostReady = useHostReady();
  const { events, connection } = useDomainEvents(hostReady ? "" : apiUrl);
  const studentsQuery = useStudents(apiUrl);
  const institutionsQuery = useInstitutions(apiUrl);
  const createStudentMutation = useCreateStudent(apiUrl);
  const students = studentsQuery.data ?? [];
  const studentPagination = usePaginatedItems(students);
  const institutions = institutionsQuery.data ?? EMPTY_LIST;
  const state = studentsQuery.isFetching
    ? "loading"
    : studentsQuery.isError
      ? "error"
      : students.length
        ? "success"
        : "empty";

  useEffect(() => {
    if (institutions.length > 0) {
      setInstitutionId((current) => current || institutions[0].id);
    }
  }, [institutions]);

  useDomainEventSync(events, (event) => {
    if (event.type === "STUDENT_CREATED") {
      studentPagination.setPage(1);
      const student = event.payload;
      const queryKey = studentQueryKeys.students(apiUrl);
      queryClient.setQueryData<Student[]>(queryKey, (current) => {
        if (!current) return current;
        return current.some((item) => item.id === student.id) ? current : [student, ...current];
      });
      if (!queryClient.getQueryData<Student[]>(queryKey)) {
        void queryClient.invalidateQueries({ queryKey });
      }
    } else if (event.type === "STUDENT_UPDATED") {
      void queryClient.invalidateQueries({ queryKey: studentQueryKeys.students(apiUrl) });
    }
  });

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!institutionId) {
      setMessage("Selecione uma instituição antes de cadastrar.");
      return;
    }

    try {
      await createStudentMutation.mutateAsync({ name, institutionId });
      studentPagination.setPage(1);
      setName("");
      if (institutions.length > 0) {
        setInstitutionId(institutions[0].id);
      }
      setMessage("Estudante cadastrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado.");
    }
  }

  return (
    <main className="student-shell">
      <section className="student-hero">
        <p className="eyebrow">Secretaria escolar · estudantes</p>
        <h1>Vínculos que acompanham cada trajetória.</h1>
        <p className="lede">
          Cadastre estudantes e acompanhe as alterações persistidas em tempo real.
        </p>
        <span className="connection">
          <i />{" "}
          {connection === "connected"
            ? "Eventos conectados"
            : connection === "connecting"
              ? "Conectando eventos"
              : "Eventos offline"}{" "}
          · {apiUrl}
        </span>
      </section>

      <section className="student-grid">
        <form className="student-form" onSubmit={createStudent}>
          <div className="section-heading">
            <span className="section-number">01</span>
            <h2>Novo estudante</h2>
          </div>
          <label htmlFor="student-name">
            Nome completo
            <input
              id="student-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Ana Souza"
              required
            />
          </label>
          <label htmlFor="student-institution">
            Instituição
            <select
              id="student-institution"
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
              required
              disabled={institutions.length === 0 || institutionsQuery.isPending}
            >
              {institutions.length === 0 ? (
                <option value="">
                  {institutionsQuery.isError
                    ? "Instituições indisponíveis"
                    : "Carregando instituições..."}
                </option>
              ) : (
                institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="submit" disabled={createStudentMutation.isPending}>
            {createStudentMutation.isPending ? "Salvando..." : "Cadastrar estudante"} <span>→</span>
          </button>
          {institutionsQuery.isError && (
            <p className="form-message error">
              {institutionsQuery.error instanceof Error
                ? institutionsQuery.error.message
                : "Erro ao carregar instituições."}
              <button type="button" onClick={() => void institutionsQuery.refetch()}>
                Tentar novamente
              </button>
            </p>
          )}
          {message && (
            <p
              className={`form-message ${
                createStudentMutation.isError || !institutionId ? "error" : "success"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <section className="student-list" aria-live="polite" aria-busy={studentsQuery.isFetching}>
          <div className="section-heading">
            <span className="section-number">02</span>
            <h2>Estudantes recentes</h2>
            <strong>{students.length.toString().padStart(2, "0")}</strong>
          </div>
          {state === "loading" && <p className="empty-state">Carregando estudantes...</p>}
          {studentsQuery.isError && (
            <div className="empty-state error-state">
              <p>
                {studentsQuery.error instanceof Error
                  ? studentsQuery.error.message
                  : "Erro inesperado."}
              </p>
              <button type="button" onClick={() => void studentsQuery.refetch()}>
                Tentar novamente
              </button>
            </div>
          )}
          {state === "empty" && <p className="empty-state">Nenhum estudante cadastrado ainda.</p>}
          {studentPagination.pageItems.map((student) => (
            <article className="student-row" key={student.id}>
              <div className="avatar">{student.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <h3>{student.name}</h3>
                <p>{student.institutionId}</p>
              </div>
              <span className="status">{student.status}</span>
            </article>
          ))}
          <Pagination
            label="estudantes"
            page={studentPagination.page}
            pageCount={studentPagination.pageCount}
            totalItems={students.length}
            onPageChange={studentPagination.setPage}
          />
        </section>
      </section>
    </main>
  );
}
