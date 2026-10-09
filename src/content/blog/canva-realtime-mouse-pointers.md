---
title: WebSockets vs WebRTC: lessons from Canva's real-time mouse pointers
date: 2026-02-25
summary: Canva's live cursors started on WebSockets and Redis, then moved to peer-to-peer WebRTC when 60 updates per second made server round-trips too costly.
tags: [system-design, distributed-systems, webrtc, websockets]
original: https://lnkd.in/p/g4A7Fpeq
---

I was reading through a case study from Canva on how they built real-time mouse pointers for their whiteboard and scaled it to 1M users. It is a great example of evolving architecture with scale.
They first used WebSockets with Redis. Every mouse move went through the backend, which handled routing and reliability. This setup scaled to hundreds of thousands of users and worked very well for controlled real-time collaboration.
But when they wanted smoother motion at up to 60 updates per second, the server round-trip became expensive and added latency.
So they moved to WebRTC. Browsers sent pointer updates directly to each other (mesh). This reduced backend load, lowered latency, and improved the real-time feel.
My takeaway is this: WebSockets are powerful for building reliable real-time systems at scale. But when ultra-low latency and very high frequency updates matter, WebRTC and peer-to-peer architecture can unlock a different level of performance.

## References

- [Real-time mouse pointers](https://www.canva.dev/blog/engineering/realtime-mouse-pointers/) — Canva Engineering
