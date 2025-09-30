const { default: axios } = require("axios");
const qs = require("qs");
const Brand = require("../models/Brand");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const CryptoJS = require("crypto-js"); // npm install crypto-js
const crypto = require("crypto");
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

exports.getRefundStatus = catchAsync(async (req, res, next) => {
  const m_refund_id = req.params.mRefundId;
  const timestamp = Date.now();
  console.log(m_refund_id)

  console.log(typeof(m_refund_id));

  const body = {
    app_id: config.app_id,
    m_refund_id,
    timestamp
  };

  const hmacInput = config.app_id +
    "|" +
    body.m_refund_id + 
    "|" +
    body.timestamp

  body.mac = CryptoJS.HmacSHA256(hmacInput, config.key1).toString(CryptoJS.enc.Hex);

  try {
    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/query_refund",
      qs.stringify(body), // convert sang x-www-form-urlencoded
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.refundOrder = catchAsync(async (req, res, next) => {
  const { zp_trans_id, amount, description } = req.body;

  const m_refund_id = `${moment().format("YYMMDD")}_${config.app_id}_1`;
  const timestamp = Date.now();

  const data = `${config.app_id}|${zp_trans_id}|${amount}|${description}|${timestamp}`;

  const mac = CryptoJS.HmacSHA256(data, config.key1).toString(CryptoJS.enc.Hex);
  // const mac = CryptoJS.HmacSHA256(data, config.key1).toString();
  
  const body = {
    app_id: config.app_id,
    m_refund_id,
    zp_trans_id,
    amount,
    timestamp,
    description,
    mac,
  };

  console.log(body)

  try {
    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/refund",
      qs.stringify(body), // convert sang x-www-form-urlencoded
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );
  // const response = await axios.post("https://sb-openapi.zalopay.vn/v2/refund", null, { params: body });


    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

exports.getOrderStatus = catchAsync(async (req, res, next) => {
  const app_trans_id = req.params.id;
  console.log(app_trans_id)

  const body = {
    app_id: config.app_id,
    app_trans_id,
  };

  const hmacInput = config.app_id +
    "|" +
    body.app_trans_id + 
    "|" +
    config.key1

  body.mac = CryptoJS.HmacSHA256(hmacInput, config.key1).toString(CryptoJS.enc.Hex);

  console.log(body)

  try {
    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/query",
      qs.stringify(body), // convert sang x-www-form-urlencoded
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


exports.createPayment = catchAsync(async (req, res, next) => {
  let result = {};
  const { items, totalAmount, userId } = req.body;
  //TODO: create order on db
  const transaction = await sequelize.transaction();
    try {
      // 1. Kiểm tra tồn kho
      for (const item of items) {
        const variant = await Variant.findOne({
          where: { id: item.variant_id },
          transaction,
          lock: transaction.LOCK.UPDATE, // tránh race condition
        });

        if (!variant) {
          result.return_code = -1;
          result.status = "error";
          result.return_message = `Sản phẩm không tồn tại`;
          await transaction.rollback();
          return res.json(result); // Trả lời ngay nếu lỗi
        }

        if (variant.stock_quantity < item.quantity) {
          console.log(
            `Sản phẩm ${variant.name} không đủ số lượng tồn kho (${variant.stock_quantity} trong kho, yêu cầu ${item.quantity})`
          );
          result.return_code = -1;
          result.status = "error";
          result.return_message = `Sản phẩm ${variant.name} không đủ số lượng tồn kho`;
          await transaction.rollback();
          return res.json(result); // Trả lời ngay nếu lỗi
        }
      }

      // 2. Trừ tồn kho
      for (const item of items) {
        await Variant.decrement({ 
          stock_quantity: item.quantity
        },{
          where: { id: item.variant_id },
          transaction 
        });
      }

      // 3. Tạo order
      const order = await Order.create(
        {
          total_amount: totalAmount,
          payment_method: "Online",
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

      // 4. Xóa sản phẩm trong giỏ hàng
      await Cart_Item.destroy({
        where: {
          user_id: userId,
          variant_id: items.map((item) => item.variant_id),
        },
        transaction,
      });
      // ✅ Commit trước để đảm bảo DB luôn consistent
      await transaction.commit();

      // 5. Gọi ZaloPay API (ngoài transaction)
      const embed_data = {
        // redirecturl: "https://cellphones-self.vercel.app/lich-su-mua-hang",
        redirecturl: `${process.env.FRONTEND_URL}/lich-su-mua-hang`,
        orderId: order.id,
      };

      const random = Math.floor(1000 + Math.random()* 9000);

      const newOrder = {
        app_id: config.app_id,
        app_trans_id: `${moment().format("YYMMDD")}_${Date.now()}${random}`, // translation missing: vi.docs.shared.sample_code.comments.app_trans_id
        app_user: userId,
        app_time: Date.now(), // miliseconds
        item: JSON.stringify(items),
        embed_data: JSON.stringify(embed_data),
        amount: totalAmount,
        description: `Thanh toán cho đơn hàng #${order.id}`,
        bank_code: "",
        callback_url: `${process.env.BACKEND_URL}/api/callback`,
        // callback_url: `https://f9b8149c8ee1.ngrok-free.app/api/callback`,
        
      };
      const data =
        config.app_id +
        "|" +
        newOrder.app_trans_id +
        "|" +
        newOrder.app_user +
        "|" +
        newOrder.amount +
        "|" +
        newOrder.app_time +
        "|" +
        newOrder.embed_data +
        "|" +
        newOrder.item;
      newOrder.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

      console.log({newOrder})

      // Cập nhật order với app_trans_id
      order.app_trans_id = newOrder.app_trans_id
      await order.save();

      // Gọi API Zalopay
      const result = await axios.post(config.endpoint, null, { params: newOrder });

      console.log(result.data)
      if(result.data.return_code !== 1) {
        res.status(400).json({
          status: "fail",
          message: result.data.sub_return_message
        });
      }

      res.status(200).json({
        status: "success",
        data: result.data,
      });
    }
    catch (error) {
      await transaction.rollback();
      result.return_code = -1;
      result.status = "error";
      result.return_message = error.message;
      return res.json(result); // Trả lời ngay nếu có lỗi
    }
});

exports.callback = catchAsync(async (req, res, next) => {
  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;

    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    if (reqMac !== mac) {
      return res.json({ return_code: -1, return_message: "mac not equal" });
    }

    const dataJson = JSON.parse(dataStr);
    const embedData = JSON.parse(dataJson.embed_data);
    const orderId = embedData.orderId;
    const zp_trans_id = dataJson.zp_trans_id;

    console.log({orderId})
    console.log({dataJson})

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.json({ return_code: -1, return_message: "Order not found" });
    }

    await order.update({
      payment_status: "Đã thanh toán",
      zp_trans_id
    });

    const userData = await User.findByPk(order.user_id);
    const orderCreated = await Order.findByPk(orderId, {
      include: [
        {
          model: Order_Item,
          as: "items",
          include: [
            {
              model: Variant,
              include: [
                { model: Product, attributes: ["name", "image"] },
                { model: Ram, attributes: ["id", "capacity"] },
                { model: Rom, attributes: ["id", "capacity"] },
                { model: Color, attributes: ["id", "name", "code"] }
              ]
            }
          ]
        }
      ]
    });

    if (userData && orderCreated) {
      await new Email(userData, orderCreated).sendCreatedSuccessfullOrder();
    }

    return res.json({ return_code: 1, return_message: "success" });

  } catch (error) {
    console.error(error);
    return res.json({ return_code: -1, return_message: error.message });
  }
});


// create refundOrder
exports.createRefundOrder = async (order) => {
  const { zp_trans_id, total_amount } = order;

  const description =  `Hoàn tiền cho đơn hàng ${order.id}`
  const random = Math.floor(1000 + Math.random()* 9000);

  const m_refund_id = `${moment().format("YYMMDD")}_${config.app_id}_${Date.now()}${random}`;
  const timestamp = Date.now();

  const data = `${config.app_id}|${zp_trans_id}|${total_amount}|${description}|${timestamp}`;

  const mac = CryptoJS.HmacSHA256(data, config.key1).toString(CryptoJS.enc.Hex);
  // const mac = CryptoJS.HmacSHA256(data, config.key1).toString();
  
  const body = {
    app_id: config.app_id,
    m_refund_id,
    zp_trans_id,
    amount: total_amount,
    timestamp,
    description,
    mac,
  };

  console.log(body)

  try {
    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/refund",
      qs.stringify(body), // convert sang x-www-form-urlencoded
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    console.log("RESPONSE CREATE REFUND ORDER:", response.data);

  // const response = await axios.post("https://sb-openapi.zalopay.vn/v2/refund", null, { params: body });

    return { success: true, m_refund_id, data: response.data };
  } catch (err) {
    return { success: false, m_refund_id, error: err.message };
  }
};

// GetRefundOrderStatus
// services/zalopay.service.js
exports.getRefundOrderStatus = async (order) => {
  const { m_refund_id } = order;

  console.log({m_refund_id})

  const timestamp = Date.now();

  const hmacInput = `${config.app_id}|${m_refund_id}|${timestamp}`;
  const mac = CryptoJS.HmacSHA256(hmacInput, config.key1).toString(CryptoJS.enc.Hex);

  const body = {
    app_id: config.app_id,
    m_refund_id,
    timestamp,
    mac
  };

  try {
    const response = await axios.post(
      "https://sb-openapi.zalopay.vn/v2/query_refund",
      qs.stringify(body),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const result = response.data;

    console.log("RESPONSE GET REFUND STATUS:", response.data);

    if (result.return_code === 1) {
      return { success: true, status: "Đã hoàn tiền", data: result };
    } else if(result.return_code === 3) {
      return { success: true, status: "Đang xử lý", data: result };
    }
     else {
      return { success: false, status: "Đang xử lý", data: result };
    }
  } catch (err) {
    return { success: false, status: "Thất bại", error: err.message };
  }
};


