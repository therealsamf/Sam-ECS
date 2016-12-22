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
    expect(stateManager.getEntityState(entity.hash()).keys()).toEqual(['Transform', 'Render']);
  });

  // test("Get removed correctly", () => {

  // });

  // test("Are sorted by component correctly", () => {

  // });
});

// describe("SubStates", () => {
//   test("Are added correctly", () => {

//   });

//   test("Return the correct entities from 'getSubState'", () => {

//   });

//   test("Entities added and removed all update data structures correctly", () => {

//   });
// });

// describe("Entities components", () => {
//   test("Can be added and removed correctly", () => {

//   });
// });