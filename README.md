Sam-ECS: Sam's entity component system
============================

Simple but specialized entity component system. Currently work in progress

<b>Installation</b>
```
$ npm install --save sam-ecs
```

<b>Usage</b> (ES6)
```
import { Manager, Entity, Processor } from 'sam-ecs';

//manager creation
var manager = new Manager();

//empty entity creation
var entity = new Entity(manager);

// add component to entity
/* Each component has to have at a minimum a 'name' and
 * 'state' object
 */
entity.addComponent({name: 'Transform', state: {x: 0, y: 0}});

// processor definition
class RenderProcessor extends Processor {
  constructor(manager, name) {
    super(manager, name);
    
    /* every entity that contains a render component
     * will be given to this processor's update
     * function
     */
    this.components = new Set(['Render']);
  }

  // Called every time manager.update is called
  update(entities, manager) {
    for (var hash of entities) {
      var entity = manager.getEntity(hash);
      // render entity
    }
  }

  // Required, called by the manager
  getComponentNames() {
    return this.components;
  }
}
```