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

  // Lấy danh sách đơn hàng của 1 khách hàng cụ thể
  async getUserOrders(userId) {
    if (!this.client || !userId) return [];
    try {
      const { data, error } = await this.client
        .from("orders")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false });
      if (error) return [];
      return data || [];
    } catch (err) {
      return [];
    }
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
let currentImageBase64 = ""; // Giữ chuỗi ảnh đang chọn tải lên
let adminOrders = [];
let adminOrdersFilter = "all";
let manualOrderDraftItems = [];
let activeAdminTab = "orders";

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
    renderCheckout();
  } else if (name === "manage") {
    if (!currentUser || currentUser.role !== "admin") {
      window.location.href = "login.html?redirect=manage";
      return;
    }
    setupAdminPortal();
  }
}

/* ========================================================
   4. RENDER SẢN PHẨM & GIAO DIỆN KHÁCH HÀNG
   ======================================================== */
async function loadProductsFromDB() {
  currentProducts = await db.getAllProducts();
  renderProductsGrid();
  renderManageList();
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

  // Tự động cập nhật banner và điền thông tin khách hàng nếu đã đăng nhập
  const banner = $("checkout-auth-banner");
  if (banner) {
    if (currentUser) {
      banner.className = "p-4 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3 border bg-emerald-50 border-emerald-200 text-emerald-900";
      banner.innerHTML = `
        <div class="flex items-center gap-2">
          <i data-lucide="user-check" class="w-5 h-5 text-emerald-700"></i>
          <span>Đang đặt hàng với tài khoản: <strong>${currentUser.fullName}</strong> (${currentUser.phone || "Chưa có SĐT"}). Địa chỉ và SĐT đã được điền sẵn từ tài khoản của bạn.</span>
        </div>
      `;
      if (!$("customer-name").value) $("customer-name").value = currentUser.fullName || "";
      if (!$("customer-phone").value) $("customer-phone").value = currentUser.phone || "";
      if (!$("customer-address").value) $("customer-address").value = currentUser.address || "";
    } else {
      banner.className = "p-4 rounded-xl text-sm flex flex-wrap items-center justify-between gap-3 border bg-amber-50 border-amber-200 text-amber-900";
      banner.innerHTML = `
        <div class="flex items-center gap-2">
          <i data-lucide="info" class="w-5 h-5 text-amber-700"></i>
          <span>Bạn đã có tài khoản? <a href="login.html?redirect=checkout" class="underline font-bold text-amber-950 hover:text-green-800">Đăng nhập ngay</a> để tự động điền địa chỉ giao hàng.</span>
        </div>
        <a href="login.html?redirect=checkout" class="outline text-xs px-3 py-1.5 font-bold border-amber-300 text-amber-900 hover:bg-white inline-block">Đăng nhập ngay</a>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }
}

/* ========================================================
   6. QUẢN LÝ SẢN PHẨM & CƠ SỞ DỮ LIỆU (DATABASE ADMIN)
   ======================================================== */
function setupImageUploadHandlers() {
  const fileInput = $("p-image-file");
  const urlInput = $("p-image-url");
  const previewBox = $("image-preview-container");
  const previewImg = $("image-preview");
  const removeBtn = $("image-preview-remove");
  const uploadZone = $("image-upload-zone");

  // Xử lý kéo thả và click chọn file
  uploadZone.addEventListener("click", () => fileInput.click());

  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("dragover");
  });

  uploadZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedImage(e.dataTransfer.files[0]);
    }
  });

  // Khi chọn file ảnh từ máy
  fileInput.addEventListener("change", async (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedImage(e.target.files[0]);
    }
  });

  // Khi nhập đường link URL ảnh trực tuyến
  urlInput.addEventListener("input", () => {
    const url = urlInput.value.trim();
    if (url) {
      currentImageBase64 = url;
      previewImg.src = url;
      previewBox.hidden = false;
    } else {
      currentImageBase64 = "";
      previewBox.hidden = true;
    }
  });

  // Nút xóa ảnh xem trước
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentImageBase64 = "";
    fileInput.value = "";
    urlInput.value = "";
    previewBox.hidden = true;
    previewImg.src = "";
  });

  async function handleSelectedImage(file) {
    if (!file.type.startsWith("image/")) {
      toast("Vui lòng chọn một tệp hình ảnh (JPG, PNG, WEBP)!");
      return;
    }
    try {
      toast("Đang tải và tối ưu ảnh...");
      const compressedDataUrl = await compressAndReadImage(file);
      currentImageBase64 = compressedDataUrl;
      previewImg.src = compressedDataUrl;
      previewBox.hidden = false;
      urlInput.value = ""; // Xóa url nếu đã chọn file
      toast("Đã thêm ảnh thành công!");
    } catch (err) {
      console.error(err);
      toast("Lỗi khi xử lý hình ảnh.");
    }
  }
}

// Render bảng quản lý sản phẩm trong database
function renderManageList() {
  const listEl = $("manage-products-list");
  if (!listEl) return;

  $("db-total-count").textContent = `${currentProducts.length} sản phẩm trong Database`;

  listEl.innerHTML = "";
  if (!currentProducts.length) {
    listEl.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-gray-500">Chưa có sản phẩm nào trong cơ sở dữ liệu.</td></tr>`;
    return;
  }

  currentProducts.forEach((p, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-bold text-gray-400 w-12 text-center">${idx + 1}</td>
      <td class="w-16">
        <img src="${p.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=100&q=80"}" alt="${p.name}" class="table-thumb">
      </td>
      <td>
        <div class="font-bold text-[#173626]">${p.name}</div>
        <div class="text-xs text-gray-500">${p.category || "Chưa phân loại"} · ID: ${p.id}</div>
      </td>
      <td class="font-bold text-[#174d37] whitespace-nowrap">${money(p.price)}</td>
      <td class="text-right whitespace-nowrap">
        <button type="button" class="danger-btn" onclick="deleteProductFromDB('${p.id}')">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Xóa
        </button>
      </td>
    `;
    listEl.appendChild(tr);
  });

  if (window.lucide) lucide.createIcons();
}

async function deleteProductFromDB(id) {
  if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi cơ sở dữ liệu?")) return;
  try {
    await db.deleteProduct(id);
    if (cart[id]) {
      delete cart[id];
      saveCart();
      renderCartCount();
    }
    toast("Đã xóa sản phẩm thành công!");
    await loadProductsFromDB();
  } catch (err) {
    console.error(err);
    toast("Không thể xóa sản phẩm.");
  }
}

async function resetDatabaseToDefault() {
  if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ sản phẩm hiện tại trong Database?")) return;
  try {
    await db.resetToDefault();
    cart = {};
    saveCart();
    renderCartCount();
    toast("Đã dọn dẹp sạch toàn bộ sản phẩm trong Database!");
    await loadProductsFromDB();
  } catch (err) {
    console.error(err);
    toast("Lỗi khi xóa dữ liệu.");
  }
}

/* ========================================================
   6. HỆ THỐNG QUẢN TRỊ ADMIN (Admin Portal)
   ======================================================== */
async function setupAdminPortal() {
  if (!currentUser || currentUser.role !== "admin") {
    window.location.href = "login.html?redirect=manage";
    return;
  }

  const greetingEl = $("admin-greeting");
  if (greetingEl) greetingEl.textContent = `(Xin chào, ${currentUser.fullName})`;
  
  // Nạp danh sách đơn hàng và danh sách sản phẩm
  switchAdminTab(activeAdminTab || "orders");
  await loadAdminOrders();
  initManualOrderProductsDropdown();
  renderManageList();
}

function switchAdminTab(tabName) {
  activeAdminTab = tabName;
  const tabs = ["orders", "new-order", "products"];
  
  tabs.forEach((t) => {
    const btn = $(`tab-btn-${t}`);
    const panel = $(`panel-admin-${t}`);
    const isActive = t === tabName;
    if (btn) {
      if (isActive) {
        btn.className = "admin-tab-btn flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-[#174d37] text-white shadow-sm";
      } else {
        btn.className = "admin-tab-btn flex-1 min-w-[140px] py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 text-gray-700 hover:bg-white/60";
      }
    }
    if (panel) panel.hidden = !isActive;
  });
  if (window.lucide) lucide.createIcons();
}

async function loadAdminOrders() {
  try {
    adminOrders = await db.getAllOrders();
    $("badge-total-orders").textContent = adminOrders.length;
    renderAdminOrders(adminOrdersFilter);
  } catch (err) {
    console.error("Lỗi khi tải danh sách đơn hàng:", err);
    $("admin-orders-list").innerHTML = `<tr><td colspan="7" class="text-center py-6 text-red-500">Không thể tải danh sách đơn hàng từ Supabase. Vui lòng kiểm tra kết nối mạng.</td></tr>`;
  }
}

function renderAdminOrders(filterStatus = "all") {
  adminOrdersFilter = filterStatus;
  const tbody = $("admin-orders-list");
  if (!tbody) return;

  // Cập nhật trạng thái nút lọc
  document.querySelectorAll(".order-filter-btn").forEach((btn) => {
    const isAct = btn.dataset.status === filterStatus;
    btn.className = isAct
      ? "order-filter-btn text-xs px-3 py-1.5 rounded-lg border font-semibold bg-[#174d37] text-white"
      : "order-filter-btn text-xs px-3 py-1.5 rounded-lg border font-semibold bg-white text-gray-700 hover:bg-gray-50";
  });

  const filtered = filterStatus === "all"
    ? adminOrders
    : adminOrders.filter((o) => o.status === filterStatus);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400">Không có đơn hàng nào ${filterStatus !== "all" ? `ở trạng thái "${filterStatus}"` : ""}.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  filtered.forEach((order) => {
    const tr = document.createElement("tr");
    
    // Parse ngày giờ
    const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "Vừa xong";
    
    // Parse danh sách món
    const itemsList = Array.isArray(order.items)
      ? order.items.map((it) => `<div class="text-xs text-gray-700 font-medium">• ${it.name} <span class="text-gray-500 font-bold">x${it.qty || 1}</span></div>`).join("")
      : `<div class="text-xs text-gray-400 italic">Chi tiết không xác định</div>`;

    // Màu trạng thái
    let statusColor = "bg-amber-100 text-amber-800 border-amber-300";
    if (order.status === "Đang giao") statusColor = "bg-blue-100 text-blue-800 border-blue-300";
    if (order.status === "Hoàn thành") statusColor = "bg-green-100 text-green-800 border-green-300";
    if (order.status === "Đã hủy") statusColor = "bg-red-100 text-red-800 border-red-300";

    tr.innerHTML = `
      <td>
        <strong class="text-xs text-[#173626] block font-mono">${order.orderCode || "YB-" + order.id}</strong>
        <span class="text-[11px] text-gray-400">${dateStr}</span>
      </td>
      <td>
        <div class="font-bold text-sm text-[#173626]">${order.customerName || "Khách hàng"}</div>
        <a href="tel:${order.customerPhone}" class="text-xs text-[#174d37] hover:underline font-semibold block mt-0.5">
          <i data-lucide="phone" class="w-3 h-3 inline mr-1"></i>${order.customerPhone || "Chưa có SĐT"}
        </a>
      </td>
      <td class="max-w-xs text-xs text-gray-600">
        <div>${order.customerAddress || "Chưa có địa chỉ"}</div>
        ${order.customerNote ? `<div class="text-[11px] text-amber-700 italic mt-1 bg-amber-50 p-1 rounded">Ghi chú: ${order.customerNote}</div>` : ""}
      </td>
      <td class="min-w-[180px]">
        ${itemsList}
      </td>
      <td class="whitespace-nowrap font-bold text-sm text-[#174d37]">
        ${money(order.totalAmount || 0)}
        <span class="block text-[11px] font-normal text-gray-500">${order.paymentMethod || "COD"}</span>
      </td>
      <td class="whitespace-nowrap">
        <select class="text-xs font-bold py-1 px-2 rounded-lg border ${statusColor} outline-none cursor-pointer" onchange="updateOrderStatusInDB('${order.id}', this.value)">
          <option value="Chờ xác nhận" ${order.status === "Chờ xác nhận" ? "selected" : ""}>Chờ xác nhận</option>
          <option value="Đang giao" ${order.status === "Đang giao" ? "selected" : ""}>Đang giao</option>
          <option value="Hoàn thành" ${order.status === "Hoàn thành" ? "selected" : ""}>Hoàn thành</option>
          <option value="Đã hủy" ${order.status === "Đã hủy" ? "selected" : ""}>Đã hủy</option>
        </select>
      </td>
      <td class="text-right whitespace-nowrap">
        <button type="button" class="danger-btn text-xs px-2.5 py-1" onclick="deleteOrderInDB('${order.id}')" title="Xóa đơn hàng này">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

async function updateOrderStatusInDB(orderId, newStatus) {
  try {
    toast(`Đang cập nhật trạng thái đơn sang "${newStatus}"...`);
    await db.updateOrderStatus(orderId, newStatus);
    const order = adminOrders.find((o) => String(o.id) === String(orderId));
    if (order) order.status = newStatus;
    toast(`Cập nhật đơn hàng thành công!`);
    renderAdminOrders(adminOrdersFilter);
  } catch (err) {
    console.error("Lỗi cập nhật trạng thái đơn:", err);
    toast("Không thể cập nhật trạng thái đơn hàng.");
  }
}

async function deleteOrderInDB(orderId) {
  if (!confirm("Bạn có chắc chắn muốn xóa đơn hàng này khỏi Database?")) return;
  try {
    await db.deleteOrder(orderId);
    adminOrders = adminOrders.filter((o) => String(o.id) !== String(orderId));
    $("badge-total-orders").textContent = adminOrders.length;
    toast("Đã xóa đơn hàng thành công!");
    renderAdminOrders(adminOrdersFilter);
  } catch (err) {
    console.error("Lỗi xóa đơn hàng:", err);
    toast("Không thể xóa đơn hàng.");
  }
}

// KHỞI TẠO TẠO ĐƠN HÀNG THỦ CÔNG CHO ADMIN
function initManualOrderProductsDropdown() {
  const select = $("manual-order-product");
  if (!select) return;
  select.innerHTML = `<option value="">-- Chọn sản phẩm có trong kho --</option>`;
  currentProducts.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} - ${money(p.price)}`;
    select.appendChild(opt);
  });
}

function renderManualOrderItems() {
  const box = $("manual-order-items-list");
  const totalEl = $("manual-order-total");
  if (!box) return;

  if (!manualOrderDraftItems.length) {
    box.innerHTML = `<p class="text-xs text-gray-400 italic">Chưa chọn sản phẩm nào.</p>`;
    if (totalEl) totalEl.textContent = "0 ₫";
    return;
  }

  let total = 0;
  box.innerHTML = "";
  manualOrderDraftItems.forEach((item, idx) => {
    const lineTotal = item.product.price * item.qty;
    total += lineTotal;
    const div = document.createElement("div");
    div.className = "flex items-center justify-between text-xs py-1.5 px-2 bg-white rounded border border-gray-200";
    div.innerHTML = `
      <div class="flex-1 min-w-0 pr-2">
        <strong class="text-gray-800 truncate block">${item.product.name}</strong>
        <span class="text-gray-400">${money(item.product.price)} × ${item.qty} = <span class="font-bold text-[#174d37]">${money(lineTotal)}</span></span>
      </div>
      <button type="button" class="text-red-600 hover:text-red-800 p-1 font-bold" onclick="removeManualOrderItem(${idx})" title="Xóa món này">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;
    box.appendChild(div);
  });
  if (totalEl) totalEl.textContent = money(total);
  if (window.lucide) lucide.createIcons();
}

