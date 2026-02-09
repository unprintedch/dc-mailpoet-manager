/**
 * Hook for chunked bulk action execution with progress tracking.
 */
import { useState, useCallback } from '@wordpress/element';
import { executeBulk } from '../api';

export default function useBulk( onComplete ) {
	const [ progress, setProgress ] = useState( null );
	const [ running, setRunning ] = useState( false );
	const [ error, setError ] = useState( null );
	const [ downloadUrl, setDownloadUrl ] = useState( null );

	const run = useCallback( async ( action, ids, { tag_ids = [], list_ids = [] } = {} ) => {
		setRunning( true );
		setError( null );
		setDownloadUrl( null );
		setProgress( { processed: 0, total: ids.length } );

		try {
			const result = await executeBulk(
				{ action, ids, tag_ids, list_ids },
				( chunk ) => {
					setProgress( {
						processed: chunk.processed,
						total: ids.length,
					} );
				}
			);

			if ( result?.download_url ) {
				setDownloadUrl( result.download_url );
				window.open( result.download_url, '_blank' );
			}

			if ( onComplete ) {
				onComplete();
			}
		} catch ( err ) {
			setError( err.message || 'Bulk action failed.' );
		} finally {
			setRunning( false );
		}
	}, [ onComplete ] );

	const reset = useCallback( () => {
		setProgress( null );
		setError( null );
		setDownloadUrl( null );
	}, [] );

	return { run, running, progress, error, downloadUrl, reset };
}
