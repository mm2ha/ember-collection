import Ember from 'ember';

function getRandomInt() {
    return Math.floor(Math.random() * (251) + 75);
}

function getItems(startingIndex = 0, numItems = 50, noWidth = false) {
    Ember.Logger.debug('creating ' + numItems + ' items');
    var items = [];
    for (var i = startingIndex; i < numItems + startingIndex; i++) {
        var width = getRandomInt();
        var height = getRandomInt();

        var item = {
            name: 'Item ' + (i + 1) + '(' + width + 'x' + height + ')',
            height: height,
            index: i + 1
        };

        if (!noWidth) {
            item.width = width;
        }

        items.push(item);
    }

    return Ember.A(items);
}

/**
 * Creates a promise that will resolve with new items
 *
 * @returns {Ember.RSVP.Promise}
 */
function getMoreItemsPromise () {
    return new Ember.RSVP.Promise(function(resolve) {
        Ember.run.later(() => {
            let startingIndex = this.get('lastIndex');
            let count = this.get('incrementalItemCount');

            let newItems = getItems(startingIndex, count, this.get('mixedGridNoWidth'));

            let allLoaded = Math.random() > 0.3;
            Ember.Logger.debug('All Loaded: ', allLoaded);

            this.set('lastIndex', startingIndex + count);

            // Set meta data
            // Randomly pick whether it already has all items
            let meta = {
                lastIndex: startingIndex + count,
                totalCount: allLoaded ? startingIndex + count : undefined
            };

            newItems.set('meta', meta);

            resolve(newItems);
        }, 500);
    }.bind(this));
}

/**
 * Fake creator of new items
 *
 * @param {Function} setPromiseFunction
 */
function getMoreItems (setPromiseFunction) {
    let promise = getMoreItemsPromise.call(this);

    setPromiseFunction(promise);
}

export default Ember.Controller.extend(/** @lends Ember.Controller.prototype **/ {

    initialItemCount: 50,
    incrementalItemCount: 50,
    allLoaded: false,
    buffer: 10,
    infinityScrollBuffer: 50,
    lastVisibleIndex: 0,
    rowHeight: 90,
    fullWidthRow: true,
    isInfinite: true,
    isLoadingStatus: Ember.computed.oneWay('isLoading'),
    hasAllItemsLoadedStatus: Ember.computed.oneWay('hasAllItemsLoaded'),

    /**
     * Initialize data
     */
    onInit: Ember.on('init', function () {
        this.set('lastIndex', 0);
        this.set('items', getItems(0, this.get('initialItemCount'), false));
    }),

    /** @ignore **/
    actions: /** @lends Ember.Controller.prototype **/  {
        sliceDidChange (firstVisibleIndex, visibleItemsCount /*, lastVisibleIndex */) {
            this.set('firstVisibleIndex', firstVisibleIndex);
            this.set('visibleItemsCount', visibleItemsCount);
            this.set('lastVisibleIndex', firstVisibleIndex + visibleItemsCount);
        },


        /**
         * Generates additional items for the collection
         *
         * @param {Function} setPromiseFunction - call this with the promise to set the promise for more items to be loaded be resolved
         */
        loadMoreDataFunction (setPromiseFunction) {
            Ember.Logger.debug('handling loading function');

            getMoreItems.call(this, setPromiseFunction);
        },
        deleteItem() {
            Ember.Logger.warn('DeleteItem in Controller');
        },

        /**
         * Sets items as a promise, which tests how the collection can handle this
         */
        reloadData() {
            this.set('lastIndex', 0);
            this.set('items', getMoreItemsPromise.call(this));
        },

        /**
         * Gets data about whether the collection is loading
         *
         * @param {boolean} loadingValue
         */
        isLoadingAction(loadingValue) {
            this.set('isLoading', loadingValue);
        },

        /**
         * Gets data about whether the collection has loaded all data
         *
         * @param {boolean} allItemsLoaded
         */
        allItemsLoadedAction (allItemsLoaded) {
            this.set('hasAllItemsLoaded', allItemsLoaded);
        }
    }

});