function removeManualOrderItem(index) {
  manualOrderDraftItems.splice(index, 1);
  renderManualOrderItems();
}

/* ========================================================
   7. HỆ THỐNG XÁC THỰC TÀI KHOẢN & PHÂN QUYỀN (Auth UI)
   ======================================================== */
function initAuthUI() {
  updateAuthUI();

  // Nút đăng xuất trên header
  const headerLogoutBtn = $("header-logout-btn");
  if (headerLogoutBtn) headerLogoutBtn.onclick = logout;

  // Nút đăng xuất trên trang Admin
  const adminLogoutBtn = $("admin-logout-btn");
  if (adminLogoutBtn) adminLogoutBtn.onclick = logout;

  // Tab switcher admin
  if ($("tab-btn-orders")) $("tab-btn-orders").onclick = () => switchAdminTab("orders");
  if ($("tab-btn-new-order")) $("tab-btn-new-order").onclick = () => switchAdminTab("new-order");
  if ($("tab-btn-products")) $("tab-btn-products").onclick = () => switchAdminTab("products");
  if ($("btn-refresh-orders")) $("btn-refresh-orders").onclick = loadAdminOrders;

  // Thêm món vào đơn thủ công
  if ($("btn-add-item-to-manual-order")) {
    $("btn-add-item-to-manual-order").onclick = () => {
      const sel = $("manual-order-product");
      const qty = parseInt($("manual-order-qty").value) || 1;
      const prodId = sel.value;
      if (!prodId) {
        toast("Vui lòng chọn một sản phẩm từ kho!");
        return;
      }
      const product = currentProducts.find((p) => p.id === prodId);
      if (!product) return;

      const existing = manualOrderDraftItems.find((it) => it.product.id === prodId);
      if (existing) {
        existing.qty += qty;
      } else {
        manualOrderDraftItems.push({ product, qty });
      }
      renderManualOrderItems();
      toast(`Đã thêm "${product.name}" vào đơn!`);
    };
  }

  // Submit tạo đơn hàng thủ công
  const adminCreateOrderForm = $("admin-create-order-form");
  if (adminCreateOrderForm) {
    adminCreateOrderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!manualOrderDraftItems.length) {
        toast("Đơn hàng phải có ít nhất 1 sản phẩm!");
        return;
      }

      const name = $("manual-customer-name").value.trim();
      const phone = $("manual-customer-phone").value.trim();
      const address = $("manual-customer-address").value.trim();
      const payment = $("manual-payment").value;
      const status = $("manual-status").value;
      const note = $("manual-note").value.trim();

      if (!name || !phone || !address) {
        toast("Vui lòng điền đủ Tên, SĐT và Địa chỉ khách!");
        return;
      }

      const total = manualOrderDraftItems.reduce((acc, it) => acc + (it.product.price * it.qty), 0);
      const orderCode = "YB-ADM-" + Date.now().toString(36).toUpperCase();

      const orderData = {
        orderCode,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        customerNote: note,
        paymentMethod: payment,
        items: manualOrderDraftItems.map((x) => ({ id: x.product.id, name: x.product.name, price: x.product.price, qty: x.qty })),
        totalAmount: total,
        status: status,
        createdAt: new Date().toISOString()
      };

      try {
        toast("Đang lưu đơn hàng lên Database...");
        await db.createOrder(orderData);
        toast("Tạo đơn hàng thủ công thành công!");
        $("admin-create-order-form").reset();
        manualOrderDraftItems = [];
        renderManualOrderItems();
        switchAdminTab("orders");
        await loadAdminOrders();
      } catch (err) {
        console.error("Lỗi khi tạo đơn thủ công:", err);
        toast("Không thể lưu đơn hàng vào Database.");
      }
    });
  }
}

