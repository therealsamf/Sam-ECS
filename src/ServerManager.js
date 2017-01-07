//ServerManager.js//

/**
 * @description - Specialized manager for use with the server
 * @author - Sam Faulkner
 */

//user imports
const Manager = require('./Manager.js');

class ServerManager extends Manager {
  constructor() {
    super();

    this._clients = {};
    this._maxBufferSize = 8;
  }

  addClient(id, socket) {
    this._clients[id] = {
      'socket': socket,
      'lastAcknowledgedState': -1
    };


    var _this = this;
    socket.on('BUFFER', (num) => {
      _this._clients[id].bufferSize = num;
      if (num < _this._maxBufferSize) {
        _this._maxBufferSize = num;
      }
    });
    socket.on('EVENT', (event) => {
      _this._eventManager.emit(event.type, Object.assign(event, {'sid': id}));
    });
    socket.on('ACKNOWLEDGE', (data) => {
      _this._clients[id].lastAcknowledgedState = data.tick;
    });

    socket.emit('CONNECTION');
  }

  getClient(id) {
    return this._clients[id];
  }

  update() {
    super.update();

    for (var clientID in this._clients) {
      var clientObject = this._clients[clientID];
      if (this._currentTick >= clientObject.lastAcknowledgedState + clientObject.bufferSize) {
        this.sendStateUpdate(clientID);
        continue;
      }
      var oldStateObject = this._stateManager.getBufferedState(clientObject.lastAcknowledgedState);
      if (oldStateObject) {
        var oldState = oldStateObject.state;
        var deltaState = this._stateManager.getDeltaState(oldState);
        //there have been changes
        if (deltaState.length > 0) {
          this.sendStateUpdate(clientID, deltaState);
        }
      }
      // send the client state for sure
      else {
        this.sendStateUpdate(clientID);
      }
    }

    this._currentTick++;
  }

  /** 
   * @description - This function is responsible for sending a particular client an update
   * in state
   * @param {String} clientID - the ID of the client within the _clients
   * @param {Dict} deltaState - an optional parameter for the new state to send
   * to the client
   */
  sendStateUpdate(clientID, deltaState) {
    //not going to check if this is valid here because it should be
    var clientObject = this._clients[clientID];
    var state = deltaState;
    if (!state) {
      var oldStateObject = this._stateManager.getBufferedState(clientObject.lastAcknowledgedState);
      if (oldStateObject) {
        state = this._stateManager.getDeltaState(oldStateObject.state);
      }
      else {
        state = this._stateManager.getSubState();
      }
    }

    this._clients[clientID].socket.emit('UPDATE', {
      'tick': this._currentTick,
      'state': this._stateManager._serializeState(state);
    });
  }
}

module.exports = ServerManager;