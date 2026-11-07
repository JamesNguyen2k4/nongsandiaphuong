/**
 * YÊN BÌNH MARKET - CLIENT & DATABASE LOGIC
 * Sử dụng IndexedDB để lưu trữ sản phẩm và đơn hàng kèm hình ảnh
 */

// Helper selector & định dạng tiền tệ
const $ = (id) => document.getElementById(id);
const money = (val) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

// Danh sách sản phẩm (để trống để người dùng tự thêm sản phẩm thực tế)
const initialProducts = [];

// Chính sách cửa hàng
const policies = {
  shipping: ["Chính sách giao hàng", "Yên Bình Market hỗ trợ giao hàng toàn quốc qua Viettel Post / GHTK. Đơn hàng nội tỉnh nhận trong 24h, đơn hàng liên tỉnh nhận trong 2-3 ngày. Miễn phí vận chuyển cho đơn hàng từ 500.000đ."],
  returns: ["Chính sách đổi trả", "Khách hàng được quyền kiểm tra hàng trước khi thanh toán. Đổi trả miễn phí 100% trong vòng 7 ngày nếu sản phẩm có lỗi rách vỡ, ẩm mốc hoặc không đúng mô tả sản phẩm."],
  privacy: ["Chính sách bảo mật", "Chúng tôi cam kết bảo mật tuyệt đối thông tin cá nhân gồm tên, số điện thoại, địa chỉ của quý khách. Thông tin chỉ được sử dụng cho mục đích liên hệ giao hàng và bảo hành."],
  guide: ["Hướng dẫn mua hàng", "Bước 1: Chọn sản phẩm yêu thích và thêm vào giỏ.\nBước 2: Vào giỏ hàng kiểm tra và chọn 'Tiến hành đặt hàng'.\nBước 3: Điền thông tin giao hàng và chọn 'Gửi yêu cầu đặt hàng'. Nhân viên cửa hàng sẽ gọi xác nhận ngay."]
};

/* ========================================================
   1. CƠ SỞ DỮ LIỆU CLOUD DATABASE (Supabase Service)
   ======================================================== */
const SUPABASE_URL = "https://sjvwoyehcfcseobenxmi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pX92oWJ-vlC3PfklnXk9BQ_uP0OH3kC";

class DatabaseService {
  constructor() {
    this.client = (window.supabase && typeof window.supabase.createClient === "function")
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;
  }

  async init() {
    if (!this.client) {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        this.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      } else {
        throw new Error("Không thể tải thư viện Supabase JS SDK. Vui lòng kiểm tra kết nối mạng!");
      }
    }

