# Sounds Like That — Admin User Guide

Admin Studio for **Sounds Like That**: take in music-mix orders, assign producers, finish mixes on MTD, run payroll, and email schedules.

**Who this is for:** Studio admins with **Full access** (edit/send) or **View access** (browse only).

**Main menu:** Dashboard · Orders · MTD · Payroll · Schedule · Producers · Settings

---

## Quick flow

1. **Orders** — make sure data is complete, assign a producer, then **Move to MTD**
2. **MTD** — produce the mix, set pricing/invoice, then **Complete to Payroll**
3. **Payroll** — review payouts, **Mark Paid**, optionally **Send Statements**
4. **Schedule** — check capacity; **Send Schedule** emails producers when needed

---

## Dashboard

At-a-glance pulse for the studio — not where you do day-to-day work. Click a number to jump to the related board.

### Top numbers (KPIs)

| Number | What it means |
|--------|----------------|
| **Unassigned** | Mixes that still need a producer |
| **In Queue** | Producer is set, but the mix start date is still in the future |
| **Today’s Mixes** | Work producers are scheduled for today (including mixes already started) |
| **Outsourced** | Mixes given to outsourced producers |

### Panels

| Panel | What it shows |
|-------|----------------|
| **All team today** | Who’s on the roster today and how full they look |
| **Week capacity** | Each day this week — who’s open vs already full |
| **Music to do** | Open MTD mixes by category (how work is split) |
| **Orders in** | How many new orders arrived over the last 14 days |
| **Mix timeline** | Open mixes by urgency |

### Mix timeline slices

| Slice | Easy meaning |
|-------|----------------|
| **Overdue** | Past the due date — do these first |
| **Start today** | Scheduled to begin today |
| **Due this week** | Due within the next 7 days |
| **Missing data** | Still needs invoice, pricing, or materials |
| **On track** | Dated and fine for now |

---

## Orders

Pre-production board: get orders complete and assigned before Music To Do.

### Forms

| Form | Notes |
|------|--------|
| School/All Star Cheer | Subtypes: All Star Cheer, VIROC, School Cheer, Youth Rec Cheer |
| School/All Star Dance | Subtypes: POM, Hip Hop, Team Performance & Variety, Gameday, Jazz/Kick |
| Marching Band | |
| Sports Entertainment | Magento only — no manual New Order / Match |
| School Anthem | Magento only — no manual New Order / Match |

### Status chips

Combine filters as needed (or leave **All**):

- **All** — everything for the current form  
- **Complete data** — requirements filled  
- **Missing data** — still needs materials/info  
- **Assigned** — has a producer  
- **Not assigned** — needs a producer  
- **Reassign** — old assignment no longer works; pick a new producer (see below)

### Filters & sort

**Form / subtype is the main selection** — pick a form (and subtype when needed) first. **Source** narrows Magento vs Manual. Status chips , Filters, Sort, and Search all apply **inside** the selected form **and** source.

- **Source** — All orders · Form (Magento) · Manual (New Order)  
- **Status chips** — All · Complete data · Missing data · Assigned · Not assigned · Reassign (within form + source; can combine)  
- **Filters** — Package · Mix Length (Cheer) · Split (when that subtype uses it) · Assigned editor · Requested · Date (within form + source)  
- **Sort** — Newest · Oldest · A-Z · Z-A · Package price High/Low · Start date Earliest/Oldest · End date Earliest/Oldest · Days booked More/Less (within form + source)  
- **Search** — coach / contact / program (within form + source)

### Reassign (important)

These rows **must get a new producer**. Assignment and mix dates were cleared. Open **Assign** to fix them.

**From Producers — nothing is silent; confirm in the dialog:**