function updateAuthUI() {
  const label = $("account-btn-label");
  const accountBtn = $("account-button");
  const logoutBtn = $("header-logout-btn");
  const adminNav = $("nav-manage-btn");

  if (currentUser) {
    if (label) label.textContent = currentUser.fullName || "Tài khoản";
    if (accountBtn) {
      accountBtn.href = "javascript:void(0)";
      accountBtn.onclick = () => {
        if (currentUser.role === "admin") {
          showView("manage");
        }
      };
    }
    if (logoutBtn) logoutBtn.hidden = false;
    if (adminNav) adminNav.hidden = currentUser.role !== "admin";
  } else {
    if (label) label.textContent = "Đăng nhập";
    if (accountBtn) {
      accountBtn.href = "login.html";
      accountBtn.onclick = null;
    }
    if (logoutBtn) logoutBtn.hidden = true;
    if (adminNav) adminNav.hidden = true;
  }
  if (window.lucide) lucide.createIcons();
}

function logout() {
  currentUser = null;
  localStorage.removeItem("yb_user");
  loadCartForCurrentUser(false);
  toast("Đã đăng xuất tài khoản.");
  updateAuthUI();
  if (!$("manage-view").hidden) {
    showView("home");
  }
  if (!$("checkout-view").hidden) {
    renderCheckout();
  }
}

