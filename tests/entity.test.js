//entity.test.js//

/**
 * @description - Tests the Entity.js file
 * @author Samuel Faulkner
 */

const path = require('path');
const source_path = path.resolve(__dirname, "..", "src");


/**
 * @description - Test an empty entity
 */
test("Creation of an empty entity", () => {
  const { Manager } = require(path.resolve(source_path, "Manager.js"));
  var manager = new Manager();

  const { Entity } = require(path.resolve(source_path, "Entity.js"));
  
  // give an undefined manager
  expect(() => { var entity = new Entity(); }).toThrow();

  const entity = new Entity(manager);

  // test that it's components are empty
  expect(entity.getComponents()).toEqual({});

  // test that getting components from an empty entity throws errors
  expect(() => { entity.getComponent(); }).toThrow();
  expect(() => { entity.getComponent("Transform"); }).toThrow();
});

/**
 * @description - Test adding, readding a component
 */
test("Adding a component to an entity", () => {
  const { Manager } = require(path.resolve(source_path, "Manager.js"));
  var manager = new Manager();

  const { Entity } = require(path.resolve(source_path, "Entity.js"));
  const entity = new Entity(manager);

  var validComponent1 = {
    'name': 'Transform',
    'state': {
      'x': 0,
      'y': 0
    }
  };
  var validComponent2 = {
    'name': 'Transform',
    'state': {
      'x': 1,
      'y': 1
    }
  };
  var invalidComponent1 = {
    'name': 'Render'
  };
  var invalidComponent2 = {
    'name': 'Physics',
    'state': 'cube'
  };

  /* check against the invalid components, and make sure the component field
   * is empty
   */
  expect(() => { entity.addComponent(invalidComponent1); }).toThrow();
  expect(() => { entity.addComponent(invalidComponent2); }).toThrow();
  expect(entity.getComponents()).toEqual({});

  // test whether behaves correctly under a valid case
  entity.addComponent(validComponent1);
  expect(entity.getComponents()).toEqual(
    {
      'Transform': {
        'x': 0,
        'y': 0
      }
    }
  );
  /* NOTE: Important that we use 'toBe' and refer the the validComponent's 
   * state. We need to be able to reference objects and mutate them
   */
  expect(entity.getComponent("Transform")).toBe(validComponent1.state);

  // test if we can replace a component
  entity.addComponent(validComponent2);
  expect(entity.getComponents()).toEqual(
    {
      'Transform': {
        'x': 1,
        'y': 1
      }
    }
  );
  expect(entity.getComponent("Transform")).toBe(validComponent2.state);

  
});

/**
 * @description - Tests removing a component from an entity
 */
test("Removing a component from an entity", () => {
  const { Manager } = require(path.resolve(source_path, "Manager.js"));
  var manager = new Manager();

  const { Entity } = require(path.resolve(source_path, "Entity.js"));
  const entity = new Entity(manager);

  var transformComponent = {
    'name': 'Transform',
    'state': {'x': 0, 'y': 0}
  };

  var testFunction = jest.fn();
  var componentWithRemove = {
    'name': 'ComponentWithRemove',
    'state': {
      'stuff': 0,
      'remove': function(manager) {
        testFunction();
      }
    }
  };

  entity.addComponent(transformComponent);
  entity.addComponent(componentWithRemove);

  // test removing components
  expect(() => { entity.removeComponent("Render"); }).toThrow();
  entity.removeComponent("Transform");

  expect(() => { entity.getComponent(transformComponent.name); }).toThrow();
  expect(entity._components['Transform']).toBeUndefined();

  entity.removeComponent("ComponentWithRemove");
  expect(testFunction).toHaveBeenCalled();
  expect(entity._components).toEqual({});
});

test("Removing all components from an entity", () => {
  const { Manager } = require(path.resolve(source_path, "Manager.js"));
  var manager = new Manager();

  const { Entity } = require(path.resolve(source_path, "Entity.js"));
  const entity = new Entity(manager);

  var transformComponent = {
    'name': 'Transform',
    'state': {'x': 0, 'y': 0}
  };

  entity.addComponent(transformComponent);
  var savedRemoveComponent = entity.removeComponent;
  entity.removeComponent = jest.fn();
  entity.removeComponents();
  
  expect(entity.removeComponent).toHaveBeenCalled();

  entity.removeComponent = savedRemoveComponent;
  entity.removeComponents();
  expect(Object.keys(entity._components).length).toEqual(0);
});