---
title: CAP in the wild: how Stripe recalculates billing metrics without going offline
date: 2026-08-14
summary: When a customer changes their MRR definition, Stripe recomputes years of history while new events keep arriving — choosing availability over immediate consistency.
tags: [distributed-systems, system-design, streaming]
original: https://lnkd.in/p/g9dD_9eR
---

I have always studied concepts like the CAP theorem in distributed systems, but I find it more interesting when you see those ideas show up in real systems.

I was reading Stripe’s engineering blog post on their real-time Billing analytics using Apache Flink. One of the key challenges was to handle changing metric definitions without taking the system offline.

When a customer changes something like their MRR definition, Stripe needs to recalculate the state using years of historical data while new events continue arriving in real time.

Instead of stopping the pipeline, they process the historical recalculation separately and temporarily buffer incoming events in the meantime. Once they update the historical state, and then replay those events using the new definition.

In this case, availability is prioritized over immediate consistency. Users can continue using the Dashboard while the system works toward a consistent view, rather than taking the system offline during recalculation.

I am looking for similar blogs/ newsletters / substack to read every other day. If you have recommendations, please share in the comments and I can check them out.

## References

- [How we built it: Real-time analytics for Stripe Billing](https://stripe.dev/blog/how-we-built-it-real-time-analytics-for-stripe-billing) — Stripe
