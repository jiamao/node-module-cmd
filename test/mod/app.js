define('mod/app', function(require, exports) {

    const env = require('mod/env');
    exports.say = function() {
        return env;
    }
})