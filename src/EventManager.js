//EventManager.js//

/**
 * @description - Manages the events and event listeners
 * and event emitters
 * @author - Sam Faulkner
 */

const EventEmitter = require('events');

class EventManager {
  constructor(parent) {
    this._parent = parent;
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
    this._emitter.emit(eventType, args, this._parent.getActionManager());
  }
}

module.exports = EventManager;