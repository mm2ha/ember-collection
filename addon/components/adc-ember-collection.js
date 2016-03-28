import Ember from 'ember';
import EmberCollection from 'ember-collection/components/ember-collection';
//import layout from './adc-ember-collection/template';
import FixedGrid from 'ember-collection/layouts/grid';
import MixedGrid from 'ember-collection/layouts/mixed-grid';
import FullWidthRow from 'ember-collection/layouts/full-width-row';

//region constants
/**
 * Action name that gets triggered when viewport changes
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const VIEWPORT_CHANGE_ACTION = 'viewport-change';

/**
 * Action name for getting more items
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const GET_MORE_ITEMS_ACTION = 'get-more-items';

/**
 * Action name for returning whether the items are currently loading or not
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const IS_LOADING_ACTION = 'is-loading';

/**
 * Action name for returning whether all of the items have been loaded
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ALL_ITEMS_LOADED_ACTION = 'all-items-loaded';

/**
 * Name of property for the loading of more items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ITEMS_PROMISE_PROPERTY = 'itemsPromise';

/**
 * Name of property for success callback after items promise has been resolved
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ITEMS_PROMISE_SUCCESS_CALLBACK_PROPERTY = 'itemsPromiseSuccessCallback';

/**
 * Name of property for error callback after items promise has failed
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ITEMS_PROMISE_FAILURE_CALLBACK_PROPERTY = 'itemsPromiseFailureCallback';

/**
 * Name of property that holds the curent state of loading more items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ITEMS_PROMISE_STATE_PROPERTY = 'itemsPromiseState';

/**
 * Should items and grid layout be refreshed after promise resolution?
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const REFRESH_ITEMS_AFTER_PROMISE = 'refreshItemsAfterPromise';

/**
 * States for the items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.AdcEmberCollection
 */
const ITEMS_PROMISE_STATE_PENDING = 'pending',
    ITEMS_PROMISE_STATE_SUCCESS = 'success',
    ITEMS_PROMISE_STATE_ERROR = 'error';
//endregion

//region private functions
/**
 * Updates viewport visibility variables
 *
 * @param firstVisibleIndex
 * @param visibleItemsCount
 *
 * @private
 * @instance
 * @memberof AdcEmberCollection
 */
function updateViewportData(firstVisibleIndex, visibleItemsCount) {
    if (this.firstVisibleIndex !== firstVisibleIndex || this.visibleItemsCount !== visibleItemsCount) {
        this.firstVisibleIndex = firstVisibleIndex;
        this.visibleItemsCount = visibleItemsCount;
        var lastVisibleIndex = firstVisibleIndex + visibleItemsCount;

        // Set it on the object so that it can be observed
        this.set('lastVisibleIndex', lastVisibleIndex);

        // send slice did change action if we had the action passed in
        if (this.hasViewportChangeAction) {
            this.sendAction(VIEWPORT_CHANGE_ACTION, firstVisibleIndex, visibleItemsCount, lastVisibleIndex);
        }
    }
}

/**
 * Receives a promise from the getMoreItems functions and sets it on the collection
 *
 * <strong>Note:</strong> A reference to this method is passed to getMoreItems action so it can be called by the consumer
 *
 * @param {Ember.RSVP.Promise} itemsPromise - The promise that will resolve in returning more items
 * @param {function=} successCallback - Callback method to be executed if the promise is resolved successfully.
 * @param {function=} failureCallback - Callback method to be executed if the promise is rejected.
 *
 * @private
 * @instance
 * @memberof components.AdcEmberCollection
 */
function setItemsPromise(itemsPromise, successCallback, failureCallback) {
    this.setProperties({
        [ITEMS_PROMISE_PROPERTY]: itemsPromise,
        [ITEMS_PROMISE_SUCCESS_CALLBACK_PROPERTY]: successCallback || function() {},
        [ITEMS_PROMISE_FAILURE_CALLBACK_PROPERTY]: failureCallback || function() {}
    });
}

/**
 * <p>Attempts to load more data if the getMoreItemsFunction has been specified</p>
 *
 * @todo Ideally, we would want to just return a Promise from the function that implements the action, but that does not work
 * @todo Or then, we could reassign the deferredResult, but that I could not get that to work
 *
 * @private
 * @instance
 * @memberof components.AdcEmberCollection
 */
