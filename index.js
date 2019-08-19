const vm = require("vm");
const fs = require('fs');
const path = require('path');

module.exports = class {
    constructor() {
        this.cache = {}
    }   

    // 代理给模块用的require
    require(id, __path) {
        let mod = this.cache[id];
		  // 为了保证require一定返回是模块实例，不存在可以先初始化，加载后再重置
		if(!mod) {
            const objExports = {
                __call_cache: []
            };
            const modObj = function(...args) {
                const thisExports = objExports;
                if(typeof thisExports == 'function') {
                    return thisExports(...args);
                }
                else {
                    const p = createProxyModule({
                        exports: {
                            args: args
                        }
                    });
                    thisExports.__call_cache.push(p);
                    return p;
                }
            };
            modObj.exports = objExports; 

			// 返回的是一个mod代理，访问它的属性等同于访问其exports下的属性，这是避免模块重置了module.exports导致属性不可用
			this.cache[id] = mod = createProxyModule(modObj);
            if(__path) this.cache[__path] = mod;
		}
        return mod;
        
        function createProxyModule(obj) {
            return new Proxy(obj, {
                get: function (target, key, receiver) {  
                    // 其它属性的访问都代理到exports下           
                    if(typeof key == 'string' && key != 'exports' && key != 'sandbox') {
                        return Reflect.get(target['exports'], key, target['exports']);
                    }
                    return Reflect.get(target, key, receiver);
                },
                set: function (target, key, value, receiver) {  
                    // 其它属性的访问都代理到exports下           
                    if(typeof key == 'string' && key != 'exports' && key != 'sandbox') {
                        return Reflect.set(target['exports'], key, value, target['exports']);
                    }
                    return Reflect.set(target, key, value, receiver);
                }
            });
        }
    }
    // 加载单个模块文件或目录
    // p 加载的文件或目录
    // env需要指定的一些环境变量
    // options 配置，如果有error函数，则出错回调它
    load(p, env, options) {
        const stat = fs.statSync(p);
        if(stat.isDirectory()) {
            const files = fs.readdirSync(p);
            for(let f of files) {
                this.load(path.join(p, f), env, options);
            }
            return;
        }
        else if(stat.isFile()) {
            if(this.cache[p]) return this.cache[p];            

            // 代理模块中的`require` 让它是访问我们缓存中的模块代理
            const self = this;
            const _req = (id, __path) => {
                return self.require(id, __path);
            };
            const sandbox = Object.assign(env||{}, {
                // 定认cmd的define函数，代理
                define: (id, deps, fun) => {
                    if(typeof id == 'function') {
                        fun = id;
                        id = p;
                    }
                    else if(typeof deps == 'function') {
                        fun = deps;
                        deps = null;
                    }
                    const mod = _req(id, p);
                    mod.sandbox = sandbox;
                    try {
                        const exp = fun(_req, mod.exports, mod);
                        if(exp) {                            
                            if(typeof exp == 'function') {
                                if(mod.exports.__call_cache.length) {
                                    for(let p of mod.exports.__call_cache) {
                                        p.exports = exp(...p.args);
                                    }
                                }
                            }
                            mod.exports = exp;
                        }
                    }
                    catch(e) {
                        if(options && options.error) options.error(e, {id: id, path: p});
                        else {
                            console.log(e);  
                        }                      
                    }
                }
            });  
            sandbox.define.cmd = {};           

            return this.loadModule(p, sandbox, options);
        }
    }

    loadModule(p, sandbox, options) {
        // 读取模块代码
        const content = fs.readFileSync(p, 'utf8');
        const modScript = new vm.Script(content, {
            filename: p
        });

        const context = vm.createContext(sandbox);
        modScript.runInContext(context);
        console.log(`load module: ${p}`);

        // 如果需要watch，则有修改则重新载入
        if(options.watch && !sandbox.watcher) {
            const self = this;
            sandbox.watcher = fs.watch(p, (eventType, filename) => {
                if(eventType == 'change') {
                    console.log(`file change, reload: ${filename}`);
                    self.loadModule(p, sandbox, options);
                }
            });
        }
        return this.require(p);
    }
}