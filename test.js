// * test

// 与 Google Chrome 97 原生 Promise 基本保持一致
// 与原生 Promise 的差异：
// 原生未处理的 rejected promise ，会在微任务队列清空后，宏任务执行前，报错
// 而未处理的 rejected $promise ，会以宏任务的方式报错（技术限制：无法得知何时微任务全部执行完）

// 测试说明：去掉下方注释即可测试

import $Promise from './$promise.js'

const log = console.log;

const resolveThenable = {
  then (resolve) {
    console.log('resolveThenable');
    resolve(20);
  }
}

const rejectThenable = {
  then (resolve, reject) {
    console.log('rejectThenable');
    reject(30);
  }
}

function contrast() { // 对比
  log(0);
  setTimeout(() => log(100));
  queueMicrotask(() => { 
    log(1); 
    queueMicrotask(() => { 
      log(2); 
      queueMicrotask(() => { 
        log(3); 
        queueMicrotask(() => { 
          log(4);
          queueMicrotask(() => {
            log(5);
            queueMicrotask(() => {
              log(6);
            })
          })
        }) 
      }) 
    })
  })
}


// * 一、构造函数测试

// 1、执行非函数的 executor
// 2、执行空的 executor
// 3、执行 resolve
// 4、执行 reject
// 5、抛出错误
// 6、混合执行
// 7、循环引用

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、执行非函数的 executor

// $Promise(); 
// 同步报错：Uncaught TypeError: Class constructor $Promise cannot be invoked without 'new' 

// new $Promise(); 
// 同步报错：Uncaught $PromiseError: Executor must be a function 

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、执行空的 executor

// log(new $Promise(() => {})); 
// 同步执行 executor && 不改变：promise<pending,undefined> 
// 验证：
// new $Promise(() => log(10)).then(result => log(result));
// contrast();
// 打印结果：10, 0, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、执行 resolve

// log(new $Promise(resolve => resolve(10))); 
// 同步执行 executor && 同步改变：promise<fulfilled,10> 
// 验证：
// new $Promise(resolve => resolve(10)).then(result => log(result));
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise(resolve => resolve($Promise.resolve(10)))); 
// 同步执行 executor && 2 层微任务后改变：promise<fulfilled,10> 
// 验证：
// new $Promise(resolve => resolve($Promise.resolve(10))).then(result => log(result));  
// contrast();
// 打印结果：0, 1, 2, 10, 3, 4, 5, 6, 100

// log(new $Promise(resolve => resolve($Promise.reject(10)))); 
// 同步执行 executor && 2 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10 
// 验证：
// new $Promise(resolve => resolve($Promise.reject(10))).catch(result => log(result)); 
// contrast();
// 打印结果：0, 1, 2, 10, 3, 4, 5, 6, 100

// log(new $Promise(resolve => resolve(resolveThenable)));
// 同步执行 executor && 1 层微任务后执行 resolveThenable.then && 1 层微任务后改变：promise<fulfilled,20> 
// 验证：
// new $Promise(resolve => resolve(resolveThenable)).then(result => log(result));
// contrast();
// 打印结果：0, 'resolveThenable', 1, 20, 2, 3, 4, 5, 6, 100

// log(new $Promise(resolve => resolve(rejectThenable)));
// 同步执行 executor && 1 层微任务后执行 rejectThenable.then && 1 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// new $Promise(resolve => resolve(rejectThenable)).catch(result => log(result));
// contrast();
// 打印结果：0, 'rejectThenable', 1, 30, 2, 10, 3, 4, 5, 6, 100

// log(new $Promise(resolve => setTimeout(resolve))); 
// 同步执行 executor && 1 个宏任务后改变：promise<fulfilled,undefined>  
// 验证：
// new $Promise(resolve => setTimeout(resolve)).then(() => log(10));
// contrast();
// 打印结果：0, 1, 2, 3, 4, 5, 6, 10, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 4、执行 reject

