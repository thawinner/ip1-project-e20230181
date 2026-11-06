# ShopStock — Specification

Storage inventory for a small shop: storekeepers record goods coming into storage and going out to the shop and report losses, and see their work on their own dashboard; the manager approves write-offs, adjusts stock after a count, manages accounts, and sees a reorder list and a monthly report (which can be downloaded) on the dashboard. Everyone has a My profile page.

## Roles

| Role | Who | What they can do | Menu (home page first) |
| --- | --- | --- | --- |
| Staff | Storekeepers | Search products and see what is left in storage; record deliveries in and goods sent to the shop; record damaged, expired or returned goods, which wait for the manager's approval; see their own movements with their status, and a dashboard with their work today and what is running low. They do not see cost prices, stock value, reports or other staff members' records. Their account is created by the manager, and they set their own password at first login. | Dashboard, Products, My movements |
| Manager | The shop owner or manager | Everything staff can do, plus manage products, categories and suppliers, approve or reject storekeepers' write-offs on the Approvals page (the manager's own are applied at once), adjust stock after counting a product, see the dashboard with the monthly report (which can be downloaded), the reorder list, all movements, cost prices and stock value, and add, edit, deactivate and reset the password of storekeeper accounts. | Dashboard, Products, Approvals, Reorder list, Movements, Staff, Categories, Suppliers |

## User stories

### US-01 · Add a storekeeper account (Manager)
As a manager, I want to add a storekeeper account so that a new employee can use the system.
- AC1: With a name, a username (3–20 lowercase letters or numbers), a phone number (for example 012 345 678) and a temporary password (8+ characters with a letter and a number), the account is created active and appears in the staff list as "must change password".
- AC2: A username already in use shows "This username is already taken"; a phone number already in use or in the wrong format shows a message under the field.
- AC3: There is no public sign-up page; register without a token returns 401, and with a staff token 403.
- AC4: At first login, the storekeeper is sent to "Set your new password" and cannot open other pages until a new password is saved.

### US-02 · Log in (Both)
As a user, I want to log in so that I see the pages for my role.
- AC1: Correct username and password take staff to /dashboard and a manager to /manager/dashboard; the user stays logged in after a page reload until the 1-hour session ends.
- AC2: A wrong username or a wrong password shows the same message, "Invalid username or password", and no token is stored.
- AC3: A deactivated account sees "This account is deactivated" and cannot log in.
- AC4: Staff see only Dashboard, Products and My movements in the menu; a manager also sees Dashboard, Approvals, Reorder list, Movements, Staff, Categories and Suppliers. Opening a page of the other role shows a 403 page with a link back to the home page.
- AC5: Any user can change their password with their current password; a wrong current password shows "Current password is incorrect".
- AC6: Clicking their name in the menu opens My profile: their own name, role, username, phone and date added, a Change password button, and what of theirs needs attention; no other user's phone number is shown.

### US-03 · Find a product (Staff)
As a storekeeper, I want to search and filter products so that I can quickly see what is left in storage.
- AC1: The list shows 10 products per page with SKU, name, category, quantity and unit, and page controls.
- AC2: Typing "coca" shows only products whose name or SKU contains "coca", ignoring upper and lower case.
- AC3: Filters (category, supplier, low stock only) combine with the search; an empty result shows "No products match your search".
- AC4: Products at or below their reorder level show a low-stock badge.
- AC5: Staff see quantity and unit but not the cost price or stock value; the API response for staff has no costPrice field.

### US-04 · Record a delivery (stock in) (Staff)
As a storekeeper, I want to record goods that arrive in storage so that the stock count goes up.
- AC1: A whole quantity from 1 to 10,000 with reason PURCHASE or RETURN_FROM_SHOP is saved, and the product's quantity increases by that amount without a page reload.
- AC2: A quantity of 0, a negative number or a decimal shows "Quantity must be a whole number from 1 to 10,000".
- AC3: An archived product cannot receive stock; the message "This product is archived" is shown.
- AC4: A PURCHASE needs a supplier, preset to the product's supplier, and may have an invoice number; the form keeps both for the next product of the same delivery, and both show on the movement.

### US-05 · Send stock to the shop or write it off (Staff)
As a storekeeper, I want to record goods leaving storage so that the stock count stays correct.
- AC1: A TO_SHOP stock out decreases the quantity at once.
- AC2: Taking out more than is in stock is refused with "Not enough stock: only N left", and the quantity does not change.
- AC3: If the quantity drops to the reorder level or below, the product appears in the manager's reorder list at once.
- AC4: While typing, the form shows the result, for example "Stock after: 8 (now 12)", so mistakes are caught before saving.
- AC5: DAMAGED, EXPIRED or RETURN_TO_SUPPLIER needs a note ("A note is required for this reason"); a storekeeper's is saved as Pending and changes the quantity only when the manager approves it; a rejection shows its reason.