    // Kiểm tra kết nối tới bảng products
    try {
      await this.countProducts();
    } catch (err) {
      console.error("Lỗi khi kiểm tra dữ liệu bảng products trên Supabase:", err);
      throw err;
    }
  }

  // Đếm tổng số sản phẩm trong DB
  async countProducts() {
    if (!this.client) return 0;
    const { count, error } = await this.client
      .from("products")
      .select("*", { count: "exact", head: true });
    if (error) throw error;
    return count || 0;
  }

  // Lấy tất cả sản phẩm
  async getAllProducts() {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Lấy 1 sản phẩm theo ID
  async getProduct(id) {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Thêm hoặc cập nhật sản phẩm vào database
  async addProduct(product) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const { data, error } = await this.client
      .from("products")
      .upsert([product]);
    if (error) throw error;
    return data;
  }

  // Xóa sản phẩm khỏi database
  async deleteProduct(id) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const { error } = await this.client
      .from("products")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  }

  // Xóa toàn bộ sản phẩm khỏi database
  async resetToDefault() {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const { error } = await this.client
      .from("products")
      .delete()
      .neq("id", "___dummy_id_to_match_all___");
    if (error) throw error;
    return true;
  }

  // Lưu đơn hàng vào database Supabase (chuyển trực tiếp tới Quản trị viên)
  async createOrder(order) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    let res = await this.client
      .from("orders")
      .insert([order])
      .select();

    // Nếu bảng orders trên Supabase chưa có cột userId (mã lỗi PGRST204), tự động bỏ userId và insert lại
    if (res.error && res.error.code === "PGRST204") {
      const { userId, ...orderWithoutUserId } = order;
      res = await this.client
        .from("orders")
        .insert([orderWithoutUserId])
        .select();
    }

    if (res.error) throw res.error;
    return res.data;
  }

  // Lấy tất cả đơn hàng (dành cho Admin)
  async getAllOrders() {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from("orders")
      .select("*")
      .order("createdAt", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // Lấy danh sách đơn hàng của 1 khách hàng cụ thể (kèm thông tin sản phẩm và trạng thái giao hàng)
  async getUserOrders(user) {
    if (!user) return [];
    let orders = [];
    const userId = user.id;
    const phone = user.phone ? user.phone.trim() : "";
    const name = user.fullName ? user.fullName.trim().toLowerCase() : "";

    // 1. Tra cứu trực tuyến từ Supabase
    if (this.client) {
      try {
        const all = await this.getAllOrders();
        orders = all.filter((o) => {
          if (o.userId && o.userId === userId) return true;
          if (phone && o.customerPhone && o.customerPhone.trim() === phone) return true;
          if (name && o.customerName && o.customerName.trim().toLowerCase() === name) return true;
          return false;
        });
      } catch (err) {
        console.warn("Lỗi khi tải đơn hàng từ Supabase:", err);
      }
    }

    // 2. Tra cứu dự phòng từ localStorage nếu chưa có mạng
    const localKey = `yb_user_orders_${userId}`;
    const localOrders = JSON.parse(localStorage.getItem(localKey) || "[]");
    const combined = [...orders];
    localOrders.forEach((lo) => {
      if (!combined.some((o) => o.orderCode === lo.orderCode)) {
        combined.push(lo);
      }
    });

    return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Cập nhật trạng thái đơn hàng (dành cho Admin)
  async updateOrderStatus(orderId, status) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const { error } = await this.client
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (error) throw error;
    return true;
  }

  // Xóa đơn hàng (dành cho Admin)
  async deleteOrder(orderId) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const { error } = await this.client
      .from("orders")
      .delete()
      .eq("id", orderId);
    if (error) throw error;
    return true;
  }

  // Đăng ký tài khoản khách hàng mới
  async registerUser(userData) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    const cleanEmail = userData.email.trim().toLowerCase();

    const newUser = {
      id: "usr_" + Date.now(),
      email: cleanEmail,
      password: userData.password,
      fullName: userData.fullName.trim(),
      phone: userData.phone ? userData.phone.trim() : "",
      address: userData.address ? userData.address.trim() : "",
      role: userData.role || "customer",
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Thử kiểm tra xem email đã tồn tại trên Supabase chưa
      const { data: existing, error: checkErr } = await this.client
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (checkErr && checkErr.code === "PGRST205") {
        throw checkErr; // Bảng chưa tạo trên Supabase, chuyển sang catch fallback
      }

      if (existing) {
        throw new Error("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác!");
      }

      // 2. Thêm vào bảng users trên Supabase
      const { data, error } = await this.client
        .from("users")
        .insert([newUser])
        .select()
        .single();

      if (error) throw error;
      return data || newUser;
    } catch (err) {
      if (err.message && err.message.includes("Email này đã được sử dụng")) {
        throw err;
      }
      // Lưu trữ dự phòng ở localStorage nếu bảng users chưa tạo trên Supabase
      console.warn("Lưu ý: Bảng users chưa có trên Supabase, tự động lưu tài khoản vào thiết bị:", err);
      let localUsers = JSON.parse(localStorage.getItem("yb_local_users") || "[]");
      if (localUsers.some((u) => u.email === cleanEmail)) {
        throw new Error("Email này đã được đăng ký. Vui lòng đăng nhập!");
      }
      localUsers.push(newUser);
      localStorage.setItem("yb_local_users", JSON.stringify(localUsers));
      return newUser;
    }
  }

  // Đăng nhập tài khoản
  async loginUser(identifier, password) {
    const rawId = (identifier || "").trim();
    const cleanId = rawId.toLowerCase();

    // 1. Kiểm tra tài khoản admin mặc định trước (chấp nhận cả 'admin' hoặc 'admin@yenbinhmarket.vn')
    if ((cleanId === "admin" || cleanId === "admin@yenbinhmarket.vn") && password === "admin123") {
      return {
        id: "admin_001",
        email: "admin@yenbinhmarket.vn",
        fullName: "Quản Trị Viên",
        phone: "0988 123 456",
        address: "Thôn Tân Bình, Xã Yên Bình, Yên Bái",
        role: "admin"
      };
    }

    // 2. Tra cứu trong bảng users trên Supabase theo cả Email hoặc Số điện thoại
    if (this.client) {
      try {
        const { data: byEmail } = await this.client
          .from("users")
          .select("*")
          .eq("email", cleanId)
          .eq("password", password)
          .maybeSingle();

        if (byEmail) return byEmail;

        const { data: byPhone } = await this.client
          .from("users")
          .select("*")
          .eq("phone", rawId)
          .eq("password", password)
          .maybeSingle();

        if (byPhone) return byPhone;
      } catch (err) {
        console.warn("Tra cứu Supabase users lỗi, chuyển sang kiểm tra local users:", err);
      }
    }

    // 3. Tra cứu trong danh sách người dùng local
    const localUsers = JSON.parse(localStorage.getItem("yb_local_users") || "[]");
    const localMatch = localUsers.find((u) => {
      const matchEmail = u.email && u.email.trim().toLowerCase() === cleanId;
      const matchPhone = u.phone && u.phone.trim() === rawId;
      const matchName = u.fullName && u.fullName.trim().toLowerCase() === cleanId;
      return (matchEmail || matchPhone || matchName) && u.password === password;
    });
    if (localMatch) return localMatch;

    throw new Error("Tài khoản hoặc mật khẩu không chính xác!");
  }

  // Cập nhật thông tin cá nhân khách hàng
  async updateUserProfile(userId, updates) {
    if (!this.client) throw new Error("Chưa kết nối Supabase");
    try {
      const { data, error } = await this.client
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn("Chưa cập nhật được lên Supabase users:", e);
    }
    // Cập nhật vào localUsers dự phòng
    let localUsers = JSON.parse(localStorage.getItem("yb_local_users") || "[]");
    const idx = localUsers.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      localUsers[idx] = { ...localUsers[idx], ...updates };
      localStorage.setItem("yb_local_users", JSON.stringify(localUsers));
    }
    return updates;
  }
}