// log(new $Promise((resolve, reject) => reject(10))); 
// 同步执行 executor && 同步改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// new Promise((resolve, reject) => reject(10)).catch(result => log(result));
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise((resolve, reject) => reject($Promise.resolve(10)))); 
// 同步执行 executor && 同步改变：promise<rejected,promise> && 异步报错：Uncaught $promise
// 验证：
// new $Promise((resolve, reject) => reject($Promise.resolve(10))).catch(() => log(10));  
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100 

// log(new $Promise((resolve, reject) => reject($Promise.reject(10)))); 
// 同步执行 executor && 同步改变：promise<rejected,promise> && 异步报错：Uncaught 10 和 Uncaught $promise
// 验证：
// new $Promise((resolve, reject) => reject($Promise.reject(10))).catch(() => log(10));  
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise((resolve, reject) => reject(resolveThenable)));
// 同步执行 executor && 不执行 resolveThenable.then  && 同步改变：promise<rejected,resolveThenable> && 异步报错：Uncaught resolveThenable
// 验证：
// new $Promise((resolve, reject) => reject(resolveThenable)).catch(() => log(10));
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise((resolve, reject) => reject(rejectThenable)));
// 同步执行 executor && 不执行 rejectThenable.then && 同步改变：promise<rejected,rejectThenable> && 异步报错：Uncaught rejectThenable
// 验证：
// new Promise((resolve, reject) => reject(rejectThenable)).catch(() => log(10));
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise((resolve, reject) => setTimeout(reject))); 
// 同步执行 executor && 1 个宏任务后改变：promise<rejected,undefined> && 异步报错：Uncaught undefined  
// 验证：
// new $Promise((resolve, reject) => setTimeout(reject)).catch(() => log(10));
// contrast();
// 打印结果：0, 1, 2, 3, 4, 5, 6, 10, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 5、抛出错误

// log(new $Promise(() => { throw Error('test'); }));
// 同步执行 executor && 同步改变：promise<rejected,error> && 异步报错：Uncaught Error: test
// 验证：
// new $Promise(() => { throw Error('test'); }).catch(() => log(10));
// contrast();
// 打印结果：0, 10, 1, 2, 3, 4, 5, 6, 100

// log(new $Promise(() => { setTimeout(() => { throw Error('test'); }) }));
// 同步执行 executor && 不改变: promise<pending,undefined> && 异步报错 Uncaught Error: test
// 验证：
// new $Promise(() => { setTimeout(() => { throw Error('test'); }) }).catch(() => log(10));
// contrast();
// 打印结果：0, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 6、混合执行

// log(new $Promise((resolve, reject) => { resolve(); reject(); throw Error('test'); }));
// 同步执行 executor && 同步改变：promise<fulfilled,undefined> 

// log(new $Promise((resolve, reject) => { reject(); throw Error('test'); resolve(); }));
// 同步执行 executor && 同步改变：promise<rejected,undefined> && 异步报错：Uncaught undefined

// log(new $Promise((resolve, reject) => { throw Error('test'); resolve(); reject(); }));
// 同步执行 executor && 同步改变：promise<rejected,error> && 异步报错：Uncaught Error: test

// --------------------------------------------------------------------------------------------------------------------------------

// * 7、循环引用

// const promise = new $Promise((resolve) => setTimeout(() => resolve(promise)));
// log(promise);
// 同步执行 executor && 1 个宏任务后改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: Chaining cycle detected for promise
// 验证：
// const promise = new $Promise((resolve) => setTimeout(() => resolve(promise)));
// promise.catch(() => log(10));
// contrast();
// 打印结果：0, 1, 2, 3, 4, 5, 6, 10, 100

// ********************************************************************************************************************************

// * 二、then 测试

// 1、执行非函数的 executor 
// 2、执行返回值为非 thenable 的 executor 
// 3、执行返回值为 thenable 的 executor 
// 4、循环引用

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、执行非函数的 executor 

