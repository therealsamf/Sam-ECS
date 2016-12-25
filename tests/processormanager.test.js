//processormanager.test.js//

/**
 * @description - Testing suite for the ProcessorManager
 * @author - Sam Faulkner
 */

//node imports
const ProcessorManager = require('../src/ProcessorManager.js');
const StateManager = require('../src/StateManager.js');
const { Processor } = require('../src/Processor.js');
const Family = require('../src/Family.js');
const Entity = require('../src/Entity.js');

function transformGenerator(state) {
  return {
    'name': 'Transform',
    'state': {
      'x': state.x,
      'y': state.y
    }
  };
}

function physicsGenerator(state) {
  return {
    'name': 'Physics',
    'state': {
      'x': state.x,
      'y': state.y
    }
  };
}



describe("Processors", () => {
  var processorManager,
    stateManager,
    moveProcessor,
    updateFun;

  class MoveProcessor extends Processor {
    constructor(name) {
      super(name);

      this._components = new Family(['Transform', 'Physics']);
    }

    update(entities) {
      updateFun(entities.toArray());
    }

    getComponentNames() {
      return this._components;
    }
  }

  beforeEach(() => {
    stateManager = new StateManager();
    processorManager = new ProcessorManager(stateManager);
    moveProcessor = new MoveProcessor('MoveProcessor');
    updateFun = jest.fn();
  });

  test("Can be added", () => {
    processorManager.addProcessor(moveProcessor);
    expect(processorManager.getProcessors().keysArray().length).toBe(1);
    expect(processorManager.getProcessorOrder().toArray().length).toBe(1);
  });

  test("Can be removed", () => {
    processorManager.addProcessor(moveProcessor);
    processorManager.removeProcessor(moveProcessor);
    expect(processorManager.getProcessors().keysArray().length).toBe(0);
    expect(processorManager.getProcessorOrder().toArray().length).toBe(0);
  });

  test("Get updated", () => {
    processorManager.addProcessor(moveProcessor);
    processorManager.update();
    expect(updateFun).toHaveBeenCalledTimes(1);
  });

  test("Get updated with the appropriate entities, BEFORE adding processor", () => {
    var entity1 = new Entity();
    entity1.addComponent(transformGenerator(0, 1));
    entity1.addComponent(physicsGenerator(2, 3));
    var entity2 = new Entity();
    entity2.addComponent(transformGenerator(4, 5));

    stateManager.addEntity(entity1);
    stateManager.addEntity(entity2);

    processorManager.addProcessor(moveProcessor);
    processorManager.update();
    expect(updateFun).toHaveBeenCalledWith([entity1.hash()]);
  });

  test("Get updated with the appropriate entities, AFTER adding processor", () => {
    processorManager.addProcessor(moveProcessor);

    var entity1 = new Entity();
    entity1.addComponent(transformGenerator(0, 1));
    entity1.addComponent(physicsGenerator(2, 3));
    var entity2 = new Entity();
    entity2.addComponent(transformGenerator(4, 5));

    stateManager.addEntity(entity1);
    stateManager.addEntity(entity2);

    processorManager.update();
    expect(updateFun).toHaveBeenCalledWith([entity1.hash()]);
  });
});

describe("Entities", () => {
  
  var processorManager,
    stateManager,
    moveProcessor,
    updateFun;

  class MoveProcessor extends Processor {
    constructor(name) {
      super(name);

      this._components = new Family(['Transform', 'Physics']);
    }

    update(entities) {
      updateFun(entities.toArray());
    }

    getComponentNames() {
      return this._components;
    }
  }

  beforeEach(() => {
    stateManager = new StateManager();
    processorManager = new ProcessorManager(stateManager);
    moveProcessor = new MoveProcessor('MoveProcessor');
    updateFun = jest.fn();
  });

  test("Can add components and cached lists get properly updated", () => {
    processorManager.addProcessor(moveProcessor);

    var entity1 = new Entity();
    entity1.addComponent(transformGenerator(0, 1));
    stateManager.addEntity(entity1);
    processorManager.update();
    expect(updateFun).toHaveBeenLastCalledWith([]);

    entity1.addComponent(physicsGenerator(2, 3));
    processorManager.update();

    expect(updateFun).toHaveBeenLastCalledWith([entity1.hash()]);
  });

  test("Can remove components and cached lists get properly updated", () => {
    processorManager.addProcessor(moveProcessor);

    var entity1 = new Entity();
    
    stateManager.addEntity(entity1);
    entity1.addComponent(transformGenerator(0, 1));
    entity1.addComponent(physicsGenerator(2, 3));
    
    processorManager.update();
    expect(updateFun).toHaveBeenLastCalledWith([entity1.hash()]);

    entity1.removeComponent('Transform');
    processorManager.update();

    expect(updateFun).toHaveBeenCalledTimes(2);
    expect(updateFun).toHaveBeenLastCalledWith([]);
  });

  test("Can be removed from state manager and properly update cached lists", () => {
    processorManager.addProcessor(moveProcessor);

    var entity1 = new Entity();
    
    stateManager.addEntity(entity1);
    entity1.addComponent(transformGenerator(0, 1));
    entity1.addComponent(physicsGenerator(2, 3));

    stateManager.removeEntity(entity1);
    processorManager.update();
    expect(updateFun).toHaveBeenLastCalledWith([]);
  });
});