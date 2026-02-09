<?php
/**
 * Plugin Name: DC MailPoet Manager
 * Description: Modern admin UI for managing MailPoet subscribers with advanced filtering, sorting, and bulk actions.
 * Version:     1.0.0
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

define( 'DCMM_VERSION', '1.0.0' );
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

	public function render_admin_page(): void {
		echo '<div class="wrap"><div id="dc-mailpoet-manager-app"></div></div>';
	}

	public function enqueue_assets( string $hook_suffix ): void {
		if ( 'tools_page_dc-mailpoet-manager' !== $hook_suffix ) {
			return;
		}

		$asset_file = DCMM_PLUGIN_DIR . 'build/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'dc-mailpoet-manager',
			DCMM_PLUGIN_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);

		wp_enqueue_style(
			'dc-mailpoet-manager',
			DCMM_PLUGIN_URL . 'build/style-index.css',
			[ 'wp-components' ],
			$asset['version']
		);

		wp_localize_script( 'dc-mailpoet-manager', 'dcMailPoetManager', [
			'restUrl' => rest_url( 'dc-mailpoet/v1/' ),
			'nonce'   => wp_create_nonce( 'wp_rest' ),
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
