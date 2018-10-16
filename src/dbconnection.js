var mysql = require('mysql');

// connect to the db
var dbConnectionInfo = {
    host: "localhost",
    port: "3306",
    user: "root",
    password: "Root@123",
    connectionLimit: 10, //mysql connection pool length
    database: "projectx"
};

//For mysql single connection
/* var dbconnection = mysql.createConnection(
        dbConnectionInfo
); 

 dbconnection.connect(function (err) {
    if (!err) {
        console.log("Database is connected ... nn");
    } else {
        console.log("Error connecting database ... nn");
    }
}); 

*/


//create mysql connection pool
var dbconnection = mysql.createPool(
    dbConnectionInfo
);

// Attempt to catch disconnects 
dbconnection.on('connection', function (connection) {
    console.log('Db pool created. Connection established');

    connection.on('error', function (err) {
        console.error(new Date(), 'MySQL error', err.code);
    });
    connection.on('close', function (err) {
        console.error(new Date(), 'MySQL close', err);
    });

});
 


module.exports = dbconnection;