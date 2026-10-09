---
title: HyperLogLog: counting unique items with coin flips
date: 2026-08-19
summary: How many unique items are in a dataset? HyperLogLog estimates it from how rare a hashed pattern is — Redis does it in 12 KB with ~0.81% error.
tags: [algorithms, data-structures, system-design]
original: https://lnkd.in/p/gJTnprF5
---

Bloom filters are an amazing data structure when you need to answer one question with very little memory:
“Is this element definitely NOT in my dataset?”
The tradeoff is that a Bloom filter can never guarantee that an element exists. It can only tell us that it might exist.

There is another data structure that solves a common but interesting problem efficiently: How many unique items are in a dataset? HyperLogLog comes into the picture.

The intuition is that rare events tell us something about how many events have occurred.

If I tell you I flipped a coin and got 3 heads in a row, you’d assume I made several attempts. If I got 10 heads in a row, you’d assume I made far more (even more than 1000).

HLL applies this idea using hashed binary representations and the position of the first 1 (or equivalently, the number of leading/trailing zeros). The rarer the pattern we observe, the larger the estimated cardinality.

**Example:**
One approach is to hash the user ID of a user who visited a page, which might yield a binary string like `1110000`.
We can use the number of consecutive zeros to estimate the cardinality of the dataset. For example, seeing a pattern with 5 consecutive zeros could suggest a cardinality around 32.
However, this could be an outlier, the user was the first person to watch the video.
To improve the approximation, we can use multiple buckets and combine the estimates from each bucket. For example, the first 3 bits can determine the bucket (m = 8), while the remaining bits are used to estimate the rarity of the event.
By combining the estimates across all 8 buckets, we get a much more reliable approximation of the total number of unique users.

That’s where HLL’s multiple registers come in. We distribute observations across buckets and combine their estimates to get a much more reliable approximation.

Redis’s implementation takes this idea further, achieving an error rate of roughly 0.81% using only 12 KB of memory.
For 1M unique values, that’s a pretty incredible tradeoff: approximate accuracy in exchange for dramatically lower memory usage.

I find these very interesting, and the articles I used are very easy to understand. I have shared them in the comments.

## References

- [The coin flip example] [Redis new data structure: the HyperLogLog](https://antirez.com/news/75) — antirez
- [Meta's blog for HLL] [HyperLogLog in Presto: A significantly faster way to handle cardinality estimation](https://engineering.fb.com/2018/12/13/data-infrastructure/hyperloglog/) — Meta Engineering
