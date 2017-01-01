//statemanager.test.js//

/**
 * @description - Test suite for the StateManager.js file
 * @author - Sam Faulkner
 */

const Entity = require('../src/Entity.js'),
  StateManager = require('../src/StateManager.js');

var tComponent = {
  'name': 'Transform',
  'state': {
    'x': 0,
    'y': 0
  }
};

var rComponent = {
  'name': 'Render',
  'state': {
    'layer': 0
  }
};

describe("Entities", () => {
  var stateManager,
    transformComponent,
    renderComponent;

  beforeEach(() => {
    stateManager = new StateManager();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("Get added correctly", () => {
    var entity = new Entity();
    transformComponent.init = jest.fn();
    entity.addComponent(transformComponent);

    

    entity.addComponent(renderComponent);

    stateManager.addEntity(entity);
    expect(transformComponent.init).toHaveBeenCalled();
    expect(transformComponent.init).toHaveBeenCalledWith(transformComponent.state,
      entity.getComponent('Transform'));

    expect(stateManager.getEntitiesByComponent('Transform').toArray()).toEqual([entity.hash()]);
    expect(stateManager.getEntitiesByComponent('Render').toArray()).toEqual([entity.hash()]);
    expect(stateManager.getEntitySet().toArray()).toEqual([entity.hash()]);
    expect(stateManager.getEntityState(entity.hash()).keysArray()).toEqual(['Transform', 'Render']);
  });

  test("Get removed correctly", () => {
    var entity = new Entity();
    entity.addComponent(transformComponent);
    entity.addComponent(renderComponent);

    stateManager.addEntity(entity);
    stateManager.removeEntity(entity);

    expect(stateManager.hasComponent('Transform')).toBe(false);
    expect(stateManager.hasComponent('Render')).toBe(false);
    expect(stateManager.getEntitySet().toArray()).toEqual([]);
    expect(() => { stateManager.getEntityState(entity.hash()); }).toThrow();
    expect(() => { stateManager.getEntitiesByComponent('Transform'); }).toThrow();
    expect(() => { stateManager.getEntitiesByComponent('Render'); }).toThrow();
  });

  test("Are sorted by component correctly", () => {
    var entity1 = new Entity();
    var entity2 = new Entity();

    entity1.addComponent(transformComponent);
    entity2.addComponent(Object.assign({}, transformComponent));

    entity1.addComponent(renderComponent);

    stateManager.addEntity(entity1);
    stateManager.addEntity(entity2);

    expect(stateManager.getEntitiesByComponent('Transform').toArray()).toEqual([entity1.hash(),
      entity2.hash()]);
    expect(stateManager.getEntitiesByComponent('Render').toArray()).toEqual([entity1.hash()]);
  });

  test("Can be cleared", () => {
    var entity1 = new Entity();
    var entity2 = new Entity();

    stateManager.addEntity(entity1);
    stateManager.addEntity(entity2);

    stateManager.clear();
    expect(stateManager.getSubState().keysArray().length).toBe(0);
    expect(stateManager.getEntitySet().toArray().length).toBe(0);
  });
});

describe("SubStates", () => {
  var stateManager,
    transformComponent,
    renderComponent;

  beforeEach(() => {
    stateManager = new StateManager();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("Are added correctly", () => {
    stateManager.addSubState("server");

    expect(() => { stateManager.getSubState("server"); }).not.toThrow();
    var entity = new Entity();
    stateManager.addEntity(entity);
    expect(() => { stateManager.addEntityToSubState("server", entity.hash()); }).not.toThrow();
  });

  test("Return the correct entities from 'getSubState'", () => {
    stateManager.addSubState("client");
    var entity1 = new Entity(),
      entity2 = new Entity();

    stateManager.addEntity(entity1, "client");
    stateManager.addEntity(entity2);

    expect(stateManager.getSubState("client").keysArray()).toEqual([entity1.hash()]);
    stateManager.removeEntity(entity2);
    expect(() => { stateManager.addEntity(entity, 'server'); }).toThrow();

  });

  test("Entities added and removed all update data structures correctly", () => {
    stateManager.addSubState('client');
    var entity1 = new Entity(),
      entity2 = new Entity();

    stateManager.addSubState('server');
    stateManager.addEntity(entity1, 'client');
    stateManager.addEntity(entity2, 'server');
    stateManager.removeEntity(entity1);
    expect(stateManager.getSubState('client').keysArray().length).toBe(0);
    expect(stateManager.getSubState('server').keysArray()).toEqual([entity2.hash()]);
    stateManager.removeEntity(entity2);
    expect(stateManager.getSubState('server').keysArray().length).toBe(0);
  });

  test("Can be cleared correctly", () => {
    stateManager.addSubState('client');

    var entity1 = new Entity();
    var entity2 = new Entity();

    stateManager.addEntity(entity1, 'client');
    stateManager.addEntity(entity2);

    stateManager.clearSubState('client');

    expect(stateManager.getEntitySet().toArray()).toEqual([entity2.hash()]);
    expect(stateManager.getSubState('client').keysArray().length).toBe(0);
  });
});

describe("Entities' components", () => {
  var stateManager,
    transformComponent,
    renderComponent;

  beforeEach(() => {
    stateManager = new StateManager();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("Can be added and removed correctly", () => {
    var entity = new Entity(stateManager);

    stateManager.addEntity(entity);
    entity.addComponent(transformComponent);

    expect(stateManager.getEntitiesByComponent('Transform').toArray()).toEqual([entity.hash()]);
    entity.removeComponent('Transform');
    expect(() => { stateManager.getEntitiesByComponent('Transform'); }).toThrow();
    expect(stateManager.hasComponent('Transform')).toBe(false);
  });
});

describe("Saving and restoring state", () => {
  var stateManager,
    transformComponent,
    renderComponent;

  beforeEach(() => {
    stateManager = new StateManager();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("Can be saved properly", () => {
    var entity = new Entity(stateManager);

    stateManager.addEntity(entity);
    entity.addComponent(transformComponent);
    entity.addComponent(renderComponent);

    expect(stateManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entity.hash(),
          'components': {
            'Transform': {
              'x': 0,
              'y': 0
            },
            'Render': {
              'layer': 0
            }
          },
          'subState': 'default'
        }
      ]
    });

    var newEntity = new Entity(stateManager);
    newEntity.addComponent(Object.assign({}, transformComponent));
    stateManager.addEntity(newEntity);
    expect(stateManager.serializeState()).toEqual({
      'entities': [
        {
          'hash': entity.hash(),
          'components': {
            'Transform': {
              'x': 0,
              'y': 0
            },
            'Render': {
              'layer': 0
            }
          },
          'subState': 'default'
        },
        {
          'hash': newEntity.hash(),
          'components': {
            'Transform': {
              'x': 0,
              'y': 0
            }
          },
          'subState': 'default'
        }
      ]
    });
  });

  test("Can be restored properly", () => {
    const ComponentManager = require('../src/ComponentManager.js');
    var componentManager = new ComponentManager();

    componentManager.addComponentToLibrary('Transform', (state) => {
      return {
        'name': 'Transform',
        'state': {
          'x': state.x,
          'y': state.y
        }
      };
    });

    componentManager.addComponentToLibrary('Render', (state) => {
      return {
        'name': 'Render',
        'state': {
          'layer': state.layer
        }
      };
    });

    var entity1 = componentManager.createEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 3,
          'y': 4
        } 
      },
      {
        'name': 'Render',
        'args': {
          'layer': 5
        }
      }
    ]);

    var entity2 = componentManager.createEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 6,
          'y': 7
        }
      }
    ]);

    var entity3 = componentManager.createEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 6,
          'y': 7
        }
      }
    ], entity2.hash());

    stateManager.addEntity(entity1);
    stateManager.addEntity(entity2);
    var stateManager2 = new StateManager();
    stateManager2.addEntity(entity3);

    var previousStateManagerState = stateManager.serializeState();
    expect(stateManager.serializeState()).not.toEqual(stateManager2.serializeState());
    stateManager2.mergeState(stateManager.serializeState(), componentManager);
    expect(stateManager.serializeState()).toEqual(previousStateManagerState);
    expect(stateManager.serializeState()).toEqual(stateManager2.serializeState());
  });
});

