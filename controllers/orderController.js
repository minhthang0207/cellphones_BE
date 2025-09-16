const Order = require("../models/Order");
const Order_Item = require("../models/Order_Item");
const Ram = require("../models/Ram");
const Variant = require("../models/Variant");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sequelize = require("../config/database");
const Cart_Item = require("../models/Cart_Item");
const Product = require("../models/Product");
const Rom = require("../models/Rom");
const Color = require("../models/Color");
const User = require("../models/User");
const { Sequelize, Op } = require("sequelize");
const Email = require("../utils/email");


const statusMapping = (value) => {
  switch (value) {
    case "all":
      return ""; // Không thêm điều kiện lọc
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "transit":
      return "Đang vận chuyển";
    case "delivered":
      return "Đã giao hàng";
    case "canceled":
      return "Đã hủy";
    default:
      throw new Error("Giá trị không hợp lệ");
  }
};

exports.getAllOrder = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.userId) filter = { user_id: req.params.userId };

  if (req.query.status) {
    const value = statusMapping(req.query.status);
    if (value) {
      filter.status = value;
    }
  }
  const orders = await Order.findAll({
    where: filter,
    order: [["createdAt", "DESC"]],

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

  if (!orders) {
    return next(new AppError("Không tìm thấy kết quả", 404));
  }
  res.status(201).json({
    status: "success",
    data: {
      orders,
    },
  });
});
exports.createOrder = catchAsync(async (req, res, next) => {
  const { items, totalAmount, paymentMethod, userId } = req.body;

  const userData = await User.findByPk(userId);
  if(!userData) {
    return res.status(400).json({
      success: false,
      message: "Không tìm thấy người dùng",
    });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Sản phẩm không được trống",
    });
  }

  if (!paymentMethod || !userId) {
    return res.status(400).json({
      success: false,
      message: "Phương thức thanh toán và mã người dùng là bắt buộc",
    });
  }

  const transaction = await sequelize.transaction();
  try {
    for (const item of items) {
      const variant = await Variant.findOne({
        where: { id: item.variant_id },
        transaction,
      });

      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm với ID ${item.variant_id} không tồn tại`,
        });
      }

      if (variant.stock_quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${variant.name} không đủ số lượng tồn kho (${variant.stock_quantity} trong kho, yêu cầu ${item.quantity})`,
        });
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
        payment_method: paymentMethod,
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

    await new Email(userData, orderCreated).sendCreatedSuccessfullOrder();


    res.status(201).json({
      status: "success",
      data: {
        order,
        orderItems,
      },
      mesage: "Tạo mới đơn hàng thành công",
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
});

exports.getOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findByPk(orderId, {
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
      {
        model: User, // Thêm mối quan hệ với bảng User
        attributes: ["id", "name", "phone", "address", "email"], // Chọn các trường bạn muốn lấy từ bảng User
      },
    ],
  });

  if (!order) {
    return res.status(404).json({ message: "Không tìm thấy đơn hàng này" });
  }

  res.status(200).json({
    status: "success",
    data: {
      order,
    },
  });
});

exports.updateOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;
  const { status, deliveredDate } = req.body;

  const transaction = await sequelize.transaction();

  try {
    // Tìm đơn hàng
    const order = await Order.findByPk(orderId, { transaction });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng này" });
    }

    let delivered = null;
    let payment_status;

    // Xử lý ngày giao hàng nếu trạng thái là "Đã giao hàng"
    if (status === "Đã giao hàng") {
      delivered = Date.now();
      payment_status = "Đã thanh toán";
    } else if (deliveredDate) {
      const parsedDate = new Date(deliveredDate);
      if (parsedDate.getTime()) {
        delivered = parsedDate; // Chỉ gán nếu ngày hợp lệ
      }
    }

    // Nếu trạng thái là "Đã hủy", hoàn trả số lượng tồn kho
    if (status === "Đã hủy") {
      if (order.status !== "Chờ xác nhận") {
        return next(new AppError("Đơn hàng này không thể hủy", 400));
      }
      const orderItems = await Order_Item.findAll({
        where: { order_id: order.id },
        transaction,
      });

      for (const item of orderItems) {
        await Variant.increment(
          { stock_quantity: item.quantity },
          { where: { id: item.variant_id }, transaction }
        );
      }
    }

    // Cập nhật trạng thái và ngày giao hàng của đơn hàng
    order.status = status || order.status;
    order.delivered_date = delivered || order.delivered_date;
    order.payment_status = payment_status || order.payment_status;

    await order.save({ transaction });

    // Commit transaction
    await transaction.commit();

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
      message: "Cập nhật đơn hàng thành công",
    });
  } catch (error) {
    // Rollback transaction nếu có lỗi
    await transaction.rollback();
    next(error);
  }
});

