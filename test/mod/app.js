define('mod/app', function(require, exports) {

    const env = require('mod/env');
    exports.say = function() {
        console.log('i am app');
        return env;
    }
})