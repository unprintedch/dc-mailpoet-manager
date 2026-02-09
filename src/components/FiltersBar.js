/**
 * Filters bar: search, status, tags, lists, NPA.
 */
import { TextControl, SelectControl, FormTokenField, Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function FiltersBar( { filters, meta, onFilterChange } ) {
	const tagSuggestions = meta.tags.map( ( t ) => t.name );
	const listSuggestions = meta.lists.map( ( l ) => l.name );

	const selectedTagNames = filters.tags
		.map( ( id ) => meta.tags.find( ( t ) => t.id === id )?.name )
		.filter( Boolean );

	const selectedListNames = filters.lists
		.map( ( id ) => meta.lists.find( ( l ) => l.id === id )?.name )
		.filter( Boolean );

	const handleTagsChange = ( names ) => {
		const ids = names
			.map( ( name ) => meta.tags.find( ( t ) => t.name === name )?.id )
			.filter( Boolean );
		onFilterChange( { tags: ids }, true );
	};

	const handleListsChange = ( names ) => {
		const ids = names
			.map( ( name ) => meta.lists.find( ( l ) => l.name === name )?.id )
			.filter( Boolean );
		onFilterChange( { lists: ids }, true );
	};

	const handleReset = () => {
		onFilterChange( {
			search: '',
			status: '',
			tags: [],
			tags_mode: 'any',
			lists: [],
			lists_mode: 'any',
			npa: '',
			npa_min: '',
			npa_max: '',
			page: 1,
		}, true );
	};

	return (
		<div className="dcmm-filters">
			<div className="dcmm-filters-row">
				<div className="dcmm-filter-field dcmm-filter-search">
					<TextControl
						label={ __( 'Search', 'dc-mailpoet-manager' ) }
						placeholder={ __( 'Email, first or last name…', 'dc-mailpoet-manager' ) }
						value={ filters.search }
						onChange={ ( val ) => onFilterChange( { search: val } ) }
						__nextHasNoMarginBottom
					/>
				</div>

				<div className="dcmm-filter-field">
					<SelectControl
						label={ __( 'Status', 'dc-mailpoet-manager' ) }
						value={ filters.status }
						options={ [
							{ label: __( 'All', 'dc-mailpoet-manager' ), value: '' },
							{ label: __( 'Subscribed', 'dc-mailpoet-manager' ), value: 'subscribed' },
							{ label: __( 'Unsubscribed', 'dc-mailpoet-manager' ), value: 'unsubscribed' },
							{ label: __( 'Bounced', 'dc-mailpoet-manager' ), value: 'bounced' },
							{ label: __( 'Inactive', 'dc-mailpoet-manager' ), value: 'inactive' },
							{ label: __( 'Unconfirmed', 'dc-mailpoet-manager' ), value: 'unconfirmed' },
						] }
						onChange={ ( val ) => onFilterChange( { status: val }, true ) }
						__nextHasNoMarginBottom
					/>
				</div>
			</div>

			<div className="dcmm-filters-row">
				<div className="dcmm-filter-field">
					<FormTokenField
						label={ __( 'Tags', 'dc-mailpoet-manager' ) }
						value={ selectedTagNames }
						suggestions={ tagSuggestions }
						onChange={ handleTagsChange }
						__nextHasNoMarginBottom
					/>
					<div className="dcmm-mode-toggle">
						<SelectControl
							value={ filters.tags_mode }
							options={ [
								{ label: __( 'Match ANY', 'dc-mailpoet-manager' ), value: 'any' },
								{ label: __( 'Match ALL', 'dc-mailpoet-manager' ), value: 'all' },
							] }
							onChange={ ( val ) => onFilterChange( { tags_mode: val }, true ) }
							__nextHasNoMarginBottom
						/>
					</div>
				</div>

				<div className="dcmm-filter-field">
					<FormTokenField
						label={ __( 'Lists', 'dc-mailpoet-manager' ) }
						value={ selectedListNames }
						suggestions={ listSuggestions }
						onChange={ handleListsChange }
						__nextHasNoMarginBottom
					/>
					<div className="dcmm-mode-toggle">
						<SelectControl
							value={ filters.lists_mode }
							options={ [
								{ label: __( 'Match ANY', 'dc-mailpoet-manager' ), value: 'any' },
								{ label: __( 'Match ALL', 'dc-mailpoet-manager' ), value: 'all' },
							] }
							onChange={ ( val ) => onFilterChange( { lists_mode: val }, true ) }
							__nextHasNoMarginBottom
						/>
					</div>
				</div>
			</div>

			<div className="dcmm-filters-row">
				<div className="dcmm-filter-field dcmm-filter-npa">
					<TextControl
						label={ __( 'NPA (exact)', 'dc-mailpoet-manager' ) }
						placeholder="1000"
						value={ filters.npa }
						onChange={ ( val ) => onFilterChange( { npa: val, npa_min: '', npa_max: '' } ) }
						type="number"
						__nextHasNoMarginBottom
					/>
				</div>

				<div className="dcmm-filter-field dcmm-filter-npa">
					<TextControl
						label={ __( 'NPA min', 'dc-mailpoet-manager' ) }
						placeholder="1000"
						value={ filters.npa_min }
						onChange={ ( val ) => onFilterChange( { npa_min: val, npa: '' } ) }
						type="number"
						__nextHasNoMarginBottom
					/>
				</div>

				<div className="dcmm-filter-field dcmm-filter-npa">
					<TextControl
						label={ __( 'NPA max', 'dc-mailpoet-manager' ) }
						placeholder="9999"
						value={ filters.npa_max }
						onChange={ ( val ) => onFilterChange( { npa_max: val, npa: '' } ) }
						type="number"
						__nextHasNoMarginBottom
					/>
				</div>

				<div className="dcmm-filter-field dcmm-filter-reset">
					<Button variant="tertiary" onClick={ handleReset }>
						{ __( 'Reset filters', 'dc-mailpoet-manager' ) }
					</Button>
				</div>
			</div>
		</div>
	);
}
