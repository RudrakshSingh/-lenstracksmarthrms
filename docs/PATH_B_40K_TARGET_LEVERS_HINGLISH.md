# Path B ko aur tight karke ~40k/month target (Hinglish)

**Context:** Base bill reference tumhare docs me ~INR 1,18,755/month.  
**Goal:** Path B style (heavy rewrite nahi, lean ops + consolidation) ke saath cost **~40k** ke kareeb lana.

---

## Extra levers (pura table wala content, bina table ke)

**Hard EKS floor** — Matlab compute ko consciously floor par lao: jaise **3–4 x t3.medium** (ya jahan vCPU/RAM fit ho wahan aur chhota instance family). Non-core workload ko band karo ya scale-down. Isse needle isliye hilta hai kyunki compute aapke bill ka **sabse bada** fixed block hota hai.

**Strict “Lenstrack core only” runtime** — Matlab prod me sirf wahi services 24×7 chalao jo business ke liye zaroori hain: **auth, HR, attendance, gateway**, aur jo bhi sach me lazmi ho. Baaki ko scale-to-zero karo ya prod se hata do. Isse kam pods bante hain, isliye kam nodes chahiye aur internal/NAT chatter bhi kam hota hai.

**Single ingress path** — Matlab north-south traffic ke liye **ek clear path** rakho, ideally **ek ALB** jahan possible ho. Jo NLB/ALB redundant hai aur safely hata sakte ho, wahan cleanup. Isse LB ka hourly/fix aur LCU/data processing dono kam ho sakte hain.

**NAT attack** — Matlab NAT se guzarnewala useless egress kam karo: AWS APIs ke liye **VPC endpoints**, image pulls / telemetry / polling jitna ho sake utna lean, aur bahar ki duniya ko zarurat se zyada mat chedo. NAT ka **hourly + per-GB processing** bill me aksar bada chunk hota hai, isliye yahan savings real milti hai.

**DocDB down aggressively** — Matlab 7-day / 30-day metrics dekh ke **smallest viable class** pe aao jahan CPU, connections, latency safe ho. Storage aur IO bhi disciplined rakho. DB spend usually compute ke baad **doosra bada** block hota hai.

**Non-prod / dev** — Matlab dev/stage ko **24×7 same account par expensive footprint** mat chalao. Band karo, schedule karo, ya alag isolate karo. Bahut teams ki bill me **chhupa hua 20–30%** yahi se aata hai.

**Spot mix + Savings Plan** — Matlab jab consolidation stable ho jaye, non-critical tier pe **Spot** socho aur jo baseline steady rehta hai us par **Compute Savings Plan**. Isse jo compute reh jata hai us par discount lag jata hai.

**Important:** ~40k ke liye aksar in me se **2–3 strong moves** (hard floor, core-only, aur NAT/LB/DocDB me se koi do) **must** hote hain. Agar ye materially nahi hote, to EKS + DocDB + NAT + LB wale footprint pe **40k optimistic** lagta hai.

---

## Realistic bracket (“Path B + aggressive caps”)

Discipline ke saath pehla honest milestone ~**INR 45k–55k**/month maan ke chalo.

~**40k** tab realistic lagta hai jab nodes **sach me low** ho jaen (jaise **≤4**) aur **peak pe bhi stable** rahen, **NAT + LB lean** ho, **DocDB materially chhota** ho, aur **sirf core services** hi 24×7 chal rahe hon.

Agar nodes, DB, ya NAT ko materially shrink nahi kar sakte, to is footprint pe **40k** ke liye **bada architecture change** ya **DB tier shift** zyada realistic option ban jata hai.

---

## Tradeoffs (~40k pe)

Traffic spike aur deploy churn ke liye **kam headroom** milega. SLOs **tighter** ho jate hain — incident ka user impact zyada dikhai de sakta hai. **Staging ko prod jaisa expensive mat banao**, warna **40k sustainable nahi** rahega.

---

## Practical framing

Pehla target **45k–48k** run-rate rakho; jab metrics OK hon tab hi **40k** tak squeeze karo.

Tumhare **30k plan** me already hai: **30k** ke liye architecture **bahut aggressively** simplify karna padta hai. **40k** unke aur “normal Path B ceiling” (~53k–71k) ke **beech** me hai — **doable** hai, lekin “sirf light Path B” se nahi; **aggressive caps** chahiye.

---

## One-line summary

**40k = Path B + hard limits (compute floor, core-only prod, lean network + DB) + non-prod discipline + optional Spot/SP; warna 45k–55k zyada honest first target hai.**
