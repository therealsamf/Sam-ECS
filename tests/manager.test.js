//manager.test.js//

/**
 * @description - Tests the manager class
 */

//constants
const path = require('path');
const source_path = path.resolve(__dirname, "..", "src");
const HASH_LENGTH = 8;

//user import
const { Manager } = require(path.resolve(source_path, "Manager.js"));
const { Processor } = require(path.resolve(source_path, "Processor.js"));
const { Entity } = require(path.resolve(source_path, "Entity.js"));
const Family = require(path.resolve(source_path, 'Family.js'));

describe("ECS-Manager", () => {
  /**
   * @description - Tests an empty manager is all that it should be: empty
   */
  test("Creates successfully", () => {
    var manager = new Manager();
    
    // test empty entities
    expect(manager.getEntities()).toEqual({});
    expect(() => { manager.getEntityState(); }).toThrow();
    expect(() => { manager.getEntityState("ythgkdiu"); }).toThrow();
    
    // test that passing in undefined for getEntitiesByComponent throws an error
    expect(() => { manager.getEntitiesByComponent(); }).toThrow();

    /* test that passing in a component name that isn't in the manager yet 
     * throws an error
     */
    expect(() => { manager.getEntitiesByComponent("Transform"); }).toThrow();

    /* test that passing in undefined for action type for getReducers throws an
     * error
     */
    expect(() => { manager.getReducers(); }).toThrow();

    /* Test that passing in a action type that doesn't have a reducer associated
     * with it yet throws an error
     */
    expect(() => { manager.getReducer("UPDATE_VELOCITY"); }).toThrow();
  });
});

describe("Entities and the ECS-Manager", () => {
  /**
   * @description - Tests adding an entity
   */
  test("Adds an entity to the ECS manager", () => {
    var manager = new Manager();

    const entity = new Entity(manager);

    var transformComponent = {
      name: 'Transform',
      state: {
        'x': 0,
        'y': 0
      }
    };

    expect(manager.hasComponent(transformComponent.name)).toEqual(false);

    entity.addComponent(transformComponent);
    manager.addEntity(entity);
    var entityHashValue = entity.hash();

    expect(manager.hasComponent(transformComponent.name)).toEqual(true);

    // test that the 'entities' object is correct
    expect(Object.keys(manager.getEntities())).toContain(entityHashValue);
    expect(manager.getEntities()[entityHashValue]).toEqual({
      [transformComponent.name]: {
        'state': {
          'x': 0,
          'y': 0
        },
        'init': undefined,
        'remove': undefined
      }
    });
    expect(manager.getEntities()[entityHashValue][transformComponent.name].state)
      .toEqual(transformComponent.state);

    // test that 'getEntity' also returns the right data
    expect(manager.getEntityState(entityHashValue)).toBe(entity.getComponents());

    // test the component lists to see if they correctly added the entity's hash
    var expectedSet = new Set();
    expectedSet.add(entityHashValue);
    expect(manager.getEntitiesByComponent(transformComponent.name)
      .toArray()).toEqual([entityHashValue]);

    
  });

  /**
   * @description - Tests overwriting an entity 
   */
  test("Overwrites an entity in the ECS manager", () => {
    var manager = new Manager();

    const entity = new Entity(manager);

    entity.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    manager.addEntity(entity);
    var entityHashValue = entity.hash();

    /* add another entity with the same hash, make sure it overwrites and 
     * removes the previous one
     */
    var physicsComponent = {
      name: 'Physics',
      state: {
        'velocity': {
          'x': 0,
          'y': 0
        }
      }
    };
    var entity2 = new Entity(manager);
    entity2._hash = entityHashValue;
    entity2.addComponent(physicsComponent);

    manager.addEntity(entity2);

    expect(Object.keys(manager.getEntities()).length).toEqual(1);
    expect(manager.getEntityState(entityHashValue)).toBe(entity2.getComponents());

    var expectedSet = new Set();
    expectedSet.add(entityHashValue);
    expect(manager.getEntitiesByComponent(physicsComponent.name).toArray())
      .toEqual([entityHashValue]);

    expect(() => { manager.getEntitiesByComponent(transformComponent.name); }).toThrow();
  });

  /**
   * @description - Tests removing an entity
   */
  test("Removes an entity from the ECS manager", () => {
    var manager = new Manager();

    const entity = new Entity(manager);
    
    /*
     * Add a single entity, remove it, make sure the manager is completely empty
     */
    entity.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    manager.addEntity(entity);

    manager.removeEntity(entity);
    expect(manager.hasComponent("Transform")).toEqual(false);

    // test that all the appropriate fields in the manager are empty
    expect(manager.getEntities()).toEqual({});
    expect(() => { manager.getEntitiesByComponent("Transform"); }).toThrow();
    expect(() => { manager.getEntityState(entity.hash()); }).toThrow();

    /*
     * Add two entities, remove one, make sure the manager is in correct state
     */
    const entity1 = new Entity(manager);
    const entity2 = new Entity(manager);

    entity1.addComponent({'name': 'Transform', 'state': {'x': 1, 'y': 1}});
    entity1.addComponent({'name': 'Physics', 'state': {'velocity': { 'x': 0, 'y': 0}}});
    entity2.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});

    manager.addEntity(entity1);
    manager.addEntity(entity2);
    manager.removeEntity(entity1);

    /* test if all appropriate fields have been updated to the correct modified
     * state after the removal
     */
    // no trace of entity1
    expect(manager.getEntities()).toEqual({
      [entity2.hash()]: entity2.getComponents()
    });
    expect(() => { manager.getEntityState(entity1.hash()); }).toThrow();
    expect(manager.hasComponent("Physcis")).toEqual(false);

    // 'entity2' should still be there safe and sound
    expect(manager.getEntityState(entity2.hash())).toBe(entity2.getComponents());
    
    expect(manager.getEntitiesByComponent("Transform").toArray()).toEqual([entity2.hash()]);
    expect(manager.hasComponent("Transform")).toEqual(true);

    // Should be no more 'Physics' list
    expect(() => { manager.getEntitiesByComponent("Physics"); }).toThrow();
    expect(manager._entitiesByComponent["Physics"]).toBeUndefined();
  });
});

