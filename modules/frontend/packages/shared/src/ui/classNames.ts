export type CSSModuleStyles = Readonly<Record<string, string>>;

export function cx(styles: CSSModuleStyles, ...names: (string | false | undefined)[]) {
  return names
    .filter((name): name is string => Boolean(name))
    .flatMap((name) => name.split(/\s+/))
    .filter(Boolean)
    .map((name) => {
      const scopedName = styles[name] ?? (Object.values(styles).includes(name) ? name : undefined);
      if (!scopedName) throw new Error(`Unknown CSS Module class: ${name}`);
      return scopedName;
    })
    .join(" ");
}
