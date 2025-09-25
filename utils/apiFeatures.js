// GET /products?price=gt:2000000&sort=-rating,name&fields=name,price&page=2&limit=5

const { Op } = require("sequelize");
const Brand = require("../models/Brand");
const Product_Category = require("../models/Product_Category");
const Ram = require("../models/Ram");
const Rom = require("../models/Rom");
const Variant = require("../models/Variant");

class APIFeaturesSequelize {
  constructor(query, queryString) {
    this.query = query; // Sequelize query
    this.queryString = queryString; // Query từ req.query
    this.options = {}; // Tuỳ chọn Sequelize
  }
  filter() {
    const queryObj = { ...this.queryString };

    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Kiểm tra và khởi tạo queryOptions nếu chưa có
    if (!this.options.where) {
      this.options.where = {};
    }

    if (queryObj.name) {
      this.options.where.name = {
        [Op.like]: `%${queryObj.name}%`, // Sử dụng `%` để tìm kiếm gần đúng
      };
      delete queryObj.name; // Xóa `name` khỏi queryObj để tránh xung đột
    }
    // Khởi tạo đối tượng price nếu chưa có
    if (
      queryObj.priceGt ||
      queryObj.priceGte ||
      queryObj.priceLte ||
      queryObj.priceLt
    ) {
      this.options.where.price = { [Op.and]: [] }; // Dùng Op.and để kết hợp các điều kiện price

      if (queryObj.priceGt) {
        this.options.where.price[Op.and].push({ [Op.gt]: queryObj.priceGt }); // Dùng Op.gt cho giá trị lớn hơn
        delete queryObj.priceGt; // Xóa priceGt khỏi query để tránh xung đột
      }

      if (queryObj.priceGte) {
        this.options.where.price[Op.and].push({ [Op.gte]: queryObj.priceGte }); // Dùng Op.gte cho giá trị lớn hơn hoặc bằng
        delete queryObj.priceGte; // Xóa priceGte khỏi query để tránh xung đột
      }

      if (queryObj.priceLte) {
        this.options.where.price[Op.and].push({ [Op.lte]: queryObj.priceLte }); // Dùng Op.lte cho giá trị nhỏ hơn hoặc bằng
        delete queryObj.priceLte; // Xóa priceLte khỏi query để tránh xung đột
      }

      if (queryObj.priceLt) {
        this.options.where.price[Op.and].push({ [Op.lt]: queryObj.priceLt }); // Dùng Op.lt cho giá trị nhỏ hơn
        delete queryObj.priceLt; // Xóa priceLt khỏi query để tránh xung đột
      }
    }

    // lọc  theo khoảng giá
    if (queryObj.price) {
      console.log(queryObj.price);
      const ranges = queryObj.price.split(",").map((range) => {
        if (range.startsWith("<")) {
          // Lọc từ 0 đến giá trị tối đa
          const max = Number(range.replace("<", "").trim());
          return { [Op.between]: [0, max] };
        } else if (range.startsWith(">")) {
          // Lọc từ giá trị tối thiểu trở lên
          const min = Number(range.replace(">", "").trim());
          return { [Op.gte]: min };
        } else {
          // Lọc trong khoảng min-max
          const [min, max] = range.split("-").map(Number);
          return { [Op.between]: [min, max] };
        }
      });

      this.options.where.price = {
        [Op.or]: ranges,
      };

      delete queryObj.price;
    }

    //tìm sản phẩm theo điều kiện về RAM (capacity)
    if (queryObj.ram) {
      console.log("queryObj.ram:", queryObj.ram);

      const ramValues = queryObj.ram.split(",").map((value) => parseInt(value));
      console.log("ramValues:", ramValues);

      this.options.include = this.options.include || [];

      this.options.include.push({
        model: Variant,
        include: [
          {
            model: Ram,
            where: {
              capacity: {
                [Op.in]: ramValues,
              },
            },
            attributes: ["capacity"],
          },
        ],
        attributes: [],
      });

      console.log(
        "this.options.include:",
        JSON.stringify(this.options.include, null, 2)
      );

      delete queryObj.ram;
    }

    //tìm sản phẩm theo điều kiện về RoM (capacity)
    if (queryObj.rom) {
      // Tách queryObj.ram thành các giá trị cụ thể, mỗi giá trị được phân tách bởi dấu "|"
      const romValues = queryObj.rom.split(",").map((value) => parseInt(value));

      // Đảm bảo options.include đã được khởi tạo
      this.options.include = this.options.include || [];

      // Đưa vào điều kiện lọc cho Variant và Ram
      this.options.include.push({
        model: Variant,
        include: [
          {
            model: Rom,
            where: {
              // So sánh capacity bằng với các giá trị trong romValues
              capacity: {
                [Op.in]: romValues, // So sánh với các giá trị trong mảng
              },
            },
            attributes: ["capacity"], // Chỉ lấy trường capacity
          },
        ],
        attributes: [], // Không lấy thuộc tính của Variant
      });

      // Xóa queryObj.rom để tránh xung đột với các tham số khác
      delete queryObj.rom;
    }

    // Lọc theo brand

    // if (queryObj.brand) {
    //   const brands = queryObj.brand.split(","); // Tách thành mảng slug
    //   if (!this.options.include) {
    //     this.options.include = [];
    //   }
    //   this.options.include.push({
    //     model: Brand,
    //     where: { slug: { [Op.in]: brands } }, // Lọc theo slug trong bảng Brand
    //     attributes: [], // Không cần lấy thêm trường từ bảng Brand
    //   });
    //   delete queryObj.brand; // Xóa `brand` khỏi queryObj để tránh xung đột
    // }

    // Lọc theo slug của category
    // if (queryObj.categorySlug) {
    //   // Tách categorySlug thành mảng (nếu có nhiều slug)
    //   const categorySlugs = [
    //     ...new Set(queryObj.categorySlug.split(",").map((slug) => slug.trim())),
    //   ];

    //   if (!this.options.include) {
    //     this.options.include = [];
    //   }

    //   this.options.include.push({
    //     model: Product_Category,
    //     where: { slug: { [Op.in]: categorySlugs } }, // Lọc theo danh sách slug
    //     attributes: [], // Không lấy trường slug vì đã có trong điều kiện lọc
    //   });

    //   delete queryObj.categorySlug; // Xóa categorySlug khỏi query để tránh xung đột
    // }\

    this.options.include = this.options.include || [];

    // Lọc theo nhiều categorySlug
    if (queryObj.categorySlug) {
      const categorySlugs = queryObj.categorySlug
        .split(",")
        .map((slug) => slug.trim());

      this.options.include.push({
        model: Product_Category,
        attributes: ["id", "slug"],
        where: {
          slug: {
            [Op.in]: categorySlugs, // Sử dụng Op.in để lọc theo danh sách slug
          },
        },
      });
      delete queryObj.categorySlug;
    } else {
      this.options.include.push({
        model: Product_Category,
        attributes: ["id", "slug"],
      });
      delete queryObj.categorySlug;
    }

    // Lọc theo nhiều brandSlug
    if (queryObj.brandSlug) {
      const brandSlugs = queryObj.brandSlug
        .split(",")
        .map((slug) => slug.trim());

      if (!this.options.include) {
        this.options.include = [];
      }

      this.options.include.push({
        model: Brand,
        attributes: ["id", "slug"],
        where: {
          slug: {
            [Op.in]: brandSlugs, // Sử dụng Op.in để lọc theo danh sách slug
          },
        },
      });
      delete queryObj.brandSlug;
    } else {
      this.options.include.push({
        model: Brand,
        attributes: ["id", "slug"],
      });
      delete queryObj.brandSlug;
    }

    // Nếu còn điều kiện khác, ánh xạ vào `where`
    if (Object.keys(queryObj).length > 0) {
      this.options.where = {
        ...this.options.where,
        ...queryObj,
      };
    }

    return this;
  }