describe("Actions and dispatch", () => {
  test("has robust 'dispatch'", () => {
    var manager = new Manager();

    /* test to make sure we can dispatch some random action and nothing bad
     * happens
     */
    manager.dispatch({'type': "UPDATE_PHYSICS", "velocity": "4"});

    // undefined type throws error
    expect(() => { manager.dispatch({"velocity": "4"}); }).toThrow();
  });

  /**
   * @description - Tests dispatching ADD_ENTITY action
   */
  test("Can dispatch an ADD_ENTITY action", () => {
    const { ADD_ENTITY, HASH_LENGTH } = 
      require(path.resolve(source_path, "Manager.js"));
    var manager = new Manager();

    //make sure we fail if 'components' is undefined
    expect(() => { manager.dispatch({"type": ADD_ENTITY}); }).toThrow();

    //test for correct behavior in a normal case
    var transformComponent = {
      "name": "Transform",
      "state": {
        "x": 0,
        "y": 0
      }
    };
    manager.dispatch({'type': ADD_ENTITY, "components": [
      transformComponent
    ]});

    //retrieve the entity from the '_entities' field
    var keys = Object.keys(manager.getEntities());
    expect(keys.length).toEqual(1);
    
    var hashValue = keys[0];
    expect(hashValue).toBeDefined();
    expect(hashValue.length).toEqual(HASH_LENGTH);

    //veritfy that the inserted entity is correct
    var entityStateTree = manager.getEntityState(hashValue);

    expect(entityStateTree[transformComponent.name].state)
      .toEqual(transformComponent.state);
  });

  /**
   * @description - Tests dispatching a REMOVE_ENTITY action
   */
  test("Can dispatch a REMOVE_ENTITY action", () => {
    const { REMOVE_ENTITY, HASH_LENGTH } = 
      require(path.resolve(source_path, "Manager.js"))
    var manager = new Manager();

    // test that an undefined 'hash' fails
    expect(() => { manager.dispatch({"type": REMOVE_ENTITY}); }).toThrow();

    // test for a defined but invalid hash
    expect(() => { manager.dispatch(
      {
        "type": REMOVE_ENTITY, 
        "hash": require(path.resolve(source_path, "utils", 
          "RandomStringGenerator.js")(HASH_LENGTH))
      });
    }).toThrow();

    // test for normal case
    var entity = new Entity(manager);
    entity.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    manager.addEntity(entity);

    manager.dispatch({'type': REMOVE_ENTITY, 'hash': entity.hash()});

    expect(Object.keys(manager.getEntities()).length).toEqual(0);
    expect(() => { manager.getEntitiesByComponent('Transform'); }).toThrow();
    expect(manager._entitiesByComponent['Transform']).toBeUndefined();
    expect(() => { manager.getEntity(entity.hash()); }).toThrow();
  });
});

