
# 在nodejs中加载cmd模块

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/module-cmd.svg?style=flat-square
[npm-url]: https://npmjs.org/package/module-cmd
[download-image]: https://img.shields.io/npm/dm/module-cmd.svg?style=flat-square
[download-url]: https://npmjs.org/package/module-cmd

# Install
```js
npm install module-cmd --save
```

# Usage

 前端cmd模块
```js
// 模块 /data/web/mod/env.js
define('mod/env', function(require, exports, module) {
    exports.id = '1234';
})

// 模块 /data/web/mod/app.js
define('mod/app', function(require, exports, module) {
    const env = require('mod/env');
    
    exports.say = function() {
        console.log(env.id);
    }
})
```

使用前端模块
```js
const cmd = require('module-cmd');
const loader = new cmd();

// 加载整个目录
loader.load('/data/web/mod');
// 加载单个模块
//loader.load('/data/web/mod/env.js');

// 基于id获取模块
const app = loader.require('mod/app');
app.say();
```
