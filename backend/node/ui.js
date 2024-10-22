const path = require('path');   
const client = require('./client');

/*
 *       UIs
 */

    const pageEntity = function(req, res, next) {

        client.async_didUtil_getEntities()
        .then(aE => {
            res.sendFile(path.join(__dirname, '../static_website', 'entities.html'));    
        })
        .catch(err => {
            return;
        })
    }

    module.exports = {
        pageEntity
    }