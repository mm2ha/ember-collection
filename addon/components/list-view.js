import Ember from 'ember';
import layout from '../templates/components/list-view';
import FixedGrid from 'ember-collection/layouts/grid';
import MixedGrid from 'ember-collection/layouts/mixed-grid';
import FullWidthRow from 'ember-collection/layouts/full-width-row';

//region constants
/**
 * Action name that gets triggered when viewport changes
 *
 * @type {string}
 *
 * @static
 * @memberof components.ListView
 */
export const VIEWPORT_CHANGE_ACTION = 'viewport-change';

/**
 * Action name for getting more items
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const GET_MORE_ITEMS_ACTION = 'get-more-items';

/**
 * Action name for returning whether the items are currently loading or not
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const IS_LOADING_ACTION = 'is-loading';

/**
 * Action name for returning whether all of the items have been loaded
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ALL_ITEMS_LOADED_ACTION = 'all-items-loaded';

/**
 * Action name for passing back changed items object
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_CHANGE_ACTION = 'items-change';

/**
 * Name of property for the loading of more items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_PROMISE_PROPERTY = 'itemsPromise';

/**
 * Name of property for success callback after items promise has been resolved
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_PROMISE_SUCCESS_CALLBACK_PROPERTY = 'itemsPromiseSuccessCallback';

/**
 * Name of property for error callback after items promise has failed
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_PROMISE_FAILURE_CALLBACK_PROPERTY = 'itemsPromiseFailureCallback';

/**
 * Name of property that holds the curent state of loading more items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_PROMISE_STATE_PROPERTY = 'itemsPromiseState';

/**
 * Should items and grid layout be refreshed after promise resolution?
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const REFRESH_ITEMS_AFTER_PROMISE = 'refreshItemsAfterPromise';

/**
 * States for the items promise
 *
 * @type {string}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ITEMS_PROMISE_STATE_PENDING = 'pending',
    ITEMS_PROMISE_STATE_SUCCESS = 'success',
    ITEMS_PROMISE_STATE_ERROR = 'error';
//endregion

//region private functions
/**
 * Executes function once during the current Ember run cycle
 *
 * @param {Object} context - Context in which the method should be executed in
 * @param {Function} fn
 */
const runOnce = Ember.run.once;

/**
 * Updates viewport visibility variables
 *
 * @param {number} firstVisibleIndex
 * @param {number} visibleItemsCount
 *
 * @private
 * @instance
 * @memberof ListView
 */
