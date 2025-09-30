const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Sử dụng UUIDV4 cho giá trị mặc định
      primaryKey: true,
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false, // Không cho phép null
      defaultValue: DataTypes.NOW,
    },
    delivered_date: {
      type: DataTypes.DATE,
      allowNull: true, // Có thể cho phép null nếu đơn hàng chưa được giao
      validate: {
        isAfterOrderDate(value) {
          if (
            value &&
            this.order_date &&
            new Date(value) < new Date(this.order_date)
          ) {
            throw new Error("Delivered date must be after the order date.");
          }
        },
      },
    },
    status: {
      type: DataTypes.ENUM(
        "Chờ xác nhận",
        "Đã xác nhận",
        "Đang vận chuyển",
        "Đã giao hàng",
        "Đã hủy"
      ),
      allowNull: false,
      defaultValue: "Chờ xác nhận",
    },
    payment_method: {
      type: DataTypes.ENUM("Online", "Khi nhận hàng"),
    },
    payment_status: {
      type: DataTypes.ENUM("Đã thanh toán", "Chưa thanh toán"),
      allowNull: false,
      defaultValue: "Chưa thanh toán",
    },
    total_amount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    app_trans_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zp_trans_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    m_refund_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refund_status: {
      type: DataTypes.ENUM("Đang xử lý", "Đã hoàn tiền", "Thất bại"),
      allowNull: true,
    },
    expired_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "user", // Tên bảng liên kết
        key: "id", // Cột được liên kết
      },
    },
  },
  {
    tableName: "order",
    timestamps: true,
    hooks: {
      beforeCreate: (order) => {
        if (order.payment_method === "Online") {
          const now = new Date();
          order.expired_at = new Date(now.getTime() + 5 * 60 * 1000); // +5 phút
        } else {
          order.expired_at = null;
        }
      },
    },
  }
);

Order.associate = (models) => {
  Order.hasMany(models.Order_Item, { foreignKey: "order_id", as: "items" });
  Order.belongsTo(models.User, { foreignKey: "user_id" });
};

module.exports = Order;
