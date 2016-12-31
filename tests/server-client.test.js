//server-client.test.js//

/**
 * @description - Tests relationship between
 * server and client
 * @author - Sam Faulkner
 */

//node imports
const Emitter = require('events');

//user imports
const ClientManager = require('../src/ClientManager.js');
const ServerManager = require('../src/ServerManager.js');

describe("Client Manager", () => {
  var clientManager,
    socket,
    testFun;

  beforeEach(() => {
    socket = new Emitter();
    clientManager = new ClientManager(socket);

    testFun = jest.fn();
    socket.addListener('EVENT', (event) => {
      testFun(event);
    });
  });

  test("Sends events in the right order", () => {
    
    expect(testFun).toHaveBeenCalledTimes(0);
    clientManager.emit('CLICK', {'entity': 'testEntity1'});
    expect(testFun).toHaveBeenCalledTimes(1);
    expect(testFun).toHaveBeenLastCalledWith({
      'type': 'CLICK',
      'tick': 0,
      'entity': 'testEntity1'
    });

    //this shouldn't emit the event yet because we haven't received state for the last event
    clientManager.emit('CLICK', {'entity': 'testEntity2'});
    expect(testFun).toHaveBeenCalledTimes(1);

  });

  test("Buffers events until state has been acknowledged", () => {
    clientManager.emit('CLICK', {'entity': 'testEntity1'});
    expect(clientManager.getQueuedEvents().length).toBe(0);
    
    clientManager.emit('CLICK', {'entity': 'testEntity2'});
    expect(clientManager.getQueuedEvents().length).toBe(1);
    
    clientManager.emit('CLICK', {'entity': 'testEntity3'});
    expect(clientManager.getQueuedEvents().length).toBe(2);

    clientManager.emit('CLICK', {'entity': 'testEntity4'});
    expect(clientManager.getQueuedEvents().length).toBe(3);
  });
});

describe("Client manager receiving state", () => {
  var clientManager,
    socket,
    testFun,
    entityHash = 'testEntity';

  function moveReducer(action, stateManager) {
    var componentState = stateManager.getEntityComponent(action.entity, 'Transform');
    componentState.x = action.x;
    componentState.y = action.y;
  }

  function transformGenerator(state) {
    return {
      'name': 'Transform',
      'state': {
        'x': state.x,
        'y': state.y
      }
    };
  }

  beforeEach(() => {
    socket = new Emitter();
    clientManager = new ClientManager(socket);
    
    testFun = jest.fn();
    socket.addListener('EVENT', (event) => {
      testFun(event)
    });

    clientManager.addComponentToLibrary('Transform', transformGenerator);
    clientManager.addEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 1,
          'y': 2
        }
      }
    ], entityHash);
    clientManager.addReducer(moveReducer, ['MOVE']);

  });

  test("Receiving state works", () => {
    var stateObject = {
      'tick': 0,
      'state': clientManager.serializeState()
    };

    clientManager.emit('CLICK', 
      {
        'entity': 'testEntity1'
      }
    );

    expect(testFun).toHaveBeenCalledTimes(1);
    clientManager.update();

    clientManager.emit('CLICK',
      {
        'entity': 'testEntity2'
      }
    );

    expect(testFun).toHaveBeenCalledTimes(1);
    clientManager.dispatch({
      'type': 'MOVE',
      'entity': entityHash,
      'x': 4,
      'y': 5
    });

    clientManager.update();
    expect(clientManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 4,
              'y': 5
            }
          },
          'subState': 'default'
        }
      ]
    });

    clientManager.receiveState(stateObject);
    //make sure state is unchanged
    expect(clientManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 4,
              'y': 5
            }
          },
          'subState': 'default'
        }
      ]
    });

    //sent the other queued event
    expect(testFun).toHaveBeenCalledTimes(2);
  });

  test("Reapplying actions and prediction work as expected", () => {

    var stateObject0 = {
      'tick': 0,
      'state': clientManager.serializeState()
    };
    clientManager.dispatch({
      'type': 'MOVE',
      'entity': entityHash,
      'x': 3,
      'y': 4
    });
    clientManager.update();

    var stateObject1 = {
      'tick': 1,
      'state': clientManager.serializeState()
    };

    clientManager.dispatch({
      'type': 'MOVE',
      'entity': entityHash,
      'x': 5,
      'y': 6
    });
    clientManager.update();

    var stateObject2 = {
      'tick': 2,
      'state': clientManager.serializeState()
    }

    clientManager.receiveState(stateObject0);
    expect(clientManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 5,
              'y': 6
            }
          },
          'subState': 'default'
        }
      ]
    });
      
    clientManager.receiveState(stateObject1);
    expect(clientManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 5,
              'y': 6
            }
          },
          'subState': 'default'
        }
      ]
    });

    clientManager.receiveState(stateObject2);
    expect(clientManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 5,
              'y': 6
            }
          },
          'subState': 'default'
        }
      ]
    });

  });
});

