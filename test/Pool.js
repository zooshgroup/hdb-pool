'use strict';

const should = require('should');
const sinon = require('sinon');
const RequestState = require('../lib/types/RequestState');
const ResourceState = require('../lib/types/ResourceState');
const TaskType = require('../lib/types/TaskType');
const EventType = require('../lib/types/EventType');
const Utils = require('../lib/Utils');
const Pool = require('../lib/Pool');
const Resource = require('../lib/Resource');
const Stub = require('./utils/Stub');
const Task = require('../lib/Task');

describe('Pool', function () {
  let pool, stub, spy, spy2;
  beforeEach(() => {
    pool = new Pool({});
    stub = undefined;
    spy = undefined;
    spy2 = undefined;
  });
  afterEach(() => {
    Stub.restore(stub);
    Stub.restore(spy);
    Stub.restore(spy2);
  });

  describe('#constructor', function () {
    it('should create two operators', function () {
      should(pool['_operators'].length).equals(2);
    });
  });

  describe('#parameters', function () {
    it('should return parameters', function () {
      const param = {userName: 1, password: 2};
      pool = new Pool(param);
      should(pool.parameters).equals(param);
    });
  });

  describe('#options', function () {
    it('should call Utils.getPoolOptions for the input options', function () {
      spy = sinon.spy(Utils, 'getPoolOptions');
      new Pool({});
      sinon.assert.calledOnce(spy);
    });
  });

  describe('#requestList', function () {
    it('should return requestList', function () {
      should(pool.requestList).exactly(pool['_requestList']);
    });
  });

  describe('#getAvailableResource', function () {
    it('should return available resource by index', function () {
      const resource = {};
      should(pool.getAvailableResource(0)).exactly(undefined);
      pool['_availableResources'].push(resource);
      should(pool.getAvailableResource(0)).exactly(resource);
    });
  });

  describe('#poolSize', function () {
    it('should return the size of pool', function () {
      pool['_allResources'].length = 0;
      should(pool.poolSize).equals(0);
      const resource = {};
      pool['_allResources'].push(resource);
      should(pool.poolSize).equals(1);
    });
  });

  describe('#availableResourceNum', function () {
    it('should return the size of available list', function () {
      should(pool.availableResourceNum).equals(0);
      const resource = {};
      pool['_availableResources'].push(resource);
      should(pool.availableResourceNum).equals(1);
    });
  });

  describe('#room', function () {
    it('should return the available room left of current pool', function () {
      pool = new Pool({}, {max: 20});
      pool['_allResources'].length = 0;
      should(pool.room).equals(20);
      const resource = {};
      pool['_allResources'].push(resource);
      should(pool.room).equals(19);
      pool['_allResources'].push(resource);
      should(pool.room).equals(18);
    });
  });

  describe('#placeholderNum', function () {
    it('should return the placeholder number of current pool', function () {
      pool['_allResources'].length = 0;
      should(pool.placeholderNum).equals(0);
      const creationPlaceHolder = Symbol('PlaceHolder4Creation');
      pool['_allResources'].push(creationPlaceHolder);
      should(pool.placeholderNum).equals(1);
    });
  });
  describe('#poolResources', function () {
    it('should return all resources', function () {
      should(pool.poolResources).exactly(pool['_allResources']);
    });
  });
  describe('#availableResourceList', function () {
    it('should return availableResourceList', function () {
      should(pool.availableResourceList).exactly(pool['_availableResources']);
    });
  });
  describe('#dequeueFromAvailableResources', function () {
    it('should dequeue and return the first item from available list', function () {
      should(pool.dequeueFromAvailableResources()).exactly(undefined);
      should(pool.getAvailableResource(0)).exactly(undefined);

      const resource = {};
      pool['_availableResources'].push(resource);
      should(pool.getAvailableResource(0)).exactly(resource);
      should(pool.dequeueFromAvailableResources()).exactly(resource);
      should(pool.getAvailableResource(0)).exactly(undefined);
    });
  });

  describe('#dequeueFromRequestList', function () {
    it('should dequeue and return the first item from request list', function () {
      should(pool.dequeueFromRequestList()).exactly(undefined);

      const resource = {};
      pool['_requestList'].push(resource);
      should(pool['_requestList'].length).exactly(1);
      should(pool.dequeueFromRequestList()).exactly(resource);
      should(pool['_requestList'].length).exactly(0);
    });
  });

  describe('#removeResourceFromAll', function () {
    it('should remove the resource from the pool', function () {
      const resource1 = {};
      const resource2 = {};
      pool['_allResources'].length = 0;
      pool['_allResources'].push(resource1);

      pool.removeResourceFromAll(resource2);
      should(pool['_allResources'].length).exactly(1);
      pool.removeResourceFromAll(resource1);

      should(pool['_allResources'].length).exactly(0);
    });
  });

  describe('#getResourceFromConnectionInAll', function () {
    it('should get the resource from connection in the pool', function () {
      const connection = {};
      const resource1 = {};
      resource1.connection = connection;

      pool['_allResources'].length = 0;
      pool['_allResources'].push(resource1);

      should(pool.getResourceFromConnectionInAll(connection)).exactly(resource1);
    });
  });

  describe('#removeResourceFromAvailable', function () {
    let resource;
    beforeEach(function() {
      resource = {};
    });
    it('should remove the resource from the available list', function () {
      pool['_availableResources'].push(resource);
      pool.removeResourceFromAvailable(resource);
      should(pool['_availableResources'].length).exactly(0);
    });

    it('should call stopCheckInterval if available is empty', function () {
      pool['_availableResources'].push(resource);
      spy = sinon.spy(pool, '_stopCheckInterval');
      pool._intervalId = 1;
      pool.removeResourceFromAvailable(resource);
      sinon.assert.calledOnce(spy);
    });

    it('should set intervalId to undefined after stop the interval if available is empty', function () {
      pool['_availableResources'].push(resource);
      pool._intervalId = 1;
      pool.removeResourceFromAvailable(resource);
      should(pool._intervalId).exactly(undefined);
    });
  });

  describe('#removeRequestFromList', function () {
    it('should remove the request from the request list', function () {
      const request1 = {};
      const request2 = {};
      pool['_requestList'].push(request1);

      pool.removeRequestFromList(request2);
      should(pool['_requestList'].length).exactly(1);
      pool.removeRequestFromList(request1);
      should(pool['_requestList'].length).exactly(0);
    });
  });

  describe('#removeNonPendingRequest', function () {
    let request1, request2, request3;
    beforeEach(function() {
      request1 = {};
      request2 = {};
      request3 = {};
    });
    it('should remove the all the None-Pending requests from the request list', function () {
      request1.state = RequestState.REJECTED;
      request2.state = RequestState.PENDING;
      request3.state = RequestState.FULFILLED;
      pool['_requestList'].push(request1);
      pool['_requestList'].push(request2);
      pool['_requestList'].push(request3);
      should(pool['_requestList'].length).exactly(3);
      pool.removeNonPendingRequest();
      should(pool['_requestList'].length).exactly(1);
    });
    it('should not do anything if all requests are PENDING', function () {
      request1.state = RequestState.PENDING;
      request2.state = RequestState.PENDING;
      pool['_requestList'].push(request1);
      pool['_requestList'].push(request2);
      should(pool['_requestList'].length).exactly(2);
      pool.removeNonPendingRequest();
      should(pool['_requestList'].length).exactly(2);
    });
  });

  describe('#addRequestToRequestList', function () {
    let request;
    beforeEach(() => {
      request = {};
    });
    it('should add the request to the request list, return Promise.resolve if task process is succeed.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.addRequestToRequestList(request).then(() => {
        should(pool['_requestList'].length).exactly(1);
      });
    });
    it('should add the request to the request list, return Promise.reject if task process is failed.', function () {
      stub = Stub.getStubForObjectWithRejectedPromise(pool, '_notifyAllOperators', Stub.rejectErrorMessage);
      return pool.addRequestToRequestList(request)
        .then(() => sinon.assert.fail('it was not supposed to succeed.'))
        .catch((err) => {
          should(err).equals(Stub.rejectErrorMessage);
        });
    });
    it('should call _notifyAllOperators once.', function () {
      stub = sinon.spy(pool, '_notifyAllOperators');
      pool.addRequestToRequestList(request).catch(() => '');
      sinon.assert.calledOnce(stub);
    });
  });

  describe('#addResourceToAll', function () {
    let resource;
    beforeEach(() => {
      resource = {};
    });
    it('should add the resource to the pool, return Promise.resolve if task process is succeed.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      pool['_allResources'].length = 0;
      return pool.addResourceToAll(resource).then(() => {
        should(pool['_allResources'].length).exactly(1);
      });
    });
    it('should add the resource to the the pool, return Promise.reject if task process is failed.', function () {
      stub = Stub.getStubForObjectWithRejectedPromise(pool, '_notifyAllOperators', Stub.rejectErrorMessage);
      pool['_allResources'].length = 0;
      return pool.addResourceToAll(resource)
        .then(() => sinon.assert.fail('it was not supposed to succeed.'))
        .catch((err) => {
          should(err).equals(Stub.rejectErrorMessage);
        });
    });
    it('should call _notifyAllOperators once if resource is not symbol.', function () {
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.addResourceToAll(resource).catch(() => '');
      sinon.assert.calledOnce(spy);
    });
    it('should not call _notifyAllOperators once if resource is symbol.', function () {
      const resource = Symbol('test');
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.addResourceToAll(resource).catch(() => '');
      sinon.assert.notCalled(spy);
    });
    it('should not call _notifyAllOperators once if resource is null/undefined.', function () {
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.addResourceToAll(null).catch(() => '');
      pool.addResourceToAll(undefined).catch(() => '');
      sinon.assert.notCalled(spy);
    });
  });

  describe('#addResourceToAvailable', function () {
    let resource;
    beforeEach(() => {
      resource = new Resource(undefined);
    });
    it('should add the resource to available resource list', function () {
      pool.addResourceToAvailable(resource).catch(() => '');
      should(pool['_availableResources'].length).exactly(1);
    });
    it('the state of resource added to available resource list should set to idle', function () {
      resource['_state'] = ResourceState.ALLOCATED;
      pool.addResourceToAvailable(resource).catch(() => '');
      should(resource.state).exactly(ResourceState.IDLE);
    });
    it('should not call _notifyAllOperators once', function () {
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.addResourceToAvailable(resource).catch(() => '');
      sinon.assert.calledOnce(spy);
    });
    it('should not call _checkConnectionIdleTimeout once if options.checkInterval>0 and _intervalId === undefined', function () {
      pool = new Pool({}, {checkInterval: 50});
      spy = sinon.spy(pool, '_stopCheckInterval');
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_checkConnectionIdleTimeout');
      pool.addResourceToAvailable(resource).catch(() => '');
      sinon.assert.calledOnce(stub);
      sinon.assert.notCalled(spy);
    });
    it('should not call _stopCheckInterval once if options.checkInterval<=0 and _intervalId !== undefined', function () {
      pool = new Pool({}, {checkInterval: 0});
      pool._intervalId = 1;
      spy = sinon.spy(pool, '_stopCheckInterval');
      spy2 = sinon.spy(pool, '_checkConnectionIdleTimeout');
      pool.addResourceToAvailable(resource).catch(() => '');
      sinon.assert.calledOnce(spy);
      sinon.assert.notCalled(spy2);
    });
  });

  describe('#replacePlaceHolderWithConnectionFromAll', function () {
    let resource;
    beforeEach(() => {
      resource = new Resource(undefined);
    });
    it('should replace the placeholder with the provided resource from the pool', function () {
      const placeHolder = Symbol('PlaceHolder4Creation');
      pool['_allResources'].push(placeHolder);
      const index = pool['_allResources'].indexOf(placeHolder);
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.replacePlaceHolderWithConnectionFromAll(placeHolder, resource).then(() => {
        should(pool['_allResources'][index]).exactly(resource);
      });
    });

    it('#should call _notifyAllOperators once', function () {
      const placeHolder = Symbol('PlaceHolder4Creation');
      pool['_allResources'].push(placeHolder);
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.replacePlaceHolderWithConnectionFromAll(placeHolder, resource).catch(() => '');
      sinon.assert.calledOnce(spy);
    });

    it('#should not call _notifyAllOperators if resource is a Symbol as well', function () {
      const placeHolder = Symbol('PlaceHolder4Creation');
      pool['_allResources'].push(placeHolder);
      spy = sinon.spy(pool, '_notifyAllOperators');
      pool.replacePlaceHolderWithConnectionFromAll(placeHolder, Symbol('PlaceHolder4Creation')).catch(() => '');
      sinon.assert.notCalled(spy);
    });

    it('#should return rejected promise if the placeHolder cannot be matched', function () {
      const placeHolder = Symbol('PlaceHolder4Creation');
      return pool.replacePlaceHolderWithConnectionFromAll(placeHolder, resource).catch(() => {
        should(pool['_allResources'].indexOf(placeHolder)).below(0);
      });
    });
  });

  describe('#returnConnection', function () {
    it('#should return Promise.resolve() if connection is not null and _notifyAllOperators is succeed.', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.returnConnection({}).then((msg) => {
        should(msg).equals(undefined);
      });
    });
    it('#should return Promise.reject() if connection is not null and _notifyAllOperators is failed.', function () {
      stub = Stub.getStubForObjectWithRejectedPromise(pool, '_notifyAllOperators', Stub.rejectErrorMessage);
      return pool.returnConnection({})
        .then(() => sinon.assert.fail('it was not supposed to succeed.'))
        .catch((err) => {
          should(err).equals(Stub.rejectErrorMessage);
        });
    });
    it('#should return reject promise if the connection is null/undefined', function () {
      const rejectError = 'it was not supposed to succeed.';
      return pool.returnConnection(null)
        .then(() => sinon.assert.fail(rejectError))
        .catch((err) => should.notStrictEqual(err, rejectError));
    });
  });

  describe('#destroyConnection', function () {
    it('#should return Promise.resolve() if connection is not null and _notifyAllOperators is succeed.', function () {
      const pool = new Pool({});
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.destroyConnection({}).then((msg) => {
        should(msg).equals(undefined);
      });
    });
    it('#should return Promise.reject() if connection is not null and _notifyAllOperators is failed.', function () {
      stub = Stub.getStubForObjectWithRejectedPromise(pool, '_notifyAllOperators', Stub.rejectErrorMessage);
      return pool.destroyConnection({})
        .then(() => sinon.assert.fail('it was not supposed to succeed.'))
        .catch((err) => {
          should(err).equals(Stub.rejectErrorMessage);
        });
    });
    it('#should return promise.resolve if the connection is null/undefined', function () {
      return pool.destroyConnection(null)
        .then((msg) => {
          should(msg).equals(undefined);
        });
    });
  });

  describe('#clear', function () {
    it('#should truncate all resources.', function () {
      pool['_requestList'].length = 0;
      pool['_allResources'].length = 0;
      pool['_availableResources'].length = 0;
      const resource = Symbol('TEST_CLEAR');
      pool['_requestList'].push(resource);
      pool['_allResources'].push(resource);
      pool['_availableResources'].push(resource);
      return pool.clear().then(() => {
        should(pool['_requestList'].length).equals(0);
        should(pool['_allResources'].length).equals(0);
        should(pool['_availableResources'].length).equals(0);
      });
    });
    it('#should try to stop checking interval if intervalId is not undefined.', function () {
      pool._intervalId = 1;
      spy = sinon.spy(pool, '_stopCheckInterval');
      return pool.clear({}).then(() => sinon.assert.calledOnce(spy));
    });
  });
  describe('#initialize', function () {
    it('#should return rejected promise if pool already initialized.', function () {
      pool['_initializeFlag'] = true;
      return pool.initialize().catch(err => should(err.message.includes('has already been initialized')).equals(true));
    });
    it('#should trigger initialize task if pool has not been initialized.', function () {
      pool['_initializeFlag'] = false;
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.initialize({}).then(() => sinon.assert.calledWith(stub, new Task(TaskType.INITIALIZE_POOL)));
    });
    it('#should set initialize flag to true after initialization is done if pool has not been initialized.', function () {
      pool['_initializeFlag'] = false;
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      return pool.initialize({}).then(() => should(pool['_initializeFlag']).equals(true));
    });
  });
  describe('#isPoolInitialized', function () {
    it('#should return value of _initializeFlag.', function () {
      pool['_initializeFlag'] = true;
      should(pool.isPoolInitialized()).equals(pool['_initializeFlag']);
      pool['_initializeFlag'] = false;
      should(pool.isPoolInitialized()).equals(pool['_initializeFlag']);
    });
  });

  describe('#_checkConnectionIdleTimeout', function () {
    const time = 500;
    let clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });
    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
    it('#shoud emit error if _notifyAllOperators failed', async function () {
      const errorMsg = 'Error_NotifyAllOperators';
      stub = Stub.getStubForObjectWithRejectedPromise(pool, '_notifyAllOperators', errorMsg);
      spy = sinon.spy(Utils, 'emitMessage');
      pool['_checkConnectionIdleTimeout'](time);
      clock.tick(time + 1);
      clock.restore();
      await sleep(150); // wait for emitMessage (is there any better solution?)
      sinon.assert.calledOnce(spy);
      sinon.assert.calledWith(spy, EventType.ERROR);
    });
    it('#should call _notifyAllOperators with a CHECK_IDLE_TIMEOUT type task', function () {
      stub = Stub.getStubForObjectWithResolvedPromise(pool, '_notifyAllOperators');
      pool['_checkConnectionIdleTimeout'](time);
      clock.tick(time + 1);
      sinon.assert.calledOnce(stub);
      sinon.assert.calledWith(stub, new Task(TaskType.CHECK_IDLE_TIMEOUT));
    });
  });

  describe('#_notifyAllOperators', function () {
    let stubList;
    beforeEach(() => {
      stubList = [];
    });
    afterEach(() => {
      stubList.forEach((stub) => Stub.restore(stub));
    });
    it('#should call work for operators.', function () {
      pool['_operators'].forEach((operator) => {
        stubList.push(Stub.getStubForObjectWithResolvedPromise(operator, 'work', Stub.resolvedMessage));
      });
      return pool['_notifyAllOperators']().then((str) => {
        should(str).equals(Stub.resolvedMessage);
      });
    });
    // `Something wrong, can not find any worker for task ${task && task.taskType ? task.taskType : 'None'}`

    it('#should reject if no taskFound (task is undefined).', function () {
      const rejectError = 'it was not supposed to succeed.';
      pool['_operators'].forEach((operator) => {
        stubList.push(Stub.getStubForOperatorWithObject(operator, 'work', null));
      });
      return pool['_notifyAllOperators']()
        .then(() => Promise.reject(rejectError))
        .catch((err) => {
          should(err.message).equals('Something wrong, can not find any worker for task None');
        });
    });

    it('#should reject if no taskFound (task is not undefined).', function () {
      const rejectError = 'it was not supposed to succeed.';
      pool['_operators'].forEach((operator) => {
        stubList.push(Stub.getStubForOperatorWithObject(operator, 'work', null));
      });
      const Task = {taskType: 'JUST_FOR_TEST'};
      return pool['_notifyAllOperators'](Task)
        .then(() => Promise.reject(rejectError))
        .catch((err) => {
          should(err.message).equals('Something wrong, can not find any worker for task JUST_FOR_TEST');
        });
    });
  });

  describe('#_stopCheckInterval', function () {
    let clock;
    before(function() {
      clock = sinon.useFakeTimers();
    });
    after(function() {
      clock.restore();
    });

    it('#should set _intervalId to undefined if _intervalId is not undefined', function () {
      pool['_intervalId'] = 25;
      pool['_stopCheckInterval']();
      should(pool['_intervalId']).exactly(undefined);
    });
    it('#should call clearInterval with the interval Id if _intervalId is not undefined', function () {
      pool['_intervalId'] = 25;
      spy = sinon.spy(clock, 'clearInterval');
      pool['_stopCheckInterval']();
      sinon.assert.calledOnce(spy);
    });
    it('#should not call clearInterval if _intervalId is not undefined', function () {
      pool['_intervalId'] = undefined;
      spy = sinon.spy(clock, 'clearInterval');
      pool['_stopCheckInterval']();
      sinon.assert.notCalled(spy);
    });
  });
});
