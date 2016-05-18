import Ember from 'ember';

export default Ember.Component.extend({
    classNames: ['list-item'],
    actions: {
        pseudoDeleteItem(item) {
            Ember.Logger.debug('pseudoDeleteItem in more-data component');
            this.sendAction('removeItem', item);
        }
    }
});