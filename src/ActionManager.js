//ActionManager.js//

/**
 * @description - Manages the current actions in the ECS manager,
 * along with reducers that act on those actions
 * @author - Sam Faulkner
 */

const Dict = require('collections/dict.js');

class ActionManager {
  constructor() {

    this._actionQueues = new Array();
    this._actionQueues.push(new Array());
    this._actionQueues.push(new Array());
    this._actionQueueIndex = 0;

    this._reducers = new Dict();
  }

  /**
   * @description - Adds a reducer that will reduce actions of 
   * the given type
   * @param {Function} reducer - the function that will be called with
   * the given action
   * @param {Array} actionTypes - the types of action that this reducer
   * will be called with
   */
  addReducer(reducer, actionTypes) {
    for (var actionType of actionTypes) {
      if (!this._reducers.has(actionType)) {
        this._reducers.set(actionType, new Array());
      }

      this._reducers.get(actionType).push(reducer);
    }
  }

  /**
   * @description - Removes the reducer from the given action types
   * @param {Function} reducer - the function to remove
   * @param {Array} actionTypes - the types of actions to remove it from
   */
  removeReducer(reducer, actionTypes) {
    for (var actionType of actionTypes) {
      //should I throw an error here?
      if (!this._reducers.has(actionType)) {
        continue;
      }

      var reducerArray = this._reducers.get(actionType);
      if (!reducerArray.includes(reducer)) {
        throw new TypeError("Given reducer can't be removed from type: " + actionType);
      }

      reducerArray.splice(reducerArray.indexOf(reducer), 1);
    }
  }

  /**
   * @description - dispatches all queued actions to 
   * the respective reducers
   * @param {StateManager} stateManager - the state manager
   * that is passed to reducers
   */
  update(stateManager) {
    var activeActionQueue = this._actionQueues[this._actionQueueIndex];
    this._actionQueueIndex += 1;
    this._actionQueueIndex %= this._actionQueues.length;

    for (var action of activeActionQueue) {
      var reducerArray = this.getReducers(action.type);
      for (var reducer of reducerArray) {
        reducer(action, stateManager, this);
      }
    }

    activeActionQueue.length = 0;
  }

  /**
   * @description - Returns the array of reducers associated with
   * the given action type
   * @param {String} actionType - the type of action to return the reducers for
   */
  getReducers(actionType) {
    if (this._reducers.has(actionType)) {
      return this._reducers.get(actionType);
    }
  }

  /**
   * @description - Queues an action to be sent out
   * next update
   * @param {Object} action - the action to be queued
   */
  dispatch(action) {
    if (!action || !action.type) {
      throw new TypeError("Action must be defined and have a type!");
    }
    this._actionQueues[this._actionQueueIndex].push(action);
  }

  /**
   * @description - Returns the currently queued actions
   * @returns {Array} the list of actions currently queued
   */
  getQueuedActions() {
    return this._actionQueues[this._actionQueueIndex];
  }

}

module.exports = ActionManager;