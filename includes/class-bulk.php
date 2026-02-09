<?php
/**
 * Bulk mutation operations on MailPoet data.
 *
 * @package DC_MailPoet_Manager
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class DCMM_Bulk {

	/**
	 * Execute a bulk action on a chunk of subscriber IDs.
	 *
	 * @param string $action   Action name.
	 * @param int[]  $ids      All subscriber IDs.
	 * @param int[]  $tag_ids  Tag IDs (for add/remove tag).
	 * @param int[]  $list_ids List IDs (for add/remove list).
	 * @param int    $offset   Current offset into $ids.
	 * @param int    $chunk    Chunk size.
	 * @return array{ok: bool, processed: int, remaining: int, download_url?: string, message?: string}
	 */
	public function execute(
		string $action,
		array $ids,
		array $tag_ids,
		array $list_ids,
		int $offset,
		int $chunk
	): array {
		$total      = count( $ids );
		$chunk_ids  = array_slice( $ids, $offset, $chunk );
		$processed  = $offset + count( $chunk_ids );
		$remaining  = max( 0, $total - $processed );

		if ( empty( $chunk_ids ) ) {
			return [ 'ok' => true, 'processed' => $processed, 'remaining' => 0 ];
		}

		$result = match ( $action ) {
			'add_tag'      => $this->add_tags( $chunk_ids, $tag_ids ),
			'remove_tag'   => $this->remove_tags( $chunk_ids, $tag_ids ),
			'add_list'     => $this->add_lists( $chunk_ids, $list_ids ),
			'remove_list'  => $this->remove_lists( $chunk_ids, $list_ids ),
			'unsubscribe'  => $this->unsubscribe( $chunk_ids ),
			'export_csv'   => $this->export_csv( $ids, $offset, $chunk ),
			default        => [ 'ok' => false, 'message' => 'Unknown action.' ],
		};

		if ( isset( $result['ok'] ) && ! $result['ok'] ) {
			return $result;
		}

		$response = [
			'ok'        => true,
			'processed' => $processed,
			'remaining' => $remaining,
		];

		if ( isset( $result['download_url'] ) ) {
			$response['download_url'] = $result['download_url'];
		}

		return $response;
	}

	/**
	 * Add tags to subscribers (INSERT IGNORE).
	 */
	private function add_tags( array $subscriber_ids, array $tag_ids ): array {
		global $wpdb;

		if ( empty( $tag_ids ) ) {
			return [ 'ok' => false, 'message' => 'No tag IDs provided.' ];
		}

		$table  = dcmm_table( 'subscriber_tag' );
		$values = [];
		$placeholders = [];

		foreach ( $subscriber_ids as $sid ) {
			foreach ( $tag_ids as $tid ) {
				$placeholders[] = '(%d, %d, NOW())';
				$values[]       = $sid;
				$values[]       = $tid;
			}
		}

		$sql = "INSERT IGNORE INTO {$table} (subscriber_id, tag_id, created_at) VALUES " . implode( ', ', $placeholders );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( $sql, $values ) );

		return [ 'ok' => true ];
	}

	/**
	 * Remove tags from subscribers.
	 */
	private function remove_tags( array $subscriber_ids, array $tag_ids ): array {
		global $wpdb;

		if ( empty( $tag_ids ) ) {
			return [ 'ok' => false, 'message' => 'No tag IDs provided.' ];
		}

		$table = dcmm_table( 'subscriber_tag' );

		$sid_placeholders = implode( ',', array_fill( 0, count( $subscriber_ids ), '%d' ) );
		$tid_placeholders = implode( ',', array_fill( 0, count( $tag_ids ), '%d' ) );

		$sql    = "DELETE FROM {$table} WHERE subscriber_id IN ({$sid_placeholders}) AND tag_id IN ({$tid_placeholders})";
		$values = array_merge( $subscriber_ids, $tag_ids );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( $sql, $values ) );

		return [ 'ok' => true ];
	}

	/**
	 * Add lists (segments) to subscribers.
	 */
	private function add_lists( array $subscriber_ids, array $list_ids ): array {
		global $wpdb;

		if ( empty( $list_ids ) ) {
			return [ 'ok' => false, 'message' => 'No list IDs provided.' ];
		}

		$table  = dcmm_table( 'subscriber_segment' );
		$values = [];
		$placeholders = [];

		foreach ( $subscriber_ids as $sid ) {
			foreach ( $list_ids as $lid ) {
				$placeholders[] = '(%d, %d, %s, NOW(), NOW())';
				$values[]       = $sid;
				$values[]       = $lid;
				$values[]       = 'subscribed';
			}
		}

		$sql = "INSERT IGNORE INTO {$table} (subscriber_id, segment_id, status, created_at, updated_at) VALUES " . implode( ', ', $placeholders );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( $sql, $values ) );

		return [ 'ok' => true ];
	}

	/**
	 * Remove lists (segments) from subscribers.
	 */
	private function remove_lists( array $subscriber_ids, array $list_ids ): array {
		global $wpdb;

		if ( empty( $list_ids ) ) {
			return [ 'ok' => false, 'message' => 'No list IDs provided.' ];
		}

		$table = dcmm_table( 'subscriber_segment' );

		$sid_placeholders = implode( ',', array_fill( 0, count( $subscriber_ids ), '%d' ) );
		$lid_placeholders = implode( ',', array_fill( 0, count( $list_ids ), '%d' ) );

		$sql    = "DELETE FROM {$table} WHERE subscriber_id IN ({$sid_placeholders}) AND segment_id IN ({$lid_placeholders})";
		$values = array_merge( $subscriber_ids, $list_ids );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( $sql, $values ) );

		return [ 'ok' => true ];
	}

	/**
	 * Set subscriber status to 'unsubscribed'.
	 */
	private function unsubscribe( array $subscriber_ids ): array {
		global $wpdb;

		$table        = dcmm_table( 'subscribers' );
		$placeholders = implode( ',', array_fill( 0, count( $subscriber_ids ), '%d' ) );

		$sql = "UPDATE {$table} SET status = 'unsubscribed', updated_at = NOW() WHERE id IN ({$placeholders})";

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( $sql, $subscriber_ids ) );

		return [ 'ok' => true ];
	}

	/**
	 * Export subscribers to CSV.
	 *
	 * Generates the full file on the first chunk and returns the download URL.
	 * For simplicity, we generate the complete CSV in one pass (the IDs are already limited to 5000).
	 *
	 * @param int[] $all_ids All subscriber IDs to export.
	 * @param int   $offset  Current offset.
	 * @param int   $chunk   Chunk size.
	 * @return array{ok: bool, download_url?: string}
	 */
	private function export_csv( array $all_ids, int $offset, int $chunk ): array {
		// Only generate on first chunk; subsequent chunks are no-ops reporting progress.
		if ( $offset > 0 ) {
			return [ 'ok' => true ];
		}

		global $wpdb;

		$upload_dir = wp_upload_dir();
		$export_dir = $upload_dir['basedir'] . '/dc-mailpoet-manager/exports';

		if ( ! file_exists( $export_dir ) ) {
			wp_mkdir_p( $export_dir );
		}

		$filename     = 'export-' . wp_generate_password( 16, false ) . '.csv';
		$filepath     = $export_dir . '/' . $filename;
		$download_url = $upload_dir['baseurl'] . '/dc-mailpoet-manager/exports/' . $filename;

		$handle = fopen( $filepath, 'w' );
		if ( ! $handle ) {
			return [ 'ok' => false, 'message' => 'Could not create export file.' ];
		}

		// CSV header.
		fputcsv( $handle, [ 'email', 'first_name', 'last_name', 'status', 'npa', 'tags', 'lists', 'created_at' ] );

		// Fetch data in batches to handle large exports.
		$queries  = new DCMM_Queries();
		$npa_id   = $queries->detect_npa_field_id();
		$t_sub    = dcmm_table( 'subscribers' );
		$t_scf    = dcmm_table( 'subscriber_custom_field' );
		$t_stag   = dcmm_table( 'subscriber_tag' );
		$t_tags   = dcmm_table( 'tags' );
		$t_sseg   = dcmm_table( 'subscriber_segment' );
		$t_segs   = dcmm_table( 'segments' );

		$batch_size = 500;
		$batches    = array_chunk( $all_ids, $batch_size );

		foreach ( $batches as $batch ) {
			$id_placeholders = implode( ',', array_fill( 0, count( $batch ), '%d' ) );

			// Subscribers + NPA.
			$npa_join   = '';
			$npa_select = 'NULL AS npa';
			if ( $npa_id ) {
				$npa_join   = $wpdb->prepare(
					"LEFT JOIN {$t_scf} npa ON npa.subscriber_id = s.id AND npa.custom_field_id = %d",
					$npa_id
				);
				$npa_select = 'npa.value AS npa';
			}

			$sql = "SELECT s.id, s.email, s.first_name, s.last_name, s.status, s.created_at, {$npa_select}
					FROM {$t_sub} s {$npa_join}
					WHERE s.id IN ({$id_placeholders})";

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.NotPrepared
			$rows = $wpdb->get_results( $wpdb->prepare( $sql, $batch ), ARRAY_A );
			if ( ! $rows ) {
				continue;
			}

			$id_list = implode( ',', array_map( fn( $r ) => (int) $r['id'], $rows ) );

			// Tags.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$tag_rows = $wpdb->get_results(
				"SELECT st.subscriber_id, t.name
				 FROM {$t_stag} st JOIN {$t_tags} t ON t.id = st.tag_id
				 WHERE st.subscriber_id IN ({$id_list})",
				ARRAY_A
			);
			$tags_map = [];
			foreach ( ( $tag_rows ?: [] ) as $tr ) {
				$tags_map[ (int) $tr['subscriber_id'] ][] = $tr['name'];
			}

			// Lists.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$list_rows = $wpdb->get_results(
				"SELECT ss.subscriber_id, seg.name
				 FROM {$t_sseg} ss JOIN {$t_segs} seg ON seg.id = ss.segment_id
				 WHERE ss.subscriber_id IN ({$id_list})",
				ARRAY_A
			);
			$lists_map = [];
			foreach ( ( $list_rows ?: [] ) as $lr ) {
				$lists_map[ (int) $lr['subscriber_id'] ][] = $lr['name'];
			}

			// Write rows.
			foreach ( $rows as $row ) {
				$sid = (int) $row['id'];
				fputcsv( $handle, [
					$row['email'],
					$row['first_name'],
					$row['last_name'],
					$row['status'],
					$row['npa'] ?? '',
					implode( ', ', $tags_map[ $sid ] ?? [] ),
					implode( ', ', $lists_map[ $sid ] ?? [] ),
					$row['created_at'],
				] );
			}
		}

		fclose( $handle );

		return [ 'ok' => true, 'download_url' => $download_url ];
	}
}