// log($Promise.resolve(10).then());
// 1 层微任务后改变：promise<fulfilled,10>  
// 验证：
// $Promise.resolve(10).then().then(() => log(10));
// contrast();
// 打印结果：0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.reject(10).then());
// 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.reject(10).then().catch(() => log(10));
// contrast();
// 打印结果：0, 1, 10, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、执行返回值为非 thenable 的 executor 

// log($Promise.resolve(10).then(result => result));
// 1 层微任务后执行 executor && 1 层微任务后改变：promise<fulfilled,10>  
// 验证：
// $Promise.resolve(10).then(result => result).then(() => log(10));
// contrast();
// 打印结果：0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.reject(10).then(null, result => result));
// 1 层微任务后执行 executor && 1 层微任务后改变：promise<fulfilled,10>  
// 验证：
// $Promise.reject(10).then(null, result => result).then(() => log(10));
// contrast();
// 打印结果：0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.resolve().then(() => { throw Error('test') }))
// 1 层微任务后执行 executor && 1 层微任务后改变：promise<rejected,error>  && 异步报错：Uncaught Error: test
// 验证：
// $Promise.resolve().then(() => { throw Error() }).catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、执行返回值为 thenable 的 executor 

// log($Promise.resolve().then(() => $Promise.resolve()));
// 1 层微任务后执行 executor && 3 层微任务后改变：promise<fulfilled,undefined>
// 验证：
// $Promise.resolve().then(() => $Promise.resolve()).then(() => log(10));
// contrast();
// 打印: 0, 1, 2, 3, 10, 4, 5, 6, 100

// log($Promise.resolve().then(() => $Promise.reject()));
// 1 层微任务后执行 executor && 3 层微任务后改变：promise<rejected,undefined> && 异步报错：Uncaught undefined
// 验证：
// $Promise.resolve().then(() => $Promise.reject()).catch(() => log(10));
// contrast();
// 打印: 0, 1, 2, 3, 10, 4, 5, 6, 100

// log($Promise.resolve().then(() => resolveThenable));
// 1 层微任务后执行 executor && 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,20>
// 验证：
// $Promise.resolve().then(() => resolveThenable).then(() => log(10));
// contrast();
// 打印: 0, 1, 'resolveThenable', 2, 10, 3, 4, 5, 6, 100

// log($Promise.resolve().then(() => rejectThenable));
// 1 层微任务后执行 executor && 1 层微任务后执行 rejectThenable.then ，2 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// $Promise.resolve().then(() => rejectThenable).catch(() => log(10));
// contrast();
// 打印: 0, 1, 'rejectThenable', 2, 10, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 4、循环引用

// const promise = $Promise.resolve().then(() => promise);
// log(promise); 
// 1 层微任务后执行 executor && 1 层微任务后改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: Chaining cycle detected for promise
// 验证：
// const promise = $Promise.resolve().then(() => promise);
// promise.catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// ********************************************************************************************************************************

// * 三、catch 测试

// 等同于 then(null, executor)

// ********************************************************************************************************************************

// * 四、finally 测试

// 1、执行非函数的 executor
// 2、执行返回值为非 rejectThenable 的 executor
// 3、执行返回值为 rejectThenable 的 executor
// 4、循环引用

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、执行非函数的 executor 

// log($Promise.resolve(10).finally());
// 1 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.resolve(10).finally().then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.reject(10).finally());
// 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.reject(10).finally().catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、执行返回值为非 rejectThenable 的 executor ($promise 和 thenable 的处理方式有差异)

// log($Promise.resolve(10).finally(() => {}));
// 1 层微任务后执行 executor && 3 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.resolve().finally(() => log(10)).then(() => log(15));
// contrast();
// 打印: 0, 10, 1, 2, 3, 15, 4, 5, 6, 100

// log($Promise.resolve(10).finally(() => $Promise.resolve()));
// 1 层微任务后执行 executor && 3 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.resolve().finally(() => $Promise.resolve()).then(() => log(10));
// contrast();
// 打印: 0, 1, 2, 3, 10, 4, 5, 6, 100 

