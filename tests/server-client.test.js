//server-client.test.js//

/**
 * @description - Tests functionalities for a server client
 * architecture
 * @author - Sam Faulkner
 */

const { Manager } = require('../src/Manager.js');

function applyComponentGenerators(manager) {
  manager.addComponentToLibrary('Render', 
    (argObject, manager) => {
      return {
        'name': 'Render',
        'state': {
          'layer': argObject.layer
        }
      }
    }
  );
  manager.addComponentToLibrary('Transform',
    (argObject, manager) => {
      return {
        'name': 'Transform',
        'state': {
          'x': argObject.x,
          'y': argObject.y
        }
      }
    }
  );
}

var renderComponent = {
  'name': 'Render',
  'args': {
    'layer': 1
  }
};

var transformComponent = {
  'name': 'Transform',
  'args': {
    'x': 0,
    'y': 0
  }
}

function moveReducer(action, manager) {
  var transformState = manager.getEntityState(action.entity).Transform.state;
  transformState.x = action.x;
  transformState.y = action.y;
}

function relayerReducer(action, manager) {
  var renderState = manager.getEntityState(action.entity).Render.state;
  renderState.layer = action.layer;
}

function addEntityReducer(action, manager) {
  manager.addEntityFromComponents([
    {
      'name': 'Render',
      'args': {
        'layer': 4
      }
    },
    {
      'name': 'Transform',
      'args': {
        'x': 3,
        'y': 4
      }
    }
  ]);
}

describe("Rolling back", () => {
  var manager1,
    manager2,
    entity;

  beforeEach(() => {
    manager1 = new Manager();
    manager2 = new Manager();

    applyComponentGenerators(manager1);
    applyComponentGenerators(manager2);

    entity = manager1.addEntityFromComponents([
      renderComponent,
      transformComponent
    ]);

    manager2.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    manager1.addReducer(moveReducer, ['MOVE']);
    manager1.addReducer(relayerReducer, ['RELAYER']);
    manager2.addReducer(moveReducer, ['MOVE']);
    manager2.addReducer(relayerReducer, ['RELAYER']);

  });

  test("Properly updates the _stateQueue", () => {
    manager1.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 0,
      'y': 1
    });

    expect(manager1._stateQueue.length).toBe(1);
    expect(manager1._stateCounter).toBe(1);

    manager2.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 1,
      'y': 1
    });

    var manager2State = manager2.toJSON();
    var manager2Number = manager2._stateCounter;

    manager1.rollback(manager2Number, manager2State);
    expect(manager1._stateQueue.length).toBe(0);
    expect(manager1.toJSON()).toEqual(manager2.toJSON());

  });

  test("Overwrites newer updates", () => {

    manager1.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 0,
      'y': 1
    });

    manager1.dispatch({
      'type': 'RELAYER',
      'entity': entity,
      'layer': 3
    });

    manager2.dispatch({
      'type': 'RELAYER',
      'entity': entity,
      'layer': 4
    });

    var manager2State = manager2.toJSON();
    var manager2Number = manager2._stateCounter;

    manager1.rollback(manager2Number, manager2State);
    expect(manager1._stateQueue.length).toBe(1);
    expect(manager1.toJSON()).toEqual(manager2.toJSON());
  });

  test("Properly sets the state counter to the newer value", () => {
    manager1.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 0,
      'y': 1
    });

    manager1.dispatch({
      'type': 'RELAYER',
      'entity': entity,
      'layer': 3
    });

    manager2.dispatch({
      'type': 'RELAYER',
      'entity': entity,
      'layer': 4
    });

    expect(manager1._stateCounter).toBe(2);
    var manager1State = manager1.toJSON();
    var manager1Number = manager1._stateCounter;

    manager2.rollback(manager1Number, manager1State);
    expect(manager2._stateQueue.length).toBe(0);
    expect(manager2.toJSON()).toEqual(manager1.toJSON());
    
    expect(manager2._stateCounter).toBe(2);

  });
});

describe("Unrolling", () => {
  var manager1,
    manager2,
    entity;

  beforeEach(() => {
    manager1 = new Manager();
    manager2 = new Manager();

    applyComponentGenerators(manager1);
    applyComponentGenerators(manager2);

    entity = manager1.addEntityFromComponents([
      renderComponent,
      transformComponent
    ]);

    manager2.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    manager1.addReducer(moveReducer, ['MOVE']);
    manager1.addReducer(relayerReducer, ['RELAYER']);
    manager2.addReducer(moveReducer, ['MOVE']);
    manager2.addReducer(relayerReducer, ['RELAYER']);

  });

  test("Reapplied state is equal to current state", () => {
    
    manager1.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1,
      'entity': entity
    });
    var state = manager1.toJSON();

    manager1.dispatch({
      'type': 'RELAYER',
      'layer': 3,
      'entity': entity
    });
    manager1.dispatch({
      'type': 'MOVE',
      'x': 4,
      'y': 5,
      'entity': entity
    });

    var newState = manager1.toJSON();
    manager1.rollback(1, state);            
    expect(manager1._stateQueue.length).toBe(2);
    expect(manager1.toJSON()).toEqual(state);
    manager1.unroll();
    expect(manager1.toJSON()).toEqual(newState);
  });

  test("Actions are reapplied properly", () => {
    manager1.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1,
      'entity': entity
    });

    manager1.dispatch({
      'type': 'RELAYER',
      'layer': 3,
      'entity': entity
    });
    manager2.dispatch({
      'type': 'MOVE',
      'x': 4,
      'y': 5,
      'entity': entity
    });

    manager1.rollback(manager2._stateCounter, manager2.toJSON());
    manager1.unroll();
    expect(manager1.toJSON()).toEqual({
      'entities': [
        {
          'components': {
            'Transform': {            
              'x': 4,
              'y': 5
            },
            'Render': {
              'layer': 3
            }
          },
          'hash': entity
        }
      ]
    });
  });

});

