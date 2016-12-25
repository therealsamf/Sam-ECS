//eventmanager.test.js//

/**
 * @description - Test suite for the event manager
 * @author - Sam Faulkner
 */

const ActionManager = require('../src/ActionManager.js'),
  EventManager = require('../src/EventManager.js');

describe("Event Listeners", () => {
  var eventManager;

  beforeEach(() => {
    eventManager = new EventManager(new ActionManager());
  });
  test("Can be added", () => {
    eventManager.addListener('MOVE_EVENT', (args, actionManager) => {

    });

    expect(eventManager.getListeners('MOVE_EVENT').length).toBe(1);
  });

  test("Can be removed", () => {
    function listenerFunction(args, actionManager) {

    };
    eventManager.addListener('MOVE_EVENT', listenerFunction);
    eventManager.removeListener('MOVE_EVENT', listenerFunction);

    expect(eventManager.getListeners('MOVE_EVENT').length).toBe(0);
  });
});

describe("Events", () => {
  var eventManager;
  var listenerFunction;
  var testFun;

  beforeEach(() => {
    eventManager = new EventManager(new ActionManager());
    testFun = jest.fn();
    listenerFunction = (args, actionManager) => {
      testFun(args);
    };
  });

  test("Can be emitted", () => {
    eventManager.addListener('MOVE_EVENT', listenerFunction);

    eventManager.emit('MOVE_EVENT', {'x': 0, 'y': 1});
    expect(testFun).toHaveBeenCalledWith({'x': 0, 'y': 1});
  });
});