export type SuggestFixInput = {
  contract: string;
  severity: 'high' | 'medium' | 'low';
  entity: string;
  message: string;
  fix?: string | undefined;
};

export function buildSuggestFixOutput(findings: SuggestFixInput[]) {
  const fixes = findings
    .map((f) => f.fix)
    .filter((fix): fix is string => Boolean(fix));

  const unique = [...new Set(fixes)];
  return {
    fixes: unique,
    count: unique.length,
    note: 'Deterministic fix hints from contract definitions. Apply them and re-run check tools.',
  };
}
