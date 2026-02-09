=== DC MailPoet Manager ===
Contributors: dc
Tags: mailpoet, subscribers, admin, bulk actions, export
Requires at least: 6.6
Tested up to: 6.8
Requires PHP: 8.2
Stable tag: 2.0.0
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

No React. No build step. No npm. Pure PHP + vanilla JavaScript.

== Installation ==

1. Upload the `dc-mailpoet-manager` folder to `wp-content/plugins/`
2. Activate the plugin in WordPress admin → Plugins
3. Go to **Tools → MailPoet Manager**

== Requirements ==

* WordPress 6.6+
* PHP 8.2+
* MailPoet plugin installed and activated (tables must exist)

== Changelog ==

= 2.0.0 =
* Complete rewrite: removed React/build toolchain, replaced with vanilla JS.
* No npm, no node_modules, no build step required.
* Single JS file + single CSS file.

= 1.0.0 =
* Initial release: subscriber table, filters, bulk actions, CSV export.
