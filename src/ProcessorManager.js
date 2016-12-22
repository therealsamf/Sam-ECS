//ProcessorManager.js//

/**
 * @description - Manages the processors in the ECS
 * @author - Sam Faulkner
 */

const SortedMap = require('collections/sorted-map.js'),
  Dict = require('collections/dict.js'),
  Set = require('collections/set.js'),
  SortedSet = require('collections/sorted-set.js');

class ProcessorManager {
  constructor(parent) {
    this._parent = parent;
    this._stateManager = this._parent.getStateManager();

    var _this = this;

    this._processors = new SortedMap([],
      (firstKey, secondKey) => {
        return _this._processors.get(firstKey).get('order') == 
          _this._processors.get(secondKey).get('order');
      },
      (firstKey, secondKey) => {
        return _this._processors.get(firstKey).get('order') < 
          _this._processors.get(secondKey).get('order');
      }
    );
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
            .testEntity(value.get('object'))) {

            _this.fetchCachedList(processorValue.get('name'));
          }
        });
      }
    });
  }

  /**
   * @description - Adds a processor to the processor manager
   * @param {Processor} processor - the processor to be added
   */
  addProcessor(processor) {
    this._processors.set(processor.getName(), new Dict({
      'name': processor.getName(),
      'object': processor,
      'order': this._processorOrder++,
      'cachedEntityList': new Set()
    }));

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
      list = new Set(this._stateManager.getEntitySet.toArray()),
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
      list = list.intersection(this._stateManager.getEntitiesByComponent(component));
      if (list.length <= 0)
        break;
    }

    if (list.length > 0) {
      for (var component of family.getCannotHaves()) {
        list = list.difference(this._stateManager.getEntitiesByComponent(component));
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
      this._processors.delete(processor.getName());
    }
  }

  /**
   * @description - Updates all the processors this manager has
   */
  update() {
    var _this = this;
    this._processors.forEach((value, key) => {
      value.get('object').update(value.get('cachedEntityList'));
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