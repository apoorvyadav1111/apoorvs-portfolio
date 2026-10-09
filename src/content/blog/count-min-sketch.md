---
title: Count-Min Sketch: counting billions of events without storing them
date: 2026-09-16
summary: How do you count billions of events without storing billions of records? A small 2D array of counters and a few hash functions.
tags: [data-structures, probabilistic, system-design]
original: https://lnkd.in/p/gW6-sszk
---

I have read and shared about Bloom Filters and HLL, but now the next questions comes to mind is: **how do you count billions of events without storing billions of records?**

With millions of unique items and massive traffic, maintaining exact counts can consume significant memory.

Meet **Count-Min Sketch**. Similar to how we work with Bloom filters, it maintains a small 2D array of counters.

For every incoming item, multiple hash functions map it to one counter in each row, and those counters are incremented. When retrieving the count for an item, we get the hash values for each function and get the counter values. To tackle the problem of hash collisions, we look at its counters across all rows and take the minimum. Because collisions can only increase a counter, never decrease it. Therefore, the count we get is a definite frequency rather than an overestimation.

So Count-Min Sketch gives us:

- Low memory
- Fast updates
- Approximate frequency counts

The trade-off: sacrifice exactness to handle massive data efficiently.

That's the core idea behind Count-Min Sketch.
