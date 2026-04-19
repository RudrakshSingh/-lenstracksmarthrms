# Payroll start — “Completed when…” + kya chahiye (Vaibhav Sir / leadership)

Short definitions: har point **kab complete maana jaye**, aur use complete karne ke liye **kya inputs / dependencies** chahiye.

---

## 1) Employee master final freeze (active employees, DOJ/DOL, department/designation)

**Completed when…**  
- Payroll month ke liye jo employees run mein aayenge, unka **HR master** change nahi ho raha (naye add / exit / transfer / designation change **freeze** window ke baad band).  
- Har active employee ke liye **DOJ**, **exit/DOL** (agar applicable), **department**, **designation** ek clear final value par locked hai — aur payroll team ne **list sign-off** kar di hai.

**Iske liye kya chahiye**  
- Final employee list (payroll month scope) + koi bhi open correction **deadline se pehle** close.  
- HR policy: freeze window dates aur exception process (agar koi change zaroori ho).

---

## 2) Payroll month attendance and leave freeze (present/absent, leave approvals, LOP)

**Completed when…**  
- Chosen month ke liye **attendance + approved leaves + LOP / unpaid** decisions final hain — koi pending approval ya disputed day **payroll cut-off** ke baad open nahi.  
- Payroll ke inputs ke liye **paid days / LOP days** ek agreed number par aa chuke hain.

**Iske liye kya chahiye**  
- Attendance cut-off date, leave approval SLA, aur **LOP** rule (kis basis par).  
- Store/manager side se **pending approvals** zero (ya formally waived).

---

## 3) Salary structure validation complete (CTC breakup, allowances, deductions, statutory flags)

**Completed when…**  
- Har eligible employee ke liye **CTC / salary structure** system mein validate ho chuka hai: **allowances, deductions, PF / ESIC / PT / TDS** flags aur amounts **business rules** se match karte hain.  
- Spot checks + exceptions (new joiner, revision mid-month) **documented** aur payroll mein reflect ho chuke hain.

**Iske liye kya chahiye**  
- Approved salary policy / revision letters jahan applicable.  
- Payroll + HR ek **validation checklist** (sample employees + edge cases).

---

## 4) Payroll cycle initiate and monthly records generate

**Completed when…**  
- Payroll **cycle** chosen month ke liye **initiate** ho chuka hai aur **monthly payroll records** generate ho chuke hain (system mein expected employees cover, obvious data gaps flagged).  
- Generation ke baad **exception report** (missing salary, zero pay, negative, etc.) **reviewed** hai.

**Iske liye kya chahiye**  
- Technical: payroll service access, correct **month/year**, tenant context, aur APIs / UI flow per org process.  
- Business: **who runs** generation aur **who approves** moving to next step.

---

## 5) HR and Accounts approval completion before payroll lock

**Completed when…**  
- **HR** ne payroll draft / summary **approve** kar di hai (headcount, gross, statutory summary acceptable).  
- **Accounts** ne **financial correctness + statutory** angle se **approve** kar di hai — **lock** se pehle written / tool-based sign-off.

**Iske liye kya chahiye**  
- Clear approval matrix (HR vs Accounts vs management).  
- Ek shared **summary view** (Excel / dashboard / export) jis par sign-off hota hai.

---

## 6) Payroll posting to finance and reconciliation match confirmation

**Completed when…**  
- Payroll totals **finance** mein post ho chuke hain (jis process se org follow karta hai) aur **reconciliation** pass ho gayi: payroll payable / expense lines **finance** ke saath **match** (defined tolerance ke andar).  
- Mismatch ho to **root cause + adjustment** record ho chuka hai.

**Iske liye kya chahiye**  
- Finance chart / GL mapping, expense categories, aur **reconcile** karne wala report (payroll vs finance).  
- Finance + payroll **joint sign-off** on match.

---

## 7) One dry run + sample payslip validation + final go-live sign-off

**Completed when…**  
- Kam se kam **ek dry run** (test month / subset / copy) complete ho chuka hai — **sample payslips** (different roles) **manually checked** (earnings, deductions, net pay, statutory).  
- **Final go-live** ke liye **authorised signatory** ne approve kar diya hai — production payroll run **allowed**.

**Iske liye kya chahiye**  
- Dry-run scope (full vs pilot), test data rules, aur **who signs** go-live.  
- User acceptance criteria: **3–5 sample profiles** (e.g. new joiner, full month, LOP, high deduction).

---

## Ek line summary (7/7 “complete” kab?)

Jab **master + attendance/leave + salary validation** lock ho, **cycle generate + dual approval + finance match** ho, aur **dry run + payslip check + final sign-off** ho — tab payroll start / go-live **complete** maana jaye.

---

*Internal use — Lenstrack / Etelios payroll process. Adjust names (HR/Accounts) to your org.*
