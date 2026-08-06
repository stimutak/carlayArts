# Implementation checkpoints

The branch uses small, reversible commits. Each checkpoint must build and pass its
focused tests before later lanes are integrated.

| Checkpoint | Scope | Commit |
|---|---|---|
| Foundation | Astro, schema, routes, shared navigation, review register | `20a7bd3` |
| Story and client handoff | Artist/contact placeholders and client-needs route | `1444ade` |
| Demo commerce | Fail-closed cart, demo checkout and confirmation | `767056b` |
| Gallery | Homepage, catalog filters, artwork detail and media inspection | `0488b98` |
| Integration and hardening | Shared chrome, browser journeys, accessibility and final QA | Pending |

Never combine live-payment activation or owner factual approval with an implementation
checkpoint. Those changes require their own explicit approval and evidence.
