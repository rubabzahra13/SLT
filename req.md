Yes. Based on the meeting, the main goal is to replace Megan’s current **email + Google Sheets workflow** with an **admin portal/dashboard** where orders come in automatically, Megan manages them, assigns producers, and tracks schedules.

I’d structure the admin panel like this:

### Sidebar

**1. Dashboard**

* High-level view of what needs attention.
* New orders waiting to be assigned.
* Orders with scheduling issues.
* Orders where a requested producer is unavailable for a long time.
* Potentially upcoming deadlines / mixes needing attention.
* Quick visibility into producer availability.

---

**2. Orders**
This is the main place where **all incoming customer orders** appear.

When a customer submits an order:

* Order data comes into the portal automatically through the API.
* Different order forms can have different fields, because customers go through different paths/subcategories.
* The system should store all the information from the relevant order form.
* Orders should be categorized, e.g. school, marching band, etc.
* Megan can search/filter orders by category.
* Completed orders eventually move to **Past Orders**.

### Inside an order

Megan should be able to see:

* Customer/order information
* What they ordered
* Package/type
* Songs/music information
* Requested producer/editor
* Other order-form information
* Any relevant scheduling information

Most information should be **automatically populated**, but Megan needs to be able to edit fields when necessary.

---

**3. MTD / Music To Do**
This is basically the replacement for Megan’s current spreadsheet.

The important idea is:

**Order → automatically populates MTD → Megan adds/edits the information that only she knows.**

The MTD view needs all the current spreadsheet columns, but:

* Information already available from the order should be pre-filled.
* Fields that Megan currently enters manually should remain editable.
* Some fields should be dropdowns/toggles instead of free text where possible.

### Important MTD fields/functions

**Producer/editor**

* Requested producer can come from the order.
* If customer says **First Available**, the system should help Megan choose.
* Show suitable producers based on:

  * Genre/specialization
  * Earliest available date
* Megan can manually change the suggested producer.
* Producer should be selectable from a dropdown using initials.

**Other fields**

* Invoice number → manually entered.
* Mix start date → manually entered initially.
* 8-count sheet → imported if available, but editable.
* Required materials/song information → imported where possible, but editable.
* "Have / No" type information → easy dropdown/toggle.

---

**4. Schedule / Producer Schedule**
This is a major requirement.

Megan currently has to scroll through a huge spreadsheet to figure out who is available.

The new system should let her:

* Filter to **one producer**
* See that producer's current workload
* See their schedule by **week**
* See schedules by **month**
* See upcoming available dates
* See how many mixes they can handle
* Quickly identify the earliest available slot

For example:

> **Producer: Ann**
> Week: Aug 17–21
> Mon: Mix
> Tue: Mix
> Wed: Mix
> Thu: Available
> Fri: Available

Instead of scrolling through the whole spreadsheet.

---

**5. Assignments**
This could either be its own tab or part of Orders/MTD.

The key workflow is:

**New order → system checks requirements → suggests available producers → Megan chooses/assigns one.**

For example:

> Requested: First Available
> Genre: Cheer
>
> Suggested:
>
> * Matt — Aug 27
> * Nate — Aug 27
> * Steve — Sep 2

Megan chooses the producer.

The system **must not suggest someone outside the required specialty**. They specifically said producers don't cross genres—for example, a hip-hop order should not automatically be assigned to someone who doesn't specialize in hip-hop.

---

**6. Outsourced / In Progress**
Megan currently has a section for things like outsourced mixes.

These are orders that have started but aren't finished because parts such as:

* Voiceovers
* Instrumentation
* Other customization

are being outsourced.

The portal should therefore allow these orders to be marked as **in progress / outsourced**, with a deadline.

When completed:

* Remove it from the in-progress area.
* Move it into the appropriate month's schedule/order history.

---

**7. Past Orders**
Once an order is fulfilled/completed:

**Active order → Past Orders**

Megan should be able to:

* Search past orders
* Filter by category
* Filter by producer
* Find previous work
* Sort/filter things like marching band, school, etc.

---

**8. Roster / Producers**
This came directly from Megan and Andrea's discussion.

A settings/admin area should contain the **producer/editor roster**.

Megan/admin can:

* Add producer
* Remove producer
* Edit producer
* Enter name
* Enter email
* Enter initials
* Potentially add profile picture
* Store their specialty/genre
* Update availability-related information

This is important because producers can join or leave, and Megan shouldn't need the development team every time the roster changes.

---

**9. Pricing**
They also discussed making pricing manageable from the admin side.

The system should have pricing information so that prices can be automatically populated into MTD/orders.

Admin should eventually be able to:

* View pricing
* Edit pricing
* Add/update package prices
* Handle different pricing rules, including compliant vs. non-compliant music.

This was mentioned as something they want the system to support, although the meeting didn't go deeply into the exact pricing UI.

---

**10. Settings**
General admin configuration.

At minimum:

### Producer settings

* Add/remove producers
* Names
* Initials
* Emails
* Specializations

### Pricing settings

* Update package pricing
* Pricing rules

Potentially other system configuration later.

---

### One important feature: "Needs Attention" flags

This came up specifically from Megan.

Example:

Customer requests **Casey**, but Casey isn't available until 8 weeks later.

The system should flag the order:

> ⚠️ **Casey unavailable until Aug 27**
> **Needs attention**

Megan can then decide what to do/contact the customer.

This is particularly useful because producer schedules can change—for example, Casey may suddenly decide to work on a Saturday and create new availability.

---

## The overall workflow

I'd visualize the admin panel as:

```text
SIDEBAR
│
├── Dashboard
│
├── Orders
│     ├── New Orders
│     ├── Active Orders
│     └── Past Orders
│
├── MTD / Music To Do
│
├── Schedule
│     ├── All Producers
│     ├── By Producer
│     ├── Weekly View
│     └── Monthly View
│
├── Assignments
│
├── Outsourced / In Progress
│
├── Producers / Roster
│
├── Pricing
│
└── Settings
```

### Most important MVP features

If you're turning this into an actual UI/requirements document, I would **not treat all tabs as equal**. The meeting makes these the core MVP:

1. **Orders** — automatically receive all customer orders.
2. **MTD** — replace Megan's spreadsheet and pre-fill as much as possible.
3. **Producer Schedule** — let Megan quickly see availability.
4. **Assignment** — suggest suitable available producers.
5. **Needs Attention** — flag scheduling problems.
6. **Roster** — Megan can manage producers herself.
7. **Past Orders** — completed orders/history.

The **editor login** is explicitly more of a **Phase 2** idea: producers/editors could eventually log into the portal themselves, while restricting the customer information they can see.