describe("Server Manager", () => {

  var clientManager,
    serverManager,
    clientSocket,
    clientID = 'clientID';

  beforeEach(() => {
    clientSocket = new Emitter();
    clientManager = new ClientManager(clientSocket);
    serverManager = new ServerManager();
  });

  test("Can add clients", () => {
    var testFun1 = jest.fn();
    var testFun2 = jest.fn();
    clientSocket.on('CONNECTION', () => {
      testFun1();
    });
    clientSocket.on('BUFFER', (num) => {
      testFun2(num);
    });

    serverManager.addClient(clientID, clientSocket);
    expect(serverManager.getClient(clientID)).toBeDefined();
    expect(testFun1).toHaveBeenCalledTimes(1);
    expect(testFun2).toHaveBeenCalledTimes(1);
    expect(testFun2).toHaveBeenLastCalledWith(8);
  });

  test("Sends updates to clients when buffer size is about to be exceeded", () => {
    var testFun = jest.fn();

    clientSocket.on('UPDATE', (stateObject) => {
      testFun(stateObject);
    });

    serverManager.addClient(clientID, clientSocket);
    for (var i = 0; i < 10; i++) {
      serverManager.update();
    }

    // we exceed the buffer size of 8, so it should be called once
    expect(testFun).toHaveBeenCalledTimes(2);
  });

  test("Sends updates to clients when the state has changed", () => {
    function transformGenerator(state) {
      return {
        'name': 'Transform',
        'state': {
          'x': state.x,
          'y': state.y
        }
      };
    }

    function moveReducer(action, stateManager) {
      var componentState = stateManager.getEntityComponent(action.entity, 'Transform');
      componentState.x = action.x;
      componentState.y = action.y;
    }

    serverManager.addComponentToLibrary('Transform', transformGenerator);
    serverManager.addReducer(moveReducer, ['MOVE']);
    clientManager.addComponentToLibrary('Transform', transformGenerator);
    clientManager.addReducer(moveReducer, ['MOVE']);

    serverManager.addClient(clientID, clientSocket);

    var testFun = jest.fn();

    clientSocket.on('UPDATE', (stateObject) => {
      testFun(stateObject);
    });

    var entityHash = 'entityHash';
    serverManager.addEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 0
        } 
      }
    ], entityHash);

    serverManager.update();
    //should have sent out an immediate update
    expect(testFun).toHaveBeenCalledTimes(1);

    serverManager.dispatch({
      'type': 'MOVE',
      'entity': entityHash,
      'x': 1,
      'y': 2
    });
    serverManager.update();
    //state has changed, so should have sent out another update
    expect(testFun).toHaveBeenCalledTimes(2);
  });
});

