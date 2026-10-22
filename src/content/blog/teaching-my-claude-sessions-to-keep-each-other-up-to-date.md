---
title: Teaching my Claude sessions to keep each other up to date
date: 2026-10-22
summary: I kept repeating myself to every Claude chat I had open, so I built parley, a small ledger that sends each update only to the sessions it affects.
tags: [ai, system-design]
draft: true
---

I usually have several Claude Code chats open, each on one track of a bigger effort. None of them knows what the others know. A date would move in one chat, and another would keep planning around the old one until I re-explained it or Claude went searching through files.

So I built parley with Claude Code. Each chat publishes a short card saying what it works on. When something changes, Claude reads the cards and sends the update only to the chats it affects, through an append-only log that hooks deliver before every prompt. Each message says how much it matters and whether I asked for it to be sent or Claude inferred it, and the receiving chat decides what to do with it.

What I learned along the way:

**Put the rules in code and leave judgment to the model.** Who owns an inbox, which messages can be urgent, and when one session may wake another are all enforced by the script. The model only decides what is relevant.

**Treat messages between agents as data, not instructions.** Every message arrives labelled as information from another session. Anything risky still needs my approval.

**Identity is harder than it looks.** One chat went quiet because the app had started a new session for it with a new ID. parley thought it was a stranger. Now it recognises the chat itself, and still never lets a different chat inherit an inbox.

**Ask "who does this help?", not "is this allowed?".** One chat broadcast a useful update to everyone, including chats it had nothing to do with. Now an inferred message has to name its recipients and say why.

**Privacy needs a lock, not a request.** A rule in the prompt only works if the model read it. Sealed chats are blocked from sending or receiving by the script itself.

**Name things so the model can't mix them up.** Commands called `read`, `who` and `log` collide with the shell. They became `collect`, `roster` and `ledger`.

It's open source on [GitHub](https://github.com/apoorvyadav1111/parley), with 40 unit tests and model-behaviour evals.

## References

- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic
- [Cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging) — Claude Code docs
- [Hooks reference](https://code.claude.com/docs/en/hooks) — Claude Code docs
- [Prompt injection](https://simonwillison.net/series/prompt-injection/) — Simon Willison
- [Similar project] [claude-code-session-bridge](https://github.com/PatilShreyas/claude-code-session-bridge) — Shreyas Patil
