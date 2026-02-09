<?php
/**
 * REST API route registration and callbacks.
 *
 * @package DC_MailPoet_Manager
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class DCMM_REST {

	private const NAMESPACE = 'dc-mailpoet/v1';

	public function register_routes(): void {
		register_rest_route( self::NAMESPACE, '/meta', [
			'methods'             => 'GET',
			'callback'            => [ $this, 'get_meta' ],
			'permission_callback' => [ $this, 'check_permission' ],
		] );

		register_rest_route( self::NAMESPACE, '/subscribers', [
			'methods'             => 'GET',
			'callback'            => [ $this, 'get_subscribers' ],
			'permission_callback' => [ $this, 'check_permission' ],
			'args'                => $this->get_subscribers_args(),
		] );

		register_rest_route( self::NAMESPACE, '/bulk', [
			'methods'             => 'POST',
			'callback'            => [ $this, 'post_bulk' ],
			'permission_callback' => [ $this, 'check_permission' ],
		] );
	}

	public function check_permission(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * GET /meta — tags, lists, custom fields, NPA field id.
	 */
	public function get_meta( WP_REST_Request $request ): WP_REST_Response {
		$queries = new DCMM_Queries();

		return new WP_REST_Response( [
			'tags'          => $queries->get_tags(),
			'lists'         => $queries->get_lists(),
			'custom_fields' => $queries->get_custom_fields(),
			'npa_field_id'  => $queries->detect_npa_field_id(),
		], 200 );
	}

	/**
	 * GET /subscribers — filtered, sorted, paginated.
	 */
	public function get_subscribers( WP_REST_Request $request ): WP_REST_Response {
		$queries = new DCMM_Queries();

		$params = [
			'page'       => absint( $request->get_param( 'page' ) ?: 1 ),
			'per_page'   => min( absint( $request->get_param( 'per_page' ) ?: 25 ), 200 ),
			'search'     => sanitize_text_field( $request->get_param( 'search' ) ?? '' ),
			'status'     => sanitize_text_field( $request->get_param( 'status' ) ?? '' ),
			'tags'       => dcmm_sanitize_int_array( $request->get_param( 'tags' ) ?? [] ),
			'tags_mode'  => ( $request->get_param( 'tags_mode' ) === 'all' ) ? 'all' : 'any',
			'lists'      => dcmm_sanitize_int_array( $request->get_param( 'lists' ) ?? [] ),
			'lists_mode' => ( $request->get_param( 'lists_mode' ) === 'all' ) ? 'all' : 'any',
			'npa'        => sanitize_text_field( $request->get_param( 'npa' ) ?? '' ),
			'npa_min'    => sanitize_text_field( $request->get_param( 'npa_min' ) ?? '' ),
			'npa_max'    => sanitize_text_field( $request->get_param( 'npa_max' ) ?? '' ),
			'sort'       => dcmm_validate_sort( sanitize_text_field( $request->get_param( 'sort' ) ?? 'created_at' ) ),
			'order'      => dcmm_validate_order( sanitize_text_field( $request->get_param( 'order' ) ?? 'desc' ) ),
		];

		$result = $queries->get_subscribers( $params );

		return new WP_REST_Response( $result, 200 );
	}

	/**
	 * POST /bulk — chunked bulk actions.
	 */
	public function post_bulk( WP_REST_Request $request ): WP_REST_Response {
		$body = $request->get_json_params();

		$action   = sanitize_text_field( $body['action'] ?? '' );
		$ids      = dcmm_sanitize_int_array( $body['ids'] ?? [] );
		$tag_ids  = dcmm_sanitize_int_array( $body['tag_ids'] ?? [] );
		$list_ids = dcmm_sanitize_int_array( $body['list_ids'] ?? [] );
		$offset   = absint( $body['offset'] ?? 0 );
		$chunk    = min( absint( $body['chunk'] ?? 500 ), 500 );

		if ( empty( $ids ) ) {
			return new WP_REST_Response( [ 'ok' => false, 'message' => 'No subscriber IDs provided.' ], 400 );
		}

		if ( count( $ids ) > 5000 ) {
			return new WP_REST_Response( [ 'ok' => false, 'message' => 'Maximum 5000 IDs per request.' ], 400 );
		}

		$allowed_actions = [ 'add_tag', 'remove_tag', 'add_list', 'remove_list', 'unsubscribe', 'export_csv' ];
		if ( ! in_array( $action, $allowed_actions, true ) ) {
			return new WP_REST_Response( [ 'ok' => false, 'message' => 'Invalid action.' ], 400 );
		}

		$bulk   = new DCMM_Bulk();
		$result = $bulk->execute( $action, $ids, $tag_ids, $list_ids, $offset, $chunk );

		$status = $result['ok'] ? 200 : 500;

		return new WP_REST_Response( $result, $status );
	}

	/**
	 * Schema for GET /subscribers args.
	 */
	private function get_subscribers_args(): array {
		return [
			'page'       => [ 'type' => 'integer', 'default' => 1, 'minimum' => 1 ],
			'per_page'   => [ 'type' => 'integer', 'default' => 25, 'minimum' => 1, 'maximum' => 200 ],
			'search'     => [ 'type' => 'string', 'default' => '' ],
			'status'     => [ 'type' => 'string', 'default' => '' ],
			'tags'       => [ 'type' => 'array', 'items' => [ 'type' => 'integer' ], 'default' => [] ],
			'tags_mode'  => [ 'type' => 'string', 'default' => 'any', 'enum' => [ 'any', 'all' ] ],
			'lists'      => [ 'type' => 'array', 'items' => [ 'type' => 'integer' ], 'default' => [] ],
			'lists_mode' => [ 'type' => 'string', 'default' => 'any', 'enum' => [ 'any', 'all' ] ],
			'npa'        => [ 'type' => 'string', 'default' => '' ],
			'npa_min'    => [ 'type' => 'string', 'default' => '' ],
			'npa_max'    => [ 'type' => 'string', 'default' => '' ],
			'sort'       => [ 'type' => 'string', 'default' => 'created_at' ],
			'order'      => [ 'type' => 'string', 'default' => 'desc', 'enum' => [ 'asc', 'desc' ] ],
		];
	}
}