| Why | What happened | Button |
|-----|----------------|--------|
| **Producer deleted** | Editor removed; assigned mixes cleared first. Blocked until unpaid payroll for that producer is Mark Paid | **Send to reassign & delete** |
| **Category removed** | Producer no longer covers this mix’s category. Blocked while they still have **unpaid payroll** in that category (Mark Paid first). Open assigned mixes in that category go to Reassign when you **Save** | Confirm in the dialog, then **Save** |
| **Work day turned off** | A regular work day with a booked mix was turned off — reassign the mix, or keep that date as an **Extra day** (still booked, no longer a regular work day) | **Send to Reassign** or **Keep as Extra days** |
| **Extra day removed** | An extra day was removed and mixes were booked on it | **Send to Reassign** |
| **Leave / off day** | Off days overlapped booked mixes | **Send to Reassign & add leave** |

**From MTD — you choose it:**

| Why | What happened | Button |
|-----|----------------|--------|
| **Move to Orders (rush)** | Mix sent back so someone else can take it | **Move to Orders** → confirm **Move** |

Check this chip regularly — mixes here are blocked until reassigned.

### Common actions

- **New Order** — create a manual booking (Cheer / Dance / Marching Band only)  
- **Assign** — pick producer and mix dates (manuals can assign even while data is still missing). See **Assign calendar & capacity graph** below  
- **Rush order** — Yes/No on the Orders row (anytime). Stays saved on the order through Assign, Move to MTD, and Complete to Payroll. Shows on the Orders row, in the producer email, and drives rush payout on Payroll (Cheer/Dance rush fee / SE Magento rush). You can still adjust rush/misc on the Payroll tab if needed.  
- **Email customer** — while collection items are still missing (see Email below)  
- **Email producer** — after collection items are complete and a producer is assigned; required before **Move to MTD**  
- **Move to MTD** — send a ready order into Music To Do  
- **Match Orders** — link a Magento form to a manual booking. See **Match Orders** below  
- **Flagged Orders** — resolve multi Music Affiliate holds (not on the main board yet). See **Flagged Orders** below  
- **CSV** — download orders for your current filters (confirm dialog shows what you’re exporting)  
- **Search** — find by coach / contact / program  
- Toggle **collections / Songs / Notes** pills as data arrives  
- Edit form fields; delete when allowed  

### Assign calendar & capacity graph

When you open **Assign** and select a producer:

**Date calendar**

- Only that producer’s **work days** and **Extra days** are pickable  
- **Leave / Off days** show blocked  
- **Already-booked mixes** show as rose colored days; hover/tooltip lists program names and date ranges — you can still select those days  
- Suggested end date follows package working days  

**Producer strip**

- Lists eligible producers for this form/category  
- Shows availability (recommended start, leave, Extra day, at daily limit, etc.)  
- Shows how many open mixes they already have and when they’re booked until  

**Capacity graph** (only if the producer has max mixes/day and/or max cost/day set)

- Title: overlapping days in the chosen mix window where **either** booked cost **or** booked mixes (or both) is **past 50%** of that daily limit — with this mix counted toward the projection  
- Which metric applies (cost, mixes, or both) is whatever daily limit(s) you’ve enabled for that producer under Producers → Schedule and capacity → **Limit**  

- Y-axis: **% of daily limit** (0 / 50 / 100)  
- Per day, up to two bars (only for limits that are on):  
  - **Booked cost** — already-booked $ toward max cost/day  
  - **Booked mixes** — already-booked mix slots toward max mixes/day  
- Bars show **already booked** load; the draft mix is **not** stacked into the bars (its daily share is shown as “Producer cost for current mix: $X/day”)  
- Hover a day for mix names, booked $, mix count, and status  
- Status cues: **Reaching limit** (~80%+) · **Limit full** (~99%+)  
- A day is hidden only if **both** metrics stay under 50% (one metric ≥50% is enough to show)  
- Expand **How previous mixes use daily cost** — each booked mix in range: program, dates, `mix cost ÷ work days = daily share`  
- Mix cost formula (Settings): package price (± compliance) × producer compensation by default; extras (8CS / sheet / vocals / rush / voiceover) are **not** in the day-cap sum  
- Disclaimer: extras excluded; prices can change when edited; completed/payroll mixes not included  

