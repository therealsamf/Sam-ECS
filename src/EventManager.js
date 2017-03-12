//EventManager.js//

/**
 * @description - Manages the events and event listeners
 * and event emitters
 * @author - Sam Faulkner
 */

const EventEmitter = require('events');

class EventManager {
  constructor(actionManager) {
    this._actionManager = actionManager;
    this._emitter = new EventEmitter();
    this._queue = {};
    this._currentTick = 0;
  }

  /**
   * @description - Adds an event listener,
   * @param {String} eventType - the type of event the listener will listen
   * for
   * @param {Function} listener - the function that will be called when an
   * event of the right type gets emitted
   */
  addListener(eventType, listener) {
    this._emitter.addListener(eventType, listener);
  }

  /**
   * @description - Returns the listeners for the given event type
   * @param {String} eventType - the type of event
   * @returns {Array} - the listener functions for the array
   */
  getListeners(eventType) {
    return this._emitter.listeners(eventType);
  }

  /**
   * @description - Removes an event listener
   * @param {String} eventType - the type of event that the listener will be removed
   * from
   * @param {Function} listener - the function that will be removed from the
   * given event type
   */
  removeListener(eventType, listener) {
    this._emitter.removeListener(eventType, listener);
  }

  /**
   * @description - Emits an event with the given
   * type and arguments
   * @param {String} eventType - the type of event that will be emitted
   * @param {Object} args - the args object that will be passed to the
   * event listeners
   */
  emit(eventType, args, tick = -1) {
    if (tick === -1) {
      tick = this._currentTick;// + 2;
    }
    // this._emitter.emit(eventType, args, this._actionManager);
    if (!this._queue[tick]) {
      this._queue[tick] = new Array();
    }

    this._queue[tick].push({
      'eventType': eventType,
      'args': args
    });
  }

  /**
   * @description - Called every frame in order to emit our queued events
   * @param {int} currentTick - the current tick of the engine
   */
  update(currentTick) {
    this._currentTick = currentTick;

    if (this._currentTick in this._queue) {
      var eventQueue = this._queue[this._currentTick];
      for (var eventObject of eventQueue) {
        this._emitter.emit(eventObject.eventType, eventObject.args, this._actionManager);
      }
    }

    /* Because this should get called every tick, it shouldn't be necessary to 
     * delete everything <= the current tick. Just the = the current tick
     * should be enough
     */
    delete this._queue[this._currentTick];
  }
}

module.exports = EventManager;