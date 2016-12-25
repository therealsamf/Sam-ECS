//ProcessorManager.js//

/**
 * @description - Manages the processors in the ECS
 * @author - Sam Faulkner
 */

const Dict = require('collections/dict.js'),
  Set = require('collections/set.js'),
  SortedSet = require('collections/sorted-set.js');

class ProcessorManager {
  constructor(stateManager) {
    if (!stateManager)
      throw new TypeError("StateManager must be defined!");
    this._stateManager = stateManager

    var _this = this;

    this._processorsOrder = new SortedSet([],
      (first, second) => {
        return first.order == second.order;
      },
      (first, second) => {
        return first.order - second.order;
      }
    );
    this._processors = new Dict();
    this._processorOrder = 0;

    this._stateManager._entities.addMapChangeListener((value, key, map) => {
      // entity was removed was deleted
      if (!value) {
        _this._processors.forEach((processorValue, processorKey) => {
          if (processorValue.get('cachedEntityList').has(key)) {
            _this.fetchCachedList(processorValue.get('name'));
          }
        });
      }

      // entity was added
      else {
        _this._processors.forEach((processorValue, processorKey) => {
          if (processorValue.get('object')
            .getComponentNames()
            .testEntity(value.get('object')) ||
            //the entity removed one of its components
            processorValue.get('cachedEntityList').has(key)) {

            _this.fetchCachedList(processorValue.get('name'));
          }
        });
      }
    }, 'entities', false);
  }

  /**
   * @description - Gets the processor set
   * @returns {Set} the set of processors
   */
  getProcessors() {
    return this._processors;
  }

  /**
   * @description - Gets the processor order set
   * @returns {Set} the sorted set of processor objects that
   * are used to determine the processor order
   */
  getProcessorOrder() {
    return this._processorsOrder;
  }

  /**
   * @description - Adds a processor to the processor manager
   * @param {Processor} processor - the processor to be added
   */
  addProcessor(processor) {
    this._processors.set(processor.getName(), new Dict({
      'name': processor.getName(),
      'order': ++this._processorOrder,
      'object': processor,
      'cachedEntityList': new Set()
    }));

    this._processorsOrder.add({
      'name': processor.getName(),
      'order': this._processorOrder
    });

    this.fetchCachedList(processor.getName());
  }

  /**
   * @description - Gets the entities that belong to the family of entites
   * the processor has defined
   * @param {String} processorName - the name of the processor to fetch entites
   * for
   */
  fetchCachedList(processorName) {
    if (!this._processors.has(processorName)) {
      throw new TypeError("Can't fetch an entity list for an untracked processor: '" + processorName + "'!");
    }

    var _this = this,
      processorObject = this._processors.get(processorName),
      list = new Set(this._stateManager.getEntitySet().toArray()),
      sorted = false;

    if (processorObject.has('sorter')) {
      sorted = true;
      list = new SortedSet(
        list.toArray(), 
        (first, second) => { return first === second; },
        (first, second) => {
          return processorObject.get('sorter')(
            first,
            second,
            _this._stateManager
          );
        }
      );
    }

    var family = processorObject.get('object').getComponentNames();

    for (var component of family.getHaves().toArray()) {
      if (!this._stateManager.hasComponent(component)) {
        processorObject.set('cachedEntityList', new Set());
        return;
      }
      list = list.intersection(this._stateManager.getEntitiesByComponent(component));
      if (list.length <= 0)
        break;
    }

    if (list.length > 0) {
      for (var component of family.getCannotHaves().toArray()) {
        if (this._stateManager.hasComponent(component)) {
          list = list.difference(this._stateManager.getEntitiesByComponent(component));
        }

        if (list.length <= 0)
            break;
      }
    }

    processorObject.set('cachedEntityList', list);
  }

  /**
   * @description - Removes a processor from the processor manager
   * @param {Processor} processor - the processor to be removed
   */
  removeProcessor(processor) {

    if (this._processors.has(processor.getName())) {
      this._processorsOrder.remove({
        'name': processor.getName(),
        'order': this._processors.get(processor.getName()).get('order')
      });

      this._processors.delete(processor.getName());
    }
  }

  /**
   * @description - Updates all the processors this manager has
   */
  update() {
    var _this = this;
    this._processorsOrder.forEach((value, index) => {
      var processorObject = _this._processors.get(value.name);
      processorObject.get('object').update(processorObject.get('cachedEntityList'));
    });
  }

  /**
   * @description - Adds a sorter for the entities to be processed
   * by a given processor
   */
  addSorterForProcessor(sorter, processorName) {
    if (!this._processors.has(processorName)) {
      throw new TypeError("Can't add a sorting function for processor: '" + processorName + "'!");
    }
    var processorObject = this._processors.get(processorName);
    processorObject.set('sorter', sorter);

    this.fetchCachedList(processorName);
  }
}

module.exports = ProcessorManager;