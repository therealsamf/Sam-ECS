//family.test.js//

/**
 * @description - Tests the family testing suite
 */

const FastSet = require('collections/fast-set.js');
const StateManager = require('../src/StateManager.js');
const Family = require('../src/Family.js');
const Entity = require('../src/Entity.js');

describe("A family", () => {
  var stateManager = new StateManager();
  var family;
  beforeEach(() => {
    family = new Family(['RenderComponent'], ['TransformComponent']);
  });


  test("Includes proper sets", () => {
    expect(family.testComponentSet(new FastSet(['RenderComponent', 'PhysicsComponent']))).toBe(true);
    expect(family.testComponentSet(new FastSet(['RenderComponent']))).toBe(true);
  });

  test("Excludes improper sets", () => {
    expect(family.testComponentSet(new FastSet(['RenderComponent', 'TransformComponent']))).toBe(false);
    expect(family.testComponentSet(new FastSet(['PhysicsComponent']))).toBe(false);
  });

  test("Excludes proper entities", () => {
    var entity1 = new Entity(stateManager);
    entity1.addComponent({
      'name': 'TransformComponent',
      'state': {

      }
    });
    entity1.addComponent({
      'name': 'RenderComponent', 
      'state': {

      }
    });

    expect(family.testEntity(entity1)).toBe(false);
  });

  test("Includes proper entites", () => {
    var entity1 = new Entity(stateManager);
    entity1.addComponent({
      'name': 'RenderComponent',
      'state': {

      }
    });

    expect(family.testEntity(entity1)).toBe(true);
  });
});