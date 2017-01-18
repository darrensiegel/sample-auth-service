'use strict';

var amqp = require('amqplib/callback_api');
var mysql = require("mysql");

// Application entry point
var init = function() {

  var messageHandlers = {
    hasAuthorization,
    getActors,
    getItems,
    getActions
  };

  // Stand up the database connection, then the message broker
  initDatabase()
    .then(conn => initBroker(dispatcher.bind(undefined, messageHandlers, conn)))
    .then(result => console.log("auth-service up and running"))
    .catch(err => console.log(err));
}

// Message handler for messages received from the broker
var dispatcher = function(handlers, conn, msg, reply) {

  let handler = handlers[msg.type];

  if (handler !== undefined) {
    handler(conn, msg)
      .then(result => reply(result))
      .catch(err => console.log(err));
  } else {
    console.log("Unknown message type: " + msg.type);
  }

}

// Initialize the database connection
var initDatabase = function(initialResolve) {

  let con = mysql.createConnection({
    host: "mysql",
    user: "root",
    password: "password",
    database: "authorization"
  });

  return new Promise(function(resolve, reject) {
    con.connect(function(err){
      if (err) {

        setTimeout(() => initDatabase(initialResolve === undefined ? resolve : initialResolve), 100);

      } else {
        if (initialResolve !== undefined) {
          initialResolve(con);
        } else {
          resolve(con);
        }
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
          resolve({ hasAuthorization: (rows[0].recordCount === 1 ? true : false)});
        }
      });
    });
}

var getAllFromTable = function(table, con) {

  return new Promise(function(resolve, reject) {
    con.query("SELECT * FROM " + table + " ORDER BY name",
      function(err,rows){
        if (err) {
          reject(err);
        } else {
          resolve({rows});
        }
      });
    });
}

var getActors = getAllFromTable.bind(undefined, "actor");
var getActions = getAllFromTable.bind(undefined, "action");
var getItems = getAllFromTable.bind(undefined, "item");


// Initialize the broker, giving it the message handler that we
// want to use
var initBroker = function(onMessage, initialResolve) {

  return new Promise(function(resolve, reject) {

    amqp.connect('amqp://broker', function(err, conn) {

      if (err) {
        setTimeout(() => initBroker(onMessage, initialResolve === undefined ? resolve : initialResolve), 100);
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

        if (initialResolve !== undefined) {
          initialResolve(true);
        } else {
          resolve(true);
        }
      });
    });
  });

}

init();
