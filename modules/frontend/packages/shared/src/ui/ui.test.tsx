import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import buttonStyles from "./Button/Button.module.css";
import { Card } from "./Card";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataList, DataRow } from "./DataList";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Field } from "./Field";
import { Modal } from "./Modal";
import { PageHeader } from "./PageHeader";
import { SearchInput } from "./SearchInput";
import { Skeleton } from "./Skeleton";
import { StatusBadge } from "./StatusBadge";
import { Tabs } from "./Tabs";
import { ToastRegion } from "./ToastRegion";
import { useConfirm } from "./ConfirmDialog/useConfirm";

expect.extend(toHaveNoViolations);

describe("shared UI primitives", () => {
  it("supports button variants and disables the loading action", () => {
    render(
      <Button loading variant="danger">
        Saving
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Saving" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving" })).toHaveAttribute("aria-busy", "true");
  });

  it("supports button sizes and accessible icon-only actions", () => {
    render(
      <Button
        aria-label="Add person"
        iconOnly
        leadingIcon={<span aria-hidden="true">+</span>}
        size="sm"
        variant="secondary"
      />,
    );

    const button = screen.getByRole("button", { name: "Add person" });
    expect(button).toHaveClass(buttonStyles.secondary, buttonStyles.sizeSm, buttonStyles.iconOnly);
    expect(button).toHaveTextContent("+");
  });

  it("connects field help and validation errors to input, select, and textarea controls", () => {
    const { rerender } = render(
      <Field error="Obrigatório" help="Digite o nome" id="name" label="Nome" />,
    );
    const input = screen.getByRole("textbox", { name: "Nome" });
    expect(input).toHaveAttribute("aria-describedby", "name-help name-error");
    expect(input).toHaveAttribute("aria-invalid", "true");

    rerender(
      <Field as="select" id="institution" label="Instituição">
        <option>Unidade A</option>
      </Field>,
    );
    expect(screen.getByRole("combobox", { name: "Instituição" })).toBeInTheDocument();

    rerender(<Field as="textarea" id="notes" label="Observações" />);
    expect(screen.getByRole("textbox", { name: "Observações" })).toBeInTheDocument();
  });

  it("renders card, page header, badge, data rows, search, empty state and skeleton", () => {
    render(
      <>
        <PageHeader eyebrow="Admin" title="Pessoas" description="Acessos ativos" />
        <Card as="div">
          <StatusBadge tone="success">Ativo</StatusBadge>
          <DataList aria-label="Pessoas">
            <DataRow>Ana Souza</DataRow>
          </DataList>
        </Card>
        <SearchInput id="search" label="Buscar" />
        <EmptyState title="Nenhum resultado" />
        <Skeleton label="Carregando pessoas" />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Pessoas" })).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Pessoas" })).toHaveTextContent("Ana Souza");
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Carregando pessoas" })).toBeInTheDocument();
  });

  it("supports accessible tab selection and arrow-key navigation", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        id="admin"
        items={[
          { id: "people", label: "Pessoas", content: <p>Lista de pessoas</p> },
          { id: "groups", label: "Grupos", content: <p>Lista de grupos</p> },
        ]}
        label="Seções"
        onChange={onChange}
        value="people"
      />,
    );

    const people = screen.getByRole("tab", { name: "Pessoas" });
    fireEvent.keyDown(people, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("groups");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Lista de pessoas");
  });

  it("renders a retry action and announces dismissible toasts", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(
      <>
        <ErrorState description="Falha ao carregar" onRetry={onRetry} title="Erro" />
        <ToastRegion
          notices={[{ id: 1, kind: "error", message: "Falha ao salvar" }]}
          onDismiss={onDismiss}
        />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    fireEvent.click(screen.getByRole("button", { name: "Dispensar notificação: Falha ao salvar" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledWith(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar");
  });

  it("traps focus, closes with Escape, and restores focus when the modal closes", async () => {
    const onClose = vi.fn();
    function ModalHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Open dialog
          </button>
          <Modal
            labelledBy="modal-title"
            onClose={() => {
              onClose();
              setOpen(false);
            }}
            open={open}
          >
            <h2 id="modal-title">Dialog title</h2>
            <button type="button">First action</button>
            <button type="button">Last action</button>
          </Modal>
        </>
      );
    }

    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);
    const first = screen.getByRole("button", { name: "First action" });
    const last = screen.getByRole("button", { name: "Last action" });
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("uses Cancel as the initial focus for dangerous confirmation and surfaces action errors", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("Não foi possível remover."));
    render(
      <ConfirmDialog
        confirmLabel="Remover"
        description="A remoção não pode ser desfeita."
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        open
        title="Remover pessoa"
        tone="danger"
      />,
    );

    const cancel = screen.getByRole("button", { name: "Cancelar" });
    await waitFor(() => expect(cancel).toHaveFocus());
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível remover.");
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("resolves useConfirm with the user's decision", async () => {
    function ConfirmHarness() {
      const { confirm, dialog } = useConfirm();
      const [result, setResult] = useState("");
      return (
        <>
          <button
            type="button"
            onClick={() =>
              void confirm({
                confirmLabel: "Confirmar",
                description: "Deseja continuar?",
                title: "Continuar",
              }).then((confirmed) => setResult(String(confirmed)))
            }
          >
            Abrir confirmação
          </button>
          {dialog}
          <output>{result}</output>
        </>
      );
    }

    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir confirmação" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect(await screen.findByText("false")).toBeInTheDocument();
  });

  it("runs an async confirmation action before resolving true", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    function ConfirmHarness() {
      const { confirm, dialog } = useConfirm();
      const [result, setResult] = useState("");
      return (
        <>
          <button
            type="button"
            onClick={() =>
              void confirm(
                {
                  confirmLabel: "Confirmar",
                  description: "Deseja continuar?",
                  title: "Continuar",
                },
                onConfirm,
              ).then((confirmed) => setResult(String(confirmed)))
            }
          >
            Abrir confirmação
          </button>
          {dialog}
          <output>{result}</output>
        </>
      );
    }

    render(<ConfirmHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir confirmação" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText("true")).toBeInTheDocument();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("has no accessibility violations in the form and list primitives", async () => {
    const { container } = render(
      <main>
        <PageHeader title="Instituições" />
        <Card>
          <DataList aria-label="Instituições">
            <DataRow>Unidade Central</DataRow>
          </DataList>
        </Card>
        <Field id="institution" label="Nome" required />
        <SearchInput id="institution-search" label="Buscar instituições" />
        <Button>Salvar</Button>
        <StatusBadge tone="success">Ativa</StatusBadge>
        <EmptyState title="Nenhuma instituição" />
        <ErrorState description="Tente novamente." onRetry={vi.fn()} title="Falha ao carregar" />
        <Skeleton label="Carregando instituições" />
        <Tabs
          id="institutions"
          items={[{ id: "list", label: "Lista", content: <p>Unidades</p> }]}
          label="Seções"
          onChange={vi.fn()}
          value="list"
        />
        <ToastRegion
          notices={[{ id: 1, kind: "info", message: "Atualização concluída." }]}
          onDismiss={vi.fn()}
        />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations in an open confirmation", async () => {
    render(
      <ConfirmDialog
        confirmLabel="Confirmar"
        description="Confirme para continuar."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        title="Confirmação"
      />,
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
