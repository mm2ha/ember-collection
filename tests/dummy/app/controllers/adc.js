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
function getMoreItemsPromise (numberOfItems) {
    return new Ember.RSVP.Promise(function(resolve) {
        Ember.run.later(() => {
            let startingIndex = this.get('lastIndex');
            let count = numberOfItems || this.get('incrementalItemCount');

            let newItems = getItems(startingIndex, count, this.get('mixedGridNoWidth'));

            let allLoaded = (Math.random() * 100) > (100 - parseInt(this.get('chanceItemsLoaded'), 10));
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
        }, this.get('newItemsDelay'));
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

    initialItemCount: 5,
    incrementalItemCount: 15,
    allLoaded: false,
    buffer: 10,
    infinityScrollBuffer: 25,
    lastVisibleIndex: 0,
    rowHeight: 90,
    fullWidthRow: true,
    isInfinite: false,
    isLoadingStatus: Ember.computed.oneWay('isLoading'),
    hasAllItemsLoadedStatus: Ember.computed.oneWay('hasAllItemsLoaded'),
    newItemsDelay: 100,
    chanceItemsLoaded: 20,

    /**
     * Initialize data
     */
    onInit: Ember.on('init', function () {
        this.set('lastIndex', 0);
        this.set('items', getItems(0, this.get('initialItemCount'), false));

        this.set('lastIndex', this.get('items').length);
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

        /**
         * Sets items as a promise, which tests how the collection can handle this
         */
        addMoreData() {
            this.set('items', getItems(0, this.get('lastIndex') + this.get('incrementalItemCount'), false));

            this.set('lastIndex', this.get('items').length);
        },

        /**
         * Recreates items via a promise
         */
        recreateItems() {
            this.send('reloadData', parseInt(this.get('initialItemCount'), 10));
        },

        /**
         * Sets items as a promise, which tests how the collection can handle this
         */
        reloadData(numberOfItems) {
            this.set('lastIndex', 0);
            this.set('items', getMoreItemsPromise.call(this, numberOfItems || this.get('initialItemCount')));
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
        },

        /**
         * Outputs the received changed meta object to the console
         *
         * @param {Object} items
         * @param {Object} meta
         */
        itemsChangeAction(items, meta) {
            Ember.Logger.debug('items:', items);
            Ember.Logger.debug('meta:', meta);
        }
    }

});
