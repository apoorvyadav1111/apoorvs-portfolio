---
title: Who's nearby? Designing a simplified live location service
date: 2026-07-24
summary: Inspired by Waze — indexing millions of moving drivers with Redis GEO, sharding by geohash prefix, and splitting the write path from the read path.
tags: [system-design, algorithms, redis]
original: https://lnkd.in/p/g3AUQAGU
---

The Waze app UI got me curious recently. Seeing so many nearby drivers moving in real time made me stop and think: "How would I build something like this?"
That question led me down the rabbit hole of designing a simplified live location service.
The core challenge is answering "Who's nearby?" while handling a massive number of location updates efficiently.
My current design uses Redis GEO to index driver locations and geohash prefixes to partition data across Redis shards. Driver metadata, such as the latest location, geohash, and last seen timestamp, is stored alongside the spatial index. I also separated the write path (LocationService) from the read path (NearbyService) so they can scale independently as traffic grows.
Using geohashes means a nearby search only needs to query a handful of relevant partitions instead of scanning every active driver, making the system much more scalable.
This is definitely a naive, but good-enough solution for the problem. Working through it helped me think about tradeoffs like partitioning, eventual consistency, stale location cleanup, and scaling to millions of location updates. There are plenty of ways this design could be improved, including introducing async updates, and that's exactly what makes system design so interesting.
I'm still learning, so if you've built something similar or see a better approach, I'd love to hear your thoughts.

![System design diagram for a live location service. Clients identified by JWT or device ID send POST /location on a location change or every ~30 seconds while the app is active, and GET /nearby every few seconds, through a load balancer and API gateway. Capacity notes: 10M active users, one request every 5 seconds on average, 2M requests per second, 10K per gateway, about 200 servers at peak, distributed globally. Multiple LocationService instances write to Redis, which is sharded by geohash prefix: lat/long go in a Redis GEO index, each user's metadata (lat, long, geoprefix, last seen) in a hash, and last-seen timestamps in a sorted set. Multiple NearbyService instances look up the user's geo prefix and return GEORADIUS results. A cleanup service reads the sorted set and deletes stale drivers asynchronously.](/blog/live-location-service-design.webp)
