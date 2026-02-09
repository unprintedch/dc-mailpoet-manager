/**
 * Hook to fetch MailPoet metadata (tags, lists, custom fields).
 */
import { useState, useEffect } from '@wordpress/element';
import { fetchMeta } from '../api';

export default function useMeta() {
	const [ meta, setMeta ] = useState( {
		tags: [],
		lists: [],
		custom_fields: [],
		npa_field_id: null,
		loading: true,
		error: null,
	} );

	useEffect( () => {
		let cancelled = false;

		fetchMeta()
			.then( ( data ) => {
				if ( ! cancelled ) {
					setMeta( {
						tags: data.tags || [],
						lists: data.lists || [],
						custom_fields: data.custom_fields || [],
						npa_field_id: data.npa_field_id,
						loading: false,
						error: null,
					} );
				}
			} )
			.catch( ( err ) => {
				if ( ! cancelled ) {
					setMeta( ( prev ) => ( {
						...prev,
						loading: false,
						error: err.message || 'Failed to load metadata.',
					} ) );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [] );

	return meta;
}