// log($Promise.resolve(10).finally(() => resolveThenable));
// 1 层微任务后执行 executor && 2 层微任务后执行 resolveThenable.then && 4 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.resolve().finally(() => resolveThenable).then(() => log(10));
// contrast();
// 打印: 0, 1, 'resolveThenable', 2, 3, 4, 10, 5, 6, 100 

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、执行返回值为 rejectThenable 的 executor ($promise 和 thenable 的处理方式有差异)

// log($Promise.resolve().finally(() => $Promise.reject(10)));
// 1 层微任务后执行 executor && 3 层微任务后改变：promise<rejected,10>
// 验证：
// $Promise.resolve().finally(() => $Promise.reject(10)).catch(() => log(10));
// contrast();
// 打印: 0, 1, 2, 3, 10, 4, 5, 6, 100 

// log($Promise.resolve().finally(() => rejectThenable));
// 1 层微任务后执行 executor && 2 层微任务后执行 rejectThenable.then && 4 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// $Promise.resolve().finally(() => rejectThenable).catch(() => log(10));
// contrast();
// 打印: 0, 1, 'rejectThenable', 2, 3, 4, 10, 5, 6, 100 

// --------------------------------------------------------------------------------------------------------------------------------

// * 4、循环引用

// const promise = $Promise.resolve().finally(() => promise);
// log(promise); 
// 1 层微任务后执行 executor && 不改变：promise<pending,undefined> 

// ********************************************************************************************************************************

// * 四、resolve 测试

// 1、传递非 thenable
// 2、传递 $promise
// 3、传递 thenable（非 $promise）
// 4、同引用

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递非 thenable

// log($Promise.resolve(10));
// 同步改变：promise<fulfilled,10> 
// 验证：
// $Promise.resolve(10).then((result) => log(result));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、传递 $promise

// log($Promise.resolve($Promise.resolve(10)));  
// 同步改变：promise<fulfilled,10>
// 验证：
// $Promise.resolve($Promise.resolve(10)).then((result) => log(result));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// log($Promise.resolve($Promise.reject(10)));  
// 同步改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.resolve($Promise.reject(10)).catch((result) => log(result));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、传递 thenable（非 $promise）

// log($Promise.resolve(resolveThenable));  
// 1 层微任务后执行 resolveThenable.then && 一层微任务后改变：promise<fulfilled,20>
// 验证：
// $Promise.resolve(resolveThenable).then((result) => log(result));
// contrast();
// 打印: 0, 'resolveThenable', 1, 20, 2, 3, 4, 5, 6, 100 

// log($Promise.resolve(rejectThenable));  
// 1 层微任务后执行 rejectThenable.then && 1 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// $Promise.resolve(rejectThenable).catch((result) => log(result));
// contrast();
// 打印: 0, 'rejectThenable', 1, 30, 2, 3, 4, 5, 6, 100 

// --------------------------------------------------------------------------------------------------------------------------------

// * 4、同引用

// const promise1 = $Promise.resolve(10);
// const promise2 = $Promise.resolve(promise1);
// log(promise1 === promise2); // true

// const promise1 = $Promise.reject(10);
// const promise2 = $Promise.resolve(promise1);
// log(promise1 === promise2); // true

// ********************************************************************************************************************************

// * 五、reject 测试

// 1、传递任意值

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递任意值

// log($Promise.reject(10));
// 同步改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.reject(10).catch((result) => log(result));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// log($Promise.reject($Promise.resolve(10)));
// 同步改变：promise<rejected,promise> && 异步报错：Uncaught $promise
// 验证：
// $Promise.reject($Promise.resolve(10)).catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// log($Promise.reject($Promise.reject(10)));
// 同步改变：promise<rejected,promise> && 异步报错：Uncaught 10 和 Uncaught $promise
// 验证：
// $Promise.reject($Promise.reject(10)).catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// log($Promise.reject(resolveThenable));
// 不执行 resolveThenable.then && 同步改变：promise<rejected,resolveThenable> && 异步报错：Uncaught resolveThenable
// 验证：
// $Promise.reject(resolveThenable).catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100 