// Khởi tạo Database Service
const db = new DatabaseService();

/* ========================================================
   2. TRẠNG THÁI ỨNG DỤNG (STATE)
   ======================================================== */
let currentProducts = [];
let currentUser = JSON.parse(localStorage.getItem("yb_user") || "null");
let cart = {}; // Giỏ hàng riêng biệt theo từng user/khách vãng lai
let activeProductId = null;
let searchTerm = "";
let selectedCategory = "all";

/* ========================================================
   3. HỖ TRỢ XỬ LÝ ẢNH (Image Resizing & FileReader)
   ======================================================== */
// Tối ưu nén ảnh phía client trước khi lưu vào Database để tốc độ nhanh nhất
function compressAndReadImage(file, maxWidth = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Hiển thị thông báo Toast
function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), 3500);
}

// Cuộn mượt đến khu vực danh mục sản phẩm, tính toán trừ đi chiều cao header sticky
function scrollToProductsCatalog() {
  const target = $("catalog-section") || $("category-bar") || $("product-grid");
  if (!target) return;
  const header = document.querySelector("header");
  const headerHeight = header ? header.offsetHeight : 120;
  const targetTop = target.getBoundingClientRect().top + window.pageYOffset;
  const finalScrollTop = Math.max(0, targetTop - headerHeight - 16);

  window.scrollTo({
    top: finalScrollTop,
    behavior: "smooth"
  });
}

