/**
 * API wrapper functions for dc-mailpoet/v1 endpoints.
 */
import apiFetch from '@wordpress/api-fetch';

const { restUrl, nonce } = window.dcMailPoetManager || {};

apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
apiFetch.use( apiFetch.createRootURLMiddleware( restUrl ) );

/**
 * GET /meta
 */
export async function fetchMeta() {
	return apiFetch( { path: 'dc-mailpoet/v1/meta' } );
}

/**
 * GET /subscribers with filter params.
 */
export async function fetchSubscribers( params ) {
	const query = new URLSearchParams();

	if ( params.page ) query.set( 'page', params.page );
	if ( params.per_page ) query.set( 'per_page', params.per_page );
	if ( params.search ) query.set( 'search', params.search );
	if ( params.status ) query.set( 'status', params.status );
	if ( params.sort ) query.set( 'sort', params.sort );
	if ( params.order ) query.set( 'order', params.order );
	if ( params.npa ) query.set( 'npa', params.npa );
	if ( params.npa_min ) query.set( 'npa_min', params.npa_min );
	if ( params.npa_max ) query.set( 'npa_max', params.npa_max );

	if ( params.tags?.length ) {
		params.tags.forEach( ( t ) => query.append( 'tags[]', t ) );
		if ( params.tags_mode ) query.set( 'tags_mode', params.tags_mode );
	}
	if ( params.lists?.length ) {
		params.lists.forEach( ( l ) => query.append( 'lists[]', l ) );
		if ( params.lists_mode ) query.set( 'lists_mode', params.lists_mode );
	}

	return apiFetch( { path: `dc-mailpoet/v1/subscribers?${ query.toString() }` } );
}

/**
 * POST /bulk with chunked processing.
 *
 * @param {Object}   body          Request body.
 * @param {Function} onProgress    Called with { processed, remaining } after each chunk.
 * @return {Object} Final result with optional download_url.
 */
export async function executeBulk( body, onProgress ) {
	const chunk = body.chunk || 500;
	let offset = 0;
	let lastResult = null;

	while ( true ) {
		const result = await apiFetch( {
			path: 'dc-mailpoet/v1/bulk',
			method: 'POST',
			data: { ...body, offset, chunk },
		} );

		lastResult = result;

		if ( onProgress ) {
			onProgress( result );
		}

		if ( ! result.ok || result.remaining <= 0 ) {
			break;
		}

		offset = result.processed;
	}

	return lastResult;
}