function loadMoreData() {
    Ember.Logger.debug('Action: Loading more data');

    // If we do not have a loading action, there is nothing to do
    if (!this.get(GET_MORE_ITEMS_ACTION)) {
        Ember.Logger.warn('No function to get more data, not propagating');
        return;
    }


    this.sendAction(GET_MORE_ITEMS_ACTION, setItemsPromise.bind(this), this.get('itemsInternal.length'));

    // Mark component as loading
    this.set('isLoading', true);

    // Create a new deferred variable so that we can resolve it
    let deferredResult = Ember.RSVP.defer();

    // Act on when deferredResult is resolved
    deferredResult.promise.then(newItems => {
        Ember.Logger.debug('Deferred result object was resolved');

        // Cache items
        let itemsData = this.get('itemsInternal');

        if (!newItems || !newItems.get) {
            for (let i = 0; i < newItems.length; i++) {
                itemsData.push(newItems[i]);
            }

            const gridLayout = this.get('gridLayout');

            if (typeof gridLayout.addContent === 'function') {
                gridLayout.addContent(newItems, newItems.length);
            }

            // Remove isLoading
            this.set('isLoading', false);
            return;
        }

        // If there is metadata, get data from there because that means we got a promise
        const itemsMeta = newItems.get('meta');
        if (!itemsMeta) {
            // Strange return value, do not do anything
            // Remove isLoading
            this.set('isLoading', false);
            return;
        }

        // Push new items
        Ember.Logger.debug('Pushing new items to the items object');


        // Add the new objects
        itemsData.pushObjects(newItems.toArray());
        // Set the metadata back so that we can retrieve it everywhere
        itemsData.set('meta', itemsMeta);

        // Set whether all has been loaded
        const allItemsLoaded = itemsMeta.lastIndex >= itemsMeta.totalCount;

        // Set properties
        this.set('isLoading', false);

        Ember.Logger.debug('Sending action allItemsLoadedChange');
        // Send action saying whether the items have been loaded
        this.sendAction('allItemsLoadedChange', allItemsLoaded);
    });

    Ember.Logger.debug('Sending action defined in getMoreItemsFunction');
    this.sendAction(GET_MORE_ITEMS_ACTION, deferredResult, this.get('lastVisibleIndex'));
}

/**
 * Processes infinite scroll events
 *
 * @private
 * @instance
 * @memberof components.AdcEmberCollection
 */
function infiniteScrollProcessor() {
    // If we are not doing infinity scroll, then do nothing here
    if (!this.get('isInfiniteScroll')) {
        return;
    }

    // If we are already loading, then do nothing here
    if (this.get('isLoading')) {
        return;
    }

    // If all items have been loaded, then do nothing
    if (this.get('areAllItemsLoaded')) {
        return;
    }

    var index = this.get('lastVisibleIndex');
    var itemsCount = this.get('itemsInternal.length');
    var infiniteScrollBuffer = this.get('infiniteScrollBuffer') | 0;

    if ((itemsCount - index) <= infiniteScrollBuffer) {
        this.send('loadMoreData');
    }
}

/**
 * Creates an Ember Array from the items returned
 *
 * @param {Array|Ember.Array|Ember.NativeArray} [items=[]]
 * @param {boolean} [refreshItems=false] - If true, then re-set the internal items instead of adding to the collection
 * @returns {Ember.NativeArray}
 *
 * @private
 * @instance
 * @memberof components.AdcEmberCollection
 */
function setItemsInternal(items = [], refreshItems = false) {
    // Create internal items array.
    let itemsArray = [];

    // Is this an array with at least one element?
    if (Array.isArray(items) && items.length > 0) {

        // Make a copy of it so that the values are not bound to the model. Ember does not seem to have a one-way
        // binding yet. We are implementing this as "data-down/actions-up". We get the state of the inputs from the
        // model's data
        itemsArray = items.map(item => Object.keys(item).reduce((cache, key) => {
            cache[key] = item[key];
            return cache;
        }, {}));
    }

    // Create new Ember array if we are refreshing items, or use the existing one
    let itemsInternal = refreshItems ? Ember.A() : this.get('itemsInternal') || Ember.A();

    // Push the array object into the ember array
    itemsInternal.pushObjects(itemsArray);

    // Predefine metadata in case it was not part ot items
    // Set the lastIndex to length of the items array and set totalCount to the length if there are no more items (assumes that we loaded all of them)
    let meta = {
        lastIndex: itemsInternal.length,
        totalCount: itemsArray.length ? undefined : itemsInternal.length
    };

    // If the items passed in had meta themselves, then use that
    if (items.get && items.get('meta')) {
        meta = items.get('meta');
    }

    // Set meta to the items
    itemsInternal.set('meta', meta);

    // Set the new items collection back to the class
    this.set('itemsInternal', itemsInternal);

    // If items are being added and not refreshed, then add them to the grid layout
    if (!refreshItems) {
        const gridLayout = this.get('gridLayout');

        if (gridLayout && typeof gridLayout.addContent === 'function') {
            gridLayout.addContent(itemsArray);
        }
    }

    // If there is action that wants the result of whether all items have been loaded, then send it
    if (this.hasAllItemsLoadedAction) {
        this.sendAction(ALL_ITEMS_LOADED_ACTION, meta.lastIndex >= meta.totalCount);
    }

    return itemsInternal;
}
//endregion

