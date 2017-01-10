'use strict';

var amqp = require('amqplib/callback_api');
var mysql = require("mysql");


// Application entry point
var init = function() {

  // Stand up the database connection, then the message broker
  initDatabase()
    .then(conn => initBroker(onMessage.bind(undefined, conn)))
    .then(result => console.log("auth-service up and running"))
    .catch(err => console.log(err));
}

// Message handler for messages received from the broker
var onMessage = function(conn, msg, reply) {

  let authRequest = msg;

  hasAuthorization(conn, authRequest)
    .then(result => {
      reply({ hasAuthorization: result });
    })
    .catch(err => console.log(err));
}

// Initialize the database connection
var initDatabase = function() {

  let con = mysql.createConnection({
    host: "mysql",
    user: "root",
    password: "password",
    database: "authorization"
  });

  return new Promise(function(resolve, reject) {
    con.connect(function(err){
      if (err) {
        reject(err);
      } else {
        resolve(con);
      }
    });
  });
}

// Performs the authorization check
var hasAuthorization = function(con, authRequest) {

  var { actor, action, item } = authRequest;

  return new Promise(function(resolve, reject) {
    con.query("SELECT Count(*) as recordCount FROM authorization WHERE actor_id = ? and action_id = ? and item_id = ?",
      [actor, action, item], function(err,rows){
        if (err) {
          reject(err);
        } else {
          resolve(rows[0].recordCount === 1 ? true : false);
        }
      });
    });
}

// Initialize the broker, giving it the message handler that we
// want to use
var initBroker = function(onMessage) {

  return new Promise(function(resolve, reject) {

    amqp.connect('amqp://my-rabbit', function(err, conn) {

      if (err) {
        reject(err);
        return;
      }

      conn.createChannel(function(err, ch) {

        if (err) {
          reject(err);
          return;
        }

        var q = 'auth-rpc-queue';

        ch.assertQueue(q, {durable: false});
        ch.prefetch(1);
        ch.consume(q, msg => {

          var reply = (replyMessage => {
            ch.sendToQueue(msg.properties.replyTo,
              new Buffer(JSON.stringify(replyMessage)),
              {correlationId: msg.properties.correlationId});

            ch.ack(msg);
          });

          onMessage(JSON.parse(msg.content.toString()), reply)
        });

        resolve(true);
      });
    });
  });

}

init();