// log($Promise.reject(rejectThenable));
// 不执行 rejectThenable.then && 同步改变：promise<rejected,rejectThenable> && 异步报错：Uncaught rejectThenable
// 验证：
// $Promise.reject(rejectThenable).catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// ********************************************************************************************************************************

// * 六、all 测试

// 1、传递非 iterable
// 2、传递空的 iterable
// 3、传递非空 iterable

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递非 iterable

// log($Promise.all());
// 同步改变：promise<rejected,typeError> && 异步报错：Uncaught TypeError: promises is not iterable
// 验证：
// $Promise.all().catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、传递空的 iterable

// log($Promise.all([]));
// 同步改变：promise<fulfilled,[]> 
// 验证：
// $Promise.all([]).then(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、传递非空 iterable

// log($Promise.all([10]));
// 1 层微任务后改变：promise<fulfilled,[10]>
// 验证：
// $Promise.all([10]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.all([$Promise.resolve(10)]));
// 1 层微任务后改变：promise<fulfilled,[10]>
// 验证：
// $Promise.all([$Promise.resolve(10)]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.all([$Promise.reject(10)]));
// 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.all([$Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.all([resolveThenable]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,[20]>
// 验证：
// $Promise.all([resolveThenable]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.all([rejectThenable]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// $Promise.all([rejectThenable]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.all([resolveThenable, $Promise.resolve(15), 10]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,[20, 15, 10]>
// 验证：
// $Promise.all([resolveThenable, $Promise.resolve(15), 10]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.all([rejectThenable, $Promise.reject(10)]));
// 1 层微任务后执行 rejectThenable.then && 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.all([rejectThenable, $Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 10, 2, 3, 4, 5, 6, 100

// ********************************************************************************************************************************

// * 七、allSettled 测试

// 1、传递非 iterable
// 2、传递空的 iterable
// 3、传递非空 iterable

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递非 iterable

// log($Promise.allSettled());
// 同步改变：promise<rejected,typeError> && 异步报错：Uncaught TypeError: promises is not iterable
// 验证：
// $Promise.allSettled().catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、传递空的 iterable

// log($Promise.allSettled([]));
// 同步改变：promise<fulfilled,[]> 
// 验证：
// $Promise.allSettled([]).then(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、传递非空 iterable

// log($Promise.allSettled([10]));
// 1 层微任务后改变：promise<fulfilled,[{status: 'fulfilled', value: 10}]>
// 验证：
// $Promise.allSettled([10]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.allSettled([$Promise.resolve(10)]));
// 1 层微任务后改变：promise<fulfilled,[{status: 'fulfilled', value: 10}]>
// 验证：
// $Promise.allSettled([$Promise.resolve(10)]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.allSettled([$Promise.reject(10)]));
// 1 层微任务后改变：promise<fulfilled,[{status: 'rejected', reason: 10}]>
// 验证：
// $Promise.allSettled([$Promise.reject(10)]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.allSettled([resolveThenable]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,[{status: 'fulfilled', value: 20}]>
// 验证：
// $Promise.allSettled([resolveThenable]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.allSettled([rejectThenable]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<fulfilled,[{status: 'rejected', reason: 30}]>
// 验证：
// $Promise.allSettled([rejectThenable]).then(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.allSettled([resolveThenable, $Promise.resolve(15), 10]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,[{…20}, {…15}, {…10}]>
// 验证：
// $Promise.allSettled([resolveThenable, $Promise.resolve(15), 10]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.allSettled([rejectThenable, $Promise.reject(10)]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<fulfilled,[{…30}, {…10}]>
// 验证：
// $Promise.allSettled([rejectThenable, $Promise.reject(10)]).then(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100

// ********************************************************************************************************************************

