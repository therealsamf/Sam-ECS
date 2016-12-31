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
      _this._eventManager.emit(event.type, event);
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
          this.sendStateUpdate(clientID);
        }
      }
      // send the client state for sure
      else {
        this.sendStateUpdate(clientID);
      }
    }

    this._currentTick++;
  }

  sendStateUpdate(clientID) {
    this._clients[clientID].socket.emit('UPDATE', {
      'tick': this._currentTick,
      'state': this.serializeState()
    });
  }
}

module.exports = ServerManager;