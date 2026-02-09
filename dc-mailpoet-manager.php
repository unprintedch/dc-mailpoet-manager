<?php
/**
 * Plugin Name: DC MailPoet Manager
 * Description: Modern admin UI for managing MailPoet subscribers with advanced filtering, sorting, and bulk actions.
 * Version:     2.0.0
 * Author:      DC
 * Text Domain: dc-mailpoet-manager
 * Requires PHP: 8.2
 * Requires at least: 6.6
 *
 * @package DC_MailPoet_Manager
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'DCMM_VERSION', '2.0.0' );
define( 'DCMM_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DCMM_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once DCMM_PLUGIN_DIR . 'includes/helpers.php';
require_once DCMM_PLUGIN_DIR . 'includes/class-queries.php';
require_once DCMM_PLUGIN_DIR . 'includes/class-bulk.php';
require_once DCMM_PLUGIN_DIR . 'includes/class-rest.php';

final class DC_MailPoet_Manager {

	private static ?self $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'admin_menu', [ $this, 'register_admin_page' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
		add_action( 'admin_notices', [ $this, 'maybe_show_notice' ] );

		register_activation_hook( __FILE__, [ $this, 'on_activation' ] );
	}

	public function register_admin_page(): void {
		add_management_page(
			__( 'MailPoet Manager', 'dc-mailpoet-manager' ),
			__( 'MailPoet Manager', 'dc-mailpoet-manager' ),
			'manage_options',
			'dc-mailpoet-manager',
			[ $this, 'render_admin_page' ]
		);
	}

	/**
	 * Render the admin page HTML shell. JS populates the dynamic parts.
	 */
	public function render_admin_page(): void {
		?>
		<div class="wrap" id="dcmm-wrap">
			<h1><?php esc_html_e( 'MailPoet Manager', 'dc-mailpoet-manager' ); ?></h1>

			<noscript>
				<div class="notice notice-error">
					<p><?php esc_html_e( 'JavaScript must be enabled for this page to work.', 'dc-mailpoet-manager' ); ?></p>
				</div>
			</noscript>

			<!-- Filters bar -->
			<div id="dcmm-filters" class="dcmm-filters">
				<div class="dcmm-filter-row">
					<input type="text" id="dcmm-search" class="dcmm-input" placeholder="<?php esc_attr_e( 'Search email / name…', 'dc-mailpoet-manager' ); ?>">

					<select id="dcmm-status" class="dcmm-select">
						<option value=""><?php esc_html_e( 'All statuses', 'dc-mailpoet-manager' ); ?></option>
						<option value="subscribed"><?php esc_html_e( 'Subscribed', 'dc-mailpoet-manager' ); ?></option>
						<option value="unconfirmed"><?php esc_html_e( 'Unconfirmed', 'dc-mailpoet-manager' ); ?></option>
						<option value="unsubscribed"><?php esc_html_e( 'Unsubscribed', 'dc-mailpoet-manager' ); ?></option>
						<option value="inactive"><?php esc_html_e( 'Inactive', 'dc-mailpoet-manager' ); ?></option>
						<option value="bounced"><?php esc_html_e( 'Bounced', 'dc-mailpoet-manager' ); ?></option>
					</select>

					<input type="text" id="dcmm-npa" class="dcmm-input dcmm-input--short" placeholder="<?php esc_attr_e( 'NPA exact', 'dc-mailpoet-manager' ); ?>">
					<input type="text" id="dcmm-npa-min" class="dcmm-input dcmm-input--short" placeholder="<?php esc_attr_e( 'NPA min', 'dc-mailpoet-manager' ); ?>">
					<input type="text" id="dcmm-npa-max" class="dcmm-input dcmm-input--short" placeholder="<?php esc_attr_e( 'NPA max', 'dc-mailpoet-manager' ); ?>">

					<div class="dcmm-dropdown" id="dcmm-tags-dropdown">
						<button type="button" class="dcmm-dropdown-toggle dcmm-select"><?php esc_html_e( 'Tags', 'dc-mailpoet-manager' ); ?> <span class="dcmm-badge" id="dcmm-tags-count"></span></button>
						<div class="dcmm-dropdown-panel" id="dcmm-tags-panel">
							<div class="dcmm-dropdown-mode">
								<label><input type="radio" name="dcmm-tags-mode" value="any" checked> <?php esc_html_e( 'Any', 'dc-mailpoet-manager' ); ?></label>
								<label><input type="radio" name="dcmm-tags-mode" value="all"> <?php esc_html_e( 'All', 'dc-mailpoet-manager' ); ?></label>
							</div>
							<div class="dcmm-dropdown-list" id="dcmm-tags-list"></div>
						</div>
					</div>

					<div class="dcmm-dropdown" id="dcmm-lists-dropdown">
						<button type="button" class="dcmm-dropdown-toggle dcmm-select"><?php esc_html_e( 'Lists', 'dc-mailpoet-manager' ); ?> <span class="dcmm-badge" id="dcmm-lists-count"></span></button>
						<div class="dcmm-dropdown-panel" id="dcmm-lists-panel">
							<div class="dcmm-dropdown-mode">
								<label><input type="radio" name="dcmm-lists-mode" value="any" checked> <?php esc_html_e( 'Any', 'dc-mailpoet-manager' ); ?></label>
								<label><input type="radio" name="dcmm-lists-mode" value="all"> <?php esc_html_e( 'All', 'dc-mailpoet-manager' ); ?></label>
							</div>
							<div class="dcmm-dropdown-list" id="dcmm-lists-list"></div>
						</div>
					</div>

					<div class="dcmm-dropdown" id="dcmm-columns-dropdown">
						<button type="button" class="dcmm-dropdown-toggle dcmm-select"><?php esc_html_e( 'Columns', 'dc-mailpoet-manager' ); ?> <span class="dcmm-badge" id="dcmm-columns-count"></span></button>
						<div class="dcmm-dropdown-panel" id="dcmm-columns-panel">
							<div class="dcmm-dropdown-list" id="dcmm-columns-list"></div>
						</div>
					</div>

					<select id="dcmm-per-page" class="dcmm-select">
						<option value="25">25</option>
						<option value="50" selected>50</option>
						<option value="100">100</option>
						<option value="200">200</option>
					</select>
				</div>
			</div>

			<!-- Bulk actions bar -->
			<div id="dcmm-bulk" class="dcmm-bulk" style="display:none;">
				<span id="dcmm-bulk-count"></span>

				<select id="dcmm-bulk-action" class="dcmm-select">
					<option value=""><?php esc_html_e( '— Bulk action —', 'dc-mailpoet-manager' ); ?></option>
					<option value="add_tag"><?php esc_html_e( 'Add tag', 'dc-mailpoet-manager' ); ?></option>
					<option value="remove_tag"><?php esc_html_e( 'Remove tag', 'dc-mailpoet-manager' ); ?></option>
					<option value="add_list"><?php esc_html_e( 'Add to list', 'dc-mailpoet-manager' ); ?></option>
					<option value="remove_list"><?php esc_html_e( 'Remove from list', 'dc-mailpoet-manager' ); ?></option>
					<option value="unsubscribe"><?php esc_html_e( 'Unsubscribe', 'dc-mailpoet-manager' ); ?></option>
					<option value="export_csv"><?php esc_html_e( 'Export CSV', 'dc-mailpoet-manager' ); ?></option>
				</select>

				<select id="dcmm-bulk-target" class="dcmm-select" style="display:none;"></select>

				<button type="button" id="dcmm-bulk-apply" class="button button-primary" disabled><?php esc_html_e( 'Apply', 'dc-mailpoet-manager' ); ?></button>

				<span id="dcmm-bulk-progress" class="dcmm-bulk-progress" style="display:none;">
					<span class="dcmm-progress-bar"><span class="dcmm-progress-fill" id="dcmm-progress-fill"></span></span>
					<span id="dcmm-progress-text"></span>
				</span>

				<a id="dcmm-bulk-download" href="#" class="button" style="display:none;" download><?php esc_html_e( 'Download CSV', 'dc-mailpoet-manager' ); ?></a>
			</div>

			<!-- Data table -->
			<table class="widefat striped dcmm-table" id="dcmm-table">
				<thead id="dcmm-thead"></thead>
				<tbody id="dcmm-tbody">
					<tr><td colspan="20"><?php esc_html_e( 'Loading…', 'dc-mailpoet-manager' ); ?></td></tr>
				</tbody>
			</table>

			<!-- Pagination -->
			<div id="dcmm-pagination" class="dcmm-pagination"></div>
		</div>
		<?php
	}

	/**
	 * Enqueue plugin assets (no build step).
	 */
	public function enqueue_assets( string $hook_suffix ): void {
		if ( ! str_contains( $hook_suffix, 'dc-mailpoet-manager' ) ) {
			return;
		}

		wp_enqueue_style(
			'dc-mailpoet-manager',
			DCMM_PLUGIN_URL . 'assets/dc-mailpoet-manager.css',
			[],
			DCMM_VERSION
		);

		wp_enqueue_script(
			'dc-mailpoet-manager',
			DCMM_PLUGIN_URL . 'assets/dc-mailpoet-manager.js',
			[],
			DCMM_VERSION,
			true
		);

		wp_localize_script( 'dc-mailpoet-manager', 'DC_MAILPOET', [
			'restUrl'        => rest_url( 'dc-mailpoet/v1/' ),
			'nonce'          => wp_create_nonce( 'wp_rest' ),
			'perPageDefault' => 50,
		] );
	}

	public function register_rest_routes(): void {
		$rest = new DCMM_REST();
		$rest->register_routes();
	}

	public function on_activation(): void {
		global $wpdb;

		$table = $wpdb->prefix . 'mailpoet_subscribers';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$exists = $wpdb->get_var(
			$wpdb->prepare( 'SHOW TABLES LIKE %s', $table )
		);

		if ( ! $exists ) {
			set_transient( 'dcmm_missing_mailpoet', true, 300 );
		}
	}

	public function maybe_show_notice(): void {
		if ( ! get_transient( 'dcmm_missing_mailpoet' ) ) {
			return;
		}
		delete_transient( 'dcmm_missing_mailpoet' );
		printf(
			'<div class="notice notice-error"><p>%s</p></div>',
			esc_html__( 'DC MailPoet Manager: MailPoet tables not found. Please install and activate MailPoet first.', 'dc-mailpoet-manager' )
		);
	}
}

DC_MailPoet_Manager::instance();
