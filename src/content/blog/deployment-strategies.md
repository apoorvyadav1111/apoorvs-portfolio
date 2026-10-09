---
title: Deployment strategies every developer should know
date: 2025-12-17
summary: Rolling, blue-green, canary and recreate deployments — how each works and what you trade off for it.
tags: [devops, system-design]
original: https://lnkd.in/p/gdHTNGpW
---

As software developers, we often focus on writing features and fixing bugs. But one thing that’s equally important is understanding how our code is deployed. The strategy your team uses can greatly impact user experience, write code, reliability, and even how you debug issues.
Here are a few common deployment strategies and their trade-offs:

1. **Rolling Deployment**
   Updates instances gradually, one by one.
   - **Pros:** No downtime
   - **Cons:** Different users may see different versions temporarily
2. **Blue-Green Deployment**
   Maintains two environments: one live, one new. Traffic is switched to the new environment instantly.
   - **Pros:** Fast rollback if something goes wrong
   - **Cons:** Higher infrastructure cost
3. **Canary Deployment**
   Releases changes to a small subset of users first. e.g: 10% traffic to new, rest to old
   - **Pros:** Detect issues early
   - **Cons:** Requires strong monitoring and metrics, changes need to be backward compatible
4. **Recreate Deployment**
   Stops the old version and starts the new one.
   - **Pros:** Simple to implement
   - **Cons:** Causes downtime

Knowing these strategies helps developers write safer code, plan for rollbacks, and work more effectively with operations teams.
