/**
 * Main App component — orchestrates state between filters, table, bulk bar.
 */
import { useState, useCallback } from '@wordpress/element';
import { Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import useMeta from './hooks/useMeta';
import useSubscribers from './hooks/useSubscribers';
import useBulk from './hooks/useBulk';

import FiltersBar from './components/FiltersBar';
import SubscribersTable from './components/SubscribersTable';
import BulkBar from './components/BulkBar';
import Pagination from './components/Pagination';

export default function App() {
	const meta = useMeta();
	const { data, filters, loading, error, updateFilters, refresh } = useSubscribers();
	const [ rowSelection, setRowSelection ] = useState( {} );

	const bulk = useBulk( useCallback( () => {
		setRowSelection( {} );
		refresh();
	}, [ refresh ] ) );

	const selectedIds = Object.keys( rowSelection )
		.filter( ( k ) => rowSelection[ k ] )
		.map( ( idx ) => data.items[ parseInt( idx, 10 ) ]?.id )
		.filter( Boolean );

	if ( meta.loading ) {
		return (
			<div className="dcmm-loading">
				<Spinner />
				<p>{ __( 'Loading MailPoet data…', 'dc-mailpoet-manager' ) }</p>
			</div>
		);
	}

	if ( meta.error ) {
		return (
			<Notice status="error" isDismissible={ false }>
				{ meta.error }
			</Notice>
		);
	}

	return (
		<div className="dcmm-app">
			<h1 className="dcmm-title">{ __( 'MailPoet Manager', 'dc-mailpoet-manager' ) }</h1>

			<FiltersBar
				filters={ filters }
				meta={ meta }
				onFilterChange={ updateFilters }
			/>

			{ error && (
				<Notice status="error" isDismissible={ false }>
					{ error }
				</Notice>
			) }

			<BulkBar
				selectedIds={ selectedIds }
				meta={ meta }
				bulk={ bulk }
			/>

			<SubscribersTable
				items={ data.items }
				loading={ loading }
				sorting={ { sort: filters.sort, order: filters.order } }
				onSortChange={ ( sort, order ) => updateFilters( { sort, order }, true ) }
				rowSelection={ rowSelection }
				onRowSelectionChange={ setRowSelection }
			/>

			<Pagination
				page={ filters.page }
				perPage={ filters.per_page }
				total={ data.total }
				onPageChange={ ( page ) => updateFilters( { page }, true ) }
				onPerPageChange={ ( per_page ) => updateFilters( { per_page, page: 1 }, true ) }
			/>
		</div>
	);
}
