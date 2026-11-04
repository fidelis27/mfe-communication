import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { captureHostError } from "@mfe/shared";

type RemoteBoundaryProps = { moduleName: string; children: ReactNode };
type RemoteBoundaryState = { hasError: boolean };

export class RemoteBoundary extends Component<RemoteBoundaryProps, RemoteBoundaryState> {
  state: RemoteBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RemoteBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Remote failed to load", { error, componentStack: info.componentStack });
    captureHostError(error, {
      moduleName: this.props.moduleName,
      componentStack: info.componentStack ?? undefined,
    });
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="remote-state remote-error" role="alert">
          <p className="eyebrow">Módulo indisponível</p>
          <h1>{this.props.moduleName}</h1>
          <p>Não foi possível carregar este módulo agora.</p>
          <button type="button" onClick={this.retry}>
            Tentar novamente
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}
