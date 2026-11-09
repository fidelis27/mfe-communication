export interface DocsCheckResult {
  errors: string[];
  warnings: string[];
  markdownFileCount: number;
}

export function checkDocs(rootDir?: string): DocsCheckResult;
