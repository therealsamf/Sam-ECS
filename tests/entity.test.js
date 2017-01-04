//entity.test.js//

/**
 * @description - Test suite for entities
 * @author - Sam Faulkner
 */

//node imports
const Dict = require('collections/dict.js');

//user imports
const Entity = require('../src/Entity.js');

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

describe("Creating an entity and adding components", () => {
  var transformComponent,
    renderComponent,
    entity;

  beforeEach(() => {
    entity = new Entity();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("Properly adds components", () => {
    entity.addComponent(transformComponent);
    entity.addComponent(renderComponent);

    expect(entity.getComponents().keysArray()).toEqual(['Transform', 'Render']);

    expect(entity.getComponent('Transform').equals(new Dict({
      'state': {
        'x': 0,
        'y': 0
      },
      'init': undefined,
      'remove': undefined
    }))).toBe(true);
    expect(entity.getComponent('Render').equals(new Dict({
      'state': {
        'layer': 0
      },
      'init': undefined,
      'remove': undefined
    }))).toBe(true);

  });

  test("Init function gets called when component is added", () => {
    transformComponent.init = jest.fn();
    entity.addComponent(transformComponent);
    expect(transformComponent.init).toHaveBeenCalled();
    expect(transformComponent.init).toHaveBeenCalledWith(transformComponent.state,
      entity.getComponent('Transform'));
  });
});

describe("Removing Components from an entity", () => {
  var transformComponent,
    renderComponent,
    entity;

  beforeEach(() => {
    entity = new Entity();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });
  
  test("Properly removes components", () => {
    entity.addComponent(transformComponent);
    entity.addComponent(renderComponent);

    entity.removeComponent('Transform');
    expect(entity.getComponents().keysArray()).toEqual(['Render']);
    expect(() => { entity.getComponent('Transform'); }).toThrow();

  });

  test("Remove function gets called when component is removed", () => {
    transformComponent.remove = jest.fn();
    entity.addComponent(transformComponent);
    var transformDict = entity.getComponent('Transform');
    entity.removeComponent('Transform');
    expect(transformComponent.remove).toHaveBeenCalled();
    expect(transformComponent.remove).toHaveBeenCalledWith(transformDict);
  });
});

describe("Equality", () => {
  var entity1,
    entity2,
    entity3;

  beforeEach(() => {
    var t1 = Object.assign({}, tComponent);
    var t2 = Object.assign({}, tComponent);
    var t3 = Object.assign({}, tComponent);
    var r1 = Object.assign({}, rComponent);
    var r2 = Object.assign({}, rComponent);
    var r3 = Object.assign({}, rComponent, {'state': {'layer': 4}});

    entity1 = new Entity();
    entity2 = new Entity();
    entity3 = new Entity();
    entity1.addComponent(t1);
    entity1.addComponent(r1);
    entity2.addComponent(t2);
    entity2.addComponent(r2);
    entity3.addComponent(t3);
    entity3.addComponent(r3);
  });

  test("Is correct", () => {

    expect(entity1.equals(entity2)).toBe(true);
    expect(entity1.equals(entity3)).toBe(false);
  });

  test("Is Symmetric", () => {
    expect(entity1.equals(entity2)).toBe(entity2.equals(entity1));
    expect(entity1.equals(entity3)).toBe(entity3.equals(entity1));
    expect(entity2.equals(entity3)).toBe(entity3.equals(entity2));
  });
});

describe("Cloning entities", () => {
  var entity1,
    entity2;

  beforeEach(() => {
    entity1 = new Entity();
    entity1.addComponent(tComponent);
    entity1.addComponent(rComponent);

    entity2 = entity1.clone();
  });

  test("Clones are equal", () => {
    expect(entity1.equals(entity2)).toBe(true);
  });

  test("State changes aren't replicated across the clones", () => {
    var tState = entity1.getComponent('Transform').get('state');
    tState.x = 3;

    expect(entity1.equals(entity2)).toBe(false);

  });

  test("Hashes are equal", () => {
    expect(entity1.hash() === entity2.hash()).toBe(true);
  });
});

describe("Saving and restoring state", () => {
  var transformComponent,
    renderComponent,
    entity;

  beforeEach(() => {
    entity = new Entity();
    transformComponent = Object.assign({}, tComponent);
    renderComponent = Object.assign({}, rComponent);
  });

  test("State can be saved", () => {
    entity.addComponent(transformComponent);
    entity.addComponent(renderComponent);

    expect(entity.serialize()).toEqual({
      'components': {
        'Transform': {
          'x': 0,
          'y': 0
        },
        'Render': {
          'layer': 0
        }
      },
      'hash': entity.hash()
    });

  });

  test("State can be restored", () => {
    const ComponentManager = require('../src/ComponentManager.js');
    const StateManager = require('../src/StateManager.js');
    var componentManager = new ComponentManager(new StateManager());

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

    var entity1 = new Entity();
    entity1.addComponent({
      'name': 'Transform',
      'state': {
        'x': 3,
        'y': 4
      }
    });
    entity1.addComponent({
      'name': 'Render',
      'state': {
        'layer': 5
      }
    });

    var entity2 = new Entity();
    var object = JSON.parse(JSON.stringify(entity1.serialize()));
    
    entity2.deserialize(object, componentManager);
    expect(entity2.serialize()).toEqual(entity1.serialize());
    expect(entity2.serialize()).toEqual({
      'components': {
        'Transform': {
          'x': 3,
          'y': 4
        },
        'Render': {
          'layer': 5
        }
      },
      'hash': entity1.hash()
    });
    expect(entity2.hash()).toBe(entity1.hash());
  });
});