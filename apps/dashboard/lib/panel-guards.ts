export async function runPanelLoad(setLoading: (value: boolean) => void, setError: (value: string) => void, task: () => Promise<void>) {
  setLoading(true);
  setError("");
  try {
    await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    setError(message && !/failed to fetch|networkerror|network error/i.test(message) ? message : "A conexão falhou. Tente de novo.");
  } finally {
    setLoading(false);
  }
}

export function claimSubmit(state: { busy: boolean }) {
  if (state.busy) return false;
  state.busy = true;
  return true;
}

export function releaseSubmit(state: { busy: boolean }) {
  state.busy = false;
}

export function publishFlag(action: "draft" | "save", visibleInCatalog: boolean) {
  return action === "draft" ? false : visibleInCatalog;
}
