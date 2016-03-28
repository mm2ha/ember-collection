import PercentageGrid from './percentage-columns';
import ShelfFirst from 'layout-bin-packer/shelf-first';

/**
 * This class extends PercentageGrid by defaulting the percentage to 100. This was super easy to do, and very straightforward.
 *
 * However, in the future we might want to rebuild this so that it always returns client width for the width; we will most likely not need ShelfFirst, but something simpler
 */
export default class FullWidthRow extends PercentageGrid {
    constructor(items, height, isForceHeight) {
        // JS is forcing me to do this even though I don't want to.
        // Maybe a better way would be to abstract methods from PercentageGrid to a mixin and use it there and here,
        //  but I did not want to make too many changes to the existing ember-collections code
        super();

        this.positions = [];
        this.height = parseInt(height, 10);
        this.isForceHeight = isForceHeight;

        this.updatePositionsWithItems(items);

        this.bin = new ShelfFirst(this.positions, 100);
    }

    /**
     * Sets up positions for items
     *
     * @param {Ember.A} items
     */
    updatePositionsWithItems (items) {
        let length = items.length;

        for (let i = 0; i < length; i++) {
            this.positions.push({
                width: 100,
                height: this.isForceHeight ? this.height : items[i].height,
                percent: 100
            });
        }
    }

    /**
     * Called when more items are added to the collection
     * @param {Ember.A} items
     */
    addContent(newItems) {
        this.updatePositionsWithItems(newItems);
    }
}