describe("Multiple clients and server", () => {

  var client1,
    client2,
    server,
    entity;

  beforeEach(() => {
    client1 = new Manager();
    client2 = new Manager();
    server = new Manager();

    applyComponentGenerators(client1);
    applyComponentGenerators(client2);
    applyComponentGenerators(server);

    entity = client1.addEntityFromComponents([
      renderComponent,
      transformComponent
    ]);

    client2.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    server.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    client1.addReducer(moveReducer, ['MOVE']);
    client1.addReducer(relayerReducer, ['RELAYER']);
    client2.addReducer(moveReducer, ['MOVE']);
    client2.addReducer(relayerReducer, ['RELAYER']);
    server.addReducer(moveReducer, ['MOVE']);
    server.addReducer(relayerReducer, ['RELAYER']);

  });

  test("Syncing state across clients", () => {
    server.addDispatchSideEffect((action) => {
      client1.rollback(server._stateCounter, server.toJSON());
      client2.rollback(server._stateCounter, server.toJSON());
      client1.unroll();
      client2.unroll();
    });

    client1.addDispatchSideEffect((action, unrolling) => {
      if (!unrolling) {
        server.dispatch(action);
      }
    });

    client2.addDispatchSideEffect((action, unrolling) => {
      if (!unrolling) {
        server.dispatch(action);
      }
    });

    client1.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 2,
      'y': 2
    });

    client1.dispatch({
      'type': 'MOVE',
      'entity': entity,
      'x': 2,
      'y': 3
    });

    expect(client1._stateCounter).toBe(client2._stateCounter);

    expect(client2.toJSON()).toEqual({
      'entities': [
        {
          'hash': entity,
          'components': {
            'Transform': {
              'x': 2,
              'y': 3
            },
            'Render': {
              'layer': 1
            }
          }
        }
      ]
    });
  });

  test("Unrolling between clients", () => {
    jest.useFakeTimers();
    server.addDispatchSideEffect((action) => {
      client1.rollback(server._stateCounter, server.toJSON());
      client2.rollback(server._stateCounter, server.toJSON());
      client1.unroll();
      client2.unroll();
    });

    client2.addDispatchSideEffect((action, unrolling) => {
      if (!unrolling) {
        server.dispatch(action);
      }
    });

    var action1 = {
      'type': 'MOVE',
      'x': 2,
      'y': 2,
      'entity': entity
    };
    var action2 = {
      'type': 'RELAYER',
      'layer': 4,
      'entity': entity
    };

    client1.dispatch(action1);
    client1.dispatch(action2);
    server.dispatch(action1);



    expect(client1._stateCounter).toBeGreaterThan(client2._stateCounter);
    expect(client1.toJSON()).toEqual({
      'entities': [
        {
          'hash': entity,
          'components': {
            'Transform': {
              'x': 2,
              'y': 2
            },
            'Render': {
              'layer': 4
            }
          }
        }
      ]
    });
    expect(client2.toJSON()).toEqual({
      'entities': [
        {
          'hash': entity,
          'components': {
            'Transform': {
              'x': 2,
              'y': 2
            },
            'Render': {
              'layer': 1
            }
          }
        }
      ]
    });


    server.dispatch(action2);
    expect(client2.toJSON()).toEqual(client1.toJSON());

  });
});

function getTransformState (entity, manager) {
  return manager.getEntityState(entity).Transform.state;
}

function getRenderState (entity, manager) {
  return manager.getEntityState(entity).Render.state;
}

