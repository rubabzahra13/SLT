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

**Source:** All orders · Form (Magento) · Manual (New Order)

### Reassign (important)

These rows **must get a new producer**. Assignment and mix dates were cleared. Open **Assign** to fix them.

**From Producers — nothing is silent; confirm in the dialog:**

| Why | What happened | Button |
|-----|----------------|--------|
| **Producer deleted** | Editor removed; assigned mixes cleared first | **Send to reassign & delete** |
| **Category removed** | Producer no longer covers this mix’s category | **Remove from draft**, then **Save** |
| **Work day turned off** | A work day was turned off and mixes were booked on it | **Send to Reassign** (or **Keep as Extra days**) |
| **Extra day removed** | An extra day was removed and mixes were booked on it | **Send to Reassign** |
| **Leave / off day** | Off days overlapped booked mixes | **Send to Reassign & add leave** |

**From MTD — you choose it:**

| Why | What happened | Button |
|-----|----------------|--------|
| **Move to Orders (rush)** | Mix sent back so someone else can take it | **Move to Orders** → confirm **Move** |

Check this chip regularly — mixes here are blocked until reassigned.

### Common actions

- **New Order** — create a manual booking (Cheer / Dance / Marching Band)  
- **Assign** — pick producer and mix dates  
- **Move to MTD** — send a ready order into Music To Do  
- **Match Orders** — link a Magento form to a manual order  
- **Flagged Orders** — resolve multi-affiliate Music Affiliate holds  
- **CSV** — download orders for your current filters (confirm dialog shows what you’re exporting)  
- **Search** — find by coach / contact / program  
- Toggle **collections / Songs / Notes** pills as data arrives  
- Edit form, email customer, delete when allowed  

### Tips

- Search clears when you leave Orders (sidebar). Use **×** to clear. It won’t come back from session until you search again (Assign “Back” can restore via URL).  
- Searching switches the board to **All** status chips.  
- Status chips are not restored from a previous visit unless the URL has them. Form/subtype are remembered.  
- CSV exports every matching order for the filters (not just the page on screen), up to **5,000** rows.  
- Unmatched manuals: Songs/Notes stay locked until Match.  
- Magento multi-affiliate flags stay off the main board until resolved under Flagged.  

---

## MTD (Music To Do)

Active production: assigned mixes being worked, priced, and invoiced.

### Common actions

- Filter by form/subtype; search  
- **Assign / reassign** producer (dates + capacity)  
- Edit package, voiceovers, quantities, status  
- **Pricing** — per mix or pricing reference  
- **Invoice** — one mix or bulk  
- Cycle collection / Songs / Notes pills  
- **Complete to Payroll** — finalize pricing and move to Payroll  
- **Move to Orders** — send back for reassignment (lands as **Reassign**)  
- **CSV** — export current filtered view  

### Tips

- Opening **Assign** loads open mixes so capacity limits are accurate. Browsing the MTD table alone uses the paged board.  

---

## Payroll

Pay producers for finished mixes.

### Tabs

| Tab | Purpose |
|-----|---------|
| **Payroll** | Unpaid mixes — adjust rush/misc, Mark Paid, CSV |
| **Archive** | Paid mixes — review; delete forever when done |
| **Add Voiceover** | Voiceover add-ons for payroll |
| **Send Statements** | Preview and email producer statements (Gmail) |

### Common actions

- Filter by form; search  
- **Mark Paid** — moves the mix to Archive  
- **Send Statements** — choose period (e.g. last 2 / 4 / 6 weeks), preview, send  

**Needs Gmail connected** under Settings for statement emails.

---

## Schedule

See who’s booked and email schedules.

### Tabs

- **View Schedule** — today / week / month / 3 month / 6 month; availability vs booked  
- **Send Schedule** — preview CSVs/emails and send via Gmail  

### Tips

- View uses a light capacity snapshot.  
- Send loads fuller mix detail (needed for attachments/emails).  
- **Needs Gmail connected** to send.  

---

## Producers

Roster of editors: categories, rates, and capacity.

- Browse cards (categories, email, date added)  
- **Add / edit / delete** producer  
- Set categories and compensation  
- **Schedule and capacity** — work days, leave, extra days, max mixes/day, max cost/day  

Deleting a producer with open mixes may require sending those mixes to **Reassign** first (and clearing unpaid payroll if needed).

---

## Settings

Studio defaults.

### Email sending (Gmail)

- Connect Google account  
- Send test email  
- Disconnect when needed  

Required for payroll statements, schedule emails, and many customer/producer emails.

### Email templates

Edit copy for:

- **Customer:** Missing data · Incorrect data · Affiliate clarification  
- **Producer:** Order details · Payroll · Schedule  

### Coupon codes

Codes used to flag matching coupons on orders.

### Daily cost

What counts toward daily producer cost (package is always included; toggles for compliance and compensation).

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
