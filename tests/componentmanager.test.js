//componentmanager.test.js//

/**
 * @description - The testing suites for the component manager
 * @author - Sam Faulkner
 */

//node imports
const ComponentManager = require('../src/ComponentManager.js');

//generator functions
function generateTransform(state) {
  return {
    'name': 'Transform',
    'state': {
      'x': state.x,
      'y': state.y
    }
  };
}

function generateRender(state) {
  return {
    'name': 'Render',
    'state': {
      'layer': state.layer
    }
  };
}

describe("Components", () => {
  var componentManager;

  beforeEach(() => {
    componentManager = new ComponentManager();
    componentManager.addComponentToLibrary('Transform', generateTransform);
    componentManager.addComponentToLibrary('Render', generateRender);
  });

  test("Can be added to the component manager", () => {
    expect(() => { componentManager.addComponentToLibrary('Physics', (state) => {
      return {
        'name': 'Physics',
        'state': {
          'x': state.x,
          'y': state.y
        }
      }
    }); }).not.toThrow();

  });

  test("Can be removed from the component manager", () => {
    expect(() => { componentManager.removeComponentFromLibrary('Transform'); }).not.toThrow();
    expect(() => { componentManager.createComponent('Transform', {'x': 0, 'y': 1}); }).toThrow();
  });

  test("Can be created from generator functions", () => {
    var transformComponent = componentManager.createComponent('Transform', {'x': 1, 'y': 2});
    expect(transformComponent.state).toEqual({
      'x': 1,
      'y': 2
    });
    expect(transformComponent.name).toEqual('Transform');
  });

  
});

describe("Entities", () => {
  var componentManager;

  beforeEach(() => {
    componentManager = new ComponentManager();
  });

  test("Can be created from components", () => {
    var componentManager = new ComponentManager();
    componentManager.addComponentToLibrary('Transform', generateTransform);
    componentManager.addComponentToLibrary('Render', generateRender);

    var entity = componentManager.createEntityFromComponents([
      {
        'name': 'Transform',
        'args': {
          'x': 0,
          'y': 1
        }
      },
      {
        'name': 'Render',
        'args': {
          'layer': 1
        }
      }
    ]);

    expect(() => { entity.getComponent('Transform'); }).not.toThrow();
    expect(() => { entity.getComponent('Render'); }).not.toThrow();
    expect(entity.getComponent('Transform').get('state')).toEqual({
      'x': 0, 'y': 1
    });
    expect(entity.getComponent('Render').get('state')).toEqual({
      'layer': 1
    });
  });
});