describe("Rolling back using actions", () => {
  var manager1,
    manager2,
    entity;

  beforeEach(() => {
    manager1 = new Manager();
    manager2 = new Manager();

    applyComponentGenerators(manager1);
    applyComponentGenerators(manager2);

    entity = manager1.addEntityFromComponents([
      renderComponent,
      transformComponent
    ]);

    manager2.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    manager1.addReducer(moveReducer, ['MOVE']);
    manager1.addReducer(relayerReducer, ['RELAYER']);
    manager2.addReducer(moveReducer, ['MOVE']);
    manager2.addReducer(relayerReducer, ['RELAYER']);

  });

  test("State queue is updated properly", () => {
    // var firstState = manager1.toJSON();

    var testFun1 = jest.fn(),
      testFun2 = jest.fn();
    manager1.dispatch({
      'type': 'MOVE',
      'x': 1,
      'y': 1,
      'entity': entity,
      'revert': () => { testFun1(); }
    });

    manager1.dispatch({
      'type': 'RELAYER',
      'layer': 3,
      'entity': entity,
      'revert': () => { testFun1(); }
    });

    manager2.dispatch({
      'type': 'MOVE',
      'x': 2,
      'y': 2,
      'entity': entity,
      'revert': () => { testFun2(); }
    });

    manager2.dispatch({
      'type': 'RELAYER',
      'layer': 4,
      'entity': entity,
      'revert': () => { testFun2(); }
    });

    manager1.rollback_actions(0);
    expect(manager1._stateQueue.length).toBe(2);
    expect(testFun1).toHaveBeenCalledTimes(2);

    manager2.rollback_actions(1);
    expect(manager2._stateQueue.length).toBe(1);
    expect(testFun2).toHaveBeenCalledTimes(1);
  });

  test("Rolling back gets to correct previous state", () => {
    var transformState = getTransformState(entity, manager1),
      firstX = transformState.x,
      firstY = transformState.y;

    var firstState = manager1.toJSON();
    manager1.dispatch({
      'type': 'MOVE',
      'x': 4,
      'y': 4,
      'entity': entity,
      'revert': () => {
        transformState.x = firstX;
        transformState.y = firstY;
      }
    });

    var secondState = manager1.toJSON();

    var renderState = getRenderState(entity, manager1),
      firstLayer = renderState.layer;

    manager1.dispatch({
      'type': 'RELAYER',
      'layer': 3,
      'entity': entity,
      'revert': () => {
        renderState.layer = firstLayer;
      }
    });

    var thirdState = manager1.toJSON();

    expect(firstState).not.toEqual(secondState);
    expect(firstState).not.toEqual(thirdState);
    expect(secondState).not.toEqual(thirdState);

    manager1.rollback_actions(0);
    expect(manager1._stateQueue.length).toBe(2);
    expect(manager1.toJSON()).toEqual(firstState);

    manager1.unroll();
    expect(manager1.toJSON()).toEqual(thirdState);

    manager1.rollback_actions(1);
    expect(manager1.toJSON()).toEqual(secondState);
    manager1.unroll();
    expect(manager1.toJSON()).toEqual(thirdState);
  });
});

describe("More robust testing", () => {
  var client1,
    client2,
    server,
    entity;

  beforeEach(() => {
    client1 = new Manager();
    client2 = new Manager();
    server = new Manager();

    applyComponentGenerators(client1);
    applyComponentGenerators(client2);
    applyComponentGenerators(server);

    entity = client1.addEntityFromComponents([
      renderComponent,
      transformComponent
    ]);

    client2.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    server.addEntityFromComponents([
      renderComponent,
      transformComponent
    ], entity);

    client1.addReducer(moveReducer, ['MOVE']);
    client1.addReducer(relayerReducer, ['RELAYER']);
    client1.addReducer(addEntityReducer, ['ADD']);
    client2.addReducer(moveReducer, ['MOVE']);
    client2.addReducer(relayerReducer, ['RELAYER']);
    client2.addReducer(addEntityReducer, ['ADD']);

    client1.addEmitSideEffect((eventType, args) => {
      server.emit(eventType, args);
    });

    client2.addEmitSideEffect((eventType, args) => {
      server.emit(eventType, args);
    });

    server.addDispatchSideEffect((action) => {
      client1.rollback(server._stateCounter, server.toJSON());
      client1.unroll();
      client2.rollback(server._stateCounter, server.toJSON());
      client2.unroll();
    });

    client1.addListener("CLIENT_ONLY_EVENT", (args, manager) => {
      manager.dispatch({
        'type': 'ADD'
      });
    });

    client2.addListener("CLIENT_ONLY_EVENT", (args, manager) => {
      manager.dispatch({
        'type': 'ADD'
      });
    });

    client1.addListener("BOTH_EVENT", (args, manager) => {
      manager.dispatch({
        'type': 'MOVE',
        'x': args.x,
        'y': args.y,
        'entity': args.entity
      });
    });

    client2.addListener("BOTH_EVENT", (args, manager) => {
      manager.dispatch({
        'type': 'MOVE',
        'x': args.x,
        'y': args.y,
        'entity': args.entity
      });
    });

    server.addListener("BOTH_EVENT", (args, manager) => {
      manager.dispatch({
        'type': 'MOVE',
        'x': args.x,
        'y': args.y,
        'entity': args.entity
      });
    });
  });

  test("General client-server approach isn't inherently breaking anything", () => {
    client1.emit("BOTH_EVENT", {'x': 4, 'y': 5});
    // expect(client1._stateCounter).toBe(server._stateCounter);
    // expect(client1.toJSON()).toEqual(client2.toJSON());
  });

  // test("Reducer that adds an entity isn't creating duplicates", () => {
    

  // });

  // test("Using events and emit side effects to resemble server-client architecture", () => {

  // });
});