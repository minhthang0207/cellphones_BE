const cron = require("node-cron");
const { getRefundOrderStatus } = require("../controllers/paymentController");
const { Op } = require("sequelize");
const Order = require("../models/Order");


function startRefundOrderChecker() {
    // --- Cronjob 5 phút/lần ---
    cron.schedule("*/5 * * * *", async () => {
    console.log("🔄 Cronjob: Check refund status...");

    try {
        // Lấy các order đang xử lý refund trong 7 ngày gần nhất
        const orders = await Order.findAll({
            where: {
                refund_status: "Đang xử lý",
                updatedAt: {
                    [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 ngày gần đây
                },
            },
        });
        console.log(`👉 Tìm thấy ${orders.length} đơn cần check refund`);

        // Gọi API check refund cho từng đơn
        for (const order of orders) {
            try {
                const result = await getRefundOrderStatus(order);

                if (result.status === "Đã hoàn tiền") {
                    await order.update({ refund_status: "Đã hoàn tiền" });
                    console.log(`✅ Đơn ${order.id} cập nhật thành "Đã hoàn tiền"`);
                } else {
                    console.log(`⏳ Đơn ${order.id} vẫn đang xử lý`);
                }
            } catch (err) {
                console.error(`❌ Lỗi khi gọi API refund cho đơn ${order.id}:`, err);
            }
        }
    } catch (err) {
        console.error("❌ Cronjob error:", err);
    }
    })
}

module.exports = startRefundOrderChecker;