/**
 * <p>Class that extends original ember-collection to make it easier to use for us and adds additional features</p>
 * <strong>Notes:</strong><br/>
 * <ul>
 *      <li>The underscore class names are on purpose because I do not want people to bind to them as that could lower performance</li>
 *      <li>Getting the data is handled through getting attributes</li>
 * </ul>
 *
 * @todo <strong>Fix up the removal of items, right now it is not ideal</strong>
 *     <ul style="list-style-type: disc;">
 *          <li>This is currently extremely inefficient and does not work for all situations</li>
 *          <li>Ideally, we want to recalculate all of the items afterwards and move them up (animation?)</li>
 *          <li>This should also trigger possibly the current index changes and load more data if this is infinite loading</li>
 *      </ul>
 * @todo <strong>Implement flag to denote that everything is loading (is-reloading)</strong>
 *     <ul style="list-style-type: disc;">
 *          <li>Maybe have it pre-render fake rows, just like Facebook does</li>
 *      </ul>
 * @todo <strong>Push the visible/all items into this addon</strong>
 *      <ul style="list-style-type: disc;">
 *          <li>Fix the number of visible items that are detected; it is showing too many</li>
 *          <li>Have option to turn this part of the display on and off</li>
 *      </ul>
 *
 * @class AdcEmberCollection
 * @extends EmberCollection
 * @memberof components
 */