describe("Creating a delta state", () => {
  var stateManager1,
    stateManager2,
    entity1,
    entity2;

  beforeEach(() => {
    stateManager1 = new StateManager();
    stateManager2 = new StateManager();

    entity1 = new Entity(stateManager1),
    entity2 = new Entity(stateManager2);

    entity2._setHash(entity1.hash());
    entity1.addComponent(Object.assign({}, tComponent));
    entity2.addComponent(Object.assign({}, tComponent));

    stateManager1.addEntity(entity1);
    stateManager2.addEntity(entity2);
  });

  test("Gets created accurately", () => {
    expect(entity1.equals(entity2)).toBe(true);
    
    var tState = entity1.getComponent('Transform').get('state');
    tState.x = 5;

    expect(entity1.equals(entity2)).toBe(false);
    var deltaState = stateManager1.getDeltaState(stateManager2.getSubState());
    expect(deltaState.keysArray()).toEqual([
      entity1.hash()
    ]);

    var state = deltaState.get(entity1.hash()).get('components').get('Transform').get('state');
    expect(state).toEqual({
      'x': 5,
      'y': 0
    });
  });

  test("Doesn't include extra not needed entities", () => {
    var deltaState = stateManager1.getDeltaState(stateManager2.getSubState());
    expect(deltaState.keysArray().length).toBe(0);
  });
});

