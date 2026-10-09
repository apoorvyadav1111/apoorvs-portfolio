---
title: How "restaurants near me" is instant: Geohash and S2 geospatial indexing
date: 2025-09-07
summary: Food apps find nearby places in a blink by dividing the Earth into cells. Geohash shares prefixes between neighbors; Google's S2 refines it with near-equal cells worldwide.
tags: [system-design, algorithms, data-structures, geospatial]
original: https://lnkd.in/p/gwADWsdX
---

When we open a food app and search for restaurants nearby, within a blink, we see ten options around us. Behind that speed is geospatial indexing.

If the system had to check every restaurant in the database one by one, the response would take forever. Instead, it organizes the Earth into cells so “nearby” searches become efficient.

One classic approach is Geohash, which encodes latitude and longitude into a short string. Places that are close together share the same prefix, so finding neighbors is as simple as looking in that cell and a few around it.

Google’s S2 Geometry refined this idea for global scale. It divides the planet into nearly equal-sized cells, avoiding distortions near the poles, and gives each cell a unique identifier. That consistency makes it possible to expand outward until enough nearby results are found quickly.

This is why location-based apps feel instant and reliable.

If you would like to read more about these, I have shared articles in the comments.

## References

- [S2 Cells](http://s2geometry.io/devguide/s2cell_hierarchy) — S2 Geometry
- [Geohashes](https://www.ibm.com/docs/en/streams/4.3.0?topic=334-geohashes) — IBM Streams documentation