/* ========================================================
   8. KHỞI TẠO VÀ GẮN SỰ KIỆN (DOM Ready)
   ======================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Khởi tạo icon
  if (window.lucide) lucide.createIcons();

  // Cập nhật lại currentUser mới nhất từ localStorage
  currentUser = JSON.parse(localStorage.getItem("yb_user") || "null");

  // Khởi tạo hệ thống xác thực tài khoản & Quản trị ngay lập tức
  initAuthUI();

  // Tải giỏ hàng riêng biệt theo user hiện tại
  loadCartForCurrentUser(false);

  // Khởi tạo sự kiện upload ảnh
  setupImageUploadHandlers();

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
      showView("cart");
    }
  };

  // Nút chuyển sang thanh toán
  $("checkout-button").onclick = () => {
    if (getCartEntries().length) showView("checkout");
  };

  // Xử lý hash URL ngay lập tức (ví dụ sau khi đăng nhập chuyển về #checkout hoặc #manage)
  const applyHashRoute = () => {
    const hash = window.location.hash.replace("#", "").trim();
    if (["home", "cart", "checkout", "manage"].includes(hash)) {
      showView(hash);
    }
  };
  applyHashRoute();
  window.addEventListener("hashchange", applyHashRoute);

  // Khởi tạo cơ sở dữ liệu Supabase và tải sản phẩm
  try {
    await db.init();
    $("manage-status").textContent = "Cơ sở dữ liệu Supabase Cloud Database đã kết nối thành công!";
    $("manage-status").className = "sm:col-span-2 text-sm text-[#174d37] font-semibold";
    await loadProductsFromDB();
    if (!$("manage-view").hidden && currentUser && currentUser.role === "admin") {
      initManualOrderProductsDropdown();
      renderManageList();
    }
  } catch (err) {
    console.error("Lỗi khởi tạo Supabase:", err);
    $("manage-status").textContent = "Chưa kết nối được bảng Supabase. Hãy chạy mã SQL tạo bảng trong SQL Editor trên Supabase!";
    $("manage-status").className = "sm:col-span-2 text-sm text-amber-700 font-semibold";
    currentProducts = initialProducts;
    renderProductsGrid();
    renderManageList();
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
      userId: currentUser ? currentUser.id : null,
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

  // SUBMIT THÊM SẢN PHẨM MỚI KÈM HÌNH ẢNH VÀO DATABASE
  $("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = $("product-submit");
    const name = $("p-name").value.trim();
    const category = $("p-category").value.trim();
    const price = Number($("p-price").value);
    const desc = $("p-description").value.trim();
    const origin = $("p-origin").value.trim();
    const pack = $("p-pack").value.trim();
    const group = $("p-group").value || "all";

    if (!name || !price) {
      toast("Vui lòng điền đầy đủ Tên và Giá sản phẩm!");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Đang lưu vào Database...";

    // Tự sinh ID sản phẩm duy nhất
    const newId = "prod_" + Date.now();

    // Ảnh sản phẩm: ưu tiên ảnh vừa chọn tải lên, nếu không có thì dùng ảnh mặc định theo danh mục
    let productImg = currentImageBase64;
    if (!productImg) {
      productImg = "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80";
    }

    const newProduct = {
      id: newId,
      name,
      category: category || "Đặc sản",
      group,
      price,
      image: productImg,
      description: desc || "Sản phẩm đặc sản thiên nhiên nguyên chất.",
      features: "Được kiểm duyệt chất lượng nghiêm ngặt trước khi xuất bán.",
      ingredients: "100% nguyên liệu tự nhiên chọn lọc.",
      origin: origin || "Việt Nam",
      pack: pack || "Đóng gói tiêu chuẩn",
      usage: "Dùng trực tiếp hoặc chế biến theo sở thích.",
      createdAt: new Date().toISOString()
    };

    try {
      await db.addProduct(newProduct);
      $("product-form").reset();
      currentImageBase64 = "";
      $("image-preview-container").hidden = true;
      $("image-preview").src = "";
      toast("Thêm sản phẩm và hình ảnh vào Database thành công!");
      await loadProductsFromDB();
    } catch (err) {
      console.error(err);
      toast("Lỗi khi lưu sản phẩm vào cơ sở dữ liệu.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Lưu sản phẩm vào Database";
    }
  });

  // Nút reset database
  $("btn-reset-db").addEventListener("click", resetDatabaseToDefault);
});
