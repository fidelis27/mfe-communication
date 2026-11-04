declare module "*.module.css" {
  const styles: Readonly<Record<string, string>>;
  export default styles;
}

declare module "react-dom" {
  import type { ReactNode, ReactPortal } from "react";

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | null,
  ): ReactPortal;
}