// Điều hướng màn hình (View Router)
function showView(name, shouldScrollTop = true) {
  document.querySelectorAll("main > .view, main > section.view").forEach((el) => {
    el.hidden = el.id !== name + "-view";
  });
  if (shouldScrollTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Cập nhật trạng thái active trên navbar
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.go === name);
  });

  if (name === "home") {
    filterProducts();
  } else if (name === "cart") {
    renderCart();
  } else if (name === "checkout") {
    if (!currentUser) {
      toast("Vui lòng đăng nhập để tiến hành mua hàng!");
      setTimeout(() => {
        window.location.href = "login.html?redirect=checkout";
      }, 400);
      return;
    }
    renderCheckout();
  } else if (name === "orders" || name === "manage") {
    window.location.href = "orders.html";
    return;
  }
}

/* ========================================================
   4. RENDER SẢN PHẨM & GIAO DIỆN KHÁCH HÀNG
   ======================================================== */
async function loadProductsFromDB() {
  currentProducts = await db.getAllProducts();
  renderProductsGrid();
}

function renderProductsGrid() {
  const grid = $("product-grid");
  grid.innerHTML = "";

  if (!currentProducts || currentProducts.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-[#cbd8c9] p-8 my-4">
        <i data-lucide="package-open" class="w-12 h-12 text-[#174d37]/40 mx-auto mb-3"></i>
        <h3 class="text-lg font-bold text-[#173626]">Chưa có sản phẩm nào trong cửa hàng</h3>
        <p class="text-sm text-gray-500 mt-1 mb-4">Bạn có thể tự thêm các sản phẩm thực tế kèm ảnh và giá ở mục Quản lý sản phẩm.</p>
        <button type="button" class="primary px-5 py-2.5 text-sm inline-flex items-center gap-2" onclick="showView('manage')">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> Thêm sản phẩm thực tế ngay
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  currentProducts.forEach((p) => {
    const article = document.createElement("article");
    article.className = "card product-card";
    article.dataset.id = p.id;
    article.dataset.category = p.group || "all";

    const img = document.createElement("img");
    img.src = p.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80";
    img.alt = p.name;
    img.className = "product-photo";
    img.loading = "lazy";

    const body = document.createElement("div");
    body.className = "p-5 flex flex-col justify-between";

    body.innerHTML = `
      <div>
        <span class="text-xs font-bold text-[#648047] uppercase tracking-wider">${p.category || "Đặc sản"}</span>
        <h3 class="text-lg font-bold text-[#173626] mt-1.5 mb-2 leading-snug line-clamp-2">${p.name}</h3>
        <p class="muted text-sm mb-3 line-clamp-2">${p.description || "Sản phẩm quê nhà chất lượng cao."}</p>
        <p class="font-bold text-[#174d37] text-lg">${money(p.price)}</p>
        <p class="text-xs text-amber-600 mt-1 flex items-center gap-1">
          <span>★ 5.0</span> <span class="muted">(100% tự nhiên)</span>
        </p>
      </div>
      <div class="flex gap-2 mt-4 pt-2 border-t border-gray-100">
        <button type="button" class="outline flex-1 py-2 text-sm" onclick="openDetail('${p.id}')">Chi tiết</button>
        <button type="button" class="primary flex-1 py-2 text-sm" onclick="addToCart('${p.id}')">Thêm vào giỏ</button>
      </div>
    `;

    article.appendChild(img);
    article.appendChild(body);
    grid.appendChild(article);
  });

  filterProducts();
}

function filterProducts() {
  let count = 0;
  const cards = document.querySelectorAll(".product-card");

  cards.forEach((card) => {
    const p = currentProducts.find((item) => item.id === card.dataset.id);
    if (!p) return;

    const matchesSearch = p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm));
    const matchesCategory = selectedCategory === "all" || p.group === selectedCategory || (p.category && p.category.toLowerCase().includes(selectedCategory));

    const visible = matchesSearch && matchesCategory;
    card.hidden = !visible;
    if (visible) count++;
  });

  $("empty-search").hidden = count > 0;
  $("search-status").hidden = !searchTerm;
  if (searchTerm) {
    $("search-status").textContent = `Kết quả tìm kiếm cho: “${$("search").value.trim()}” (${count} sản phẩm)`;
  }

  document.querySelectorAll("#category-bar button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === selectedCategory);
  });
}