function updateViewportData(firstVisibleIndex, visibleItemsCount) {
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
 * @memberof components.ListView
 */
function setItemsPromise(itemsPromise, successCallback, failureCallback) {
    this.setProperties({
        [ITEMS_PROMISE_PROPERTY]: itemsPromise,
        [ITEMS_PROMISE_SUCCESS_CALLBACK_PROPERTY]: successCallback || function() {},
        [ITEMS_PROMISE_FAILURE_CALLBACK_PROPERTY]: failureCallback || function() {}
    });
}

/**
 * Processes infinite scroll events
 *
 * @private
 * @instance
 * @memberof components.ListView
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
 * Adds items to the layout if layout supports that function
 *
 * @param {Array} itemsArray
 */
function gridLayoutAddItems(itemsArray) {
    const gridLayout = this.get('gridLayout');

    if (gridLayout && typeof gridLayout.addItems === 'function') {
        gridLayout.addItems(itemsArray);
    }
}

/**
 * Removes item from the layout if layout supports that function
 *
 * @param {number} itemIndex
 * @param {Object=} item
 */
function gridLayoutRemoveItem(itemIndex, item) {
    const gridLayout = this.get('gridLayout');

    if (gridLayout && typeof gridLayout.removeItem === 'function') {
        gridLayout.removeItem(itemIndex, item);
    }
}

/**
 * Creates an Ember Array from the items returned
 *
 * @param {Array|Ember.Array|Ember.NativeArray|Ember.ArrayProxy} [items=[]]
 * @param {boolean} [refreshItems=false] - If true, then re-set the internal items instead of adding to the collection
 * @returns {Ember.NativeArray}
 *
 * @private
 * @instance
 * @memberof components.ListView
 */
function setItemsInternal(items = [], refreshItems = false) {
    // Create internal items array.
    let itemsArray = [];

    // Is this an array
    if (Ember.isArray(items)) {

        // Create a new array from all the items, so that the passed in items are not bound to the internal ones
        // Ember does not have a real one-way binding yet and we do not want to propagate changes to the items list back up
        itemsArray = items.slice();
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
        gridLayoutAddItems.call(this, itemsArray);
    }

    if (this.hasItemsChangeAction) {
        // Run this only once in a run loop
        runOnce(this, function () {
            this.sendAction(ITEMS_CHANGE_ACTION, itemsInternal, meta);
        });
    }

    // If there is action that wants the result of whether all items have been loaded, then send it
    if (this.hasAllItemsLoadedAction) {
        // Run this only once in a run loop
        runOnce(this, function () {
            this.sendAction(ALL_ITEMS_LOADED_ACTION, this.get('areAllItemsLoaded'));
        });
    }

    return itemsInternal;
}
//endregion

//region action presence detection
/**
 * List of actions that can be passed into the component
 *
 * @type {Object.<string, string>}
 *
 * @private
 * @static
 * @memberof components.ListView
 */
const ACTIONS = {
    hasGetMoreItemsAction: GET_MORE_ITEMS_ACTION,
    hasViewportChangeAction: VIEWPORT_CHANGE_ACTION,
    hasIsLoadingAction: IS_LOADING_ACTION,
    hasAllItemsLoadedAction: ALL_ITEMS_LOADED_ACTION,
    hasItemsChangeAction: ITEMS_CHANGE_ACTION
};

/**
 * Detects presence of actions on the component and sets them for easy checks later
 *
 * @private
 * @instance
 * @memberof components.ListView
 */
function detectActions() {
    Object.keys(ACTIONS).forEach(key => {
        this[key] = this.getAttr(ACTIONS[key]);
    });
}
//endregion

/**
 * Wrapper for ember-collection that is filled with features specific for long lists of items
 *
 * Note: Not sure if wrapping ember-collection or extending is better. Wrapping seems a bit cleaner though and more "ember-like"
 *
 * @class ListView
 * @extends Ember.Component
 * @memberof components
 */
export default Ember.Component.extend(/** @lends components.ListView# **/ {
    layout: layout,

    //region initialization
    /**
     * Initialize all data
     *
     * @todo Should we do some checks to see if the items should be overwritten or kept from previous?
     *          - maybe we could store the original items and compare them to the received ones and if they are the same just keep what we have in the collection
     *
     * @function
     */
    initData: Ember.on('didReceiveAttrs', function () {
        // Detect and cache presence of actions
        detectActions.call(this);

        // Run setup for observers for infinite scroll
        this.setupInfiniteScrollObserver();

        // Predefine items
        let itemsIn = this.getAttr('items');

        // If items attribute passed in is a promise, then set it as a promise
        if (itemsIn && (typeof itemsIn.then === 'function')) {
            setItemsPromise.call(this, itemsIn);

            // Set a property that will indicate that items should be refreshed
            this.set(REFRESH_ITEMS_AFTER_PROMISE, true);

            // Change itemsIn to be just an empty array so that the grid setup will reset itself
            itemsIn = Ember.A();
        }

        this.setItemsAndLayout(itemsIn, true);
    }),

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
            // Setup grid layout
            this.set('gridLayout', this.setupGridLayout(items));
        }
    },

    /**
     * Removes the corresponding items from the collection (i.e. from the DOM) when they are removed from the model.
     */
    removeDeletedItem: Ember.observer('itemsInternal.@each.isDeleted', function () {
        this.get('itemsInternal').filterBy('isDeleted', true).forEach(item => {
            this.send('removeItem', item);
        });
    }),

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
            // If there was no default height passed in, then the layout will first look at the item to see if it has height
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
     * Should the list behave as an infinitely scrolling list
     *
     * This would load more items as the user keeps scrolling
     *
     * @type {boolean}
     */
    isInfiniteScroll: true,

    /**
     * How many rows before the end of the current items should we try to get new data if we are using inifinite scrolling
     *
     * @type {number}
     */
    infiniteScrollBuffer: 50,

    /**
     * Text to be shown in the button for loading more data
     *
     * <strong>Note:</strong> This should be localized!
     *
     * @type {String}
     */
    moreDataText: 'Load more data',

    /**
     * Computed variable about whether all items have been loaded, either through the passed in argument, or through metadata
     *
     * @function
     * @returns {boolean}
     */
    areAllItemsLoaded: Ember.computed('itemsInternal.meta', function () {
        const itemsMeta = this.get('itemsInternal.meta');

        return itemsMeta && (itemsMeta.allLoaded || (itemsMeta.totalCount && itemsMeta.lastIndex >= itemsMeta.totalCount)) || false;
    }),
    //endregion

    //region internal properties
    /**
     * Whether there is currently more items being loaded
     *
     * @function
     * @returns {boolean}
     */
    isLoading: Ember.computed.equal(ITEMS_PROMISE_STATE_PROPERTY, ITEMS_PROMISE_STATE_PENDING),

    /**
     * Whether we should be showing the get more data button
     *
     * This should be shown under the following conditions:<br/>
     * <ul>
     *      <li>there is a getMoreItemsFunction</li>
     *      <li>we are not currently loading more data</li>
     *      <li>we have not loaded all items yet</li>
     *      <li>the list is not an infinite scrolling list</li>
     * </ul>
     *
     * @function
     * @returns {Boolean}
     */
    showMoreDataOption: Ember.computed(GET_MORE_ITEMS_ACTION, 'areAllItemsLoaded', 'isLoading', 'isInfiniteScroll', function () {
        return !!this.get(GET_MORE_ITEMS_ACTION) &&
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
            runOnce(this, function () {
                this.sendAction(IS_LOADING_ACTION, true);
            });
        }

        promise.then(newItems => {
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
                runOnce(this, function () {
                    this.sendAction(IS_LOADING_ACTION, false);
                });
            }
        });
    }),

    //endregion

    //region actions
    /** @ignore **/
    actions: /** @lends components.ListView# **/ {
        /**
         * Sends action to the consumer that allows it to set a promise for loading additional items
         */
        loadMoreData () {
            if (this.hasGetMoreItemsAction) {
                this.sendAction(GET_MORE_ITEMS_ACTION, setItemsPromise.bind(this), this.get('itemsInternal.length'));
            }
        },

        /**
         * Removes an item from the display
         *
         * @todo Do we want any kind of animation when an item is removed?
         *
         * @param {Object} item - Item in the collection to be removed
         */
        removeItem(item) {
            const itemsData = this.get('itemsInternal'),
                indexOfItem = itemsData.indexOf(item);

            if (indexOfItem >= 0) {
                // Remove item from the layout
                gridLayoutRemoveItem.call(this, indexOfItem, itemsData);

                // This removal will trigger array observers so that the collection will be updated
                itemsData.removeAt(indexOfItem);
            }

            // Trigger infinite scroll processor in case it needs to load up more data
            infiniteScrollProcessor.call(this);
        },

        /**
         * Called from ember-collection when cells have finished updating
         *
         * Triggers updating of viewport data
         *
         * @param {number} firstVisibleIndex
         * @param {number} visibleItemsCount
         */
        viewportChangeAction (firstVisibleIndex, visibleItemsCount) {
            updateViewportData.call(this, firstVisibleIndex, visibleItemsCount);
        }
    }
    //endregion
});