//ActionManager.js//

/**
 * @description - Manages the current actions in the ECS manager,
 * along with reducers that act on those actions
 * @author - Sam Faulkner
 */

//node imports
const Dict = require('collections/dict.js');
const SortedArray = require('collections/sorted-array.js');

//constants
const MAXIMUM_BUFFER_LENGTH = 8;

class ActionManager {
  constructor(bufferSize) {

    this._actionQueues = new Array();
    this._actionQueues.push(new Array());
    this._actionQueues.push(new Array());
    this._actionQueueIndex = 0;

    this._reducers = new Dict();

    this._actionBuffer = new SortedArray([], 
      (first, second) => {
        return first.tick == second.tick
      },
      (first, second) => {
        return first.tick - second.tick
      }
    );

    this._maxBufferSize = bufferSize || MAXIMUM_BUFFER_LENGTH;
  }

  setMaxBufferSize(value) {
    this._maxBufferSize = value;
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
  update(stateManager, currentTick) {
    var activeActionQueue = this._actionQueues[this._actionQueueIndex];

    this._actionQueueIndex += 1;
    this._actionQueueIndex %= this._actionQueues.length;
    this.bufferActions(activeActionQueue, currentTick);

    for (var action of activeActionQueue) {
      this.dispatchNow(action, stateManager);
    }

    activeActionQueue.length = 0;
  }

  /**
   * @description - Calls the reducers associated with
   * the given action. Does NOT do any error checking 
   * if the action is valid
   * @param {Object} action - the action to be dispatched
   */
  dispatchNow(action, stateManager) {
    var reducerArray = this.getReducers(action.type);
    if (reducerArray) {
      for (var reducer of reducerArray) {
        reducer(action, stateManager, this);
      }
    }
  }

  /**
   * @description - Reapplies all the actions from the given tick
   * @param {Number} tick - the tick to re apply the actions from in time
   * @param {StateManager} stateManager - the stateManager to pass to the reducers
   */
  reApplyFrom(tick, stateManager) {
    var actionBuffer = this.getActionBuffer(tick);
    if (!actionBuffer) {
      actionBuffer = this._actionBuffer.min();
      if (!actionBuffer)
        throw new RangeError("Tick: '" + tick.toString() + "' is out of range!");
      actionBuffer = actionBuffer.actions;
    }
    while (actionBuffer) {
      for (var action of actionBuffer) {
        this.dispatchNow(action, stateManager);
      }
      //increase the tick until we get to the newest in the buffer
      actionBuffer = this.getActionBuffer(++tick);
    }
  }

  /**
   * @description - Takes the given action queue and adds it to the
   * array of buffered actions
   * @param {Array} actionQueue - queue of actions to buffer
   * @param {Number} currentTick - the current tick to store with the
   * queue to keep track of the actions
   */
  bufferActions(actionQueue, currentTick) {
    while (this._actionBuffer.length >= this._maxBufferSize) {
      this._actionBuffer.shift();
    }

    var replicatedActionQueue = [];
    actionQueue.forEach((value, index, array) => {
      replicatedActionQueue.push(Object.assign({}, value));
    });

    this._actionBuffer.push({
      'tick': currentTick,
      'actions': replicatedActionQueue
    });
  }

  /**
   * @description - Returns the actions dispatched within the given tick
   * @param {Number} tick - the tick to retrieve the actions from
   * @returns {Array} the buffered action array
   */
  getActionBuffer(tick) {
    for (var buffer of this._actionBuffer.toArray()) {
      if (buffer.tick == tick) {
        return buffer.actions;
      }
    }
  }

  /**
   * @description - Returns the entire array of action buffers
   * @returns {Array} the entire buffer of action arrays
   */
  _getActionBuffer() {
    return this._actionBuffer;
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