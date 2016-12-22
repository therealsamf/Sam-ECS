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