=== DC MailPoet Manager ===
Contributors: dc
Tags: mailpoet, subscribers, admin, bulk actions, export
Requires at least: 6.6
Tested up to: 6.8
Requires PHP: 8.2
Stable tag: 1.0.0
License: GPLv2 or later
Text Domain: dc-mailpoet-manager

Modern admin UI for managing MailPoet subscribers with advanced filtering, sorting, and bulk actions.

== Description ==

DC MailPoet Manager adds a powerful subscriber management screen under **Tools → MailPoet Manager** in your WordPress admin. It provides features that MailPoet's built-in UI does not, including:

* **Filter by custom fields** (NPA postal code — exact match or range)
* **Filter by tags and lists** with ANY/ALL matching modes
* **Filter by status** (subscribed, unsubscribed, bounced, inactive, unconfirmed)
* **Full-text search** across email, first name, and last name
* **Server-side pagination** optimized for 50k+ subscribers
* **Sortable columns** (email, name, status, NPA, date)
* **Bulk actions**: add/remove tags, add/remove lists, unsubscribe, export CSV
* **Chunked processing** with progress bar for bulk operations on large selections
* **CSV export** of selected subscribers with all data

== Installation ==

1. Copy the `dc-mailpoet-manager` folder to `wp-content/plugins/`
2. Install JS dependencies and build:

    cd wp-content/plugins/dc-mailpoet-manager
    npm install
    npm run build

3. Activate the plugin in WordPress admin → Plugins
4. Go to **Tools → MailPoet Manager**

== How to Use ==

1. Navigate to **Tools → MailPoet Manager** in your WordPress admin.
2. Use the **filters bar** at the top to narrow down subscribers:
   - Type in the search box to find by email or name
   - Select a status from the dropdown
   - Add tags or lists using the token fields; choose ANY or ALL matching
   - Enter an exact NPA or a min/max range
3. Click column headers to **sort** the table.
4. **Select subscribers** using the checkboxes.
5. Choose a **bulk action** from the dropdown and click **Apply**:
   - For tag/list actions, select which tags or lists to add/remove
   - Progress is shown in real-time for large selections
   - CSV export opens the file in a new tab when complete
6. Use the **pagination controls** at the bottom to navigate pages and change page size.

== REST API ==

The plugin exposes three endpoints under `dc-mailpoet/v1`:

* `GET /meta` — Returns available tags, lists, custom fields, and auto-detected NPA field ID.
* `GET /subscribers` — Paginated, filtered, sorted subscriber list.
* `POST /bulk` — Execute bulk actions (add_tag, remove_tag, add_list, remove_list, unsubscribe, export_csv).

All endpoints require `manage_options` capability and WP REST nonce authentication.

== Requirements ==

* WordPress 6.6+
* PHP 8.2+
* MailPoet plugin installed and activated (tables must exist)
* Node.js 18+ (for building assets)

== Changelog ==

= 1.0.0 =
* Initial release: subscriber table, filters, bulk actions, CSV export.
