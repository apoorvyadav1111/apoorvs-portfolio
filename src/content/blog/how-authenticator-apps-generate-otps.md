---
title: How authenticator apps generate the same OTP without communicating
date: 2026-08-24
summary: Your phone and the server produce the same 6-digit code without talking to each other — even offline. Here's the math behind TOTP.
tags: [system-design, algorithms, security]
original: https://lnkd.in/p/gkey_NNp
---

I was thinking about how Authenticator-based 2FA can generate the same OTP on both the phone and the server without communicating. They can do so even when the phone has no network connection. There is pure mathematics behind this:

Suppose we have a deterministic function:

```text
f(x) → OTP
```

If both parties know the value of `x` to be used, they can independently generate the same OTP.

But how do we decide x without communicating? We can use timestamps.

The problem is that everyone knows the time, so anyone could calculate the OTP. That would not be very safe, and everyone would have the same OTPs.

We need something only the server and user know: a shared secret.
So we can think of it as:

```text
new_x = g(current_time, secret)
```

Then:

```text
OTP = f(new_x)
```

In the real implementation, `g()` is essentially HMAC.

HMAC takes two things:

```text
HMAC(secret, current_time) → cryptographic hash
```

The secret acts as the key, while the current time is the message. The result is a seemingly random fixed-length value that can only be reproduced by someone who knows the secret. We share the secret with both parties while setting up the authenticator app.

For example:

```text
secret = S
time = T
```

Both the phone and server independently calculate:

```text
HMAC(S, T) → 160-bit value (with HMAC-SHA1)
```

TOTP then dynamically truncates this value and converts it into a 6-digit number:

```text
160-bit HMAC
→ dynamic truncation
→ 31-bit integer
→ % 1,000,000 (last 6 digits)
→ 6-digit OTP
```

What I find interesting is that there is no communication required when the OTP is generated. The phone and server simply have the same secret and the same time window, so they independently arrive at the same answer.
And because the secret is never exposed, knowing the current time isn't enough to generate the OTP.