describe("Buffering state", () => {
  var stateManager;

  beforeEach(() => {
    stateManager = new StateManager();
  });

  test("Buffers for the entire window", () => {
    for (var i = 0; i < 8; i++) {
      stateManager.update(i);
    }

    expect(stateManager.getStateBuffer().length).toBe(8);
  });

  test("Doesn't overflow the window", () => {
    for (var i = 0; i < 10; i++) {
      stateManager.update(i);
    }

    expect(stateManager.getStateBuffer().length).toBe(8);
  });

  test("Accessing buffers outside the window throws an error", () => {
    expect(() => { stateManager.restoreState(0); }).toThrow();
    stateManager.update(0);
    stateManager.update(1);
    expect(() => { stateManager.restoreState(0); }).not.toThrow();
    expect(() => { stateManager.restoreState(2); }).not.toThrow();
  });
});

describe("Buffered states", () => {
  const ActionManager = require('../src/ActionManager.js');
  var actionManager,
    stateManager,
    currentTick,
    entity,
    updateFunction;

  function moveReducer(action, stateManager, actionManager) {
    var transform = stateManager.getEntityComponent(action.entity, 'Transform');
    transform.x = action.x;
    transform.y = action.y;
  }

  beforeEach(() => {
    actionManager = new ActionManager();
    actionManager.addReducer(moveReducer, ['MOVE']);
    stateManager = new StateManager();
    entity = new Entity();
    entity.addComponent({
      'name': 'Transform',
      'state': {
        'x': 0,
        'y': 0
      }
    });

    stateManager.addEntity(entity);
    currentTick = 0;
    updateFunction = () => {
      actionManager.update(stateManager, currentTick);
      stateManager.update(currentTick);
      currentTick++;
    }
  });

  test("Buffered states get cloned properly", () => {
    updateFunction();
    var bufferedState = stateManager.getBufferedState(0),
      clonedEntity = bufferedState.state.get(entity.hash()).get('object');
    expect(clonedEntity).toBeDefined();
    expect(clonedEntity.equals(entity)).toBe(true);

    
    actionManager.dispatch({
      'type': 'MOVE',
      'entity': entity.hash(),
      'x': 1,
      'y': 1
    });
    updateFunction();
    expect(clonedEntity.equals(entity)).toBe(false);
    expect(clonedEntity.getComponent('Transform').get('state')).toEqual({
      'x': 0,
      'y': 0
    });
  });

  test("State restorations from buffer work properly", () => {
    updateFunction();
    actionManager.dispatch({
      'type': 'MOVE',
      'entity': entity.hash(),
      'x': 1,
      'y': 0
    });
    updateFunction();
    var bufferedState = stateManager.getBufferedState(0).state;
    expect(bufferedState.equals(stateManager.getBufferedState(1).state)).toBe(false);
    stateManager.restoreState(0);

    var oldEntity = stateManager.getEntity(entity.hash());
    expect(oldEntity.getComponent('Transform').get('state')).toEqual({
      'x': 0,
      'y': 0
    });
    expect(stateManager.getEntityComponent(entity.hash(), 'Transform')).toEqual({
      'x': 0,
      'y': 0
    });
  });
});

describe("Serialized state equality", () => {
  var stateManager1,
    stateManager2,
    entity1,
    entity2;

  beforeEach(() => {
    stateManager1 = new StateManager();
    stateManager2 = new StateManager();

    entity1 = new Entity(stateManager1),
    entity2 = new Entity(stateManager2);

    entity2._setHash(entity1.hash());
    entity1.addComponent(Object.assign({}, tComponent));
    entity2.addComponent(Object.assign({}, tComponent));

    stateManager1.addEntity(entity1);
    stateManager2.addEntity(entity2);
  });

  test("Works with equal states", () => {
    var serializedStateA = stateManager1.serializeState();
    var serializedStateB = stateManager2.serializeState();
    expect(stateManager1.serializedStateEquality(serializedStateA, serializedStateB)).toBe(true);
  });

  test("Works with unequal states", () => {
    var serializedStateA = stateManager1.serializeState();
    var tState = entity2.getComponent('Transform').get('state');

    tState.x = 4;

    var serializedStateB = stateManager2.serializeState();

    expect(stateManager1.serializedStateEquality(serializedStateA, serializedStateB)).toBe(false);
  });

  test("Is symmetric", () => {
    var serializedStateA = stateManager1.serializeState();
    var serializedStateB = stateManager2.serializeState();
    expect(stateManager1.serializedStateEquality(serializedStateA, serializedStateB))
      .toBe(stateManager1.serializedStateEquality(serializedStateB, serializedStateA));
  });
})