You can still assign when over limit after confirming. Limits come from the producer’s Schedule and capacity → **Limit** tab.

### Email customer

Shown only while the order still has **missing collection items** (or, for unmatched manuals, while the Magento form is still missing). Needs Gmail. Customer To address is typed in manually.

- **Form / matched:** ask for the materials they promised (songs, notes, 8-count sheets, video, mix time, etc.).  
- **Unmatched manual:** the email asks only that they **send in the completed order form** (no songs/notes checklist).

**How collection pills fill (manual ↔ Match)**

- **Mix time** / **CS** — turn green from the mix-time and CS fields you filled on the order (Add / edit). They stay on that booking through Match.  
- **Form** — red until Match; turns green when the Magento form is linked and **stays** on that order after Match.  
- **Songs** / **Notes** — locked until Match; then take values from the Magento form when those fields are filled, and stay on the matched order.

| Situation | Template / copy | How often |
|-----------|-----------------|-----------|
| **Form (Magento) or matched** — first send | Missing-data template: mix coming up; list red collection items | As many times as needed while still missing |
| **Same, after first send** | Incorrect-data / resend template: materials wrong or unusable — resubmit listed items | Resend while still missing (no hard cap) |
| **Unmatched manual** | Wait-on-form template: ask them to submit the Magento / completed order form only (no collection checklist in the email) | As many times as needed until Match |

There is **no mark-as-sent** for customer mail — only a real send stamps the reminder.

### Email producer

Shown when collection items are **complete** and a producer is **assigned**. Uses the producer order template (full order details).

- Must email (or validly mark as sent) for the **current** producer before **Move to MTD**.  
- **Mark as sent** is only for special cases — not first Assign: same producer after a reassign that cleared the stamp, or any return from MTD (**Move to Orders** / leave / etc.), even if a new producer was picked.  
- **What Mark as sent does:** does **not** send email. It records that the current producer was already notified, so **Move to MTD** unlocks the same as after a real send. Use when a reassign didn’t change any details (producer already has what they need).

### Form order flow (Magento)

1. Form imports onto Orders (or **Flagged** first — see below).  
2. Set **Rush order** Yes or No on the row.  
3. If a matching manual booking exists, **Match Orders** to link them (Cheer / Dance / Band only).  
4. Fill / chase **Missing data** → **Email customer** for promised collections.  
5. **Complete data** → **Assign** producer + mix dates.  
6. **Email producer** (or mark as sent when allowed).  
7. Click **Move to MTD**. If this Magento form still has Match suggestions and you never opened **Match Orders**, that click opens a **Possible matches** prompt listing them — open Match to link, or continue / ignore and move without matching.  

Sports Entertainment / School Anthem are Magento-only (no New Order, no Match).

### Manual order flow (New Order)

1. **New Order** (Cheer / Dance / Marching Band). Source = Manual. Form pill stays red until Match.  
2. Save requires **at least 1 real field** from Gym/School/Program, billing address, or Coach / Billing contact — so the row can be suggested for Match later. **Division** and **Team Name** alone do **not** count (nor package / mix length / “First Available” defaults).  
3. You may **Assign** early on the Orders tab (manuals only). Songs / Notes stay **locked** until Match.  
4. On Assign you can set **invoice** here — manuals can’t go to MTD until matched, so invoicing for them starts on Orders. (Pure Magento / form orders invoice on **MTD** instead.) That invoice travels with the booking to MTD and back if the mix is sent to Orders again, even after Match, and you can edit it later on Orders or MTD.  
5. **Email customer** uses the wait-on-form template to ask them to send in the Magento / completed order form (until Match).  
6. **Match Orders** → Magento fields fill in; Form turns green; Songs / Notes unlock.  
7. Then same as a form order: complete pills → producer email → **Move to MTD**.  

**Manual-only rules**

