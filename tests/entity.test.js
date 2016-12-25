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
    expect(transformComponent.init).toHaveBeenCalledWith(transformComponent.state);
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
    entity.removeComponent('Transform');
    expect(transformComponent.remove).toHaveBeenCalled();
    expect(transformComponent.remove).toHaveBeenCalledWith();
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