describe("Entities", () => {

  test("Removing an entity's component", () => {
    var manager = new Manager();

    var entity = new Entity(manager);
    entity.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    manager.addEntity(entity);

    expect(() => { manager._removeHashFromComponentList('Render'); }).toThrow();
    entity.removeComponent('Transform');
    expect(manager._entitiesByComponent['Transform']).toBeUndefined();
    expect(() => { manager.getEntitiesByComponent('Transform'); }).toThrow();

  });

  test("Creating an entity from components", () => {
    var manager = new Manager();

    manager.addComponentToLibrary('Transform', (argObject, manager) => {
      return {
        'state': {
          'x': argObject.x,
          'y': argObject.y
        }
      };
    });

    manager.addEntityFromComponents([{'name': 'Transform', 'args': {'x': 1, 'y': 2}}]);

    expect(manager.hasComponent('Transform')).toBe(true);
    expect(manager.getEntitiesByComponent('Transform').length).toBeGreaterThan(0);
  });

  test("Creating an entity from components with init and remove", () => {
    var manager = new Manager();

    var testFun = jest.fn();

    const PHYSICS = 'Physics';
    manager.addComponentToLibrary(PHYSICS, (argObject, manager) => {
      return {
        'state': {
          'pos': {
            'x': argObject.pos.x,
            'y': argObject.pos.y
          },
          'velocity': {
            'x': argObject.velocity.x,
            'y': argObject.velocity.y
          }
        },
        'init': (state, man) => {
          testFun(state);
        },
        'remove': (man) => {
          testFun();
        }
      };
    });

    manager.addEntityFromComponents([
      {
        'name': PHYSICS,
        'args': {
          'pos': {
            'x': 0,
            'y': 1
          },
          'velocity': {
            'x': 2,
            'y': 3
          }
        }
      }
    ]);

    expect(testFun).toHaveBeenCalled();
    expect(testFun).toHaveBeenCalledWith({
      'pos': {
        'x': 0,
        'y': 1
      },
      'velocity': {
        'x': 2,
        'y': 3
      }
    });

    var entityHash = manager.getEntitiesByComponent(PHYSICS).toArray()[0];
    expect(entityHash).toBeDefined();

    var entity = manager.getEntity(entityHash);
    manager.removeEntity(entity);
    expect(testFun).toHaveBeenCalledTimes(2);
  });

});

describe("Reducers", () => {
  /**
   * @description - Tests adding a reducer
   */
  test("Adds a reducer", () => {
    var manager = new Manager();

    //action type constant
    const SAY_HI = "SAY_HI";

    var reducer = (action, manager) => { console.log('hi'); };

    // bad parameters
    expect(() => { manager.addReducer(1); }).toThrow();
    expect(() => { manager.addReducer(reducer); }).toThrow();
    expect(() => { manager.addReducer(reducer, SAY_HI); }).toThrow();

    manager.addReducer(reducer, [SAY_HI]);
    expect(manager.getReducers(SAY_HI)).toEqual([reducer]);

  });

  /**
   * @description - Tests removing a reducer
   */
  test("Removes a reducer", () => {
    var manager = new Manager();

    //action type constant
    const SAY_HI = "SAY_HI";

    // test 'removeReducer'
    var reducer = (action, manager) => { console.log("hi"); };
    manager.addReducer(reducer, [SAY_HI]);
    manager.removeReducer(reducer, SAY_HI);
    expect(() => { manager.getReducers(SAY_HI); }).toThrow();

    // test 'removeReducerFromSelect'
    manager.addReducer(reducer, [SAY_HI]);
    expect(() => { manager.removeReducerFromSelect(reducer, SAY_HI); }).toThrow();
    manager.removeReducerFromSelect(reducer, [SAY_HI]);
    expect(() => { manager.getReducers(SAY_HI); }).toThrow();
    expect(manager._reducers[SAY_HI]).toBeUndefined();

    // test 'removeReducerFromAll'
    manager.addReducer(reducer, [SAY_HI]);
    manager.removeReducerFromAll(reducer);
    expect(() => { manager.getReducers(SAY_HI); }).toThrow();
    expect(manager._reducers[SAY_HI]).toBeUndefined();
  });

  test("Only get called for what they're supposed to", () => {
    var manager = new Manager();
    const SAY_HI = 'SAY_HI';
    const SAY_BYE = 'SAY_BYE';

    var hiTest = jest.fn(),
      byeTest = jest.fn();
    var hiReducer = (action, manager) => {
      hiTest();
    };
    var byeReducer = (action, manager) => {
      byeTest();
    };

    manager.addReducer(hiReducer, [SAY_HI]);
    manager.addReducer(byeReducer, [SAY_BYE]);

    manager.dispatch({'type': 'SAY_HI'});
    expect(hiTest).toHaveBeenCalledTimes(1);
    expect(byeTest).not.toHaveBeenCalled();
  });
});