| Rule | Detail |
|------|--------|
| **No Move to MTD until Match** | Unmatched manuals never go to MTD — Match a Magento form first |
| **Songs / Notes locked** | Until Match (“Available after matching a Magento form”) |
| **Form pill** | Red until Match; does not count toward Missing/Complete badges |
| **Invoice on Assign (Orders)** | Manuals only — set on Assign because they can’t reach MTD until Match. Carries to MTD and back after Move to Orders; editable on Orders or MTD anytime. Form/Magento invoices are set on MTD |
| **SE / Anthem** | Cannot create as manual |

### Match Orders

Link an unmatched **Magento form** to an unmatched **manual New Order** (Cheer / Dance / Marching Band only — not SE / Anthem).

**Why manuals need a real field on create**

- New Order won’t save until you fill **at least 1** Gym/School/Program, billing address, or Coach / Billing field.  
- That identity/contact content is what the system uses to **suggest** pairs. Mix-only fields (package, length, division, team name alone) don’t unlock save and don’t drive suggestions.

**How suggestions work**

- Open **Match Orders**: Magento forms on one side, manuals on the other (same form/subtype filters).  
- **Suggested for You** pairs when identity/contact fields are similar enough (~90%+), same form/category:  
  - Gym / school / program / organization name  
  - Billing address  
  - Coach name / phone / email  
  - Billing contact name / email  
  - V!ROC choreographer name / email  
  - Team Name (All-Star / Youth Rec only)  
- Mix Information (package, mix length, requested editor, choreography date, songs, notes, …) is **never** used for pairing.  
- Stronger hits rank higher (Team Name above other identity when both apply). Bell notifications flag new suggested matches.

**What you do**

1. Open **Match Orders** (or follow a suggested-match notification / the **Possible matches** prompt on Move to MTD).  
2. Select a Magento form and a manual (prefer a suggested pair). You can still match a non-suggested pair of the same form/subtype if you’re sure.  
3. Review the compare / **Confirm match** dialog. You can **edit fields here before Confirm**.  
   - Magento form values win when the form has that field filled (they overwrite the manual).  
   - Manual edits you make are kept only when the form’s field is blank.  
   - Edits on the form side (or filling a blank form field) are what land in the final matched order.  
   - Fill any Magento-required gaps the dialog blocks on.  
4. Confirm. Clicking **Move to MTD** with unmatched suggestions opens that prompt — open Match from there **or ignore and move anyway**.  

**What happens after Confirm**

- Manual and Magento are linked; Form pill turns green.  
- Magento fields merge onto the manual booking; Songs / Notes unlock.  
- Continue as a normal order: finish collection items → producer email → **Move to MTD**.  
- Split later (if needed) restores the original manual order.

### Flagged Orders

Hold for Cheer/Dance Magento forms that picked **more than one Music Affiliate** — pricing needs a single affiliate before the order can live on the normal Orders board.

**Who gets flagged**

- Cheer (All-Star / School) and All-Star Dance Magento forms only.  
- **Not** Youth Rec, Marching Band, Sports Entertainment, or School Anthem (no music-affiliate field).  
- Auto-detects when Magento sends a multi-select (comma / multi options).  
- **Exception:** All-Star Dance **Power Music Covers + Unleash the Beats Covers** together is allowed and does **not** flag.  
- Note: Cheer’s single option **“Power Music + Unleash the Beats”** is one affiliate, not a multi.

**What the system does on import**

- Sets the order to Flagged (held) and keeps it **off** the main Orders board.  
- Bell can notify on new flagged rows. View on Flagged is **read-only** — no Assign / Move to MTD / normal edit there.

**What you do**

1. Open **Flagged Orders** (or follow a flagged notification).  
2. **View** the Magento details if you need context (read-only).  
3. Optional: **Email** the customer (Affiliate clarification template) to confirm which affiliate — needs Gmail; pick To contact and the affiliate you’re asking about.  
4. **Resolve** — choose the correct **single** Music Affiliate from the Magento selections → save.  

**What happens after Resolve**

