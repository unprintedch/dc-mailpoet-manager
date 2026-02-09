<?php
/**
 * Database queries for reading MailPoet data.
 *
 * @package DC_MailPoet_Manager
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class DCMM_Queries {

	/**
	 * Get all MailPoet tags.
	 *
	 * @return array<int, array{id: int, name: string}>
	 */
	public function get_tags(): array {
		global $wpdb;

		$table = dcmm_table( 'tags' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( "SELECT id, name FROM {$table} ORDER BY name ASC", ARRAY_A );

		return array_map( fn( $r ) => [
			'id'   => (int) $r['id'],
			'name' => $r['name'],
		], $rows ?: [] );
	}

	/**
	 * Get all MailPoet segments (lists).
	 *
	 * @return array<int, array{id: int, name: string}>
	 */
	public function get_lists(): array {
		global $wpdb;

		$table = dcmm_table( 'segments' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( "SELECT id, name FROM {$table} ORDER BY name ASC", ARRAY_A );

		return array_map( fn( $r ) => [
			'id'   => (int) $r['id'],
			'name' => $r['name'],
		], $rows ?: [] );
	}

	/**
	 * Get all MailPoet custom fields.
	 *
	 * @return array<int, array{id: int, name: string, type: string}>
	 */
	public function get_custom_fields(): array {
		global $wpdb;

		$table = dcmm_table( 'custom_fields' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $wpdb->get_results( "SELECT id, name, type FROM {$table} ORDER BY name ASC", ARRAY_A );

		return array_map( fn( $r ) => [
			'id'   => (int) $r['id'],
			'name' => $r['name'],
			'type' => $r['type'],
		], $rows ?: [] );
	}

	/**
	 * Auto-detect the NPA custom field ID.
	 */
	public function detect_npa_field_id(): ?int {
		global $wpdb;

		$table = dcmm_table( 'custom_fields' );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$id = $wpdb->get_var( "SELECT id FROM {$table} WHERE LOWER(name) = 'npa' LIMIT 1" );

		return $id !== null ? (int) $id : null;
	}

	/**
	 * Get paginated subscribers with filters.
	 *
	 * Uses a 3-query strategy:
	 * 1) Main query for subscriber rows + NPA + count
	 * 2) Tags for the page's subscriber IDs
	 * 3) Lists for the page's subscriber IDs
	 *
	 * @param array $params Validated filter params.
	 * @return array{items: array, total: int}
	 */
	public function get_subscribers( array $params ): array {
		global $wpdb;

		$t_sub   = dcmm_table( 'subscribers' );
		$t_scf   = dcmm_table( 'subscriber_custom_field' );
		$t_stag  = dcmm_table( 'subscriber_tag' );
		$t_sseg  = dcmm_table( 'subscriber_segment' );

		$npa_field_id = ! empty( $params['npa_field_id'] )
			? (int) $params['npa_field_id']
			: $this->detect_npa_field_id();

		// Build WHERE clauses.
		$where   = [];
		$values  = [];

		// Search filter.
		if ( $params['search'] !== '' ) {
			$like     = '%' . $wpdb->esc_like( $params['search'] ) . '%';
			$where[]  = '(s.email LIKE %s OR s.first_name LIKE %s OR s.last_name LIKE %s)';
			$values[] = $like;
			$values[] = $like;
			$values[] = $like;
		}

		// Status filter.
		if ( $params['status'] !== '' ) {
			$where[]  = 's.status = %s';
			$values[] = $params['status'];
		}

		// NPA exact.
		if ( $params['npa'] !== '' && $npa_field_id ) {
			$where[]  = 'npa.value = %s';
			$values[] = $params['npa'];
		}

		// NPA range.
		if ( $params['npa_min'] !== '' && $params['npa_max'] !== '' && $npa_field_id ) {
			$where[]  = 'CAST(npa.value AS UNSIGNED) BETWEEN %d AND %d';
			$values[] = (int) $params['npa_min'];
			$values[] = (int) $params['npa_max'];
		} elseif ( $params['npa_min'] !== '' && $npa_field_id ) {
			$where[]  = 'CAST(npa.value AS UNSIGNED) >= %d';
			$values[] = (int) $params['npa_min'];
		} elseif ( $params['npa_max'] !== '' && $npa_field_id ) {
			$where[]  = 'CAST(npa.value AS UNSIGNED) <= %d';
			$values[] = (int) $params['npa_max'];
		}

		// Tags filter.
		if ( ! empty( $params['tags'] ) ) {
			$tag_placeholders = implode( ',', array_fill( 0, count( $params['tags'] ), '%d' ) );

			if ( $params['tags_mode'] === 'all' ) {
				$where[] = "s.id IN (
					SELECT subscriber_id FROM {$t_stag}
					WHERE tag_id IN ({$tag_placeholders})
					GROUP BY subscriber_id
					HAVING COUNT(DISTINCT tag_id) = %d
				)";
				$values  = array_merge( $values, $params['tags'], [ count( $params['tags'] ) ] );
			} else {
				$where[] = "s.id IN (
					SELECT subscriber_id FROM {$t_stag}
					WHERE tag_id IN ({$tag_placeholders})
				)";
				$values = array_merge( $values, $params['tags'] );
			}
		}

		// Lists filter.
		if ( ! empty( $params['lists'] ) ) {
			$list_placeholders = implode( ',', array_fill( 0, count( $params['lists'] ), '%d' ) );

			if ( $params['lists_mode'] === 'all' ) {
				$where[] = "s.id IN (
					SELECT subscriber_id FROM {$t_sseg}
					WHERE segment_id IN ({$list_placeholders})
					GROUP BY subscriber_id
					HAVING COUNT(DISTINCT segment_id) = %d
				)";
				$values = array_merge( $values, $params['lists'], [ count( $params['lists'] ) ] );
			} else {
				$where[] = "s.id IN (
					SELECT subscriber_id FROM {$t_sseg}
					WHERE segment_id IN ({$list_placeholders})
				)";
				$values = array_merge( $values, $params['lists'] );
			}
		}

		$where_sql = ! empty( $where ) ? 'AND ' . implode( ' AND ', $where ) : '';

		// NPA JOIN.
		$npa_join = '';
		$npa_select = 'NULL AS npa';
		if ( $npa_field_id ) {
			$npa_join   = $wpdb->prepare(
				"LEFT JOIN {$t_scf} npa ON npa.subscriber_id = s.id AND npa.custom_field_id = %d",
				$npa_field_id
			);
			$npa_select = 'npa.value AS npa';
		}

		// Sort.
		$sort_col = $params['sort'];
		$order    = $params['order'];

		if ( $sort_col === 'npa' && $npa_field_id ) {
			$order_sql = "ORDER BY CAST(npa.value AS UNSIGNED) {$order}";
		} elseif ( $sort_col === 'npa' ) {
			$order_sql = "ORDER BY s.created_at {$order}";
		} else {
			$order_sql = "ORDER BY s.{$sort_col} {$order}";
		}

		// Pagination.
		$limit  = $params['per_page'];
		$offset = ( $params['page'] - 1 ) * $limit;

		// Query 1: main rows.
		$sql = "SELECT s.id, s.email, s.first_name, s.last_name, s.status, s.created_at, {$npa_select}
				FROM {$t_sub} s
				{$npa_join}
				WHERE 1=1 {$where_sql}
				{$order_sql}
				LIMIT %d OFFSET %d";

		$query_values   = array_merge( $values, [ $limit, $offset ] );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$rows = $wpdb->get_results( $wpdb->prepare( $sql, $query_values ), ARRAY_A );

		if ( ! $rows ) {
			$rows = [];
		}

		// Query 1b: total count.
		$count_sql = "SELECT COUNT(DISTINCT s.id)
					  FROM {$t_sub} s
					  {$npa_join}
					  WHERE 1=1 {$where_sql}";

		if ( ! empty( $values ) ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
			$total = (int) $wpdb->get_var( $wpdb->prepare( $count_sql, $values ) );
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
			$total = (int) $wpdb->get_var( $count_sql );
		}

		if ( empty( $rows ) ) {
			return [ 'items' => [], 'total' => $total ];
		}

		$subscriber_ids = array_map( fn( $r ) => (int) $r['id'], $rows );
		$id_list        = implode( ',', $subscriber_ids );

		// Query 2: tags for these subscribers.
		$t_tags = dcmm_table( 'tags' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$tag_rows = $wpdb->get_results(
			"SELECT st.subscriber_id, t.id, t.name
			 FROM {$t_stag} st
			 JOIN {$t_tags} t ON t.id = st.tag_id
			 WHERE st.subscriber_id IN ({$id_list})",
			ARRAY_A
		);

		$tags_map = [];
		foreach ( ( $tag_rows ?: [] ) as $tr ) {
			$tags_map[ (int) $tr['subscriber_id'] ][] = [
				'id'   => (int) $tr['id'],
				'name' => $tr['name'],
			];
		}

		// Query 3: lists for these subscribers.
		$t_segs = dcmm_table( 'segments' );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$list_rows = $wpdb->get_results(
			"SELECT ss.subscriber_id, seg.id, seg.name
			 FROM {$t_sseg} ss
			 JOIN {$t_segs} seg ON seg.id = ss.segment_id
			 WHERE ss.subscriber_id IN ({$id_list})",
			ARRAY_A
		);

		$lists_map = [];
		foreach ( ( $list_rows ?: [] ) as $lr ) {
			$lists_map[ (int) $lr['subscriber_id'] ][] = [
				'id'   => (int) $lr['id'],
				'name' => $lr['name'],
			];
		}

		// Assemble items.
		$items = [];
		foreach ( $rows as $row ) {
			$sid     = (int) $row['id'];
			$items[] = [
				'id'         => $sid,
				'email'      => $row['email'],
				'first_name' => $row['first_name'],
				'last_name'  => $row['last_name'],
				'status'     => $row['status'],
				'created_at' => $row['created_at'],
				'npa'        => $row['npa'],
				'tags'       => $tags_map[ $sid ] ?? [],
				'lists'      => $lists_map[ $sid ] ?? [],
			];
		}

		return [ 'items' => $items, 'total' => $total ];
	}
}
