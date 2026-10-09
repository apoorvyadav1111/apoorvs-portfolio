---
title: DoorDash's in-house search engine, and what I learned about BM25
date: 2025-08-23
summary: DoorDash replaced Elasticsearch with a Lucene-based engine for 50% lower p99.9 latency and 75% lower hardware cost — and building my own Lucene app taught me how BM25 improves on tf-idf.
tags: [search, system-design]
original: https://lnkd.in/p/gfUu58En
---

Just read DoorDash’s blog on their journey to building a scalable, in-house search engine.

DoorDash migrated from Elasticsearch to a custom solution built on Apache Lucene to address scaling challenges, support complex document relationships, and enable advanced query planning. Their architecture separates indexing and searching for easier scalability. After migrating to their new search engine, DoorDash achieved a 50% p99.9 latency reduction and a 75% decrease in hardware costs.

Inspired by their blog, I experimented with Lucene to build my own search app. During this process, I learned about the BM25 scoring algorithm, which Lucene uses by default. BM25 improves upon tf-idf by introducing term saturation (so repeated terms don’t disproportionately affect scores) and document length normalization (so longer documents aren’t unfairly penalized or favored). These enhancements help deliver more relevant search results.

I highly recommend reading the DoorDash blog for anyone interested in modern search architectures.

Link in the comment.

## References

- [Introducing DoorDash’s in-house search engine](https://careersatdoordash.com/blog/introducing-doordashs-in-house-search-engine/) — DoorDash Engineering
- [lucune-search-basics](https://github.com/apoorvyadav1111/lucune-search-basics) — my Lucene search example on GitHub