- Chosen affiliate becomes the order’s Music Affiliate.  
- Flag clears; row lands on **Orders** (filtered to that form/subtype).  
- Continue on Orders like any Magento form (collection items → Assign → producer email → Move to MTD). If a Match suggestion exists, open **Match Orders** when you’re ready — Resolve does not auto-navigate there.

### What’s allowed when (quick)

| Action | When |
|--------|------|
| Email customer | While Missing data (form checklist or manual wait-on-form) |
| Email producer | Complete data + assigned producer |
| Move to MTD | Complete + assigned + producer email stamped for current producer; manuals must be Matched |
| Songs / Notes edit | Magento / matched; not unmatched manuals |
| Rush Yes/No | Anytime on the Orders row |
| Match | Manual ↔ Magento (Cheer / Dance / Band) |

### Tips

- Search clears when you leave Orders (sidebar). Use **×** to clear. It won’t come back from session until you search again (Assign “Back” can restore via URL).  
- Searching switches the board to **All** status chips.  
- Status chips are not restored from a previous visit unless the URL has them. Form/subtype are remembered.  
- CSV exports every matching order for the filters (not just the page on screen), up to **5,000** rows.  

---

## MTD (Music To Do)

Active production: assigned mixes being worked, priced, and invoiced.

### Filters & sort

**Form / subtype is the main selection** — pick the form first. Filters, Sort, Search, and Group by producer all apply **inside** that form.

- **Filters** — Package · Mix Length (Cheer) · Split (when that subtype uses it) · Assigned editor · Requested · **Data** (Missing / Complete) · Date  
- **Sort** — Newest · Oldest · A-Z · Z-A · Package price High/Low · Start date Earliest/Oldest · End date Earliest/Oldest · Days booked More/Less  
- **Search** — coach / contact / program (within the selected form)  
- **Group by producer** — optional; clusters rows under each assigned producer (off = sequence order)

### Common actions

- **Pricing** — per mix or pricing reference  
- **Invoice** — set or edit (one mix or bulk)  
- **Status** — **Ongoing** (being worked on) · **Outsourced** (external producer) · **Completed** (done)  
- **Coupon code** — column on **Orders and MTD** for Cheer, Dance, and School Anthem (not Band / SE). Shows the code from the form; **Match** if it matches Settings → Coupon codes. Display only — no effect on pricing or anything else in the system  
- **Complete to Payroll** — finalize pricing and move to Payroll  
- **Move to Orders** — send back for reassignment (lands on Orders as **Reassign: rush order**)  
- **CSV** — export current filtered view  

Producer assign / reassign is on **Orders**, not MTD.  

---

## Payroll

Pay producers for finished mixes.

Form chips show **how many payrolls** are in each category. Open a form (and subtype when needed) to see those rows.

### Filters & sort

- **Form / subtype** chips (with counts)  
- **Filters** — Package · Mix Length (Cheer) · Split (when that subtype uses it) · Assigned editor · Requested · **Data** (Missing / Complete) · Date  
- **Sort** — Newest · Oldest · A-Z · Z-A · Package price High/Low · Start date Earliest/Oldest · End date Earliest/Oldest · Days booked More/Less  
- **Search**  
- **Group by producer** — optional on Payroll / Archive  

### Tabs

| Tab | Purpose |
|-----|---------|
| **Payroll** | Unpaid mixes — adjust rush/misc, Mark Paid, CSV |
| **Archive** | Paid mixes — review; delete forever when done |
| **Add Voiceover** | Standalone voiceover add-ons (not tied to completing a mix on MTD) |
| **Send Statements** | Preview and email producer statements (Gmail) — mixes and voiceovers listed **separately** |

### Common actions

- Open a **form category** (counts on the chips) to see its payrolls  
- **Mark Paid** — moves the mix to Archive  
- **Add Voiceover** — add a voiceover for any program / any form category, paid to any category’s producer. Once added, it shows as its **own row** on that producer’s statement  
- **Send Statements** — choose period (e.g. last 2 / 4 / 6 weeks), preview (mixes and voiceovers as separate rows), send  

