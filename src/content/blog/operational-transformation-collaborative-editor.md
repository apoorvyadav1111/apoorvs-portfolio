---
title: Building a collaborative text editor to understand Operational Transformation
date: 2025-11-07
summary: How do Google Docs and Notion keep everyone's edits consistent? I built a small Node.js + WebSockets editor to see Operational Transformation in action.
tags: [algorithms, system-design, real-time]
original: https://lnkd.in/p/gf_SskXD
---

Real-time collaboration looks simple, but behind tools like Google Docs or Notion is a surprisingly hard problem: multiple users editing the same text at the same time. Networks introduce delay, operations arrive out of order, and systems still need to produce a consistent result. Operational Transformation is one of the core techniques that makes this possible.

To understand it properly, I built a small collaborative text editor. A Node.js server, WebSockets, and two browser clients sharing the same document. Every keystroke is turned into an insert or delete operation, transformed against past operations, and broadcast back to all clients. The editor only updates after the server confirms the final, conflict-free version.

Seeing it work in real time made OT much clearer and less abstract. The next step is exploring how to extend this into rich text, and then diving deeper into CRDTs, another powerful approach to collaborative editing.
