//actionmanager.test.js//

/**
 * @description - Test suite for the action manager
 * @author - Sam Faulkner
 */

const ActionManager = require('../src/ActionManager.js');

function moveReducer(action, stateManager) {
  var entityState = stateManager.getEntityComponent(action.entity, 'Transform');
  entityState.x = action.x;
  entityState.y = action.y;
}

describe("Reducers", () => {
  var actionManager;

  beforeEach(() => {
    actionManager = new ActionManager();
  });

  test("Can be added", () => {
    actionManager.addReducer(moveReducer, ['MOVE']);
    expect(actionManager.getReducers('MOVE').length).toBe(1);
  });

  test("Can be removed", () => {
    actionManager.addReducer(moveReducer, ['MOVE']);
    actionManager.removeReducer(moveReducer, ['MOVE']);

    expect(actionManager.getReducers('MOVE').length).toBe(0);
  });

  test("Can dispatch other actions appropriately", () => {
    function newMoveReducer(action, stateManager, actionManager) {
      actionManager.dispatch({'type': 'MOVE', 'x': 4, 'y': 4});
    }

    actionManager.addReducer(newMoveReducer, ['MOVE']);
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1
    });

    expect(actionManager.getQueuedActions().length).toBe(1);
    actionManager.update();
    expect(actionManager.getQueuedActions().length).toBe(1);

  });
});

describe("Actions", () => {
  var actionManager;
  
  beforeEach(() => {
    actionManager = new ActionManager();
  });

  test("Can be dispatched", () => {
    var newAction = {
      'type': 'MOVE',
      'x': 0,
      'y': 1
    };

    actionManager.dispatch(newAction);
    expect(actionManager.getQueuedActions()).toEqual([newAction]);
  });

  test("Are queued up correctly", () => {
    var newAction1 = {
      'type': 'MOVE',
      'x': 0,
      'y': 1
    },
      newAction2 = {
        'type': 'MOVE',
        'x': 2,
        'y': 3
      };

    actionManager.dispatch(newAction1);
    actionManager.dispatch(newAction2);

    expect(actionManager.getQueuedActions().length).toBe(2);
    expect(actionManager.getQueuedActions()).toEqual([newAction1, newAction2]);
  });

  test("Are passed to appropriate reducers during 'update'", () => {
    var testFun1 = jest.fn(),
      testFun2 = jest.fn();
    
    function newMoveReducer(action, stateManager) {
      testFun1(action);
    }
    function newRelayerReducer(action, stateManager) {
      testFun2(action);
    }

    actionManager.addReducer(newMoveReducer, ['MOVE']);
    actionManager.addReducer(newRelayerReducer, ['RELAYER']);

    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1
    });

    actionManager.dispatch({
      'type': 'RELAYER',
      'layer': 0
    });

    actionManager.update();
    expect(testFun1).toHaveBeenCalledTimes(1);
    expect(testFun2).toHaveBeenCalledTimes(1);
    expect(testFun1).toHaveBeenCalledWith({'type': 'MOVE', 'x': 0, 'y': 1});
    expect(testFun2).toHaveBeenCalledWith({'type': 'RELAYER', 'layer': 0});

  });

  test("Are cleared after 'update'", () => {
    var testFun = jest.fn();
    actionManager.addReducer((action) => {
      testFun(action);
    }, ['MOVE']);
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1
    });

    actionManager.update();
    expect(testFun).toHaveBeenCalled();
    expect(actionManager.getQueuedActions().length).toBe(0);
    actionManager.update();
    //we don't call it twice
    expect(testFun).toHaveBeenCalledTimes(1);
    expect(actionManager.getQueuedActions().length).toBe(0);
  });
});

describe("Buffering actions", () => {
  var actionManager;

  beforeEach(() => {
    actionManager = new ActionManager();
  });

  test("Buffers for the window", () => {
    var currentTick = 0;
    while(currentTick < 8) {
      actionManager.update(undefined, currentTick);
      currentTick++;
    }

    expect(actionManager._getActionBuffer().length).toBe(8);
  });

  test("Doesn't buffer for more than the window", () => {
    var currentTick = 0;
    while (currentTick < 10) {
      actionManager.update(undefined, currentTick);
      currentTick++;
    }

    expect(actionManager._getActionBuffer().length).toBe(8);
  });

  test("Buffers the actions in the correct order/way", () => {
    var currentTick = 0;
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 1
    });
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 2
    });

    actionManager.update(undefined, currentTick++);
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 0,
      'y': 3
    });
    actionManager.update(undefined, currentTick++);

    var firstBuffer = actionManager.getActionBuffer(0);
    var secondBuffer = actionManager.getActionBuffer(1);
    expect(firstBuffer.length).toBe(2);
    expect(secondBuffer.length).toBe(1);
    
    expect(firstBuffer[0]).toEqual({
      'type': 'MOVE',
      'x': 0,
      'y': 1
    });
    expect(firstBuffer[1]).toEqual({
      'type': 'MOVE',
      'x': 0,
      'y': 2
    });
    expect(secondBuffer[0]).toEqual({
      'type': 'MOVE',
      'x': 0,
      'y': 3
    });

  });
});

describe("Reapplying actions", () => {
  var actionManager,
    stateManager,
    currentTick,
    updateFunction,
    testFun1,
    testFun2;

  function moveReducer(action, stateManager) {
    testFun1(action);
  }

  function relayerReducer(action, stateManager) {
    testFun2(action);
  }

  beforeEach(() => {
    actionManager= new ActionManager();
    const StateManager = require('../src/StateManager.js');
    stateManager = new StateManager();
    actionManager.addReducer(moveReducer, ['MOVE']);
    actionManager.addReducer(relayerReducer, ['RELAYER']);

    currentTick = 0;
    updateFunction = () => {
      actionManager.update(stateManager, currentTick);
      stateManager.update(currentTick);
      currentTick++;
    };

    testFun1 = jest.fn();
    testFun2 = jest.fn();
  });
  test("All actions get re-applied", () => {
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 1,
      'y': 1
    });
    updateFunction();
    expect(testFun1).toHaveBeenCalledTimes(1);
    actionManager.dispatch({
      'type': 'RELAYER',
      'layer': 4
    });
    updateFunction();
    expect(testFun2).toHaveBeenCalledTimes(1);

    actionManager.reApplyFrom(0, stateManager);
    expect(testFun1).toHaveBeenCalledTimes(2);
    expect(testFun2).toHaveBeenCalledTimes(2);
  });

  test("Actions not included in the buffer don't get reapplied", () => {
    actionManager.dispatch({
      'type': 'MOVE',
      'x': 1,
      'y': 1
    });
    updateFunction();
    expect(testFun1).toHaveBeenCalledTimes(1);
    actionManager.dispatch({
      'type': 'RELAYER',
      'layer': 4
    });
    updateFunction();
    expect(testFun2).toHaveBeenCalledTimes(1);

    actionManager.reApplyFrom(1, stateManager);
    expect(testFun1).toHaveBeenCalledTimes(1);
    expect(testFun2).toHaveBeenCalledTimes(2);
  });
});