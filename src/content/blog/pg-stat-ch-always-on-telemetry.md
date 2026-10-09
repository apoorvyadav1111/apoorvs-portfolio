---
title: Lessons from pg_stat_ch on building always-on, low-latency telemetry
date: 2026-02-20
summary: Streaming every Postgres query into ClickHouse without slowing Postgres down — minimize the hot path, decouple heavy work, drop data before hurting users, and engineer for contention.
tags: [postgresql, system-design, observability]
original: https://lnkd.in/p/geJcxeCF
---

Reading about #pg_stat_ch (which streams every Postgres query into ClickHouse) got me thinking about a broader system design lesson:
What if we applied the same ideas to a different problem with similar constraints? I learnt the following for designing systems that must always be on and latency-sensitive.

1. **Minimize the "Hot Path":** On every query, it performs a simple memcpy into a shared-memory ring buffer, just captures the data, and moves on.
2. **Decouple Ingestion from Heavy work:** Postgres handles the recording, while ClickHouse handles the heavy lifting (aggregations, percentiles, and storage). The OLTP system stays focused on traffic.
3. **Data Loss over User Impact:** There is no back-pressure. If the buffer overflows, events are dropped. Observability should observe, never obstruct.
4. **Engineer for contention:** Careful cache-line separation, atomic counters, batching, and try-lock patterns reduce lock amplification under high concurrency. Reducing contention using a small per-process buffer led to a 5x reduction!

When building telemetry, optimize for availability and minimal interference first. Overall, a nice read to learn about systems.

## References

- [pg_stat_ch: a PostgreSQL extension that exports every metric to ClickHouse](https://clickhouse.com/blog/pg_stat_ch-postgres-extension-stats-to-clickhouse#decision-4-minimize-lock-contention) — ClickHouse
