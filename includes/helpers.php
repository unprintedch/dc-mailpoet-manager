<?php
/**
 * Shared helper functions.
 *
 * @package DC_MailPoet_Manager
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Get a prefixed MailPoet table name.
 */
function dcmm_table( string $name ): string {
	global $wpdb;

	$tables = [
		'subscribers'              => 'mailpoet_subscribers',
		'custom_fields'            => 'mailpoet_custom_fields',
		'subscriber_custom_field'  => 'mailpoet_subscriber_custom_field',
		'tags'                     => 'mailpoet_tags',
		'subscriber_tag'           => 'mailpoet_subscriber_tag',
		'segments'                 => 'mailpoet_segments',
		'subscriber_segment'       => 'mailpoet_subscriber_segment',
	];

	if ( ! isset( $tables[ $name ] ) ) {
		wp_die( esc_html( "Unknown MailPoet table alias: {$name}" ) );
	}

	return $wpdb->prefix . $tables[ $name ];
}

/**
 * Sanitize an array of integers.
 *
 * @param mixed $input Raw input (array or other).
 * @return int[]
 */
function dcmm_sanitize_int_array( mixed $input ): array {
	if ( ! is_array( $input ) ) {
		return [];
	}
	return array_values( array_filter( array_map( 'absint', $input ) ) );
}

/**
 * Validate sort column against allowlist.
 */
function dcmm_validate_sort( string $sort ): string {
	$allowed = [ 'email', 'first_name', 'last_name', 'status', 'created_at', 'npa' ];
	return in_array( $sort, $allowed, true ) ? $sort : 'created_at';
}

/**
 * Validate sort order.
 */
function dcmm_validate_order( string $order ): string {
	return strtolower( $order ) === 'asc' ? 'ASC' : 'DESC';
}
