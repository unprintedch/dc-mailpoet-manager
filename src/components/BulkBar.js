/**
 * Bulk actions toolbar with progress indicator.
 */
import { useState } from '@wordpress/element';
import { SelectControl, FormTokenField, Button, Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function BulkBar( { selectedIds, meta, bulk } ) {
	const [ action, setAction ] = useState( '' );
	const [ selectedTagNames, setSelectedTagNames ] = useState( [] );
	const [ selectedListNames, setSelectedListNames ] = useState( [] );

	if ( selectedIds.length === 0 && ! bulk.running && ! bulk.error ) {
		return null;
	}

	const tagSuggestions = meta.tags.map( ( t ) => t.name );
	const listSuggestions = meta.lists.map( ( l ) => l.name );

	const needsTags = [ 'add_tag', 'remove_tag' ].includes( action );
	const needsLists = [ 'add_list', 'remove_list' ].includes( action );

	const handleApply = () => {
		if ( ! action || selectedIds.length === 0 ) return;

		const tag_ids = needsTags
			? selectedTagNames.map( ( n ) => meta.tags.find( ( t ) => t.name === n )?.id ).filter( Boolean )
			: [];

		const list_ids = needsLists
			? selectedListNames.map( ( n ) => meta.lists.find( ( l ) => l.name === n )?.id ).filter( Boolean )
			: [];

		if ( needsTags && tag_ids.length === 0 ) return;
		if ( needsLists && list_ids.length === 0 ) return;

		bulk.run( action, selectedIds, { tag_ids, list_ids } );
	};

	const progressPercent = bulk.progress
		? Math.round( ( bulk.progress.processed / bulk.progress.total ) * 100 )
		: 0;

	return (
		<div className="dcmm-bulk-bar">
			<div className="dcmm-bulk-row">
				<span className="dcmm-bulk-count">
					{ selectedIds.length > 0 &&
						/* translators: %d is the number of selected subscribers */
						sprintf( __( '%d selected', 'dc-mailpoet-manager' ), selectedIds.length )
					}
				</span>

				<SelectControl
					value={ action }
					options={ [
						{ label: __( '— Bulk action —', 'dc-mailpoet-manager' ), value: '' },
						{ label: __( 'Add tag', 'dc-mailpoet-manager' ), value: 'add_tag' },
						{ label: __( 'Remove tag', 'dc-mailpoet-manager' ), value: 'remove_tag' },
						{ label: __( 'Add to list', 'dc-mailpoet-manager' ), value: 'add_list' },
						{ label: __( 'Remove from list', 'dc-mailpoet-manager' ), value: 'remove_list' },
						{ label: __( 'Unsubscribe', 'dc-mailpoet-manager' ), value: 'unsubscribe' },
						{ label: __( 'Export CSV', 'dc-mailpoet-manager' ), value: 'export_csv' },
					] }
					onChange={ setAction }
					disabled={ bulk.running }
					__nextHasNoMarginBottom
				/>

				{ needsTags && (
					<div className="dcmm-bulk-picker">
						<FormTokenField
							label={ __( 'Select tags', 'dc-mailpoet-manager' ) }
							value={ selectedTagNames }
							suggestions={ tagSuggestions }
							onChange={ setSelectedTagNames }
							__nextHasNoMarginBottom
						/>
					</div>
				) }

				{ needsLists && (
					<div className="dcmm-bulk-picker">
						<FormTokenField
							label={ __( 'Select lists', 'dc-mailpoet-manager' ) }
							value={ selectedListNames }
							suggestions={ listSuggestions }
							onChange={ setSelectedListNames }
							__nextHasNoMarginBottom
						/>
					</div>
				) }

				<Button
					variant="primary"
					onClick={ handleApply }
					disabled={ ! action || selectedIds.length === 0 || bulk.running }
					isBusy={ bulk.running }
				>
					{ bulk.running
						? __( 'Processing…', 'dc-mailpoet-manager' )
						: __( 'Apply', 'dc-mailpoet-manager' )
					}
				</Button>
			</div>

			{ bulk.running && bulk.progress && (
				<div className="dcmm-progress">
					<div className="dcmm-progress-bar">
						<div
							className="dcmm-progress-fill"
							style={ { width: `${ progressPercent }%` } }
						/>
					</div>
					<span className="dcmm-progress-text">
						{ `${ bulk.progress.processed } / ${ bulk.progress.total } (${ progressPercent }%)` }
					</span>
				</div>
			) }

			{ bulk.error && (
				<Notice status="error" onDismiss={ bulk.reset }>
					{ bulk.error }
				</Notice>
			) }

			{ ! bulk.running && bulk.progress && ! bulk.error && (
				<Notice status="success" onDismiss={ bulk.reset }>
					{ sprintf(
						__( 'Done! %d subscribers processed.', 'dc-mailpoet-manager' ),
						bulk.progress.processed
					) }
					{ bulk.downloadUrl && (
						<>
							{ ' ' }
							<a href={ bulk.downloadUrl } target="_blank" rel="noopener noreferrer">
								{ __( 'Download CSV', 'dc-mailpoet-manager' ) }
							</a>
						</>
					) }
				</Notice>
			) }
		</div>
	);
}
