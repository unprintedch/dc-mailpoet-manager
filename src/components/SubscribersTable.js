/**
 * Subscribers data table using TanStack Table v8.
 */
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
} from '@tanstack/react-table';
import { useMemo } from '@wordpress/element';
import { CheckboxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const STATUS_COLORS = {
	subscribed: '#00a32a',
	unsubscribed: '#d63638',
	bounced: '#dba617',
	inactive: '#8c8f94',
	unconfirmed: '#72aee6',
};

function StatusBadge( { value } ) {
	const color = STATUS_COLORS[ value ] || '#8c8f94';
	return (
		<span
			className="dcmm-status-badge"
			style={ {
				backgroundColor: color + '1a',
				color,
				borderColor: color,
			} }
		>
			{ value }
		</span>
	);
}

function TagChips( { items } ) {
	if ( ! items?.length ) return <span className="dcmm-muted">—</span>;
	return (
		<span className="dcmm-chips">
			{ items.map( ( t ) => (
				<span key={ t.id } className="dcmm-chip">{ t.name }</span>
			) ) }
		</span>
	);
}

function SortHeader( { column, label, sorting, onSortChange } ) {
	const isActive = sorting.sort === column;
	const arrow = isActive ? ( sorting.order === 'asc' ? ' ↑' : ' ↓' ) : '';

	const handleClick = () => {
		const newOrder = isActive && sorting.order === 'asc' ? 'desc' : 'asc';
		onSortChange( column, newOrder );
	};

	return (
		<button
			type="button"
			className={ `dcmm-sort-btn${ isActive ? ' dcmm-sort-active' : '' }` }
			onClick={ handleClick }
		>
			{ label }{ arrow }
		</button>
	);
}

export default function SubscribersTable( {
	items,
	loading,
	sorting,
	onSortChange,
	rowSelection,
	onRowSelectionChange,
} ) {
	const columns = useMemo( () => [
		{
			id: 'select',
			header: ( { table } ) => (
				<CheckboxControl
					checked={ table.getIsAllPageRowsSelected() }
					indeterminate={ table.getIsSomePageRowsSelected() }
					onChange={ table.getToggleAllPageRowsSelectedHandler() }
					__nextHasNoMarginBottom
				/>
			),
			cell: ( { row } ) => (
				<CheckboxControl
					checked={ row.getIsSelected() }
					onChange={ row.getToggleSelectedHandler() }
					__nextHasNoMarginBottom
				/>
			),
			size: 40,
		},
		{
			accessorKey: 'email',
			header: () => <SortHeader column="email" label={ __( 'Email', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
		},
		{
			accessorKey: 'first_name',
			header: () => <SortHeader column="first_name" label={ __( 'First Name', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
		},
		{
			accessorKey: 'last_name',
			header: () => <SortHeader column="last_name" label={ __( 'Last Name', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
		},
		{
			accessorKey: 'status',
			header: () => <SortHeader column="status" label={ __( 'Status', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
			cell: ( { getValue } ) => <StatusBadge value={ getValue() } />,
		},
		{
			accessorKey: 'tags',
			header: () => __( 'Tags', 'dc-mailpoet-manager' ),
			cell: ( { getValue } ) => <TagChips items={ getValue() } />,
		},
		{
			accessorKey: 'lists',
			header: () => __( 'Lists', 'dc-mailpoet-manager' ),
			cell: ( { getValue } ) => <TagChips items={ getValue() } />,
		},
		{
			accessorKey: 'npa',
			header: () => <SortHeader column="npa" label={ __( 'NPA', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
			cell: ( { getValue } ) => getValue() || <span className="dcmm-muted">—</span>,
		},
		{
			accessorKey: 'created_at',
			header: () => <SortHeader column="created_at" label={ __( 'Created', 'dc-mailpoet-manager' ) } sorting={ sorting } onSortChange={ onSortChange } />,
			cell: ( { getValue } ) => {
				const d = getValue();
				if ( ! d ) return '—';
				return new Date( d ).toLocaleDateString( undefined, {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
				} );
			},
		},
	], [ sorting, onSortChange ] );

	const table = useReactTable( {
		data: items,
		columns,
		getCoreRowModel: getCoreRowModel(),
		manualSorting: true,
		manualPagination: true,
		state: { rowSelection },
		onRowSelectionChange,
		enableRowSelection: true,
		getRowId: ( row, index ) => String( index ),
	} );

	return (
		<div className="dcmm-table-wrap">
			<table className="dcmm-table">
				<thead>
					{ table.getHeaderGroups().map( ( headerGroup ) => (
						<tr key={ headerGroup.id }>
							{ headerGroup.headers.map( ( header ) => (
								<th
									key={ header.id }
									style={ header.column.columnDef.size ? { width: header.column.columnDef.size } : undefined }
								>
									{ header.isPlaceholder
										? null
										: flexRender( header.column.columnDef.header, header.getContext() ) }
								</th>
							) ) }
						</tr>
					) ) }
				</thead>
				<tbody>
					{ loading ? (
						<tr>
							<td colSpan={ columns.length } className="dcmm-table-loading">
								<div className="dcmm-skeleton-rows">
									{ Array.from( { length: 5 } ).map( ( _, i ) => (
										<div key={ i } className="dcmm-skeleton-row" />
									) ) }
								</div>
							</td>
						</tr>
					) : items.length === 0 ? (
						<tr>
							<td colSpan={ columns.length } className="dcmm-table-empty">
								{ __( 'No subscribers found.', 'dc-mailpoet-manager' ) }
							</td>
						</tr>
					) : (
						table.getRowModel().rows.map( ( row ) => (
							<tr key={ row.id } className={ row.getIsSelected() ? 'dcmm-row-selected' : '' }>
								{ row.getVisibleCells().map( ( cell ) => (
									<td key={ cell.id }>
										{ flexRender( cell.column.columnDef.cell, cell.getContext() ) }
									</td>
								) ) }
							</tr>
						) )
					) }
				</tbody>
			</table>
		</div>
	);
}