### US-06 · See my work (Staff)
As a storekeeper, I want to see my work and what is running low so that I can check my work at the end of a shift.
- AC1: My movements page lists only my movements, newest first, with their status (Applied, Pending, Rejected and why), filterable by type and date.
- AC2: Opening another staff member's movement by URL (/movements/:id) shows the not-found page (the API returns 404).
- AC3: A movement has no edit or delete button; the page explains that mistakes are fixed by the manager's adjustment after a count.
- AC4: On a product page, staff see its recent movements (date, type, change) without the names of who recorded them.
- AC5: Staff open on their dashboard (home page): how many movements they recorded today, their write-offs waiting or rejected, the products running low and their last 5 movements, each linking to its page; it shows no cost price or stock value.

### US-07 · Manage products (Manager)
As a manager, I want to add, edit and archive products so that the catalogue matches what the shop keeps in storage.
- AC1: Creating a product with a unique, well-formed SKU adds it to the list with quantity 0.
- AC2: A duplicate SKU shows "SKU already exists"; a wrong format shows "SKU must look like DRK-0001".
- AC3: A product needs a storage unit (CASE, BOX, BAG, PACK or PIECE), a cost price of 0 or more, and a target level higher than its reorder level; otherwise a message is shown under the field. Changing the cost price affects only new movements; earlier movements keep their cost.
- AC4: A product with movements cannot be deleted; the message suggests archiving it instead.
- AC5: A staff user cannot create, edit or delete products (the API returns 403).

### US-08 · Approve write-offs and adjust stock (Manager)
As a manager, I want to approve storekeepers' write-offs and correct a quantity after counting the shelf, so that the system matches what is really in storage.
- AC1: The Approvals page shows pending write-offs (product, quantity, reason, note, who), with a badge in the menu; approving applies the change, and stock is checked again ("Not enough stock: only N left").
- AC2: Rejecting needs a reason ("Please give a reason for rejecting"), which the storekeeper sees in their movements; nothing changes in stock.
- AC3: On Adjust stock, entering the counted quantity and a note creates an adjustment with the difference (for example counted 18, system 20, change −2); without a note it shows "A note is required for an adjustment".
- AC4: A count equal to the current quantity is refused with "No difference to adjust"; a negative or decimal count shows "Counted quantity must be 0 or more".
- AC5: Staff cannot approve write-offs or make an adjustment (the API returns 403); a manager's own write-offs are applied at once.

### US-09 · Reorder list and monthly report (Manager)
As a manager, I want to know what to order and how storage changed this month so that I can reorder in time and see losses.
- AC1: The reorder list shows products at or below their reorder level, grouped by supplier with phone number (products without a supplier under "No supplier"), with quantity left and a suggested order (for example 3 left, target 20, order 17).
- AC2: The menu shows a badge with the number of products to reorder.
- AC3: The dashboard opens on this month's report; what is waiting (approvals, products to reorder) is shown by the badges in the menu, and the report can be downloaded as PDF or CSV for the chosen month.
- AC4: For a chosen month, the report shows stock in and out per category, the top 5 products sent to the shop, the total stock value, and losses (approved damaged, expired and returned goods, and negative adjustments) with their value; a month with no movements shows zeros.

### US-10 · Manage staff, categories and suppliers (Manager)
As a manager, I want to control who can use the system and how products are grouped.
- AC1: The manager can activate or deactivate a staff account, but not their own ("You cannot deactivate your own account"); a deactivated user is logged out on their next action.
- AC2: The manager can create, edit and delete categories and suppliers; deleting one that still has products is refused with "Move or delete its products first".
- AC3: A staff user cannot change staff accounts, categories or suppliers (the API returns 403).
- AC4: The manager can edit a storekeeper's name, username and phone number, and reset their password to a new temporary one; the manager never sees a storekeeper's own password.

## Guard table

Y = allowed · Own = only records the user created (others → 404) · — = 403 · no token → 401 (except log in).

| Action | Staff | Manager |
| --- | --- | --- |
| Log in, see own profile, change own password | Y | Y |
| View products: name, unit and quantity in storage | Y (active only) | Y (incl. archived) |
| View cost price and stock value | — | Y |
| Create, update (including cost price), archive, delete products | — | Y |
| Record deliveries (with supplier and invoice number) and goods sent to the shop | Y | Y |
| Record write-offs (damaged, expired, returned to supplier) | Y (waits for approval) | Y (applied at once) |
| Approve or reject write-offs | — | Y (storekeepers') |
| Adjust stock after a count (with a note) | — | Y |
| View movement history | Own | All |
| See who recorded a movement | Own only | Y |
| See staff phone numbers | Own only | Y |
| View categories and suppliers | Y | Y |
| Manage categories and suppliers | — | Y |
| Add (register), edit, deactivate, reset password of storekeepers | — | Y (not own account) |
| Low-stock information | Badge and filter on the product list; running-low list on the dashboard | Reorder list and badge |
| Monthly report | — | Y |

## Stretch feature (M4): search, filter and pagination

Applies to US-03. Limits, which are tested:

| Limit | Expected behaviour |
| --- | --- |
| Page size | 10 by default; limit above 50 is capped at 50 |
| Page number | page below 1 is refused with 400 |
| Search | Case-insensitive, matches name or SKU; an empty search shows all products |
| No result | Shows "No products match your search" instead of an empty table |
