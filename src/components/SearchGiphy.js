import { Button, Icon, Spinner, TextControl } from '@wordpress/components';
import { Component, Fragment } from '@wordpress/element';

import Gallery from "react-photo-gallery";

export default class SearchGiphy extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		const {
			error,
			gifs,
			isLoading,
			maxPage,
			onGiphyClick,
			onPaginationChangeHandler,
			onSearchChangeHandler,
			pagination,
			search,
		} = this.props;

		let result_gifs;
		if ( gifs[ pagination ] ) {
			result_gifs = [];
			result_gifs = gifs[ pagination ].map( ( gif_data ) => {
				return {
					height: gif_data.images.original.height,
					src: gif_data.images.original.url,
					width: gif_data.images.original.width,
				};
			} )
		}

		return (
			<Fragment>
				<TextControl
					label="Search GIF"
					onChange={ onSearchChangeHandler }
					placeholder="Search GIF"
					value={ search }
				/>

				{ isLoading && (
					<div className="giphy_spinner_container">
						<Spinner />
					</div>
				) }

				{ error && (
					<div className="components-notice is-error">
						<div className="components-notice__content">
							{ error.message }
						</div>
					</div>
				) }

				{ result_gifs && result_gifs.length && (
					<Fragment>
						<Gallery
							onClick={ onGiphyClick }
							photos={ result_gifs }
						/>
					</Fragment>
				) }

				{ result_gifs && result_gifs.length === 0 && (
					<p>{ `Nothing found for '${search}'.` }</p>
				) }

				{ gifs.length > 0 && (
					<div className="giphy_nav_controls">
						{ pagination > 1 && (
							<div className="giphy_nav_controls__control">
								<Button
									isLink
									onClick={ () => onPaginationChangeHandler( pagination - 1 ) }
								>
									<Icon size="32" icon="controls-back"/>
								</Button>
							</div>
						) }

						<div className="giphy_nav_controls__control">
							<TextControl
								className="giphy_nav_field"
								onChange={ ( input ) => {
									if ( isNaN( input ) || input <= 0 ) {
										return 1;
									}

									if ( input > maxPage ) {
										input = maxPage;
									}

									onPaginationChangeHandler( input );
								} }
								value={ pagination }
							/>
						</div>

						<div className="giphy_nav_controls__control">/</div>
						<div className="giphy_nav_controls__control">{ maxPage }</div>

						{ pagination < maxPage && (
							<div className="giphy_nav_controls__control">
								<Button
									isLink
									onClick={ () => onPaginationChangeHandler( pagination + 1 ) }
								>
									<Icon size="32" icon="controls-forward"/>
								</Button>
							</div>
						) }

					</div>
				) }

			</Fragment>
		);
	}
}