export default EmberCollection.extend(/** @lends components.AdcEmberCollection.prototype **/ {
    //region initialization
    /**
     * This overrides didReceiveAttrs in ember-collection on purpose
     */
    didReceiveAttrs () {
        // Cache whether there are specific actions
        this.hasViewportChangeAction = this.getAttr(VIEWPORT_CHANGE_ACTION);
        this.hasIsLoadingAction = this.getAttr(IS_LOADING_ACTION);
        this.hasAllItemsLoadedAction = this.getAttr(ALL_ITEMS_LOADED_ACTION);

        // Run setup for observers for infinite scroll
        this.setupInfiniteScrollObserver();

        // Setup buffer and items
        this.setBufferData();

        // Predefine items
        let itemsIn = this.getAttr('items');

        // If items attribute passed in is a promise, then set it as a promise
        if (typeof itemsIn.then === 'function') {
            setItemsPromise.call(this, itemsIn);

            // Set a property that will indicate that items should be refreshed
            this.set(REFRESH_ITEMS_AFTER_PROMISE, true);

            // Change itemsIn to be just an empty array so that the grid setup will reset itself
            itemsIn = Ember.A();
        }

        this.setItemsAndLayout(itemsIn, true);
    },

    /**
     * Sets the data for this component so that we can use the parent component to gather all the arguments
     *
     * <strong>Warning:</strong> This technically sets data for the ember-collection, not adc-ember-collection
     */
    setBufferData () {
        // set buffer
        let buffer = parseInt(this.get('displayBuffer'), 10);
        if (!isNaN(buffer) && buffer !== this._buffer) {
            this._buffer = buffer;
        }
    },

    /**
     * Creates and sets internal items and creates a layout, as necessary
     *
     * @param {Array|Ember.Array|Ember.NativeArray} itemsIn
     * @param {boolean=} refreshItems - Should items and layout be refreshed?
     */
    setItemsAndLayout (itemsIn, refreshItems) {
        let items = setItemsInternal.call(this, itemsIn, refreshItems);

        // Refresh grid if we are refreshing items or if there is no grid
        if (refreshItems || !this.get('gridLayout')) {
            // Reset cells on refresh
            // This is probably quite expensive, but will not happen very often
            this.set('_cells', Ember.A());
            this._cellMap = Object.create(null);
            this.set('_scrollTop', 0);

            // Setup grid layout
            let gridLayout = this.setupGridLayout(items);

            // Update items that the ember-collection has
            this.updateItems(items, gridLayout);

            // Run this method on ember-collection in case something changed
            this.updateScrollPosition();
        }
    },

    /**
     * Adds or removes observer for the properties that are needed for infinity scrolling
     *
     * This should reduce bindings for cases when we do not want to do infinity scrolling
     */
    setupInfiniteScrollObserver () {
        if (this.get('isInfiniteScroll')) {
            // add observers
            // TODO: try to add all at once, if possible
            this.addObserver('lastVisibleIndex', this, infiniteScrollProcessor);
            this.addObserver('infiniteScrollBuffer', this, infiniteScrollProcessor);

            // run the processor just in case we need to load more data immediately
            infiniteScrollProcessor.call(this);
        }
        else {
            // remove observers
            // TODO: try to remove all at once, if possible
            this.removeObserver('lastVisibleIndex', this, infiniteScrollProcessor);
            this.removeObserver('infiniteScrollBuffer', this, infiniteScrollProcessor);
        }
    },

    /**
     * Sets up the grid (cell) layout based on the passed in data
     *
     * @param {Ember.NativeArray} items
     * @returns {Grid}
     */
    setupGridLayout (items) {
        // Cache variables
        const { fullWidthRow, rowHeight, itemHeight, itemWidth } = this.getProperties(
            'fullWidthRow',
            'rowHeight',
            'itemHeight',
            'itemWidth'
        );

        let layout;

        // Option #1:
        // - check if we have item-height and item-width
        // - if so, we are doing fixed grid with fixed sizes
        if (itemHeight && itemWidth) {
            // create fixed grid layout
            layout = new FixedGrid(itemWidth, itemHeight);
        }
        // Option #2:
        // - check if fullWidthRow is set
        // - if so, then we are doing a full-width-row layout with either fixed row height or variable height defined on item
        else if (fullWidthRow) {
            // Creates a full width row layout
            // Height passed in is either the height that was defined or default height
            // If there was no default height passed in, then the layour will first look at the item to see if it has height
            //  and if it does not, it will use the default height
            layout = new FullWidthRow(items, rowHeight || this.get('rowHeightDefault'), !!rowHeight);
        }
        // Option #3:
        //  - Mixed layout, items should define their height and width
        else {
            Ember.Logger.warn('Using default MixedGrid layout');
            layout = new MixedGrid(items);
        }

        // Set the layout
        this.set('gridLayout', layout);

        return layout;
    },
    //endregion

    //region list properties
    /**
     * Buffer of items that are rendered before and after the currently visible window
     *
     * @type {number}
     */
    displayBuffer: 10,

    /**
     * <p>Should the list behave as an infinitely scrolling list</p>
     * This would load more items as the user keeps scrolling
     *
     * @type {boolean}
     */
    isInfiniteScroll: false,

    /**
     * How many rows before the end of the current items should we try to get new data if we are using inifinite scrolling
     *
     * @type {number}
     */
    infiniteScrollBuffer: 50,

    /**
     * Computed variable about whether all items have been loaded, either through the passed in argument, or through metadata
     *
     * @function
     * @type {boolean}
     */
    areAllItemsLoaded: Ember.computed('itemsInternal.meta', function () {
        const itemsMeta = this.get('itemsInternal.meta');

        return itemsMeta && itemsMeta.totalCount && itemsMeta.lastIndex >= itemsMeta.totalCount;
    }),
    //endregion

    //region internal properties
    /**
     * Whether there is currently more items being loaded<
     *
     * @type {boolean}
     */
    isLoading: Ember.computed.equal(ITEMS_PROMISE_STATE_PROPERTY, ITEMS_PROMISE_STATE_PENDING),

    /**
     * <p>Whether we should be showing the get more data button</p>
     * This should be shown under the following conditions:<br/>
     * <ul>
     *      <li>there is a getMoreItemsFunction</li>
     *      <li>we are not currently loading more data</li>
     *      <li>we have not loaded all items yet</li>
     *      <li>the list is not an infinite scrolling list</li>
     * </ul>
     *
     * @function
     * @type {Boolean}
     */
    showMoreData: Ember.computed('getMoreItemsFunction', 'areAllItemsLoaded', 'isLoading', 'isInfiniteScroll', function () {
        return !!this.get('getMoreItemsFunction') &&
                !this.get('areAllItemsLoaded') &&
                !this.get('isLoading') &&
                !this.get('isInfiniteScroll');
    }),
    //endregion

    //region grid layout
    /**
     * Grid layout for the items
     *
     * @type {Grid|MixedGrid}
     *
     * @private
     */
    gridLayout: undefined,

    /**
     * <p>Row height in pixels</p>
     * Used when we are using Fixed Grid with full width
     *
     * @type {number|undefined}
     */
    rowHeight: undefined,

    /**
     * Default row height
     *
     * @type {number}
     */
    rowHeightDefault: 160,

    /**
     * Does an item span the whole width?
     *
     * @type {boolean}
     */
    fullWidthRow: true,

    /**
     * Height of an item when using fixed grid
     * <strong>Note:</strong> Both itemHeight and itemWidth must be set
     *
     * @type {number|undefined}
     */
    itemHeight: undefined,

    /**
     * Width of an item when using fixed grid
     * <strong>Note:</strong> Both itemHeight and itemWidth must be set
     *
     * @type {number|undefined}
     */
    itemWidth: undefined,
    //endregion

    //region more items promise handling
    /**
     * Represents the eventual result of an async task that is called when more data is being loaded
     *
     * @type {Ember.RSVP.Promise|undefined}
     */
    itemsPromise: undefined,

    /**
     * State of the loading items promise
     *
     * @type {String|undefined}
     */
    itemsPromiseState: undefined,

    /**
     * Listens to the changes in state of the items promise
     *
     * @function
     */
    handlePromiseChange: Ember.observer(ITEMS_PROMISE_PROPERTY, function () {
        let promise = this.get(ITEMS_PROMISE_PROPERTY);
        let successCallback = this.get(ITEMS_PROMISE_SUCCESS_CALLBACK_PROPERTY);
        let failureCallback = this.get(ITEMS_PROMISE_FAILURE_CALLBACK_PROPERTY);

        // Ensure the promise exists
        if (!promise) {
            return;
        }

        // Indicate pending state
        this.set(ITEMS_PROMISE_STATE_PROPERTY, ITEMS_PROMISE_STATE_PENDING);

        if (this.hasIsLoadingAction) {
            this.sendAction(IS_LOADING_ACTION, true);
        }

        promise.then((newItems) => {
            if (!this.isDestroyed) {
                // Update state
                this.set(ITEMS_PROMISE_STATE_PROPERTY, ITEMS_PROMISE_STATE_SUCCESS);

                // Add items to collection
                this.setItemsAndLayout(newItems, this.get(REFRESH_ITEMS_AFTER_PROMISE));

                // Clear the refresh items after promise flag
                this.set(REFRESH_ITEMS_AFTER_PROMISE, false);
            }

            // Execute success callback
            successCallback();
        }).catch(() => {
            if (!this.isDestroyed) {
                this.set(ITEMS_PROMISE_STATE_PROPERTY, ITEMS_PROMISE_STATE_ERROR);
            }

            // Execute success callback
            failureCallback();
        }).finally(() => {
            if (this.hasIsLoadingAction) {
                this.sendAction(IS_LOADING_ACTION, false);
            }
        });
    }),

    //endregion

    //region actions
    /** @ignore **/
    actions: /** @lends components.AdcEmberCollection.prototype **/ {
        /**
         * Sends action to the consumer that allows it to set a promise for loading additional items
         */
        loadMoreData () {
            if (!this.get(GET_MORE_ITEMS_ACTION)) {
                Ember.Logger.warn('No function to get more data, not propagating');
            }
            else {
                this.sendAction(GET_MORE_ITEMS_ACTION, setItemsPromise.bind(this), this.get('itemsInternal.length'));
            }
        },

        /**
         * Removes an item from the display
         *
         * @todo Fix up
         *
         * @param item
         */
        removeItem(item) {
            const itemsData = this.get('itemsInternal'),
                indexOfItem = itemsData.indexOf(item);

            Ember.Logger.debug('RemoveItem in ADCCollection ', item, ' at index ', indexOfItem);

            if (indexOfItem >= 0) {
                itemsData.splice(indexOfItem, 1);

                this.set('_cells', Ember.A());
                this._cellMap = Object.create(null);
                this.updateCells();

                Ember.Logger.debug('Item removed');
            }
        },

        /**
         * Called from ember-collection when cells have finished updating
         *
         * Triggers updating of viewport data
         *
         * @param {number} firstVisibleIndex
         * @param {number} visibleItemsCount
         */
        updateCellsFinished (firstVisibleIndex, visibleItemsCount) {
            Ember.run.scheduleOnce('afterRender', this, updateViewportData, firstVisibleIndex, visibleItemsCount, 150);
        }
    }
    //endregion
});