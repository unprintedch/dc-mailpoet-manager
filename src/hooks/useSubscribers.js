/**
 * Hook to fetch subscribers with debounced filters.
 */
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import { fetchSubscribers } from '../api';

const DEFAULT_FILTERS = {
	page: 1,
	per_page: 25,
	search: '',
	status: '',
	tags: [],
	tags_mode: 'any',
	lists: [],
	lists_mode: 'any',
	npa: '',
	npa_min: '',
	npa_max: '',
	sort: 'created_at',
	order: 'desc',
};

export default function useSubscribers() {
	const [ filters, setFilters ] = useState( DEFAULT_FILTERS );
	const [ data, setData ] = useState( { items: [], total: 0 } );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState( null );
	const debounceRef = useRef( null );
	const requestIdRef = useRef( 0 );

	const load = useCallback( ( params ) => {
		const id = ++requestIdRef.current;
		setLoading( true );
		setError( null );

		fetchSubscribers( params )
			.then( ( result ) => {
				if ( id === requestIdRef.current ) {
					setData( result );
					setLoading( false );
				}
			} )
			.catch( ( err ) => {
				if ( id === requestIdRef.current ) {
					setError( err.message || 'Failed to load subscribers.' );
					setLoading( false );
				}
			} );
	}, [] );

	// Debounced filter changes (search, npa inputs).
	const updateFilters = useCallback( ( updates, immediate = false ) => {
		setFilters( ( prev ) => {
			const next = { ...prev, ...updates };

			// Reset page to 1 when filters change (except page/per_page/sort/order).
			const filterKeys = [ 'search', 'status', 'tags', 'lists', 'npa', 'npa_min', 'npa_max', 'tags_mode', 'lists_mode' ];
			const isFilterChange = Object.keys( updates ).some( ( k ) => filterKeys.includes( k ) );
			if ( isFilterChange ) {
				next.page = 1;
			}

			if ( debounceRef.current ) {
				clearTimeout( debounceRef.current );
			}

			if ( immediate ) {
				load( next );
			} else {
				debounceRef.current = setTimeout( () => load( next ), 300 );
			}

			return next;
		} );
	}, [ load ] );

	// Initial load.
	useEffect( () => {
		load( filters );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );

	const refresh = useCallback( () => {
		load( filters );
	}, [ filters, load ] );

	return {
		data,
		filters,
		loading,
		error,
		updateFilters,
		refresh,
	};
}
