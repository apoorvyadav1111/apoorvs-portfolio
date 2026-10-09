---
title: How do you ensure an email is safe? SPF, DKIM and DMARC from first principles
date: 2026-05-26
summary: Solving email spoofing from scratch takes a registry, a verification code and an authenticity check — which is exactly what SPF, DKIM and DMARC do.
tags: [security, networking, system-design]
original: https://lnkd.in/p/gNKdetkB
---

How do you ensure that an email is safe?
I was recently mapping out how I would solve email spoofing from scratch, and it came down to three steps:

1. **A Master Registry:** Every major corporation registers their official identity.
2. **A Unique Verification Code:** Every time a company sends a legitimate email, their system generates a unique verification number and attaches it to the message.
3. **The Authenticity Check:** The receiving mailbox checks that number against the registry to prove the email is real.

If you look under the hood of modern email security, it relies heavily on three massive protocols to fight phishing and spoofing: SPF, DKIM, and DMARC.
When you look at the actual internet implementation, it maps to this logic perfectly:

- 🔹 **SPF** acts as the Master Registry. It's a public DNS record where a company lists the exact server IP addresses authorized to send their mail.
- 🔹 **DKIM** is the Unique Verification Code. It uses cryptographic keys to stamp a digital signature onto the email header. If an attacker tampers with the message or tries to fake it, the code doesn't match.
- 🔹 **DMARC** is the Check & Enforcement. It tells major providers like Gmail or Outlook exactly what to do if an email fails those tests (like throwing it straight into the spam folder).

The enterprise infrastructure of the internet can look incredibly intimidating from the outside. But more often than not, it’s just a highly scaled version of the exact same common-sense logic we use to solve everyday problems.
