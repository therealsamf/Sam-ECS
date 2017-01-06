//ClientWorker.js//

/**
 * @description - WebWorker file for the client manager
 * @author - Sam Faulkner
 */

onmessage = function(e) {
  var data = e.data;
  var oldState = data.oldState,
    entityList = oldState.entities,
    stateChanges = data.deltaState,
    changeList = stateChanges.entities;

  var entities = {};
  var changes = {};

  for (var entity of entityList) {
    entities[entity.hash] = entity.components;
  }
  for (var entity of changeList) {
    changes[entity.hash] = entity.components;
  }

  for (var entityHash in changes) {
    //possible override
    if (entityHash in entities) {
      for (var componentName in changes[entityHash].components) {
        var componentState = changes[entityHash].components[componentName];
        // def override
        if (componentName in entities[entityHash].components) {
          //override previous state
          Object.assign(entities[entityHash].components[componentName], componentState);
        }
        //new component
        else {
          //add new component state. Must call 'init' for component at some point
          entities[entityHash].components[componentName] = Object.assign({}, componentState);
        }
      }
    }
    //new entity
    else {
      /* the shallow copy is okay because objects are deep copied across 
       * the web worker message boundary anyway
       */
      entities[entityHash] = changes[entityHash];
    }
  }

  postMessage(oldState);
}