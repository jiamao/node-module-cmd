const path = require('path');
const loader = new (require('../index'))();

loader.load(path.join(__dirname, 'mod'), {}, {
    error: (e)=>{
        console.error(e);
    }
}); // load directory

//loader.load(path.join(__dirname, 'mod/app.js'));
//loader.load(path.join(__dirname, 'mod/env.js'));

const app = loader.require('mod/app');

console.log(loader.cache)

console.log(app.say());