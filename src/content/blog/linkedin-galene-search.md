---
title: How LinkedIn rebuilt search with Galene
date: 2025-09-13
summary: LinkedIn replaced a patchwork of Lucene, Zoie and Sensei with Galene — offline Hadoop index builds, live field-level updates and pluggable relevance, on a third of the hardware.
tags: [search, distributed-systems, system-design]
original: https://lnkd.in/p/gtz-kcFF
---

Do you know how LinkedIn supports searches across hundreds of millions of profiles in real time?

I continued my journey on search systems and came across LinkedIn’s engineering blog on Galene, their in-house search architecture, and it made me rethink what it really takes to build search at scale.

Before Galene, LinkedIn had stitched together different systems—Lucene for indexing, Zoie and Sensei for real-time updates, and more. It worked for a while, but as the network grew, the patchwork became harder to manage. Something as simple as updating one field in a member’s profile could turn into a complex operation.

That’s where Galene came in. Instead of just patching the old system, LinkedIn rebuilt search from the ground up:

- They designed indexing pipelines on Hadoop for consistent offline builds.
- They enabled true live updates at the field level, removing the need for extra storage layers.
- They made relevance tuning pluggable, so engineers could focus on making search results better rather than fighting infrastructure.

The result? Faster, more reliable search with only one-third of the hardware.

It's a long read but if you love reading about systems, I have posted the link in the comments.

## References

- [Did you mean "Galene"? Introducing LinkedIn's new search architecture](https://engineering.linkedin.com/search/did-you-mean-galene) — LinkedIn Engineering
