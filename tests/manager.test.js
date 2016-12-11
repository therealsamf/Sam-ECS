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

/**
 * @description - Tests an empty manager is all that it should be: empty
 */
test("Creation of empty ECS manager", () => {
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

/**
 * @description - Tests adding an entity
 */
test("Adding an entity to the ECS manager", () => {
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
      'x': 0,
      'y': 0
    }
  });
  expect(manager.getEntities()[entityHashValue][transformComponent.name])
    .toBe(transformComponent.state);

  // test that 'getEntity' also returns the right data
  expect(manager.getEntityState(entityHashValue)).toBe(entity.getComponents());

  // test the component lists to see if they correctly added the entity's hash
  var expectedSet = new Set();
  expectedSet.add(entityHashValue);
  expect(manager.getEntitiesByComponent(transformComponent.name)).toEqual(expectedSet);

  
});

/**
 * @description - Tests overwriting an entity 
 */
test("Overwriting an entity in the ECS manager", () => {
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
  expect(manager.getEntitiesByComponent(physicsComponent.name)).toEqual(expectedSet);

  expect(() => { manager.getEntitiesByComponent(transformComponent.name); }).toThrow();
});

/**
 * @description - Tests removing an entity
 */
test("Removing an entity from the ECS manager", () => {
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
  var expectedSet = new Set();
  expectedSet.add(entity2.hash());
  expect(manager.getEntitiesByComponent("Transform")).toEqual(expectedSet);
  expect(manager.hasComponent("Transform")).toEqual(true);

  // Should be no more 'Physics' list
  expect(() => { manager.getEntitiesByComponent("Physics"); }).toThrow();
  expect(manager._entitiesByComponent["Physics"]).toBeUndefined();
});

test("Robustness test for 'dispatch'", () => {
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
test("Dispatching an ADD_ENTITY action", () => {
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

  expect(entityStateTree[transformComponent.name])
    .toBe(transformComponent.state);
});

/**
 * @description - Tests dispatching a REMOVE_ENTITY action
 */
test("Dispatching a REMOVE_ENTITY action", () => {
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

/**
 * @description - Tests adding a reducer
 */
test("Adding a reducer", () => {
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
test("Removing a reducer", () => {
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

/**
 * @description - Test adding a processor
 */
test("Adding a processor", () => {
  var manager = new Manager();

  class RenderProcessor extends Processor{
    update(entities) {
      //do stuff
    }

    getComponentNames() {
      if (!this._components) {
        this._components = new Set(['Render', 'Transform']);
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
        this._components = new Set(['Render', 'Transform']);
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
        this._components = new Set(['Render', 'Transform']);
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
        this._components = new Set(['Render', 'Transform']);
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
        this._components = new Set(['Render', 'Transform']);
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

  expect(manager._processorsCachedEntityLists).toEqual({
    'RenderProcessor': {
      'invalid': false,
      'set': new Set([entity2.hash(), entity3.hash()])
    }
  });
  expect(manager._processorsCachedEntityLists.RenderProcessor.set)
    .toEqual(new Set([entity2.hash(), entity3.hash()]));
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
        this._components = new Set(['Render', 'Transform']);
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
  expect(manager._processorsCachedEntityLists.RenderProcessor.set)
    .toEqual(new Set([entity2.hash()]));
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
  expect(manager._processorsCachedEntityLists.RenderProcessor.set)
    .toEqual(new Set([entity2.hash(), entity3.hash()]));
  expect(updateFun).toHaveBeenLastCalledWith(
    manager._processorsCachedEntityLists.RenderProcessor.set);

  /* test that if we don't add or remove entities that the fetch function
   * doesn't get called
   */
  manager._fetchProcessorEntityList = jest.fn();
  manager.update();
  expect(manager._fetchProcessorEntityList).not.toHaveBeenCalled();

});

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

/**
 * @description - Tests the generating a hash
 */
test("Generating hashes", () => {
  const { HASH_LENGTH } = require(path.resolve(source_path, 
    "Manager.js"));
  var manager = new Manager();

  expect(manager.generateHash().length).toEqual(HASH_LENGTH);
});