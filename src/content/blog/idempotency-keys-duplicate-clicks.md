---
title: Five clicks, one email: deduplicating requests with idempotency keys
date: 2026-08-04
summary: Clicking "send receipt" five times shouldn't send five emails. A TTL-based idempotency key in Redis can dedup requests before they're enqueued.
tags: [system-design, algorithms, redis]
original: https://lnkd.in/p/gcHtUNmY
---

One small UI interaction got me thinking about backend design today.

Recently clicked on a button multiple times to send a receipt to email. A production system shouldn't generate five PDFs and send five emails. It is bad UX and a bad way to hit email quotas, be marked as spam, and put the system under load. A way to deduplicate unintentional requests from a user needs to be put in place to ensure we take care of this scenario. A possible solution to this would be to use Redis with a TTL-based idempotency key to dedup the requests before enqueueing them.

![Flow diagram: the user requests a document via email N times through the API Gateway to DocumentService. DocumentService runs SET send_pdf:{userId}:{docId} NX EX 60 in Redis and enqueues a send_pdf job only if the key did not exist. SendPDFWorkers pull from the job queue and send the email asynchronously.](/blog/idempotency-keys-flow.webp)