describe("Processors", () => {
  /**
   * @description - Test adding a processor
   */
  test("Adds a processor", () => {
    var manager = new Manager();

    class RenderProcessor extends Processor{
      update(entities) {
        //do stuff
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }

    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");
    manager.addProcessor(renderProcessor);

    expect(Object.keys(manager._processors)).toEqual(['RenderProcessor']);

    var removeFun = manager.removeProcessor;
    manager.removeProcessor = jest.fn();
    manager.addProcessor(renderProcessor);
    expect(manager.removeProcessor).toHaveBeenCalled();

  });

  /**
   * @description - Test removing a processor
   */
  test("Removing a processor", () => {
    var manager = new Manager();

    class RenderProcessor extends Processor{
      update(entities) {
        //do stuff
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }
    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");

    expect(() => { manager.removeProcessor(
      {'update': (entities) => { /* do stuff */}}
    ); }).toThrow();
    expect(() => { manager.removeProcessor(renderProcessor); }).toThrow();

    
    manager.addProcessor(renderProcessor);
    manager.removeProcessor(renderProcessor);

    expect(Object.keys(manager._processors)).toEqual([]);

  });

  /**
   * @description - Tests retrieving a processor from the ECS
   */
  test("Processor Retrieval", () => {
    var manager = new Manager();

    class RenderProcessor extends Processor{
      update(entities) {
        //do stuff
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }
    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");
    manager.addProcessor(renderProcessor);

    expect(() => { manager.getProcessor("PhysicsProcessor"); }).toThrow();
    expect(manager.getProcessor(renderProcessor.getName())).toBe(renderProcessor);
  });

  /**
   * @description - Test update function
   */
  test("Update function for a processor", () => {
    var manager = new Manager();

    var updateFun = jest.fn();
    class RenderProcessor extends Processor{
      update(entities) {
        updateFun();
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }
    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");

    manager.addProcessor(renderProcessor);
    manager.update();
    expect(updateFun).toHaveBeenCalled();

  });

  /**
   * @description - Test that caching a processor's list of components is
   * correct
   */
  test("Caching lists of entities for processors", () => {
    var manager = new Manager();

    var updateFun = jest.fn();
    class RenderProcessor extends Processor{
      update(entities) {
        updateFun(entities);
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }
    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");

    var entity1 = new Entity(manager);
    var entity2 = new Entity(manager);
    var entity3 = new Entity(manager);
    entity1.addComponent({'name': 'Render', 'state': {}});
    entity2.addComponent({'name': 'Render', 'state': {}});
    entity2.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    entity3.addComponent({'name': 'Render', 'state': {}});
    entity3.addComponent({'name': 'Transform', 'state': {'x': 1, 'y': 1}});
    entity3.addComponent({'name': 'Physics', 
      'state': { 'velocity': {'x': 0, 'y': 0}}});

    manager.addEntity(entity1);
    manager.addEntity(entity2);
    manager.addEntity(entity3);

    manager.addProcessor(renderProcessor);
    manager.update();

    var processorLists = manager._processorsCachedEntityLists;
    expect(Object.keys(processorLists).length).toBe(1);
    expect(processorLists.RenderProcessor.invalid).toBe(false);
    expect(processorLists.RenderProcessor.set.toArray()).toEqual([entity2.hash(),
      entity3.hash()]);

    expect(updateFun).toHaveBeenCalledWith(
      manager._processorsCachedEntityLists.RenderProcessor.set);

    manager._invalidateProcessorLists = jest.fn();
    manager.removeEntity(entity3);
    expect(manager._invalidateProcessorLists).toHaveBeenCalledWith(entity3);
  });

  test("Invalidation of cached lists for processors", () => {
    var manager = new Manager();

    var updateFun = jest.fn();
    class RenderProcessor extends Processor{
      update(entities) {
        updateFun(entities);
      }

      getComponentNames() {
        if (!this._components) {
          this._components = new Family(['Render', 'Transform']);
        }
        return this._components;
      }
    }
    var renderProcessor = new RenderProcessor(manager, "RenderProcessor");

    var entity1 = new Entity(manager);
    var entity2 = new Entity(manager);
    var entity3 = new Entity(manager);
    var entity4 = new Entity(manager);
    entity1.addComponent({'name': 'Render', 'state': {}});
    entity2.addComponent({'name': 'Render', 'state': {}});
    entity2.addComponent({'name': 'Transform', 'state': {'x': 0, 'y': 0}});
    entity3.addComponent({'name': 'Render', 'state': {}});
    entity3.addComponent({'name': 'Transform', 'state': {'x': 1, 'y': 1}});
    entity3.addComponent({'name': 'Physics', 
      'state': { 'velocity': {'x': 0, 'y': 0}}});
    entity4.addComponent({'name': 'Render', 'state': {}});
    entity4.addComponent({'name': 'Transform', 'state': {'x': 2, 'y': 2}});
    entity4.addComponent({'name': 'Physics', 
      'state': { 'velocity': {'x': 1, 'y': 1}}});
    entity4.addComponent({'name': 'Player', 'state': {'isPlayer': 'false'}});

    manager.addEntity(entity1);
    manager.addEntity(entity2);
    manager.addEntity(entity3);
    manager.addEntity(entity4);

    manager.addProcessor(renderProcessor);
    manager.update();

    entity4.removeComponent('Render');
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(true);
    manager.update();

    /* test that removal and then updating catches the invalid state and calls 
     * fetch
     */
    manager.removeEntity(entity3);
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(true);
    var fetchFunction = manager._fetchProcessorEntityList;
    manager._fetchProcessorEntityList = jest.fn();
    manager.update();
    expect(manager._fetchProcessorEntityList)
      .toHaveBeenCalledWith(renderProcessor.getName(), 
        renderProcessor.getComponentNames());
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(true);

    // restore the fetch function make sure it works
    manager._fetchProcessorEntityList = fetchFunction;
    manager.update();
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(false);
    expect(manager._processorsCachedEntityLists.RenderProcessor.set.toArray())
      .toEqual([entity2.hash()]);
    expect(updateFun).toHaveBeenLastCalledWith(
      manager._processorsCachedEntityLists.RenderProcessor.set);

    /* make sure that after adding an entity it catches the invalid state 
     * and updates the process's list
     */
    entity3.addComponent({'name': 'Render', 'state': {}});
    entity3.addComponent({'name': 'Transform', 'state': {'x': 1, 'y': 1}});
    entity3.addComponent({'name': 'Physics', 
      'state': { 'velocity': {'x': 0, 'y': 0}}});
    /* we added components back to an entity, but the entity isn't being
     * tracked in the manager, so no adverse side effects should have happened
     * to the manager
     */
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(false);
    
    manager.addEntity(entity3);
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(true);
    manager.update();
    expect(manager._processorsCachedEntityLists.RenderProcessor.invalid)
      .toEqual(false);
    expect(manager._processorsCachedEntityLists.RenderProcessor.set.toArray())
      .toEqual([entity2.hash(), entity3.hash()]);
    expect(updateFun).toHaveBeenLastCalledWith(
      manager._processorsCachedEntityLists.RenderProcessor.set);

    /* test that if we don't add or remove entities that the fetch function
     * doesn't get called
     */
    manager._fetchProcessorEntityList = jest.fn();
    manager.update();
    expect(manager._fetchProcessorEntityList).not.toHaveBeenCalled();

  });
});

describe("Events", () => {
  /**
   * @description - Tests events
   */
  test("Events", () => {
    var manager = new Manager();

    var listener = jest.fn();

    expect(manager.emit('test')).toBeFalsy();
    expect(listener).not.toHaveBeenCalled();

    var testObject = {'test': 0};

    manager.addListener('test', listener);
    expect(manager.emit('test', testObject)).toBeTruthy();
    expect(listener).toHaveBeenCalledWith(testObject, manager);

    manager.removeListener('test', listener);
    expect(manager.emit('test')).toBeFalsy();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("Robustness", () => {
  test("Saving and restoring a manager's state", () => {
    const PHYSICS = 'Physics';

    //two managers, each with the same component libraries
    var manager1 = new Manager();
    var manager2 = new Manager();


    var testFun = jest.fn();

    function physicsGenerator(argObject, manager) {
      return {
        'state': {
          'pos': {
            'x': argObject.pos.x,
            'y': argObject.pos.y
          },
          'velocity': {
            'x': argObject.velocity.x,
            'y': argObject.velocity.y
          }
        },
        'init': (state, man) => {
          testFun(state);
        },
        'remove': (man) => {
          testFun();
        }
      };
    }

    manager1.addComponentToLibrary(PHYSICS, physicsGenerator);
    manager2.addComponentToLibrary(PHYSICS, physicsGenerator);

    manager1.addEntityFromComponents([{
      'name': PHYSICS,
      'args': {
        'pos': {
          'x': 0,
          'y': 1
        },
        'velocity': {
          'x': 2,
          'y': 3
        }
      }
    }]);

    var managerState = manager1.toJSON();

    manager2.fromJSON(managerState);
    expect(manager2.hasComponent(PHYSICS));
    expect(Object.keys(manager2._entitiesByComponent))
      .toEqual(Object.keys(manager1._entitiesByComponent));
    for (var key in manager2._entitiesByComponent) {
      expect(manager2._entitiesByComponent[key].toArray())
        .toEqual(manager1._entitiesByComponent[key].toArray());
    }
    // expect(manager2._entitiesByHash).toBe(manager1._entitiesByHash);
    // expect(manager2._entities).toEqual(manager1._entities);
    expect(testFun).toHaveBeenCalledTimes(2);

  });

  test("Merging states", () => {
    const PHYSICS = 'Physics';

    //two managers, each with the same component libraries
    var manager1 = new Manager();
    var manager2 = new Manager();


    var testFun = jest.fn();

    function physicsGenerator(argObject, manager) {
      return {
        'state': {
          'pos': {
            'x': argObject.pos.x,
            'y': argObject.pos.y
          },
          'velocity': {
            'x': argObject.velocity.x,
            'y': argObject.velocity.y
          }
        },
        'init': (state, man) => {
          testFun(state);
        },
        'remove': (man) => {
          testFun();
        }
      };
    }

    manager1.addComponentToLibrary(PHYSICS, physicsGenerator);
    manager2.addComponentToLibrary(PHYSICS, physicsGenerator);

    manager1.addEntityFromComponents([{
      'name': PHYSICS,
      'args': {
        'pos': {
          'x': 0,
          'y': 1
        },
        'velocity': {
          'x': 2,
          'y': 3
        }
      }
    }]);

    manager2.addEntityFromComponents([{
      'name': PHYSICS,
      'args': {
        'pos': {
          'x': 3,
          'y': 4
        },
        'velocity': {
          'x': 5,
          'y': 6
        }
      }
    }]);

    var managerState = manager1.toJSON();

    manager2.fromJSON(managerState);
    expect(manager2.hasComponent(PHYSICS));
    expect(Object.keys(manager2._entitiesByHash)).not
      .toEqual(Object.keys(manager1._entitiesByHash));
    expect(Object.keys(manager2._entitiesByHash).length).toEqual(2);
    expect(Object.keys(manager2._entitiesByHash))
      .toContain(Object.keys(manager1._entitiesByHash)[0]);
  });
});

describe("Side effects", () => {
  test("Adding a dispatch side effect function", () => {
    var manager = new Manager();

    var actionSideEffect = jest.fn();
    expect(() => { 
      manager.addDispatchSideEffect((action) => {
        actionSideEffect(action);
      }); 
    }).not.toThrow();

    var action = {
      'type': 'TestAction',
      'stuff': 'test stuff'
    };

    manager.dispatch(action);
    expect(actionSideEffect).toHaveBeenCalledTimes(1);
    expect(actionSideEffect).toHaveBeenCalledWith(action);

    expect(() => {
      manager.removeDispatchSideEffect();
    }).not.toThrow();

    manager.dispatch(action);
    expect(actionSideEffect).toHaveBeenCalledTimes(1);

  });

  test("Adding an emit side effect function", () => {
    var manager = new Manager();

    var eventSideEffect = jest.fn();
    expect(() => { 
      manager.addEmitSideEffect((eventType, args) => {
        eventSideEffect(eventType, args);
      }); 
    }).not.toThrow();

    var eventType = 'TestEvent';
    var args = {
      'stuff': 'test stuff'
    };

    manager.emit(eventType, args);
    expect(eventSideEffect).toHaveBeenCalledTimes(1);
    expect(eventSideEffect).toHaveBeenCalledWith(eventType, args);

    expect(() => {
      manager.removeEmitSideEffect();
    }).not.toThrow();

    manager.emit(eventType, args);
    expect(eventSideEffect).toHaveBeenCalledTimes(1);

  });
});

describe("Clearing the manager's state", () => {
  var manager;
  var testFun = jest.fn();
  beforeAll(() => {
    manager = new Manager();
    var entity = new Entity(manager);
    var transformComponent = {
      name: 'Transform',
      state: {
        'x': 0,
        'y': 0
      },
      remove: () => {
        testFun();
      }
    };
    entity.addComponent(transformComponent);
    manager.addEntity(entity);
  });

  test("All entity objects are empty", () => {
    manager.clear();
    expect(Object.keys(manager._entities).length).toBe(0);
    expect(Object.keys(manager._entitiesByHash).length).toBe(0);
    expect(Object.keys(manager._entitiesByComponent).length).toBe(0);
  });

  test("Removal function was called", () => {
    manager.clear();
    expect(testFun).toHaveBeenCalledTimes(1);
  });
});

describe("Processors get updated by their inserted order", () => {
  var manager;
  var testProcessor1,
    testProcessor2,
    testProcessor3;

  var testComponent1 = {
    'name': 'TestComponent1',
    'state': {
      'test': 'this is a test'
    }
  },
    testComponent2 = {
      'name': 'TestComponent2',
      'state': {
        'test': 'this is a test'
      }
    };

  var testFun = jest.fn();
  class TestProcessor1 extends Processor {
    update(entities) {
      testFun(entities.toArray());
    }
    getComponentNames() {
      return new Family(['TestComponent1']);
    }
  } 

  class TestProcessor2 extends Processor {
    update(entities) {
      testFun(entities.toArray());
    }
    getComponentNames() {
      return new Family(['TestComponent2']);
    }
  }

  class TestProcessor3 extends Processor {
    update(entities) {
      testFun(entities.toArray());
    }

    getComponentNames() {
      return new Family(['TestComponent1', 'TestComponent2']);
    }
  }

  var entity1,
    entity2,
    entity3;

  beforeEach(() => {
    manager = new Manager();
    manager.addComponentToLibrary('TestComponent1', () => {
      return testComponent1;
    });
    manager.addComponentToLibrary('TestComponent2', () => {
      return testComponent2;
    });

    entity1 = manager.addEntityFromComponents([{
      'name': 'TestComponent1',
      'args': {}
    }]);
    entity2 = manager.addEntityFromComponents([{
      'name': 'TestComponent2',
      'args': {}
    }]);
    entity3 = manager.addEntityFromComponents([{
      'name': 'TestComponent1',
      'args': {}
    },
    {
      'name': 'TestComponent2',
      'args': {}
    }]);


    testProcessor1 = new TestProcessor1(manager, 'testProcessor1');
    testProcessor2 = new TestProcessor2(manager, 'testProcessor2');
    testProcessor3 = new TestProcessor3(manager, 'testProcessor3');
  });

  test("Gets called in the correct order", () => {
    manager.addProcessor(testProcessor2);
    manager.addProcessor(testProcessor1);
    manager.update();
    expect(testFun).toHaveBeenLastCalledWith([entity1, entity3]);
    expect(testFun).not.toHaveBeenLastCalledWith([entity2, entity3]);

  });

  test("Works correctly even when removing a processor", () => {
    manager.addProcessor(testProcessor1);
    manager.addProcessor(testProcessor2);
    manager.addProcessor(testProcessor3);
    manager.removeProcessor(testProcessor3);
    manager.update();
    expect(testFun).toHaveBeenLastCalledWith([entity2, entity3]);
    expect(testFun).not.toHaveBeenLastCalledWith([entity1, entity3]);
  });

  test("Words correctly for multiple update loops", () => {
    manager.addProcessor(testProcessor2);
    manager.addProcessor(testProcessor1);
    for (var i = 0; i < 3; i++) {
      manager.update();
      expect(testFun).toHaveBeenLastCalledWith([entity1, entity3]);
      expect(testFun).not.toHaveBeenLastCalledWith([entity2, entity3]);
    }
  });
});

describe("Sorted processor entity lists", () => {
  var manager;
  var renderProcessor;
  var testFun1,
    testFun2;

  class RenderProcessor extends Processor{
    update(entities) {
      testFun1(entities.toArray());
    }

    getComponentNames() {
      if (!this._components) {
        this._components = new Family(['Render', 'Transform']);
      }
      return this._components;
    }
  }

  beforeEach(() => {
    manager = new Manager();
    testFun1 = jest.fn();
    testFun2 = jest.fn();

    renderProcessor = new RenderProcessor(manager, "RenderProcessor");
    manager.addProcessor(renderProcessor);
    
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

  });

  var equalFunction = (entityAHash, entityBHash) => { 
    return entityAHash === entityBHash;
  };
  var compareFunction = (entityAHash, entityBHash) => {
    var entityAState = manager.getEntityState(entityAHash);
    var entityBState = manager.getEntityState(entityBHash);
    testFun2();
    if (!entityAState.Render || !entityBState.Render)
      return 0;
    return entityAState.Render.state.layer - entityBState.Render.state.layer;
  };

  test("Adding a sorter and sorting on insertion", () => {
    manager.addSorterForProcessorList("RenderProcessor", 
      equalFunction,
      compareFunction);

    var testHash1 = 'testHash1',
      testHash2 = 'testHash2';
    manager.addEntityFromComponents(
      [{
        'name': 'Render',
        'args': {
          'layer': 1
        }
      },
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 1
        }
      }],
      testHash1
    );

    manager.addEntityFromComponents(
      [{
        'name': 'Render',
        'args': {
          'layer': 0
        }
      },
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 1
        }
      }],
      testHash2
    );

    
    manager.update();
    expect(testFun2).toHaveBeenCalled();

    expect(manager._processorsCachedEntityLists['RenderProcessor'].
      set).toBeDefined();
    expect(manager._processorsCachedEntityLists['RenderProcessor'].
      set.sorted(compareFunction).toArray())
        .toEqual(manager._processorsCachedEntityLists['RenderProcessor'].set.toArray());
    
    expect(testFun1).toHaveBeenCalledWith([testHash2, testHash1]);
  });

  test("Pre-existing entities get sorted next iteration", () => {
    var testHash1 = 'testHash1',
      testHash2 = 'testHash2';
    manager.addEntityFromComponents(
      [{
        'name': 'Render',
        'args': {
          'layer': 1
        }
      },
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 1
        }
      }],
      testHash1
    );

    manager.addEntityFromComponents(
      [{
        'name': 'Render',
        'args': {
          'layer': 0
        }
      },
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 1
        }
      }],
      testHash2
    );

    manager.addSorterForProcessorList("RenderProcessor", 
      equalFunction,
      compareFunction);

    manager.update();
    expect(testFun1).toHaveBeenCalledWith([testHash2, testHash1]);
  });
});

describe("Using families to define entities given to processors", () => {
  var manager;
  var entity1,
    entity2,
    entity3;
  var entity1Hash,
    entity2Hash,
    entity3Hash;
  var renderProcessor;
  var testFun1;

  class RenderProcessor extends Processor{
    update(entities) {
      testFun1(entities.toArray());
    }

    getComponentNames() {
      if (!this._components) {
        this._components = new Family(['Render', 'Transform'], ['Physics']);
      }
      return this._components;
    }
  }

  beforeEach(() => {
    testFun1 = jest.fn();
    manager = new Manager();
    entity1 = new Entity(manager);
    entity1Hash = entity1.hash();
    entity1.addComponent({
      'name': 'Transform',
      'state': {

      }
    });

    entity2 = new Entity(manager);
    entity2Hash = entity2.hash();
    entity2.addComponent({
      'name': 'Render',
      'state': {

      }
    });
    entity2.addComponent({
      'name': 'Transform',
      'state': {

      }
    });

    entity3 = new Entity(manager);
    entity3Hash = entity3.hash();
    entity3.addComponent({
      'name': 'Physics',
      'state': {

      }
    });
    entity3.addComponent({
      'name': 'Render',
      'state': {

      }
    });
    manager.addEntity(entity1);
    manager.addEntity(entity2);
    manager.addEntity(entity3);
    manager.addProcessor(new RenderProcessor(manager, "RenderProcessor"));
  });


  test("Only include good entities", () => {
    manager.update();
    expect(testFun1).toHaveBeenCalledWith([entity2Hash]);
  });
});

describe("MISC test", () => {
  /**
   * @description - Tests the generating a hash
   */
  test("Generating hashes", () => {
    const { HASH_LENGTH } = require(path.resolve(source_path, 
      "Manager.js"));
    var manager = new Manager();

    expect(manager.generateHash().length).toEqual(HASH_LENGTH);
  });
});