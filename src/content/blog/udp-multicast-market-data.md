---
title: How stock exchanges push millions of market updates with UDP multicast
date: 2025-10-21
summary: Why exchanges trade TCP's guarantees for UDP's speed, and how multicast sends one market update to every subscriber at once.
tags: [system-design, networking, algorithms]
original: https://lnkd.in/p/gj5pTeHZ
---

I’ve always been curious about how stock exchanges manage to process and distribute millions of real-time updates so quickly.
Brokerage firms and exchanges deal with an immense volume of market data updates, millions of price changes, quotes, and orders every second. For this information to reach millions of trading devices globally in real-time, the lowest possible latency is non-negotiable.
Unlike TCP, UDP is a connectionless protocol, meaning it doesn't establish a handshake or guarantee delivery. While this sounds risky, it eliminates critical overhead, making it significantly faster.
Financial institutions leverage a highly efficient variation, UDP Multicast. This allows a single data packet (the market update) to be sent once from the source to a dedicated network address, where it is instantly replicated and forwarded to all subscribing clients.
Crucially, this low-latency distribution is just one piece of the technology puzzle. The incredible speed also relies on co-location, specialized hardware and software.