**Needs Gmail connected** under Settings for statement emails.

---

## Schedule

**Producer Schedule** — who’s free, booked, off, or at daily limit; email schedules via Gmail.

### Tabs

| Tab | What it does |
|-----|----------------|
| **View Schedule** | Browse the team calendar |
| **Send Schedule** | Preview CSV / email and send |

### View Schedule — filters

You can combine these, or use just one:

| Filter | What it does |
|--------|----------------|
| **Range** | Today · This Week · This Month · 3 Month · 6 Month |
| **Form** | Form / subtype — which producer categories appear |
| **Editor** | **All Editors**, or **one producer only** (calendar/list for that person alone) |
| **Status / label** | **All**, or **one label only** (Assigned, Reaching limit, Limit full, Off, Regular off day, Free slot) — hides other day states in the view |

### Labels

- **Assigned** — Has one or more mixes assigned  
- **Reaching limit** — Either or both daily limits (mixes / cost) ≥ 80% and under 99%  
- **Limit full** — At or over daily mix/cost limit, or ≥ 99% of either  
- **Off** — Off day on a scheduled work day  
- **Regular off day** — Outside regular work days, with no Extra day  
- **Free slot** — Open for booking, including Extra days  
- **Off today** — Only on the Today range. Number of producers who are off today, out of everyone currently shown (example: 2 / 12).  

### Columns (This Week and longer)

- **Free** — Count of free-slot days for that producer in the selected range  
- **Booked** — Count of assigned days in the range  
- **Off** — Count of Off days in the range  
- **Regular Off Days** — Count of regular off days in the range  

Hover a **day cell** (week and longer) for more detail: status name; booked mix + until date (+ more mixes); Off leave reason; Extra day note; or weekday + date.

### Columns (Today)

Today is a list, not the calendar grid. Each row is one producer for today:

- **Producer** — Avatar and initials  
- **Booked On** — Mix name(s) if assigned today, or Free slot / Reaching limit / Limit full  
- **Due Date** — When the booked mix is due (or Free slot / At daily limit / Limit full if nothing is due)  
- **Status** — Same status labels as above (tile + hover)

### Send Schedule

Pick the **form / subtype** first — only producers for that form (and sub-form) are on the send list. Search or choose an editor; each producer gets their **own separate** schedule email (not one combined email).

| Control | Options |
|---------|---------|
| **Form** | Form / subtype chips — scopes who appears on the list |
| **Send period** | Complete · This Week · This Month · 3 Month · 6 Month |
| **Editor** | All Editors (sends one email per producer on that list), or one producer |

Preview CSV / email per producer, then send. **Needs Gmail** under Settings.

---

## Producers

Roster of editors: who can be assigned, at what %, and when they’re available.

### Roster

- Cards show name, initials, categories, email, date added.  
- **Add producer** · **Edit** · **Schedule and capacity** · **Delete** (view-only accounts can browse, not change).  
- A producer only appears for **Assign** on forms/categories you’ve given them.

### Add / edit profile

**Required:** Name · Initials · Email (valid address).  

**Categories & compensation**

- Add one or more form categories this producer covers; each gets a payout % (0–100).  
- Optional **Rush fee** % addon for rush payouts.  
- On **Add**, set regular **work days** (changeable later in Schedule and capacity).  

**Removing a category**

- Blocked while they still have **unpaid payroll** mixes in that category — Mark Paid first.  
- If they have open assigned mixes in that category, Save sends those mixes to **Reassign** (you confirm in the dialog).  

### Schedule and capacity

Three tabs:

| Tab | What you set |
|-----|----------------|
| **Schedule** | Regular work weekdays; **Extra days** (one-off days outside the regular week) |
| **Leave** | Off / leave ranges — only on regular work days (not on Extra days; cancel Extra by removing the Extra day) |
| **Limit** | Optional **max mixes/day** and/or **max cost/day** (what drives Assign capacity labels and the graph) |

