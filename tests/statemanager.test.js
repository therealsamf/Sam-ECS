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

    expect(transformComponent.init).toHaveBeenCalled();
    expect(transformComponent.init).toHaveBeenCalledWith(transformComponent.state);

    entity.addComponent(renderComponent);

    stateManager.addEntity(entity);

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
});

describe("Entities components", () => {
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