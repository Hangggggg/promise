const STATE = { // dep 的状态，由它映射 $promise 的 state
  PENDING: 1,
  FULFILLED: 1 << 1,
  REJECTED: 1 << 2
}
STATE.SETTLED = STATE.FULFILLED | STATE.REJECTED;

const hiddenProperties = { // $promise 上的属性
  state: Symbol('state'),
  result: Symbol('result'),
  dep: Symbol('dep')
}
const dep = hiddenProperties.dep;

class $Promise {
  constructor (executor) {
    if (typeof executor !== 'function') { 
      throw new $PromiseError('Executor must be a function'); 
    }
    Dependence.execute($Promise.#create(this), executor);
  }

  [Symbol.toPrimitive] (hint) {
    return hint === 'number' ? NaN : '$promise';
  }
  
  toString () { // 处理显示调用 toString
    return this[Symbol.toPrimitive]('string');
  }

  // * 是否为 $promise
  static isPromise (value) { 
    return Object.prototype.toString.call(value) === '[object $Promise]';
  }

  // * 是否为 thenable
  static isThenable (obj) { 
    return typeof obj?.then === 'function';
  }

  // * 创建 $promise
  static #create (obj = Object.create($Promise.prototype)) { // 不在 constructor 中创建的原因：避免执行一些无用的判断
    obj[hiddenProperties.state] = 'pending';
    obj[hiddenProperties.result] = undefined;
    obj[dep] = new Dependence(obj);
    return obj;
  }

  then (onResolve, onReject) {
    const promise = $Promise.#create();
    this[dep].subscribe(promise, onResolve, onReject);
    return promise; 
  }

  catch (onReject) {
    return this.then(null, onReject);
  }

  finally (onFinally) {
    if (typeof onFinally === 'function') {
      return this.then(result => {
        $Promise.resolve(onFinally()).then(() => result); 
      }, reason => {
        $Promise.resolve(onFinally()).then(() => { throw reason; });
      });
    }
    return this.then(onFinally, onFinally);
  }

  static resolve (value) { 
    if ($Promise.isPromise(value)) {
      return value;
    } else if ($Promise.isThenable(value)) {
      const promise = $Promise.#create();
      Dependence.pipe(promise, value);
      return promise;
    } else {
      return $Promise.#create()[dep].change(STATE.FULFILLED, value);
    }
  }

  static reject (value) { 
    return $Promise.#create()[dep].change(STATE.REJECTED, value);
  }

  static all (promises) { 
    let promise = $Promise.#create();
    try {
      const arr = [];
      let wait = 0;
      for (const value of promises) { // 不使用 [].map.call() 的原因：传入非 iterable 不会报错
        const index = wait++;
        $Promise.resolve(value).then(result => {
          arr[index] = result;
          --wait || promise[dep].change(STATE.FULFILLED, arr);
        }, reason => {
          promise[dep].change(STATE.REJECTED, reason);
        });
      }
      wait || promise[dep].change(STATE.FULFILLED, arr);
    } catch (e) {
      promise[dep].change(STATE.REJECTED, e); // 捕获非 iterable 的错误
    } finally {
      return promise;
    }
  }
 
  static allSettled (promises) { // 不基于 all 来实现的原因：无法保证执行顺序
    let promise = $Promise.#create();
    try {
      const arr = [];
      let wait = 0;
      for (const value of promises) {
        const index = wait++;
        $Promise.resolve(value).then(result => {
          arr[index] = { status: 'fulfilled', value: result };
          --wait || promise[dep].change(STATE.FULFILLED, arr);
        }, reason => {
          arr[index] = { status: 'rejected', reason };
          --wait || promise[dep].change(STATE.FULFILLED, arr);
        });
      }
      wait || promise[dep].change(STATE.FULFILLED, arr);
    } catch (e) {
      promise[dep].change(STATE.REJECTED, e); // 捕获非 iterable 的错误
    } finally {
      return promise;
    }
  }
  
  static race (promises) { 
    let promise = $Promise.#create();
    try {
      for (let value of promises) {
        $Promise.resolve(value).then(result => {
          promise[dep].change(STATE.FULFILLED, result);
        }, reason => {
          promise[dep].change(STATE.REJECTED, reason);
        });
      }
    } catch (e) {
      promise[dep].change(STATE.REJECTED, e); // 捕获非 iterable 的错误
    } finally {
      return promise;
    }
  }

  static any (promises) { 
    let promise = $Promise.#create();
    try {
      let wait = 0; 
      for (let value of promises) {
        wait++;
        $Promise.resolve(value).then(result => {
          promise[dep].change(STATE.FULFILLED, result);
        }, () => {
          --wait || promise[dep].change(STATE.REJECTED, new $PromiseError('All promises were rejected'));
        });
      }
      wait || promise[dep].change(STATE.REJECTED, new $PromiseError('All promises were rejected'));
    } catch (e) {
      promise[dep].change(STATE.REJECTED, e); // 捕获非 iterable 的错误
    } finally {
      return promise;
    }
  }
}

$Promise.prototype[Symbol.toStringTag] = '$Promise';

class Dependence {
  constructor (promise) {
    this.#promise = promise; // 保存 $promise 的作用在于方便 change 进行修改
  }

  #promise;
  #state = STATE.PENDING;
  #result;
  #queue = new Map();
  #emptyQueue = true; // 是否存在订阅者，用于判断是否需要抛出异常

  // * 根据 thenable ，改变 $promise
  static pipe (target, thenable) {
    if (thenable === target) {
      target[dep].change(STATE.REJECTED, new $PromiseError('Chaining cycle detected for $promise'));
    } else {
      queueMicrotask(() => Dependence.execute(target, (resolve, reject) => thenable.then(resolve, reject)));
    }
  }
  
  // * 执行函数，改变 $promise
  static execute (target, executor) { 
    try { 
      executor(value => {
        if ($Promise.isThenable(value)) {
          Dependence.pipe(target, value);
        } else {
          target[dep].change(STATE.FULFILLED, value);
        }
      }, value => { 
        target[dep].change(STATE.REJECTED, value);
      }) 
    } catch (e) {  
      target[dep].change(STATE.REJECTED, e); 
    } 
  }

  // * 添加订阅者
  subscribe (target, onResolve, onReject) { 
    this.#queue.set(target, { onResolve, onReject });
    this.#emptyQueue = false;
    this.#state & STATE.SETTLED && this.#publish(); 
  }
  
  // * 发布
  #publish () { 
    if (this.#emptyQueue && this.#state & STATE.REJECTED) {
      setTimeout(() => { if (this.#emptyQueue) throw this.#result }); 
    }
    for (const [target, { onResolve, onReject }] of this.#queue) {
      const executor = this.#state & STATE.FULFILLED ? onResolve : onReject;
      queueMicrotask(() => {
        if (typeof executor === 'function') { 
          Dependence.execute(target, resolve => resolve(executor(this.#result)))    
        } else { 
          target[dep].change(this.#state, this.#result);
        }
      });
      this.#queue.delete(target);
    }
  }
  
  // * 改变 $promise
  change (state, result) { 
    if (this.#state & STATE.PENDING) {
      this.#state = state;
      this.#result = result;
      this.#promise[hiddenProperties.state] = state & STATE.FULFILLED ? 'fulfilled': 'rejected';
      this.#promise[hiddenProperties.result] = result;
      this.#publish(); 
    }
    return this.#promise;
  }
}

class $PromiseError extends Error {
  constructor (message) {
    super(message);
    this.name = '$PromiseError';
  }
}

export default $Promise