---
title: What makes Elasticsearch fast: from Lucene's inverted index to shards
date: 2025-08-31
summary: Lucene's inverted index maps terms to documents; Elasticsearch distributes it with shards and replicas, and refreshes segments every second for near real-time search.
tags: [search, data-structures, distributed-systems]
original: https://lnkd.in/p/g_w_kv3V
---

Ever wondered what makes Elasticsearch so powerful and fast?

I have been reading about different search solutions and found one fascinating article that breaks down the inner workings of Elasticsearch, starting from the ground up: Lucene's inverted index. It's a key-value store that maps terms to documents, allowing for lightning-fast searches.

The article explains how Elasticsearch builds on this core concept, adding a whole new layer of abstraction. While Lucene is a single-node library, Elasticsearch is a distributed system that uses shards and replicas to scale horizontally and provide fault tolerance. This is the secret to handling massive datasets!

Near Real-Time (NRT) search is achieved by regularly flushing in-memory changes to immutable segments on disk, making new documents available for search in seconds, not minutes.

If you would like to learn more about search and Apache Lucene, I have shared the url in the comments.

## References

- [Elasticsearch from the Bottom Up, Part 1](https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up) — Elastic
