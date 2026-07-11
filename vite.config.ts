import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function githubPagesBase(): string {
  const explicitBase = process.env.VITE_BASE_PATH;
  if (explicitBase) {
    return explicitBase;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    return "/";
  }

  const repositoryName = repository.split("/").at(-1) ?? "";
  return repositoryName.endsWith(".github.io") ? "/" : `/${repositoryName}/`;
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
  },
});
