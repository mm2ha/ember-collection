import Ember from 'ember';

export default Ember.Component.extend({
    actions: {
        pseudoDeleteItem(item) {
            this.sendAction('removeItem', item);
        }
    }
});