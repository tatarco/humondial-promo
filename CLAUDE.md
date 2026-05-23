# Humondial Promo — Claude instructions

## Knowledge graph (Graphify)

This repo keeps a Graphify graph under `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, optional `wiki/`).

- When `graphify-out/graph.json` exists, answer codebase or architecture questions from the repo root with `graphify query "<question>"`, or narrow with `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`.
- If `graphify-out/wiki/index.md` exists, use it as the index before scattering reads across raw files.
- Read `GRAPH_REPORT.md` mainly for broad orientation or when those CLI passes need more breadth.
- After changing code files, run `graphify update .` here to refresh the graph (AST-only, no billed API usage).

`/graphify` invokes the Claude graphify skill when the user runs that trigger.
