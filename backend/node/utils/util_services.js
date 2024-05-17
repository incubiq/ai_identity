
/*
 *       Misc utils
 */

    const consoleLog = function(_msg) {
        if(!_msg) {
            console.log("\r\n");    
        }
        else {
            let _date=new Date(new Date().toUTCString());
            let _strDate=_date.toString();
            console.log(_strDate.substring(0, _strDate.indexOf('GMT'))+ " - "+_msg);        
        }
    }

    // to avoid being stuck in a request that takes too long to reply
    const replyFast = async (_waitTimeMs, fn, ...args) => {    
        try {
            let p=new Promise(function(resolve, reject) {
                setTimeout(function(){
                    reject('timeout');
                },_waitTimeMs)

                fn(...args)
                    .then(function(data){
                        resolve(data);
                    })
                    .catch(function(err){
                        reject(err);
                    })                
            });
            return p;
        }
        catch (err) {
            throw err
        }
    }
    

module.exports = {

// general utils
    consoleLog,
    replyFast
}