function openDetail(id) {
  const p = currentProducts.find((item) => item.id === id);
  if (!p) return;

  activeProductId = id;
  $("detail-name").textContent = p.name;
  $("detail-category").textContent = p.category;
  $("detail-price").textContent = money(p.price);
  $("detail-description").textContent = p.description;
  $("detail-origin").textContent = p.origin || "Đặc sản tự nhiên Việt Nam";
  $("detail-features").textContent = p.features || "Hương vị thơm ngon truyền thống";
  $("detail-ingredients").textContent = p.ingredients || "100% thành phần tự nhiên";
  $("detail-pack").textContent = p.pack || "Quy cách đóng gói tiêu chuẩn";
  $("detail-usage").textContent = p.usage || "Sử dụng trực tiếp hoặc chế biến món ăn ngon";
  $("detail-quantity").value = 1;

  const photoBox = $("detail-photo");
  photoBox.innerHTML = "";
  if (p.image) {
    const img = document.createElement("img");
    img.src = p.image;
    img.alt = p.name;
    img.className = "w-full h-80 md:h-[420px] object-cover rounded-2xl";
    photoBox.appendChild(img);
  } else {
    photoBox.className = "rounded-2xl bg-[#edf2e8] min-h-64 flex items-center justify-center p-6 text-gray-500";
    photoBox.textContent = "Chưa có ảnh sản phẩm";
  }

  // Sản phẩm liên quan
  const relatedBox = $("related-items");
  relatedBox.innerHTML = "";
  currentProducts
    .filter((x) => x.id !== id)
    .slice(0, 4)
    .forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "outline text-xs px-3 py-2 text-left";
      btn.textContent = item.name;
      btn.onclick = () => openDetail(item.id);
      relatedBox.appendChild(btn);
    });

  showView("detail");
}

/* ========================================================
   5. GIỎ HÀNG RIÊNG BIỆT CHO TỪNG TÀI KHOẢN (User Cart)
   ======================================================== */
function getCartStorageKey() {
  return currentUser && currentUser.id ? `yb_cart_${currentUser.id}` : "yb_cart_guest";
}

function loadCartForCurrentUser(mergeGuest = false) {
  const currentKey = getCartStorageKey();
  if (mergeGuest && currentUser) {
    const guestCart = JSON.parse(localStorage.getItem("yb_cart_guest") || "{}");
    const userCart = JSON.parse(localStorage.getItem(currentKey) || "{}");
    for (const [prodId, qty] of Object.entries(guestCart)) {
      userCart[prodId] = Math.min(99, (userCart[prodId] || 0) + qty);
    }
    localStorage.setItem(currentKey, JSON.stringify(userCart));
    localStorage.removeItem("yb_cart_guest");
    cart = userCart;
  } else {
    cart = JSON.parse(localStorage.getItem(currentKey) || "{}");
  }
  renderCartCount();
  if (!$("cart-view").hidden) renderCart();
  if (!$("checkout-view").hidden) renderCheckout();
}

function saveCart() {
  localStorage.setItem(getCartStorageKey(), JSON.stringify(cart));
}

function addToCart(id, count = 1) {
  const p = currentProducts.find((item) => item.id === id);
  if (!p) return;
  cart[id] = Math.min(99, (cart[id] || 0) + count);
  saveCart();
  renderCartCount();
  toast(`Đã thêm "${p.name.slice(0, 30)}..." vào giỏ!`);
}

function renderCartCount() {
  const total = Object.values(cart).reduce((a, b) => a + b, 0);
  $("cart-count").textContent = total;
}

function getCartEntries() {
  return Object.entries(cart)
    .map(([id, quantity]) => ({
      product: currentProducts.find((p) => p.id === id),
      quantity
    }))
    .filter((entry) => entry.product);
}

