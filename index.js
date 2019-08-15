const vm = require("vm");
const fs = require('fs');
const path = require('path');

module.exports = class {
    constructor() {
        this.cache = {}
    }

    // 代理给模块用的require
    require(id) {
        let mod = this.cache[id];
		  // 为了保证require一定返回是模块实例，不存在可以先初始化，加载后再重置
		if(!mod) {
			let modObj = {"exports": {}}; 
			// 返回的是一个mod代理，访问它的属性等同于访问其exports下的属性，这是避免模块重置了module.exports导致属性不可用
			this.cache[id] = mod = new Proxy(modObj, {
				get: function (target, key, receiver) {  
					// 其它属性的访问都代理到exports下           
					if(typeof key == 'string' && key != 'exports') {
						return Reflect.get(target['exports'], key, target['exports']);
					}
					return Reflect.get(target, key, receiver);
				},
				set: function (target, key, value, receiver) {  
					// 其它属性的访问都代理到exports下           
					if(typeof key == 'string' && key != 'exports') {
						return Reflect.set(target['exports'], key, value, target['exports']);
					}
					return Reflect.set(target, key, value, receiver);
				}
			});
		}
		return mod;
    }
    // 加载单个模块文件或目录
    // p 加载的文件或目录
    // env需要指定的一些环境变量
    load(p, env) {
        const stat = fs.statSync(p);
        if(stat.isDirectory()) {
            const files = fs.readdirSync(p);
            for(let f of files) {
                this.load(path.join(p, f), env);
            }
            return;
        }
        else if(stat.isFile()) {
            const content = fs.readFileSync(p, 'utf8');
            const modScript = new vm.Script(content, {
                filename: p
            });
            const self = this;
            const _req = (id) => {
                return self.require(id);
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
                    const mod = _req(id);
                    try {
                        const exp = fun(_req, mod.exports, mod);
                        if(exp && typeof exp == 'object') mod.exports = exp;
                    }
                    catch(e) {
                        console.log(e);                        
                    }
                }
            });  

            const context = vm.createContext(sandbox);
            modScript.runInContext(context);
        }
    }
}