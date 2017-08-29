'use strict';

const Hapi = require('hapi');
const MySQL = require('mysql');
const Joi = require('joi');
const Bcrypt = require('bcrypt');
// Create a server with a host and port
const server = new Hapi.Server();


const connection = MySQL.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'techno',
    database: 'domotique'
});




server.connection({
    host: 'localhost',
    port: 8000
});
connection.connect();

server.route({
    method: 'GET',
    path: '/helloworld',
    handler: function (request, reply) {
        return reply('hello world');
    }
});

// TOUTES LES SONDES
server.route({
    method: 'GET',
    path: '/sondes',
    handler: function (request, reply) {

        connection.query('SELECT * FROM sonde', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            reply(results);
        });

    }
});

// SONDE PAR ID
server.route({
    method: 'GET',
    path: '/sonde/{id}',
    handler: function (request, reply) {
        const id = request.params.id;

        connection.query('SELECT * FROM sonde WHERE id = "' + id + '"', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            reply(results);
        });

    },
    config: {
        validate: {
            params: {
                id: Joi.number().integer()
            }
        }
    }
});

// LES DATAS DES SONDES
server.route({
    method: 'GET',
    path: '/sonde/{id}/datas/{code}',
    handler: function (request, reply) {
        const id = request.params.id;
        const code = request.params.code;

        var codeOk = false;

        // ON VERIFIE QUE LE CODE DEMANDER EXISTE
        connection.query('SELECT code FROM sonde_code WHERE code = "' + code + '"', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            if (results.length > 0){
                codeOk = true;
            } else {
                reply('Code '+code+' not exist');
            }
        });

        // ON VERIFIE LA NATURE DE LA SONDE
        connection.query('SELECT sensor_id,type FROM sonde WHERE id = "' + id + '"', function (error, results, fields) {
            if (error) {
                throw error;
            }
            else if (codeOk){
                if (results[0].type === 'FIL' && code === 'TC'){ // les sondes filaire ne remontent que la temperation en Celsius
                    connection.query('SELECT * FROM temperature WHERE sensor_id = "'+results[0].sensor_id+'" ORDER BY date DESC LIMIT 0,100', function (error, temperature, fields) {
                        if (error) throw error;
                        reply(temperature);
                    });
                } else if (results[0].type === 'HF'){
                    connection.query('SELECT * FROM sonde_datas WHERE id_sonde = "'+results[0].sensor_id+'" AND code = "'+code+'" ORDER BY date DESC LIMIT 0,100', function (error, datas, fields) {
                        if (error) throw error;
                        reply(datas);
                    });
                }
            }
        });

        

    },
    config: {
        validate: {
            params: {
                id: Joi.number().integer(),
                code: Joi.string().insensitive().uppercase()
            }
        }
    }
});

server.route({
    method: 'POST',
    path: '/signup',

    handler: function (request, reply) {

        const username = request.payload.username;
        const email = request.payload.email;
        const password = request.payload.password;

        var salt = Bcrypt.genSaltSync();
        var encryptedPassword = Bcrypt.hashSync(password, salt);
     
        var orgPassword = Bcrypt.compareSync(password, encryptedPassword);

        connection.query('INSERT INTO users (username,email,password) VALUES ("' + username + '","' + email + '","' + encryptedPassword + '")', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            reply(results);
        });

    },
    config: {
        validate: {
            payload: {
                username: Joi.string().alphanum().min(3).max(30).required(),
                email: Joi.string().email(),
                password: Joi.string().regex(/^[a-zA-Z0-9]{8,30}$/)
            }
        }

    }
});


server.route({
    method: 'POST',
    path: '/sendMessage',
    handler: function (request, reply) {

        const uid = request.payload.uid;
        const message = request.payload.message;
       
        connection.query('INSERT INTO messages (message,uid_fk) VALUES ("' + message + '","' + uid + '")', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            reply(results);
        });

    },
    config: {
        validate: {
            payload: {
                uid: Joi.number().integer(),
                message: [Joi.string(), Joi.number()]
            }
        }

    }
});

server.route({
    method: 'POST',
    path: '/messages',

    handler: function (request, reply) {

        const uid = request.payload.uid;
        console.log(uid);

        connection.query('SELECT * FROM messages WHERE uid_fk = "' + uid + '"', function (error, results, fields) {
            if (error) throw error;
            console.log(results);
            reply(results);
        });

    },
    config: {
        validate: {
            payload: {
                uid: Joi.number().integer()
            }
        }

    }
});

server.route({
    method: 'DELETE',
    path: '/message/{uid}/{mid}',
    handler: function (request, reply) {
        const uid = request.params.uid;
        const mid = request.params.mid;

        console.log(uid + "---" + mid);

        connection.query('DELETE FROM messages WHERE uid_fk = "' + uid + '"AND mid = "' + mid + '"', function (error, result, fields) {
            if (error) throw error;

            if (result.affectedRows) {
                reply(true);
            } else {
                reply(false);
            }

        });
    },
    config: {
        validate: {
            params: {
                uid: Joi.number().integer(),
                mid: Joi.number().integer()
            }
        }

    }
});


// Start the server
server.start((err) => {

    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});
