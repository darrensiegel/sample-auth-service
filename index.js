'use strict';

var amqp = require('amqplib/callback_api');

var mysql = require("mysql");

// First you need to create a connection to the db
var con = mysql.createConnection({
  host: "mysql",
  user: "root",
  password: "password",
  database: "authorization"
});

con.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');

});

var hasAuthorization = function(authRequest) {

  var { actor, action, item } = authRequest;

  console.log(actor);
  console.log(action);
  console.log(item);

  return new Promise(function(resolve, reject) {
    con.query("SELECT Count(*) as recordCount FROM authorization WHERE actor_id = ? and action_id = ? and item_id = ?",
      [actor, action, item], function(err,rows){
        if(err) {
            reject(err);
            return;
        }
        resolve(rows[0].recordCount === 1 ? true : false);
      });
    });
}

amqp.connect('amqp://my-rabbit', function(err, conn) {
  conn.createChannel(function(err, ch) {
    var q = 'auth-rpc-queue';

    ch.assertQueue(q, {durable: false});
    ch.prefetch(1);
    console.log(' [x] Awaiting RPC requests');
    ch.consume(q, function reply(msg) {

      var authRequest = JSON.parse(msg.content.toString());

      console.log(authRequest);

      hasAuthorization(authRequest)
        .then(result => {

          let reply = { hasAuthorization: result };

          ch.sendToQueue(msg.properties.replyTo,
            new Buffer(JSON.stringify(reply)),
            {correlationId: msg.properties.correlationId});

          ch.ack(msg);
        })
        .catch(err => console.log(err));


    });
  });
});
