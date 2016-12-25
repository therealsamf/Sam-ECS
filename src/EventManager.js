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
  emit(eventType, args) {
    this._emitter.emit(eventType, args, this._actionManager);
  }
}

module.exports = EventManager;