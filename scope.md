Phase 1: Define & Validate | Week 1 - 2
Before development begins, Shore GTM will translate the discovery work into an approved
workflow and technical specification.
The objective is to ensure that the solution reflects how Sounds Like That actually operates
before programming begins.
PHASE 1 ACTIVITIES
Workflow Definition
Document the primary flow from:
Customer Order → Orders → MTD / Scheduling → Completion → Payroll
Define the data that moves automatically between each step and the information that remains
manually controlled.
Technical Validation
Confirm the preferred method for retrieving data from the Sounds Like That / Power Music
order environment, with Magento/API integration as the intended approach.
Shore GTM will confirm that the available API data provides the fields necessary to support the
different order forms and customer ordering paths.
If the API cannot reliably provide required information, Shore GTM and Sounds Like That will
agree on an alternate approach before development proceeds.
Business Rules
Sounds Like That will provide the business logic required to configure the system, including:
Package and pricing information
Licensing deductions and treatment by order type
Producer roster
Producer specialties
Producer compensation percentages and rules
Standard miscellaneous compensation items
Missing-order-information requirements
Current customer email templates used to request missing information
Wireframe & User Experience
Shore GTM will create a static wireframe showing the proposed portal before development.
Andrea and Megan will review the proposed interface and workflow, and Shore GTM will
incorporate agreed revisions before development begins.
PHASE 1 DELIVERABLES
Confirmed workflow and requirements
Technical integration approach
Business-rule specification
Initial data architecture
Static portal wireframe
Final approved build specification
Phase 2: Build & Deploy | Weeks 2-4
Phase 2 will turn the approved workflow into a working portal.
1. ORDERS
The Orders section will serve as the centralized record of incoming customer orders.
The system will:
Receive available order data directly from the approved source
Support the Sounds Like That order-form variations included in the current ordering
process
Store the complete available order information
Identify the order/category/package type
Preserve the original customer order information
Reduce or eliminate the need for order emails to be forwarded into a personal workflow
Allow SLT to review orders from a single location
Allow relevant order information to be prepared and sent to the assigned producer from
the portal
Allow customer information that should not be shared with producers to be excluded from
producer communication
The final fields and presentation will be confirmed through the Phase 1 wireframe.
2. MTD / PRODUCER SCHEDULING
The MTD section will replace the core operating functionality currently managed through the
MTD spreadsheet.
Where the information already exists in the original order, the system will pre-populate it
automatically.
Fields that require judgment or may change will remain editable.
The MTD workflow will include:
Automatic population of relevant order information
Editable operational fields
Producer assignment
Requested-producer identification
“First Available
”
workflow
Producer specialty matching
Producer availability and capacity visibility
Suggested available producers based on specialty and current schedule
Manual override of producer assignment
Manual scheduling/start-date control
Order status management
Identification of in-progress work
Identification of orders requiring attention
Identification of requested producers whose availability may delay an order
Filtering and schedule management
SLT will be able to filter and organize the MTD view using relevant criteria such as:
Producer
Dance / cheer / other category
Package or order type
Week
Month
Date range
Pending / floating status
Other agreed order statuses
Multiple filters may be applied together where appropriate.
The objective is to allow SLT to move quickly from a complete operating view to a specific
producer, week, category, or exception without manually scrolling through the full schedule.
3. MISSING INFORMATION WORKFLOW
Orders that appear to be incomplete will be flagged for SLT’
s attention.
The initial workflow will use a human-reviewed recommendation model:
1. The system evaluates available order information against the requirements provided by
Sounds Like That.
2. The system identifies items that appear to be missing.
3. SLT reviews the order.
4. SLT confirms, adds, or removes missing items from a checklist.
5. The system generates the appropriate customer email using the approved template and
available customer/order information.
6. SLT reviews and may edit the email.
7. SLT explicitly approves and sends the email.
The system will not automatically send customer emails without human review and approval
during this phase.
Examples of requested information may include count sheets, songs, markers, videos, or other
materials identified by Sounds Like That.
Incomplete orders will remain identifiable as pending, floating, or another mutually agreed
status until they are ready to be scheduled.
4. PRICING & REFERENCE INFORMATION
The platform will contain an editable reference area for information SLT currently needs to
access elsewhere, including:
Standard pricing
Secret-menu pricing
Current promotions
Coupon or discount codes
Other operational reference information
SLT will be able to add, edit, or remove reference information as business requirements
change.
Where established business rules allow it, pricing information used elsewhere in the system
may be drawn from the approved pricing structure.
Manual pricing adjustments will remain available.
5. PRODUCER ROSTER & SETTINGS
Sounds Like That will be able to maintain its producer roster within the platform.
The roster will include agreed fields such as:
Producer name
Initials
Email
Area(s) of specialization
Compensation percentage or rule
Active/inactive status
Authorized users will be able to add, edit, or deactivate producers without requiring Shore
GTM to make routine roster changes.
Producer specialties will be used when recommending available producers for orders where
no specific producer has been requested.
6. PAYROLL PREPARATION
Payroll calculation and preparation is included in the initial implementation because
eliminating order and MTD data entry without eliminating the second transfer into payroll
would leave a significant portion of the existing manual process in place.
When a mix is completed, SLT will be able to move the relevant information from MTD into
Payroll without re-entering the order.
The Payroll section will support:
Producer-specific payroll records
Transfer of completed orders from MTD
Manual payroll entries
Editing throughout the applicable pay period
Producer compensation percentages
Package-specific compensation values
Licensing adjustments
Rush-fee treatment
Miscellaneous payments
Itemized producer compensation
Payroll-period filtering
Producer-specific filtering
Compensation Calculations
Sounds Like That will provide the rules necessary to calculate producer compensation.
Where those rules are clearly defined, the system will calculate compensation based on the
applicable combination of:
(Package value) - (Applicable licensing adjustment)
Applicable order-specific additions
× producer compensation percentage
Manual adjustment will remain available where necessary.
Rush fees
The current rush fee will be configured as an order-specific addition. The initial business rule
supplied during discovery is $150, with the assigned producer receiving their normal
compensation percentage on the resulting order value.
Sounds Like That will be able to update this value if the business rule changes.
Miscellaneous compensation
The payroll workflow will include frequently used additional compensation options.
Initial examples identified during discovery include:
Custom voiceovers: $25
Themed voiceovers: $75
Both: $100
Custom / miscellaneous entry
Sounds Like That will confirm these items and any additional recurring compensation
categories before configuration.
Producer payroll summaries
The system will allow SLT to isolate a producer
’
s payroll activity for a selected period and
generate an itemized summary showing the work and compensation represented in that
payroll.
The intended workflow is to allow this information to be sent to the applicable producer
without Megan recreating the information in a separate spreadsheet.