function getCartTotal() {
  return getCartEntries().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function renderCart() {
  const box = $("cart-items");
  box.innerHTML = "";
  const entries = getCartEntries();

  if (!entries.length) {
    box.innerHTML = `
      <div class="bg-white border rounded-2xl p-8 text-center">
        <p class="muted text-lg mb-4">Giỏ hàng của bạn đang trống.</p>
        <button type="button" class="primary" onclick="showView('home')">Khám phá sản phẩm ngay</button>
      </div>
    `;
    $("cart-total").textContent = money(0);
    $("checkout-button").disabled = true;
    return;
  }

  entries.forEach(({ product: p, quantity: q }) => {
    const row = document.createElement("article");
    row.className = "bg-white border rounded-2xl p-4 flex flex-wrap sm:flex-nowrap gap-4 items-center";

    const img = document.createElement("img");
    img.src = p.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=200&q=80";
    img.alt = p.name;
    img.className = "w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover";

    const body = document.createElement("div");
    body.className = "flex-1 min-w-[200px]";

    body.innerHTML = `
      <h3 class="font-bold text-[#173626] mb-1">${p.name}</h3>
      <p class="text-[#174d37] font-bold mb-2">${money(p.price)}</p>
      <div class="flex items-center gap-4">
        <div class="qty">
          <button type="button" onclick="updateCartItem('${p.id}', -1)" aria-label="Giảm">−</button>
          <span>${q}</span>
          <button type="button" onclick="updateCartItem('${p.id}', 1)" aria-label="Tăng">+</button>
        </div>
        <button type="button" class="text-red-600 hover:text-red-800 text-sm font-semibold underline" onclick="removeFromCart('${p.id}')">
          Xóa
        </button>
      </div>
    `;

    row.appendChild(img);
    row.appendChild(body);
    box.appendChild(row);
  });

  $("cart-total").textContent = money(getCartTotal());
  $("checkout-button").disabled = false;
}

function updateCartItem(id, change) {
  if (!cart[id]) return;
  cart[id] += change;
  if (cart[id] <= 0) {
    delete cart[id];
  } else if (cart[id] > 99) {
    cart[id] = 99;
  }
  saveCart();
  renderCartCount();
  renderCart();
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  renderCartCount();
  renderCart();
  toast("Đã bỏ sản phẩm khỏi giỏ hàng.");
}

function renderCheckout() {
  if (!currentUser) {
    toast("Vui lòng đăng nhập để tiến hành mua hàng!");
    window.location.href = "login.html?redirect=checkout";
    return;
  }

  const box = $("checkout-items");
  box.innerHTML = "";
  const entries = getCartEntries();

  entries.forEach(({ product: p, quantity: q }) => {
    const line = document.createElement("div");
    line.className = "flex justify-between gap-3 text-sm pb-2 border-b border-gray-200";
    line.innerHTML = `
      <span class="text-[#173626] font-medium">${p.name} <span class="text-gray-500">× ${q}</span></span>
      <strong class="whitespace-nowrap text-[#174d37]">${money(p.price * q)}</strong>
    `;
    box.appendChild(line);
  });

  $("checkout-total").textContent = `Tổng thanh toán: ${money(getCartTotal())}`;

  // Tự động điền thông tin khách hàng từ tài khoản
  const banner = $("checkout-auth-banner");
  if (banner) {
    banner.className = "p-4 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3 border bg-emerald-50 border-emerald-200 text-emerald-900";
    banner.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="user-check" class="w-5 h-5 text-emerald-700"></i>
        <span>Đang đặt hàng với tài khoản: <strong>${currentUser.fullName}</strong> (${currentUser.phone || "Chưa có SĐT"}). Thông tin nhận hàng đã được điền sẵn từ tài khoản của bạn.</span>
      </div>
    `;
    if (!$("customer-name").value) $("customer-name").value = currentUser.fullName || "";
    if (!$("customer-phone").value) $("customer-phone").value = currentUser.phone || "";
    if (!$("customer-address").value) $("customer-address").value = currentUser.address || "";
    if (window.lucide) lucide.createIcons();
  }
}

/* ========================================================
   5. HỆ THỐNG XÁC THỰC TÀI KHOẢN & PHÂN QUYỀN (Auth UI)
   ======================================================== */
function initAuthUI() {
  updateAuthUI();
  const headerLogoutBtn = $("header-logout-btn");
  if (headerLogoutBtn) headerLogoutBtn.onclick = logout;
}

function updateAuthUI() {
  const label = $("account-btn-label");
  const accountBtn = $("account-button");
  const logoutBtn = $("header-logout-btn");
  const ordersLink = $("nav-orders-link");
  const ordersLabel = $("nav-orders-label");

  if (currentUser) {
    if (label) label.textContent = currentUser.fullName || "Tài khoản";
    if (accountBtn) {
      accountBtn.href = "orders.html";
      accountBtn.onclick = null;
    }
    if (ordersLink) {
      ordersLink.hidden = false;
      if (ordersLabel) {
        ordersLabel.textContent = currentUser.role === "admin" ? "Quản Trị Đơn Hàng" : "Đơn Hàng Của Tôi";
      }
    }
    if (logoutBtn) logoutBtn.hidden = false;
  } else {
    if (label) label.textContent = "Đăng nhập";
    if (accountBtn) {
      accountBtn.href = "login.html";
      accountBtn.onclick = null;
    }
    if (ordersLink) ordersLink.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
  }
  if (window.lucide) lucide.createIcons();
}

function logout() {
  currentUser = null;
  localStorage.removeItem("yb_user");
  loadCartForCurrentUser(false);
  toast("Đã đăng xuất tài khoản.");
  updateAuthUI();
  if (!$("checkout-view").hidden) {
    renderCheckout();
  }
}

/* ========================================================
   6. KHỞI TẠO VÀ GẮN SỰ KIỆN (DOM Ready)
   ======================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Khởi tạo icon
  if (window.lucide) lucide.createIcons();

  // Cập nhật lại currentUser mới nhất từ localStorage
  currentUser = JSON.parse(localStorage.getItem("yb_user") || "null");

  // Khởi tạo hệ thống xác thực tài khoản
  initAuthUI();

  // Tải giỏ hàng riêng biệt theo user hiện tại
  loadCartForCurrentUser(false);

  // Điều hướng trang theo data-go
  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.go;
      if (target === "products") {
        showView("home", false);
        setTimeout(scrollToProductsCatalog, 60);
      } else {
        showView(target);
      }
    });
  });

  // Lọc theo danh mục
  document.querySelectorAll("#category-bar button").forEach((btn) => {
    btn.onclick = () => {
      selectedCategory = btn.dataset.category;
      filterProducts();
    };
  });

  // Tìm kiếm
  $("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    searchTerm = $("search").value.trim().toLowerCase();
    selectedCategory = "all";
    showView("home", false);
    filterProducts();
    setTimeout(scrollToProductsCatalog, 60);
  });

  $("search").addEventListener("input", () => {
    searchTerm = $("search").value.trim().toLowerCase();
    filterProducts();
  });

  // Chi tiết sản phẩm: thêm vào giỏ và mua ngay
  $("detail-add").onclick = () => {
    const qty = parseInt($("detail-quantity").value) || 1;
    if (activeProductId) addToCart(activeProductId, qty);
  };

  $("detail-buy").onclick = () => {
    const qty = parseInt($("detail-quantity").value) || 1;
    if (activeProductId) {
      addToCart(activeProductId, qty);
      if (!currentUser) {
        toast("Vui lòng đăng nhập để tiến hành mua hàng!");
        setTimeout(() => {
          window.location.href = "login.html?redirect=checkout";
        }, 400);
        return;
      }
      showView("checkout");
    }
  };

  // Nút chuyển sang thanh toán (bắt buộc đăng nhập trước khi mua hàng)
  $("checkout-button").onclick = () => {
    if (!getCartEntries().length) {
      toast("Giỏ hàng của bạn đang trống!");
      return;
    }
    if (!currentUser) {
      toast("Vui lòng đăng nhập để tiến hành mua hàng!");
      setTimeout(() => {
        window.location.href = "login.html?redirect=checkout";
      }, 400);
      return;
    }
    showView("checkout");
  };

  // Xử lý hash URL ngay lập tức
  const applyHashRoute = () => {
    const hash = window.location.hash.replace("#", "").trim();
    if (hash === "manage" || hash === "orders") {
      window.location.href = "orders.html";
      return;
    }
    if (hash === "checkout") {
      if (!currentUser) {
        window.location.href = "login.html?redirect=checkout";
        return;
      }
    }
    if (["home", "cart", "checkout", "about", "contact", "policy"].includes(hash)) {
      showView(hash);
    }
  };
  applyHashRoute();
  window.addEventListener("hashchange", applyHashRoute);

  // Khởi tạo cơ sở dữ liệu Supabase và tải sản phẩm
  try {
    await db.init();
    await loadProductsFromDB();
  } catch (err) {
    console.error("Lỗi khởi tạo Supabase:", err);
    currentProducts = initialProducts;
    renderProductsGrid();
  }

  // Xem chính sách
  document.querySelectorAll("[data-policy]").forEach((btn) => {
    btn.onclick = () => {
      const [title, copy] = policies[btn.dataset.policy] || ["Chính sách", ""];
      $("policy-title").textContent = title;
      $("policy-copy").textContent = copy;
      showView("policy");
    };
  });

  // Submit đơn hàng (Chuyển trực tiếp tới Quản trị viên, không thanh toán)
  $("order-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      toast("Vui lòng đăng nhập để tiến hành mua hàng!");
      setTimeout(() => {
        window.location.href = "login.html?redirect=checkout";
      }, 400);
      return;
    }

    const items = getCartEntries();
    if (!items.length) {
      toast("Giỏ hàng của bạn đang trống!");
      return;
    }

    const name = $("customer-name").value.trim();
    const phone = $("customer-phone").value.trim();
    const address = $("customer-address").value.trim();
    const note = $("customer-note").value.trim();

    if (!name || !phone || !address) {
      toast("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Địa chỉ nhận hàng!");
      return;
    }

    const orderSubmitBtn = $("order-submit");
    orderSubmitBtn.disabled = true;
    orderSubmitBtn.textContent = "Đang chuyển đơn hàng tới Quản trị viên...";

    const orderCode = "YB-" + Date.now().toString(36).toUpperCase();
    const orderData = {
      orderCode,
      userId: currentUser.id,
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      customerNote: note,
      paymentMethod: "Chuyển đơn tới Quản trị viên (Không thanh toán online)",
      items: items.map((x) => ({ id: x.product.id, name: x.product.name, price: x.product.price, qty: x.quantity })),
      totalAmount: getCartTotal(),
      status: "Chờ xác nhận",
      createdAt: new Date().toISOString()
    };

    try {
      await db.createOrder(orderData);
      
      const userOrderKey = `yb_user_orders_${currentUser.id}`;
      const userOrders = JSON.parse(localStorage.getItem(userOrderKey) || "[]");
      userOrders.unshift(orderData);
      localStorage.setItem(userOrderKey, JSON.stringify(userOrders));

      cart = {};
      saveCart();
      renderCartCount();
      $("order-form").reset();
      $("success-code").textContent = `Mã đơn hàng: ${orderCode}`;
      toast("Đơn hàng đã được chuyển tới Quản trị viên thành công!");
      showView("success");
    } catch (err) {
      console.error(err);
      toast("Không thể lưu đơn hàng vào Database. Vui lòng kiểm tra kết nối mạng!");
    } finally {
      orderSubmitBtn.disabled = false;
      orderSubmitBtn.innerHTML = `<i data-lucide="send" class="w-5 h-5"></i> <span>Gửi Đơn Hàng Tới Quản Trị Viên</span>`;
      if (window.lucide) lucide.createIcons();
    }
  });
});
