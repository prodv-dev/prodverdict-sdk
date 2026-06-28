# ProdVerdict agent skills

Thin Cursor agent skills for setup and pre-PR verification. Deterministic production contract checks — no LLM in the evaluation path.

## Skills

| Skill | Use when |
| ----- | -------- |
| `prodverdict-setup` | User asks to set up or install ProdVerdict |
| `prodverdict-verify` | User asks to verify before PR or run contract checks |

## Global install (Cursor)

```bash
npx skills add prodv-dev/prodverdict-sdk@prodverdict-setup -g -y
npx skills add prodv-dev/prodverdict-sdk@prodverdict-verify -g -y
```

Browse the skills ecosystem: https://skills.sh/

## Project install (automatic)

`npx prodverdict setup --yes` copies both skills into `.cursor/skills/` for the whole team.

Skip with `--skip-skills`.

## Docs

https://prodverdict.com/docs/agents/skills
