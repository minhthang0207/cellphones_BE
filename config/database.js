// config/database.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME, // Tên cơ sở dữ liệu
  process.env.DB_USER, // Tên người dùng
  process.env.DB_PASSWORD, // Mật khẩu
  {
    host: process.env.DB_HOST, // Địa chỉ host của cơ sở dữ liệu
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT, // Phương thức kết nối cơ sở dữ liệu (MySQL, PostgreSQL, SQLite, v.v)
    timezone: "+07:00",
    logging: false
  }
);

module.exports = sequelize;
