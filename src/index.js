/**
 * Entry point — mounts the React app into the admin page container.
 */
import { createRoot } from '@wordpress/element';
import App from './app';
import './style.css';

const container = document.getElementById( 'dc-mailpoet-manager-app' );

if ( container ) {
	const root = createRoot( container );
	root.render( <App /> );
}