exports.deleteOrder = catchAsync(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await Order.findByPk(orderId, {
    include: [{ model: Order_Item, as: "items" }], // Include các item trong đơn hàng
  });

  if (!order) {
    return res.status(404).json({ message: "Không tìm thấy đơn hàng này" });
  }

  const transaction = await sequelize.transaction(); // Bắt đầu transaction
  try {
    // Cập nhật lại số lượng tồn kho
    for (const item of order.items) {
      await Variant.increment(
        { stock_quantity: item.quantity },
        { where: { id: item.variant_id }, transaction }
      );
    }

    // Thêm sản phẩm vào lại giỏ hàng
    const cartItems = order.items.map((item) => ({
      user_id: order.user_id, // Lấy user_id từ đơn hàng
      variant_id: item.variant_id,
      quantity: item.quantity,
    }));

    // Sử dụng upsert (thêm hoặc cập nhật nếu đã tồn tại)
    for (const cartItem of cartItems) {
      await Cart_Item.upsert(cartItem, { transaction }); // CartItem là model của giỏ hàng
    }

    // Xóa các item trong đơn hàng và đơn hàng
    await Order_Item.destroy({ where: { order_id: orderId }, transaction });
    await order.destroy({ transaction });

    await transaction.commit(); // Xác nhận transaction

    res.status(200).json({
      status: "success",
      message: "Xóa đơn hàng thành công",
    });
  } catch (error) {
    await transaction.rollback(); // Rollback nếu có lỗi
    next(error);
  }
});

// GET /orders/statistics/2023?period=year
// GET /orders/statistics/2023?period=month&months=3
exports.getOrderStatistics = catchAsync(async (req, res, next) => {
  const { year } = req.params; // Lấy year từ URL
  const { period, months } = req.query; // Lấy period và months từ query string

  if (!year) {
    return res.status(400).json({
      status: "error",
      message: "Yêu cầu nhập năm.",
    });
  }

  const selectedPeriod = period || "month"; // Mặc định là 'month'
  const monthsPeriod = parseInt(months, 10) || 3; // Default là 3 tháng nếu không truyền `months`

  // Xử lý nếu period là 'month'
  if (selectedPeriod === "month") {
    const periods = [];

    // Lấy thống kê cho từng tháng theo `months`
    for (let i = 0; i < monthsPeriod; i++) {
      // Ngày đầu tháng, 00:00:00
      const startDate = new Date(Date.UTC(year, i, 1, 0, 0, 0, 0));

      // Ngày cuối tháng, 23:59:59.999
      const endDate = new Date(Date.UTC(year, i + 1, 0, 23, 59, 59, 999));

      periods.push({
        start: startDate,
        end: endDate,
        label: `Tháng ${i + 1}`,
      });
    }

    // Thống kê cho mỗi tháng
    const statistics = await Promise.all(
      periods.map(async (period) => {
        const orders = await Order.findAll({
          where: {
            order_date: {
              [Op.gte]: period.start,
              [Op.lte]: period.end,
            },
          },
          attributes: [
            [Sequelize.fn("COUNT", Sequelize.col("id")), "total_orders"],
            [
              Sequelize.fn("SUM", Sequelize.col("total_amount")),
              "total_amount",
            ],
          ],
        });

        return {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          total_orders: orders[0]?.dataValues.total_orders || 0,
          total_amount: orders[0]?.dataValues.total_amount || 0,
        };
      })
    );

    return res.json({
      status: "success",
      data: statistics,
    });
  }

  // Xử lý nếu period là 'year'
  if (selectedPeriod === "year") {
    const periods = [];

    // Chia thành 4 cụm, mỗi cụm 3 tháng
    for (let i = 0; i < 4; i++) {
      const startMonth = i * 3; // Bắt đầu từ tháng thứ i*3
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0); // Ngày cuối của tháng thứ 3

      periods.push({
        start: startDate,
        end: endDate,
        label: `Tháng ${startMonth + 1}-${startMonth + 3}`,
      });
    }

    // Thống kê cho mỗi cụm
    const statistics = await Promise.all(
      periods.map(async (period) => {
        const orders = await Order.findAll({
          where: {
            order_date: {
              [Op.gte]: period.start,
              [Op.lte]: period.end,
            },
          },
          attributes: [
            [Sequelize.fn("COUNT", Sequelize.col("id")), "total_orders"],
            [
              Sequelize.fn("SUM", Sequelize.col("total_amount")),
              "total_amount",
            ],
          ],
        });

        return {
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          total_orders: orders[0]?.dataValues.total_orders || 0,
          total_amount: orders[0]?.dataValues.total_amount || 0,
        };
      })
    );

    return res.json({
      status: "success",
      data: statistics,
    });
  }

  // Nếu period không hợp lệ
  return res.status(400).json({
    status: "error",
    message: "Invalid period. Please choose 'month' or 'year'.",
  });
});

exports.getStatisticSummary = catchAsync(async (req, res, next) => {
  const productCount = await Product.count();

  // Lấy số lượng người dùng có vai trò là admin từ bảng User
  const userCount = await User.count({
    where: {
      role: "user", // Điều kiện lọc role là 'admin'
    },
  });

  return res.json({
    status: "success",
    data: {
      productCount,
      userCount,
    },
  });
});
