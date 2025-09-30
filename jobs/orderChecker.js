const cron = require("node-cron");
const Order = require("../models/Order");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const Order_Item = require("../models/Order_Item");
const Variant = require("../models/Variant");

function startOrderChecker() {
  cron.schedule("*/20 * * * *", async () => {
    console.log("Cronjob: Kiểm tra đơn hàng online hết hạn...");
    const now = new Date();

      const expiredOrders = await Order.findAll({
        where: {
          payment_method: "Online",
          payment_status: "Chưa thanh toán",
          expired_at: { [Op.lt]: now },
          status: { [Op.ne]: "Đã hủy" }
        },
        include: [{ model: Order_Item, as: "items" }] // lấy luôn items để tránh query thêm
      });


      if (expiredOrders.length > 0) {
        const t = await sequelize.transaction();

        try {
          // Hủy tất cả đơn
          await Order.update(
            { status: "Đã hủy" },
            { where: { id: expiredOrders.map(o => o.id) }, transaction: t }
          );

          // Gom số lượng tồn cần cộng lại
          const stockAdjustments = {};
          expiredOrders.forEach(order => {
            order.items.forEach(item => {
              stockAdjustments[item.variant_id] =
                (stockAdjustments[item.variant_id] || 0) + item.quantity;
            });
          });

          console.log({stockAdjustments})

          // Update tồn kho theo batch
          for (const [variantId, qty] of Object.entries(stockAdjustments)) {
            await Variant.increment(
              { stock_quantity: qty },
              { where: { id: variantId }, transaction: t }
            );
          }
          await t.commit();
        } catch (err) {
          await t.rollback();
          throw err;
        }
      }    
  })
}

module.exports = startOrderChecker;