// * 八、race 测试

// 1、传递非 iterable
// 2、传递空的 iterable
// 3、传递非空 iterable

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递非 iterable

// log($Promise.race());
// 同步改变：promise<rejected,typeError> && 异步报错：Uncaught TypeError: promises is not iterable
// 验证：
// $Promise.race().catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、传递空的 iterable

// log($Promise.race([]));
// 不改变：promise<pending,undefined> 
// 验证：
// $Promise.race([]).finally(() => log(10));
// contrast();
// 打印: 0, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、传递非空 iterable

// log($Promise.race([10]));
// 1 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.race([10]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.race([$Promise.resolve(10)]));
// 1 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.race([$Promise.resolve(10)]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.race([$Promise.reject(10)]));
// 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.race([$Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.race([resolveThenable]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,20>
// 验证：
// $Promise.race([resolveThenable]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.race([rejectThenable]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<rejected,30> && 异步报错：Uncaught 30
// 验证：
// $Promise.race([rejectThenable]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.race([resolveThenable, $Promise.resolve(15), 10]));
// 1 层微任务后执行 resolveThenable.then && 1 层微任务后改变：promise<fulfilled,15>
// 验证：
// $Promise.race([resolveThenable, $Promise.resolve(15), 10]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.race([rejectThenable, $Promise.reject(10)]));
// 1 层微任务后执行 rejectThenable.then && 1 层微任务后改变：promise<rejected,10> && 异步报错：Uncaught 10
// 验证：
// $Promise.race([rejectThenable, $Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 10, 2, 3, 4, 5, 6, 100

// ********************************************************************************************************************************

// * 八、any 测试

// 1、传递非 iterable
// 2、传递空的 iterable
// 3、传递非空 iterable

// --------------------------------------------------------------------------------------------------------------------------------

// * 1、传递非 iterable

// log($Promise.any());
// 同步改变：promise<rejected,typeError> && 异步报错：Uncaught TypeError: promises is not iterable
// 验证：
// $Promise.any().catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 2、传递空的 iterable

// log($Promise.any([]));
// 不改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: All promises were rejected
// 验证：
// $Promise.any([]).catch(() => log(10));
// contrast();
// 打印: 0, 10, 1, 2, 3, 4, 5, 6, 100

// --------------------------------------------------------------------------------------------------------------------------------

// * 3、传递非空 iterable

// log($Promise.any([10]));
// 1 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.any([10]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.any([$Promise.resolve(10)]));
// 1 层微任务后改变：promise<fulfilled,10>
// 验证：
// $Promise.any([$Promise.resolve(10)]).then(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.any([$Promise.reject(10)]));
// 1 层微任务后改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: All promises were rejected
// 验证：
// $Promise.any([$Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.any([resolveThenable]));
// 1 层微任务后执行 resolveThenable.then && 2 层微任务后改变：promise<fulfilled,20>
// 验证：
// $Promise.any([resolveThenable]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.any([rejectThenable]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: All promises were rejected
// 验证：
// $Promise.any([rejectThenable]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100

// log($Promise.any([resolveThenable, $Promise.resolve(15), 10]));
// 1 层微任务后执行 resolveThenable.then && 1 层微任务后改变：promise<fulfilled,15>
// 验证：
// $Promise.any([resolveThenable, $Promise.resolve(15), 10]).then(() => log(10));
// contrast();
// 打印: 0, 'resolveThenable', 1, 10, 2, 3, 4, 5, 6, 100

// log($Promise.any([rejectThenable, $Promise.reject(10)]));
// 1 层微任务后执行 rejectThenable.then && 2 层微任务后改变：promise<rejected,$promiseError> && 异步报错：Uncaught $PromiseError: All promises were rejected
// 验证：
// $Promise.any([rejectThenable, $Promise.reject(10)]).catch(() => log(10));
// contrast();
// 打印: 0, 'rejectThenable', 1, 2, 10, 3, 4, 5, 6, 100
