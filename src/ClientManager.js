//ClientManager.js//

/**
 * @description - Exactly like the orignal Manager but has some helper
 * methods for clients
 * @author - Sam Faulkner
 */

//constants
const MAXIMUM_BUFFER_SIZE = 12;

const Manager = require('./Manager.js');

class ClientManager extends Manager {
  constructor(socket) {
    super();

    this._user = undefined;

    this._lastAcknowledgedState = -1;
    this._eventBuffer = new Array();
    this._eventPending = false;

    this.eventFun = this.eventFun.bind(this);

    this.addEmitSideEffect(this.eventFun);

    this._socket = socket;

    this.setMaxBufferSize(MAXIMUM_BUFFER_SIZE);

    var _this = this;
    socket.on('UPDATE', (data) => {
      _this.receiveState(data);
    });
    socket.on('CONNECTION', () => {
      socket.emit('BUFFER', MAXIMUM_BUFFER_SIZE - 4);
      socket.emit('ACKNOWLEDGE', {'tick': this._lastAcknowledgedState});
    });
  }

  getSocket() {
    return this._socket;
  }

  eventFun(event) {
    Object.assign(event, {'tick': this._currentTick});
    this._eventBuffer.push(event);
    this.sendNextEvent();
  }

  setUser(value) {
    this._user = value;
  }

  getUser() {
    return this._user;
  }

  receiveState(stateObject) {
    if (window) {
      var _this = this;
      setTimeout(() => {
        var tick = stateObject.tick;

        // we don't care about states in the past?
        if (tick < _this._lastAcknowledgedState) {
          return;
        }

        if (_this._lastAcknowledgedState > 0) {
          _this._stateManager.restoreState(_this._lastAcknowledgedState);
        }

        _this._stateManager.mergeState(stateObject.state, _this._componentManager);
        if (tick < _this._currentTick) {
          _this._actionManager.reApplyFrom(tick, _this._stateManager);
        }
        // we're behind (cheating?)
        else {
          _this._currentTick = tick;
          _this._stateManager.bufferState(_this._currentTick);
        }

        var previousAckState = _this._lastAcknowledgedState;
        _this._lastAcknowledgedState = tick;
        _this._socket.emit('ACKNOWLEDGE', {'tick': tick});
        // we've acknowledged a new state. Time to send a new event
        if (tick > previousAckState) {
          _this._eventPending = false;
          _this.sendNextEvent();
        }
      }, 0);
    }
  }

  sendNextEvent() {
    if (!this._eventPending) {
      var event = this._eventBuffer.shift();
      if (event) {
        this._eventPending = true;
        this._socket.emit('EVENT', event);
      }
    }
  }

  /**
   * @description - Returns the currently queued events waiting to be sent to the server
   * @returns {Array} the array of currently queued events
   */
  getQueuedEvents() {
    return this._eventBuffer;
  }

  update() {
    super.update();
    this._currentTick++;
  }
}

module.exports = ClientManager;