  sort() {
    // 2) Sorting
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").map((field) => {
        const direction = field.startsWith("-") ? "DESC" : "ASC";
        return [field.replace("-", ""), direction];
      });
      this.options.order = sortBy; // Sequelize sử dụng `order`
    } else {
      this.options.order = [["createdAt", "DESC"]]; // Mặc định
    }
    return this;
  }

  limitFields() {
    // 3) Field limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",");
      this.options.attributes = fields; // Sequelize sử dụng `attributes`
    }
    return this;
  }

  paginate() {
    // 4) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const offset = (page - 1) * limit; // Sequelize sử dụng `offset` và `limit`

    this.options.limit = limit;
    this.options.offset = offset;
    return this;
  }

  // apply() {

  //   // Khởi tạo this.options.include nếu chưa có
  //   if (!this.options.include) {
  //     this.options.include = [];
  //   }

  //   console.log(this.options);
  //   console.log(123, this.options);

  //   return this.query.findAll({
  //     ...this.options,
  //     include: [
  //       // {
  //       //   model: Variant,
  //       //   //   attributes: ["id", "slug"],
  //       // },
  //       ...(this.options.include || []),
  //     ],
  //   });
  // }
  apply() {
    // Kiểm tra và khởi tạo this.options.include nếu chưa có
    if (!this.options.include) {
      this.options.include = [];
    }

    // Truy vấn tổng số sản phẩm
    const totalProductsQuery = this.query.count({
      where: this.options.where,
      include: this.options.include,
    });

    // Truy vấn sản phẩm đã phân trang
    const paginatedResultsQuery = this.query.findAll({
      ...this.options,
      include: [...(this.options.include || [])],
    });

    // Sử dụng Promise.all để thực hiện cả hai truy vấn song song
    return Promise.all([totalProductsQuery, paginatedResultsQuery])
      .then(([totalProducts, products]) => {
        const limit = this.options.limit || 100; // Số sản phẩm mỗi trang
        const page = Math.ceil((this.options.offset || 0) / limit) + 1; // Trang hiện tại
        const totalPages = Math.ceil(totalProducts / limit); // Tổng số trang

        return {
          totalProducts,
          totalPages,
          currentPage: page,
          products,
        };
      })
      .catch((error) => {
        console.error("Error in apply method:", error);
        throw error;
      });
  
  }
}

module.exports = APIFeaturesSequelize;
