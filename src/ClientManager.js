//ClientManager.js//

/**
 * @description - Exactly like the orignal Manager but has some helper
 * methods for clients
 * @author - Sam Faulkner
 */

//constants
const MAXIMUM_BUFFER_SIZE = 12;

const Manager = require('./Manager.js');
const StateManager = require('./StateManager.js');

var StateWorker
if (typeof(window) !== 'undefined' && window.Worker) 
  StateWorker = require("worker!./ClientWorker.js");

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
    this._otherStateManager = new StateManager(MAXIMUM_BUFFER_SIZE);

    var _this = this;
    socket.on('UPDATE', (data) => {
      _this.receiveState(data);
    });
    socket.on('CONNECTION', () => {
      socket.emit('BUFFER', MAXIMUM_BUFFER_SIZE - 4);
      socket.emit('ACKNOWLEDGE', {'tick': this._lastAcknowledgedState});
    });
  }

  /**
   * @description - Returns the socket object
   * @returns {Socket.io} the socket.io object
   */
  getSocket() {
    return this._socket;
  }

  /**
   * @description - The event side affect which will buffer events before they are
   * sent to the server
   * @param {Object} event - the event object
   */
  eventFun(event) {
    if (!event.local) {
      Object.assign(event, {'tick': this._currentTick});
      this._eventBuffer.push(event);
      setTimeout(() => {
        this.sendNextEvent();
      }, 0);
    }
  }

  /**
   * @description - Sets the user for this client manager
   * @param {String} value - the value to set the user to
   */
  setUser(value) {
    this._user = value;
  }

  /**
   * @description - Accessor method for the server
   * @returns {String} the current user
   */
  getUser() {
    return this._user;
  }

  /**
   * @description - Receiver function for state updates from the server
   * @param {Object} stateObject - the state object received from the server
   */
  receiveState(stateObject) {
    var tick = stateObject.tick;

    // we don't care about states in the past?
    if (tick < this._lastAcknowledgedState) {
      return;
    }

    if (typeof('window') === undefined || !window.Worker) {

      if (this._lastAcknowledgedState > 0 && tick > this._lastAcknowledgedState) {
        this._stateManager.restoreState(tick);
        // this._otherStateManager.mergeState(
        //   this._otherStateManager._serializeState(
        //     this._stateManager.getBufferedState(this._lastAcknowledgedState).state
        //   ),
        //   this._componentManager
        // );
      }

      // this._otherStateManager.mergeState(stateObject.state, this._componentManager);
      this._stateManager.mergeState(stateObject.state, this._componentManager);
      if (tick < this._currentTick) {
        this._actionManager.reApplyFrom(tick, this._stateManager);
      }
      // we're behind (cheating?)
      else {
        this._currentTick = tick;
        this._stateManager.bufferState(this._currentTick);
      }
      this._stateManager.mergeEntireState(this._otherStateManager.getState(), this._componentManager);

      var previousAckState = this._lastAcknowledgedState;
      this._lastAcknowledgedState = tick;
      this._socket.emit('ACKNOWLEDGE', {'tick': tick});
      // we've acknowledged a new state. Time to send a new event
      if (tick > previousAckState) {
        this._eventPending = false;
        this.sendNextEvent();
      }
    }
    else {
      if (!this._worker) {
        this._worker = new StateWorker();
        var _this = this;
        this._worker.onmessage = this.workerResolve.bind(this);
      }
      var oldDict = this._stateManager.getBufferedState(tick);
      var oldState;
      if (oldDict !== undefined) {
        var oldStateObject = oldDict.state;
        oldState = this._stateManager._serializeState(oldStateObject);
      }
      else {
        oldState = this._stateManager.serializeState();
      }

      this._otherStateManager.mergeEntireState(this._stateManager.getState(), this._componentManager);
      this._otherStateManager.mergeState(oldState, this._componentManager);

      this._worker.postMessage({
        'oldState': oldState,
        'deltaState': stateObject.state,
        'tick': tick
      });
    }
  }

  /**
   * @description - Message handler for communicating with the web worker
   * @param {Object} mes - the message returned from the web worker
   */
  workerResolve(mes) {
    var data = mes.data;
    var tick = data.tick;
      data = data.state;

    this._otherStateManager.mergeState(data, this._componentManager);


    if (tick < this._currentTick) {
      this._actionManager.reApplyFrom(tick, this._otherStateManager);
    }
    // we're behind (cheating?)
    else if (tick > this._currentTick) {
      console.warn("We're behind the server by: " + (tick - this._currentTick) + " ticks."); 
      this._currentTick = tick;
      this._stateManager.bufferState(this._currentTick);
    }

    this._stateManager.mergeState(
      this._otherStateManager._serializeState(this._otherStateManager.getDeltaState(this._stateManager.getSubState())),
      this._componentManager
    );

    var previousAckState = this._lastAcknowledgedState;
    this._lastAcknowledgedState = tick;
    this._socket.emit('ACKNOWLEDGE', {'tick': tick});
    // we've acknowledged a new state. Time to send a new event
    if (tick > previousAckState) {
      this._eventPending = false;
      this.sendNextEvent();
    }
  }

  /**
   * @description - Sends the next event in the event buffer to the server
   */
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