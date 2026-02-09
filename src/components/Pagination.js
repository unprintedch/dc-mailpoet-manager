/**
 * Pagination controls.
 */
import { Button, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function Pagination( { page, perPage, total, onPageChange, onPerPageChange } ) {
	const totalPages = Math.max( 1, Math.ceil( total / perPage ) );

	return (
		<div className="dcmm-pagination">
			<div className="dcmm-pagination-info">
				{ sprintf(
					/* translators: 1: total items, 2: current page, 3: total pages */
					__( '%1$d subscribers — Page %2$d of %3$d', 'dc-mailpoet-manager' ),
					total,
					page,
					totalPages
				) }
			</div>

			<div className="dcmm-pagination-controls">
				<Button
					variant="secondary"
					onClick={ () => onPageChange( 1 ) }
					disabled={ page <= 1 }
					size="compact"
				>
					«
				</Button>
				<Button
					variant="secondary"
					onClick={ () => onPageChange( page - 1 ) }
					disabled={ page <= 1 }
					size="compact"
				>
					‹
				</Button>
				<span className="dcmm-pagination-current">{ page }</span>
				<Button
					variant="secondary"
					onClick={ () => onPageChange( page + 1 ) }
					disabled={ page >= totalPages }
					size="compact"
				>
					›
				</Button>
				<Button
					variant="secondary"
					onClick={ () => onPageChange( totalPages ) }
					disabled={ page >= totalPages }
					size="compact"
				>
					»
				</Button>
			</div>

			<div className="dcmm-pagination-perpage">
				<SelectControl
					value={ String( perPage ) }
					options={ [
						{ label: '25', value: '25' },
						{ label: '50', value: '50' },
						{ label: '100', value: '100' },
						{ label: '200', value: '200' },
					] }
					onChange={ ( val ) => onPerPageChange( parseInt( val, 10 ) ) }
					__nextHasNoMarginBottom
				/>
				<span>{ __( 'per page', 'dc-mailpoet-manager' ) }</span>
			</div>
		</div>
	);
}
