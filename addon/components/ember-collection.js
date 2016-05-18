import Ember from 'ember';
import layout from './ember-collection/template';
import needsRevalidate from '../utils/needs-revalidate';
import { VIEWPORT_CHANGE_ACTION } from './list-view';
var decodeEachKey = Ember.__loader.require('ember-htmlbars/utils/decode-each-key')['default'];
const { get, set } = Ember;

class Cell {
  constructor(key, item, index, style) {
    this.key = key;
    this.hidden = false;
    this.item = item;
    this.index = index;
    this.style = style;
  }
}

/**
 * @class EmberCollection
 * @extends Ember.component
 * @memberof components
 */
export default Ember.Component.extend(/** @lends components.EmberCollection.prototype */ {
  layout: layout,

  classNames: ['list-view'],

  init() {
    // State pulled from attrs is prefixed with an underscore
    // so that there's no chance of shadowing the attrs proxy.
    this._buffer = undefined;
    this._cellLayout = undefined;
    this._rawItems = undefined;
    this._items = undefined;
    this._scrollLeft = undefined;
    this._scrollTop = undefined;
    this._clientWidth = undefined;
    this._clientHeight = undefined;
    this._contentSize = undefined;

    // this.firstCell = undefined;
    // this.lastCell = undefined;
    // this.cellCount = undefined;
    this.contentElement = undefined;
    this._cells = Ember.A();
    this._cellMap = Object.create(null);

    // TODO: Super calls should always be at the top of the constructor.
    // I had to move the super call after the properties were defined to
    // work around what I believe is a bug in the attrs proxy. The problem
    // seems to arise when you:
    //
    //   1. Call this._super() immediately.
    //   2. Set a property on `this` that is both not in the
    //      initial attrs hash and not on the prototype.
    this._super();
  },

  didInitAttrs() {
    let buffer = this.getAttr('buffer'); // getIntAttr('buffer', 5)
    this._buffer = (typeof buffer === 'number') ? buffer : 5;
    this._scrollLeft = this.getAttr('scroll-left') | 0;
    this._scrollTop = this.getAttr('scroll-top') | 0;
    this._clientWidth = this.getAttr('estimated-width') | 0;
    this._clientHeight = this.getAttr('estimated-height') | 0;
    this._scrollChange = this.getAttr('scroll-change');
    this._viewportChangeAction = this.getAttr(VIEWPORT_CHANGE_ACTION);
  },

  _needsRevalidate(){
    needsRevalidate(this);
  },

  didReceiveAttrs() {
    // Work around emberjs/ember.js#11992. Affects <=1.13.8 and <=2.0.0.
    // This will likely be patched in 1.13.9 and 2.0.1.
    this._super();

    this.updateItems();
    this.updateScrollPosition();
  },

  updateItems(){
    const layout = this.getAttr('cell-layout');

    // If the actual layout changed, then reset everything
    if (this._cellLayout && this._cellLayout !== layout) {
        // Reset cells on refresh
        // This is probably quite expensive, but will not happen very often
        this.set('_cells', Ember.A());
        this._cellMap = Object.create(null);
        this.set('_scrollTop', 0);
    }

    this._cellLayout = layout;
    var rawItems = this.getAttr('items');

    if (this._rawItems !== rawItems) {
      if (this._items && this._items.removeArrayObserver) {
        this._items.removeArrayObserver(this, {
          willChange: Ember.K,
          didChange: '_needsRevalidate'
        });
      }
      this._rawItems = rawItems;
      var items = Ember.A(rawItems);
      this.set('_items', items);

      if (items && items.addArrayObserver) {
        items.addArrayObserver(this, {
          willChange: Ember.K,
          didChange: '_needsRevalidate'
        });
      }
    }
  },

  updateScrollPosition(){
    if (!this._scrollChange) { return; } // don't process bound scroll coords unless our action is being handled
    let scrollLeftAttr = this.getAttr('scroll-left');
    if (scrollLeftAttr !== undefined) {
      scrollLeftAttr = parseInt(scrollLeftAttr, 10);
      if (this._scrollLeft !== scrollLeftAttr) {
        this.set('_scrollLeft', scrollLeftAttr);
      }
    }

    let scrollTopAttr = this.getAttr('scroll-top');
    if (scrollTopAttr !== undefined) {
      scrollTopAttr = parseInt(scrollTopAttr, 10);
      if (this._scrollTop !== scrollTopAttr) {
        // console.log('updateScrollPosition', this._scrollTop, scrollTopAttr);
        this.set('_scrollTop', scrollTopAttr);
      }
    }
  },

  updateContentSize() {
    var cellLayout = this._cellLayout;
    var contentSize = cellLayout.contentSize(this._clientWidth, this._clientHeight);
    if (this._contentSize === undefined ||
        contentSize.width !== this._contentSize.width ||
        contentSize.height !== this._contentSize.height) {
      this.set('_contentSize', contentSize);
    }
  },

  willRender: function() {
    this.updateCells();
    this.updateContentSize();
  },

  updateCells() {
    if (!this._items) { return; }
    const numItems = get(this._items, 'length');
    if (this._cellLayout.length !== numItems) {
      this._cellLayout.length = numItems;
    }

    var priorMap = this._cellMap;
    var cellMap = Object.create(null);

    let startingIndex = this._cellLayout.indexAt(this._scrollLeft, this._scrollTop, this._clientWidth, this._clientHeight);
    let visibleCount = this._cellLayout.count(this._scrollLeft, this._scrollTop, this._clientWidth, this._clientHeight);

    var items = this._items;
    var bufferBefore = Math.min(startingIndex, this._buffer);
    let index = startingIndex - bufferBefore;
    let count = visibleCount + bufferBefore;
    count = Math.min(count + this._buffer, get(items, 'length') - index);
    var i, style, itemIndex, itemKey, cell;

    var newItems = [];

    for (i=0; i<count; i++) {
      itemIndex = index+i;
      itemKey = decodeEachKey(items.objectAt(itemIndex), '@identity');
      if (priorMap) {
        cell = priorMap[itemKey];
      }
      if (cell) {
        style = this._cellLayout.formatItemStyle(itemIndex, this._clientWidth, this._clientHeight);
        set(cell, 'style', style);
        set(cell, 'hidden', false);
        set(cell, 'key', itemKey);
        cellMap[itemKey] = cell;
      } else {
        newItems.push(itemIndex);
      }
    }

    for (i=0; i<this._cells.length; i++) {
      cell = this._cells[i];
      if (!cellMap[cell.key]) {
        if (newItems.length) {
          itemIndex = newItems.pop();
          let item = items.objectAt(itemIndex);
          itemKey = decodeEachKey(item, '@identity');
          style = this._cellLayout.formatItemStyle(itemIndex, this._clientWidth, this._clientHeight);
          set(cell, 'style', style);
          set(cell, 'key', itemKey);
          set(cell, 'index', itemIndex);
          set(cell, 'item', item);
          set(cell, 'hidden', false);
          cellMap[itemKey] = cell;
        } else {
          set(cell, 'hidden', true);
          set(cell, 'style', 'height: 0; display: none;');
        }
      }
    }

    for (i=0; i<newItems.length; i++) {
      itemIndex = newItems[i];
      let item = items.objectAt(itemIndex);
      itemKey = decodeEachKey(item, '@identity');
      style = this._cellLayout.formatItemStyle(itemIndex, this._clientWidth, this._clientHeight);
      cell = new Cell(itemKey, item, itemIndex, style);
      cellMap[itemKey] = cell;
      this._cells.pushObject(cell);
    }
    this._cellMap = cellMap;

    this.updateViewportData(startingIndex, visibleCount);
  },

    /**
     * Updates viewport data and triggers a viewport change action if the variables have changed
     *
     * @param {number} firstVisibleIndex - Index of the first visible item
     * @param {number} visibleItemsCount - Number of visible items in the viewport
     */
    updateViewportData (firstVisibleIndex, visibleItemsCount) {
        Ember.run.scheduleOnce('afterRender', this, function () {
            // Trigger action if it is set and if the viewport variables changed
            if (this._viewportChangeAction &&
                (this._firstVisibleIndex !== firstVisibleIndex ||
                this._visibleItemsCount !== visibleItemsCount)) {
                this.sendAction(VIEWPORT_CHANGE_ACTION, firstVisibleIndex, visibleItemsCount);
            }

            // Cache new viewport variables
            this._firstVisibleIndex = firstVisibleIndex;
            this._visibleItemsCount = visibleItemsCount;
        }, firstVisibleIndex, visibleItemsCount);
    },

  /** @ignore **/
  actions: /** @lends components.EmberCollection.prototype */ {
    scrollChange(scrollLeft, scrollTop) {
      if (this._scrollChange) {
        // console.log('ember-collection sendAction scroll-change', scrollTop);
        this.sendAction('scroll-change', scrollLeft, scrollTop);
      } else {
        if (scrollLeft !== this._scrollLeft ||
            scrollTop !== this._scrollTop) {
          set(this, '_scrollLeft', scrollLeft);
          set(this, '_scrollTop', scrollTop);
          needsRevalidate(this);
        }
      }
    },
    clientSizeChange(clientWidth, clientHeight) {
      if (this._clientWidth !== clientWidth ||
          this._clientHeight !== clientHeight) {
        set(this, '_clientWidth', clientWidth);
        set(this, '_clientHeight', clientHeight);
        needsRevalidate(this);
      }
    }
  }
});
