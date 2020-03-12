import { Component, Fragment } from '@wordpress/element';
import { AlignmentToolbar, BlockControls, BlockAlignmentToolbar } from '@wordpress/editor';
import { addQueryArgs } from '@wordpress/url';
import apiFetch from '@wordpress/api-fetch';
import { debounce, delay } from 'lodash';

import GiphyInspectorControl from "./components/GiphyInspectorControl";
import SearchGiphy from "./components/SearchGiphy";
import Gif from "./components/Gif";
import ApiKeyField from "./components/ApiKeyField";

export default class Edit extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			isLoading: false, // If currently fetching from Giphy.
			isSearching: !props.attributes.gif, // If we need to show the search field.
			gifs: [], // Cache results from Giphy.
			pagination: 1, // Current pagination.
			apiKey: '', // Giphy API Key. Set in the InspectorControls and globally as a DB option.
			isTypingApiKey: false, // If API key currently being typed.
			isProcessingApiKey: true, // If currently fetching or saving the API Key.
			isApiKeySaved: false, // If API Key was saved.
			maxPage: 0, // Max results page.
			error: false, // TODO - error.
		};

		this.GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs/search';
		this.GIPHY_RESULTS_LIMIT = 5;

		this.onSearchChangeHandler = this.onSearchChangeHandler.bind( this );
		this.fetchGiphy = this.fetchGiphy.bind( this );
		// Use debounce to prevent multiple concurrent request to Giphy.
		this.onSearchChange = debounce( this.onSearchChange.bind( this ), 500 );
		this.onGiphyClick = this.onGiphyClick.bind( this );

		this.onRemoveClickHandler = this.onRemoveClickHandler.bind( this );

		this.onApiKeyChange = this.onApiKeyChange.bind( this );
		this.onApiKeyChangeHandler = debounce( this.onApiKeyChangeHandler.bind( this ), 500 );

		this.updateIsApiKeySavedToFalse = this.updateIsApiKeySavedToFalse.bind( this );

		this.onPaginationChangeHandler = this.onPaginationChangeHandler.bind( this );
	}

	async componentDidMount() {
		const apiKey = await this.fetchApiKey();
		// TODO - Handle error.

		this.setState( {
			apiKey,
			isProcessingApiKey: false
		} );
	}

	componentWillUnmount() {
		this.onSearchChange.cancel();
		this.onApiKeyChangeHandler.cancel();
	}

	fetchApiKey() {
		return apiFetch({
			path: "/dmgiphyblock/v1/api-key"
		})
		.then( apiKey => apiKey )
		.catch( error => error);
	}

	saveApiKey( apiKey ) {
		return apiFetch({
			path: "/dmgiphyblock/v1/api-key",
			method: "POST",
			body: apiKey
		})
		.then( apiKey => apiKey )
		.catch( error => error );
	}

	/**
	 * Debounced function
	 *
	 * @returns {Promise<void>}
	 */
	async onSearchChange() {
		const {
			attributes: { search }
		} = this.props;

		if ( this.state.gifs[ this.state.pagination ] ) {
			this.setState( {
				isLoading: false,
			} );
			return;
		}

		// Minus 1 is needed as offset starts with 0.
		const offset = (this.state.pagination - 1) * this.GIPHY_RESULTS_LIMIT;

		const results = await this.fetchGiphy( search, offset );

		if ( ! results.meta || 200 !== results.meta.status ) {
			this.setState( {
				error: results,
				isLoading: false,
			} );
			return;
		}

		// The idea is to 'cache' the past results in the state.
		// Something like
		// gifs[0] => Will contain results of pagination 0.
		// gifs[1] => Results of pagination 1.
		// and so on..
		let gifs = this.state.gifs;
		gifs[ this.state.pagination ] = results.data;

		let newState = {
			error: false,
			isLoading: false,
			gifs: gifs,
		};

		if ( this.state.maxPage === 0 ) {
			newState.maxPage = Math.ceil( results.pagination.total_count / this.GIPHY_RESULTS_LIMIT );
		}

		this.setState( newState );
	}

	/**
	 * Fetch data from Giphy.
	 *
	 * @param search string
	 * @param pagination int
	 *
	 * @returns {Promise<any>}
	 */
	fetchGiphy( search, pagination ) {
		// Build the request url.
		const requestUrl = addQueryArgs( this.GIPHY_ENDPOINT, {
			q: search,
			limit: this.GIPHY_RESULTS_LIMIT,
			api_key: this.state.apiKey,
			offset: pagination,
		} );

		return fetch( requestUrl )
			.then( data => data.json() )
			.catch( error => error );
	};

	onGiphyClick( event, { photo } ) {
		// Save the selected photo data as `gif` in the DB.
		this.props.setAttributes( { gif: photo } );
		this.setState( { isSearching: false } );
	}

	onSearchChangeHandler( search ) {
		// Reset the state.
		this.setState( {
			isLoading: true,
			gifs: [],
			pagination: 1,
			maxPage: 0,
		} );

		// Save the search keyword as `search` in the DB.
		this.props.setAttributes( { search } );
		this.onSearchChange();
	}

	onPaginationChangeHandler( pagination ) {
		this.setState( { pagination: Number( pagination ), isLoading: true } );
		this.onSearchChange();
	}

	/**
	 * Invoked when the "Trash" button is clicked.
	 * This will remove the current selected GIF and will allow the user to search again.
	 */
	onRemoveClickHandler() {
		this.setState( {
			isSearching: true,
			isLoading: true,
		} );

		this.onSearchChange();
	}

	/**
	 * Invoked when the API Key field in Inspector Control was changed.
	 *
	 * @param apiKey string
	 */
	onApiKeyChange( apiKey ) {
		this.setState( {
			apiKey,
			isTypingApiKey: true,
		} );

		this.onApiKeyChangeHandler();
	}

	/**
	 * Save the current apiKey in state in the DB as the API Key.
	 *
	 * @returns {Promise<void>}
	 */
	async onApiKeyChangeHandler() {
		this.setState( {
			isProcessingApiKey: true
		} );
		// TODO - Handle error.

		const saveApiKey = await this.saveApiKey( this.state.apiKey );
		this.setState( {
			isTypingApiKey: false,
			isProcessingApiKey: false,
			isApiKeySaved: true,
		} );

		delay( this.updateIsApiKeySavedToFalse, 3000 );
	}

	/**
	 * Setting the state `isApiKeySaved` to false will hide the 'Saved' message.
	 */
	updateIsApiKeySavedToFalse() {
		this.setState( { isApiKeySaved: false } );
	}

	render() {
		const {
			attributes: {
				search,
				gif,
				blockAlignment,
				textAlignment
			},
			className,
			setAttributes
		} = this.props;

		const {
			isLoading,
			isSearching,
			gifs,
			pagination,
			apiKey,
			isTypingApiKey,
			isProcessingApiKey,
			isApiKeySaved,
			maxPage,
			error,
		} = this.state;

		let showApiKeyField = false;
		if ( apiKey.length === 0 || isTypingApiKey ) {
			showApiKeyField = true;
		}

		let showGif = false;
		if ( gif && gif.src && ! isSearching ) {
			showGif = true;
		}

		return (
			<div className={ className }>
				<GiphyInspectorControl
					isApiKeySaved={ isApiKeySaved }
					isLoading={ isProcessingApiKey }
					onApiKeyChange={ this.onApiKeyChange }
					apiKey={ apiKey }
				/>

				{ showApiKeyField ? (
					<ApiKeyField
						isApiKeySaved={ isApiKeySaved }
						isLoading={ isProcessingApiKey }
						onApiKeyChange={ this.onApiKeyChange }
						apiKey={ apiKey }
					/>
				) : showGif ? (
					<Fragment>
						<BlockControls>
							<BlockAlignmentToolbar
								value={ blockAlignment }
								onChange={ blockAlignment => setAttributes( { blockAlignment } ) }
							/>
							<AlignmentToolbar
								value={ textAlignment }
								onChange={ textAlignment => setAttributes( { textAlignment } ) }
							/>
						</BlockControls>

						<Gif
							style={ { textAlign: textAlignment } }
							onRemoveClickHandler={ this.onRemoveClickHandler }
							gif={ gif.src }
						/>
					</Fragment>
				) : (
					<SearchGiphy
						search={ search }
						onSearchChangeHandler={ this.onSearchChangeHandler }
						isLoading={ isLoading }
						gifs={ gifs }
						onGiphyClick={ this.onGiphyClick }
						pagination={ pagination }
						onPaginationChangeHandler={ this.onPaginationChangeHandler }
						maxPage={ maxPage }
						error={ error }
					/>
				) }
			</div>
		);
	}
}
