const { default: axios } = require("axios");
const Brand = require("../models/Brand");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const CryptoJS = require("crypto-js"); // npm install crypto-js
const moment = require("moment"); // npm install moment
const sequelize = require("../config/database");
const Variant = require("../models/Variant");
const Order = require("../models/Order");
const Order_Item = require("../models/Order_Item");
const Cart_Item = require("../models/Cart_Item");
const Email = require("../utils/email");
const User = require("../models/User");
const Product = require("../models/Product");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");
const Color = require("../models/Color");

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};
exports.createPayment = catchAsync(async (req, res, next) => {
  const { items, totalAmount, userId, orderId } = req.body;
  const embed_data = {
    // redirecturl: "https://cellphones-self.vercel.app/lich-su-mua-hang",
    redirecturl: `${process.env.FRONTEND_URL}/lich-su-mua-hang`,
  };

  const transID = Math.floor(Math.random() * 1000000);
  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
    app_user: userId,
    app_time: Date.now(), // miliseconds
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: totalAmount,
    description: `Thanh toán cho đơn hàng #${orderId}`,
    bank_code: "",
    callback_url: `${process.env.BACKEND_URL}/api/callback`,
  };

  // appid|app_trans_id|appuser|amount|apptime|embeddata|item
  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  const result = await axios.post(config.endpoint, null, { params: order });

  res.status(200).json({
    status: "success",
    data: result.data,
  });
});

exports.callback = catchAsync(async (req, res, next) => {
  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    // kiểm tra callback hợp lệ (đến từ ZaloPay server)
    if (reqMac !== mac) {
      // callback không hợp lệ
      result.return_code = -1;
      result.return_message = "mac not equal";
      return res.json(result); // Trả lời ngay nếu có lỗi
    }

    // thanh toán thành công
    // merchant cập nhật trạng thái cho đơn hàng
    let dataJson = JSON.parse(dataStr, config.key2);
    console.log(
      "update order's status = success where app_trans_id =",
      dataJson["app_trans_id"]
    );

    const items = JSON.parse(dataJson["item"]);
    const userId = dataJson["app_user"];
    const totalAmount = dataJson["amount"];

    // create order
    const transaction = await sequelize.transaction();
    try {
      for (const item of items) {
        const variant = await Variant.findOne({
          where: { id: item.variant_id },
          transaction,
        });

        if (!variant) {
          result.return_code = -1;
          result.return_message = `Sản phẩm với ID ${item.variant_id} không tồn tại`;
          return res.json(result); // Trả lời ngay nếu lỗi
        }

        if (variant.stock_quantity < item.quantity) {
          console.log(
            `Sản phẩm ${variant.name} không đủ số lượng tồn kho (${variant.stock_quantity} trong kho, yêu cầu ${item.quantity})`
          );
          result.return_code = -1;
          result.return_message = `Sản phẩm ${variant.name} không đủ số lượng tồn kho`;
          return res.json(result); // Trả lời ngay nếu lỗi
        }
      }

      for (const item of items) {
        await Variant.decrement(
          { stock_quantity: item.quantity },
          { where: { id: item.variant_id }, transaction }
        );
      }

      const order = await Order.create(
        {
          total_amount: totalAmount,
          payment_method: "Online",
          payment_status: "Đã thanh toán",
          status: "Đã xác nhận",
          user_id: userId,
        },
        { transaction }
      );

      const orderItems = items.map((item) => ({
        order_id: order.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        origin_price: item.price,
      }));

      await Order_Item.bulkCreate(orderItems, { transaction });

      // Xóa sản phẩm trong giỏ hàng
      const variantIds = items.map((item) => item.variant_id);

      await Cart_Item.destroy({
        where: {
          user_id: userId,
          variant_id: variantIds,
        },
        transaction,
      });

      // Commit transaction
      await transaction.commit();

      // Gửi mail về
      const userData = await User.findByPk(userId);

      const orderCreated = await Order.findByPk(order.id, {
        include: [
          {
            model: Order_Item,
            as: "items",
            include: [
              {
                model: Variant, // Liên kết với bảng Variant để lấy thông tin biến thể
                include: [
                  {
                    model: Product, // Liên kết với bảng Product để lấy thông tin sản phẩm
                    attributes: ["name", "image"],
                  },
                  {
                    model: Ram, // Liên kết với bảng Product để lấy thông tin sản phẩm
                    attributes: ["id", "capacity"],
                  },
                  {
                    model: Rom, // Liên kết với bảng Product để lấy thông tin sản phẩm
                    attributes: ["id", "capacity"],
                  },
                  {
                    model: Color, // Liên kết với bảng Product để lấy thông tin sản phẩm
                    attributes: ["id", "name", "code"],
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!userData || !orderCreated) {
        console.log("Không tìm thấy thông tin người dùng hoặc đơn hàng");
        return;
      }

      await new Email(userData, orderCreated).sendCreatedSuccessfullOrder();

      console.log("Tạo mới đơn hàng thành công");
      result.return_code = 1;
      result.return_message = "success";
      return res.json(result); // Trả lời khi thành công
    } catch (error) {
      await transaction.rollback();
      result.return_code = -1;
      result.return_message = error.message;
      return res.json(result); // Trả lời ngay nếu có lỗi
    }
  } catch (ex) {
    result.return_code = 0;
    result.return_message = ex.message;
    return res.json(result); // Trả lời nếu có lỗi
  }
});
