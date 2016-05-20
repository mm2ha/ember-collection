# @adc/ember-collection

This README outlines the details of collaborating on this Ember addon.

----
## Information and Warnings

The addon is called @adc/ember-collection, but the component to use is `list-view`. The addon is named this way because it is forked from github project [ember-collection](https://github.com/emberjs/ember-collection)


It does a lot of cool stuff under the surface. I encourage you to check out the documentation for the main class `components.list-view`.

It is useful to checkout how different layouts behave by running the dummy app and checking out the ADC Example.

### Warnings:

- If you make any changes, you must commit to the Git repo first
- We want our SVN code to stay in sync with the Git repo this was cloned from
- The reason is that we want to be able to keep our Git fork of `ember-collection` in sync with the original one as much as possible
- Those guys are doing some great work so we don't want to lose the benefits
- If you don't commit to our Git repo first, you won't be able to run the `npm run public-*` commands. This is by design.

----

## Usage in applications

### Installation

* If not installed yet, run `npm install --save-dev @adc/ember-collection` inside your project to install this addon

### Usage

```javascript
{{#list-view
    items=items
    displayBuffer=10

    fullWidthRow=fullWidthRow
    rowHeight=rowHeight
    itemHeight=itemHeight
    itemWidth=itemWidth

    isInfiniteScroll=isInfinite
    infiniteScrollBuffer=infinityScrollBuffer

    get-more-items=(action 'loadMoreDataFunction')
    viewport-change=(action 'sliceDidChange')
    is-loading=(action 'isLoadingAction')
    all-items-loaded=(action 'allItemsLoadedAction')
    items-change=(action 'itemsChangeAction')

    itemsContainerClass="this-is-a-random-class"

    as |item removeItem|
    }}
        {{more-data item=item removeItem=removeItem}}
    {{/list-view}}
```

#### Properties

##### Simple

- `items`
  - Set of items that the list-view should display OR
  - RSVP.Promise that will resolve in a set of items
  - **Note:** The items passed into the component are not bound to the actual `internalItems` of the `list-view`. The `internalItems` are passed back by action `items-change`
  - It is advantageous to set the `meta` information both on the promise or on the items
    - That way the list knows how many items have been loaded out of how many total and if all items have been loaded
- `displayBuffer` (number)
  - How may items before and after visible items should be pre-generated in the DOM
  - The higher this number, the smoother the scrolling should be, but also the more DOM elements will be generated which could make the browser sluggish at large numbers
- `itemsContainerClass` (String)
  - CSS class to be applied to the element that encloses the items

##### Layout

- `fullWidthRow` (number, default = `true`)
  - Sets the layout to use items that span the whole width of the parent
  - **Warning:** If `itemHeight` and `itemWidth` are set the fixed grid layout takes precedence
- `rowHeight` (number)
  - Used for full-width-row layout, defines the height of the row for each item
  - **Note:** If `fullWidthRow` is `true`, but `rowHeight` is `falsy`, the grid will attempt to extract `height` from each item; if that is `undefined` as well, it will use `rowHeightDefault`
- `rowHeightDefault` (number, default = `160`)
  - Used to define the height of an item when `fullWidthRow` is `true`, `rowHeight` is `falsy` and item's height is undefined
- `itemHeight` and `itemWidth` (number)
  - Used for fixed grid layout
  - Each item will have width of `itemWidth` and height of `itemHeight`

**Warning:** If `fullWidthRow`, `itemHeight` and `itemWidth` are all `falsy`, a Mixed Grid layout will be use. This layout uses `height` and `width` properties of each item to determine the size. This is useful for items that are of different sizes. However, each item must have both `height` and `width` properties defined.

##### Loading more items

- `isInfiniteScroll` (boolean, default = `true`)
  - Does nothing if `get-more-items` action is not defined
  - When `true`, new items will be loaded automatically
  - When `false`, a `Load more items` button is present at the end of the list
- `infiniteScrollBuffer` (number, default = `50`)
  - Only used when `isInfiniteScroll` is `true`
  - Specifies with how many remaining non-visible items should the `get-more-items` action be triggered
  - The higher the number the sooner more items will be retrieved, but also the higher load on the server
- `moreDataText`
  - When `isInfiniteScroll` and `get-more-items` is specified, it sets the text for the `Load more items` button

#### Actions

##### `get-more-items`

- Arguments:
  - `setPromiseFunction` (promise [RSVP.Promise], successCallback [Function], failureCallback [Function])
    - Sets promise on the component that when resolved will add items to the collection
  - `lastItemIndex` (number)
    - Index of the last loaded item
- Allows setting a promise for loading of additional items
- Similar to how the `adc-button` does asynchronous actions
- Example:
```javascript
function loadUsersData(setPromiseFunction, lastItemIndex) {
  // Load more users starting at the last index + 1
  setPromiseFunction(this.store.query('users/user', {
      searchString: this.get('searchString'),
      startIndex: lastItemIndex + 1
    }),
    // Success callback
    () => {
      console.log('Things went well!');
    },
    // Failure callback
    () => {
      console.log('Oh well, maybe next time');
    }
  );
}
```

- It is advantageous to set the `meta` information on the resolved Promise object
  - That way the list knows how many items have been loaded out of how many total and if all items have been loaded

##### viewport-change

- Arguments:
  - `firstVisibleIndex` (number)
    - Index of the first visible item
  - `visibleItemsCount` (number)
    - Number of visible items
  - `lastVisibleIndex` (number)
    - Index of the last visible item

##### is-loading

- Arguments:
  - `isLoading` (boolean)
    - Is the list-view currently loading more data?

##### all-items-loaded

- Arguments:
  - `allItemsLoaded` (boolean)
    - Have all items been loaded?
    - This is dependent on proper `meta` data passed together with the promise and items
      - Or this is also set if there were no new items loaded during the last attempt

##### items-change

- Arguments:
  - `items` (Ember.NativeArray)
    - Representation of the current state of items that are in the `list-view`
  - `meta` (Object)
    - Meta information about the items
    ```javascript
    {
      lastIndex: number,
      totalCount: number,
      allLoaded: boolean
    }
    ```
    - This can be set from the server side through the `WebApiItemResponse` and `WebApiListResponse`



<br/><br/>

----
## Contributing

### Installation

* `npm run update`

### Building

* `ember build`


### Testing through the dummy app

* `ember server`
* Visit the app at http://localhost:4200.

### Running Tests

* `npm test` (Runs `ember try:testall` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Publishing to the ADC NPM server

* Depending on the change, you can run the following commands. Each command will run the test suite, build project, increment version in package.json, and if everything succeeded will publish to npm.
  * +0.0.1: `npm run publish-patch`
  * +0.1.0: `npm run publish-minor`
  * +1.0.0: `npm run publish-major`
