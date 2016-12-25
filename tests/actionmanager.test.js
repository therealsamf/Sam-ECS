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