**Allowed / not allowed**

- You **can** turn work days on/off, add Extra days, add leave on work days, enable either or both daily limits.  
- You **cannot** put leave on a non-work day or keep an Extra day that falls on a regular work day (system cleans that up).  
- If you turn off a **regular work day** that already has a mix booked, you must choose: **Send to Reassign**, or **Keep as Extra days** (the mix stays booked on that date, but it is no longer a regular work day).  
- Removing an Extra day or adding leave that overlaps booked mixes also opens a confirm dialog — **Send to Reassign** (nothing silent).  

### Delete

| Situation | What happens |
|-----------|----------------|
| Unpaid payroll mixes | **Cannot delete** until those are Mark Paid |
| Open assigned mixes | Confirm **Send to reassign & delete** — mixes go to Orders **Reassign**, then the producer is removed |
| Clean (no open/unpaid work) | Deletes normally |

---

## Settings

Studio defaults.

### Email sending (Gmail)

- Connect Google account  
- Send test email  
- Disconnect when needed  

Required for payroll statements, schedule emails, and many customer/producer emails.

### Email templates

Editable subject and body for the emails the app sends. Needs Gmail to actually send.

**Placeholders (variables)**

- Under **Variables**, click a label (e.g. PROGRAM NAME, COMPLETE DATE, FIRST NAME) to insert it at the cursor in the subject or message; you can insert the same one as many times as you want.  
- **You cannot invent new variables.** Only the ones listed for that template work.  
- Edit surrounding wording freely; leave the variables where you want live values. Save the template — **the next emails you send use that wording**.  
- When you send, each variable in the email is **replaced with the real text** the customer/producer sees (program name, first name, deadline dates, listed missing items, etc.).  
- Before send you can still edit **recipient**, **submission deadline** (feeds Day / Complete date), and **which missing items** appear — for that email only.

The variable rules above apply to these emails only (each has its own variable list in Settings):

**Customer**

- **Missing data** — first chase for promised collection items (form / matched orders)  
- **Incorrect data** — resend when materials were wrong or unusable  
- **Affiliate clarification** — Flagged Orders email asking which Music Affiliate to use  

**Producer**

- **Order details** — Email producer before Move to MTD  
- **Payroll** — Send Statements cover email (statement attached)  
- **Schedule** — Send Schedule cover email (schedule attached)  

Unmatched-manual “wait on form” customer mail uses its own fixed copy (not the Missing data template above).  

### Coupon codes

List of codes used only to show **Match** on MTD/Orders when an order’s coupon matches. Display only — no pricing or other system effect.

### Daily cost

Controls how **mix cost** is calculated for a producer’s **max cost/day** (Assign capacity graph and daily limits).

- **Package price** — always on  
- **Compliance cost** — optional; use affiliate compliant/non-compliant pricing when on  
- **Producer compensation** — optional; multiply by the producer’s payout % when on  

Extras (8CS / sheet / vocals / rush / voiceover) are never included in this day-cap math.

### Notifications

Sidebar bell toggles (this browser only): new orders, flagged, suggested matches, producer leave tomorrow, limit full, Gmail connection.

---

## Access levels

| Role | Can do |
|------|--------|
| **Full access** | Create, edit, assign, move boards, send email, delete (where allowed) |
| **View access** | Browse boards and settings; cannot change or send |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Orders** | Intake / pre-MTD board |
| **MTD** | Music To Do — active mixes |
| **Match** | Link Magento form ↔ manual New Order |
| **Flagged** | Held for Music Affiliate clarification |
| **Reassign** | Needs a new producer |
| **Payroll** | Completed mixes awaiting / after payout |
| **Producer** | Mix editor |

---

## Need help?

If something looks stuck (empty board, wrong form, can’t Move to MTD):

1. Check form + subtype filters  
2. Clear search (**×**)  
3. Confirm Match / Flagged aren’t blocking the row  
4. Confirm you’re Full access if you need to edit or send  
