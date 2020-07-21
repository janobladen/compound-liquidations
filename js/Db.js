const mysql2 = require('mysql2/promise');

module.exports = Db;

Db.prototype.constructor = Db;

function Db(config) {

    this.config = config;
    this.connectionPool = null;

}

Db.prototype.connect = async function () {
    if (!this.connectionPool) {
        this.connectionPool = await mysql2.createPool(this.config);
    }
    return this.connectionPool.getConnection();
}

Db.prototype.disconnect = function() {
    if (this.connectionPool) this.connectionPool.end();
    this.connectionPool = null;
}

Db.prototype.getCurrentState = async function () {
    let conn = await this.connect();
    let [rows] = await conn.query('SELECT * FROM current_state');
    let state = {};
    rows.forEach(function (row) {
        state[row.state_key] = JSON.parse(row.state_value);
    });
    conn.release();
    return state;
}