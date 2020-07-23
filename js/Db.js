const mysql2 = require('mysql2/promise');

class Db {

    constructor(config) {
        let connectionPool = null;

        this.connect = async function() {
            if (!connectionPool) {
                connectionPool = await mysql2.createPool(config);
            }
            return connectionPool.getConnection();
        }

        this.disconnect = async function(conn) {
            return conn.release();
        }

    }

}

module.exports = Db;