describe("Both managers", () => {
  var clientManager1,
    clientManager2,
    clientSocket1,
    clientSocket2,
    clientID1 = 'clientID1',
    clientID2 = 'clientID2',
    serverManager,
    entityHash = 'entityHash',
    updateFunction;

  function moveReducer(action, stateManager) {
    var componentState = stateManager.getEntityComponent(action.entity, 'Transform');
    componentState.x = action.x;
    componentState.y = action.y;
  }

  function transformGenerator(state) {
    return {
      'name': 'Transform',
      'state': {
        'x': state.x,
        'y': state.y
      }
    };
  }

  function moveListener(args, actionManager) {
    actionManager.dispatch({
      'type': 'MOVE',
      'entity': args.entity,
      'x': args.x,
      'y': args.y
    });
  }

  beforeEach(() => {
    clientSocket1 = new Emitter();
    clientSocket2 = new Emitter();
    clientManager1 = new ClientManager(clientSocket1);
    clientManager2 = new ClientManager(clientSocket2);

    serverManager = new ServerManager();
    serverManager.addClient(clientID1, clientSocket1);
    serverManager.addClient(clientID2, clientSocket2);

    serverManager.addReducer(moveReducer, ['MOVE']);
    clientManager1.addReducer(moveReducer, ['MOVE']);
    clientManager2.addReducer(moveReducer, ['MOVE']);
    serverManager.addComponentToLibrary('Transform', transformGenerator);
    clientManager1.addComponentToLibrary('Transform', transformGenerator);
    clientManager2.addComponentToLibrary('Transform', transformGenerator);

    serverManager.addListener('MOVE_EVENT', moveListener);
    clientManager1.addListener('MOVE_EVENT', moveListener);
    clientManager2.addListener('MOVE_EVENT', moveListener);

    var component = {
      'name': 'Transform',
      'args': {
        'x': 0,
        'y': 0
      }
    };
    serverManager.addEntityFromComponents([
      Object.assign({}, component)
    ], entityHash);
    clientManager1.addEntityFromComponents([
      Object.assign({}, component)
    ], entityHash);
    clientManager2.addEntityFromComponents([
      Object.assign({}, component)
    ], entityHash);

    updateFunction = () => {
      clientManager1.update();
      clientManager2.update();
      serverManager.update();
    }
  });

  test("All three managers have the same state", () => {
    expect(clientManager1.serializeState()).toEqual(clientManager2.serializeState());
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager2.serializeState()).toEqual(serverManager.serializeState());
  });

  test("Both can update together and stay in sync", () => {
    updateFunction();
    updateFunction();
    updateFunction();
    expect(clientManager1.serializeState()).toEqual(clientManager2.serializeState());
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager2.serializeState()).toEqual(serverManager.serializeState());
  });

  test("Server is authoritative when server state changes", () => {
    updateFunction();

    serverManager.dispatch({
      'type': 'MOVE',
      'entity': entityHash,
      'x': 1,
      'y': 2
    });
    updateFunction();
    expect(clientManager1.serializeState()).toEqual(clientManager2.serializeState());
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager2.serializeState()).toEqual(serverManager.serializeState());
  });

  test("Multiple clients can use the same server and everyone stays in sync", () => {
    clientManager1.emit('MOVE_EVENT', {'entity': entityHash, 'x': 1, 'y': 2});
    updateFunction();
    expect(clientManager1.serializeState()).toEqual(clientManager2.serializeState());
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager2.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager1.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 1,
              'y': 2
            }
          },
          'subState': 'default'
        }
      ]
    });

    clientManager2.emit('MOVE_EVENT', {'entity': entityHash, 'x': 3, 'y': 4});
    clientManager2.emit('MOVE_EVENT', {'entity': entityHash, 'x': 5, 'y': 6});
    updateFunction();
    expect(clientManager1.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 3,
              'y': 4
            }
          },
          'subState': 'default'
        }
      ]
    });
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());    
    expect(clientManager2.serializeState()).toEqual({
      'entities': [
        {
          'hash': entityHash,
          'components': {
            'Transform': {
              'x': 5,
              'y': 6
            }
          },
          'subState': 'default'
        }
      ]
    });
    updateFunction();
    expect(clientManager1.serializeState()).toEqual(clientManager2.serializeState());
    expect(clientManager1.serializeState()).toEqual(serverManager.serializeState());
    expect(clientManager2.serializeState()).toEqual(serverManager.serializeState());
  });
});