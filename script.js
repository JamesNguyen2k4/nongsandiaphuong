/**
 * YÊN BÌNH MARKET - CLIENT & DATABASE LOGIC
 * Sử dụng IndexedDB để lưu trữ sản phẩm và đơn hàng kèm hình ảnh
 */

// Helper selector & định dạng tiền tệ
const $ = (id) => document.getElementById(id);
const money = (val) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

// Dữ liệu sản phẩm mẫu ban đầu (kèm ảnh chất lượng cao)
const initialProducts = [
  {
    id: "bamboo",
    name: "Măng Khô Đặc Sản Quê Nhà – Thơm Ngon, Dai Giòn Tự Nhiên",
    category: "Đặc sản – Thực phẩm khô",
    group: "dry",
    price: 125000,
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    description: "Măng khô được chế biến và phơi sấy thủ công trên giàn nứa tự nhiên; giòn ngọt, phù hợp với măng hầm xương, măng xào và canh măng truyền thống.",
    features: "Sợi măng vàng tự nhiên, không tẩm ướp lưu huỳnh hay hóa chất bảo quản.",
    ingredients: "100% búp măng rừng tự nhiên phơi khô.",
    origin: "Vùng núi cao Yên Bình, Yên Bái.",
    pack: "Túi hút chân không 500g hoặc 1kg.",
    usage: "Ngâm nước ấm từ 4-6 tiếng, luộc sơ 1-2 lần trước khi chế biến món ăn.",
    createdAt: new Date().toISOString()
  },
  {
    id: "shan",
    name: "Trà Shan Tuyết Cổ Thụ – Hương Vị Trà Núi Rừng",
    category: "Trà – Đặc sản",
    group: "tea",
    price: 185000,
    image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    description: "Búp chè Shan Tuyết cổ thụ trên độ cao hơn 1.400m, phủ lớp lông tơ bạc mịn màng, mang lại vị chát dịu thanh và hậu ngọt sâu lắng kéo dài.",
    features: "Hái từ cây trà cổ thụ trăm năm tuổi, sao suốt thủ công bằng chảo gang.",
    ingredients: "100% búp chè Shan Tuyết cổ thụ 1 tôm 2 lá.",
    origin: "Đỉnh núi Suối Giàng - Yên Bái.",
    pack: "Hộp thiếc cao cấp 200g giữ trọn hương vị.",
    usage: "Pha nước sôi 85-90°C, hãm trà trong 40-50 giây trước khi rót thưởng thức.",
    createdAt: new Date().toISOString()
  },
  {
    id: "cinnamon",
    name: "Tinh Dầu Quế Nguyên Chất – Hương Quế Thiên Nhiên",
    category: "Sản phẩm thiên nhiên – Tinh dầu",
    group: "natural",
    price: 99000,
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
    description: "Tinh dầu chiết xuất từ vỏ quế rừng già nồng ấm, giúp xua tan căng thẳng, khử mùi không gian, thanh lọc không khí và xua đuổi côn trùng hiệu quả.",
    features: "Mùi hương ấm nồng đậm chất thảo mộc rừng núi.",
    ingredients: "100% tinh chất quế tự nhiên nguyên chất chưng cất hơi nước.",
    origin: "Vùng quế Văn Yên - Yên Bái.",
    pack: "Lọ thủy tinh màu hổ phách 30ml kèm nắp nhỏ giọt.",
    usage: "Dùng cho máy khuếch tán, đèn xông tinh dầu hoặc nhỏ vào bông gòn để trong xe, phòng ngủ.",
    createdAt: new Date().toISOString()
  },
  {
    id: "anise",
    name: "Hoa Hồi Sấy Khô – Gia Vị Thơm Đậm Đà",
    category: "Gia vị – Nông sản khô",
    group: "spice",
    price: 79000,
    image: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80",
    description: "Hoa hồi sấy khô nguyên cánh, thơm ngát, cánh dày đẹp màu cánh gián; gia vị không thể thiếu để nấu phở bò, các món tiềm, hầm và kho đậm đà.",
    features: "Hoa hồi tuyển chọn đều cánh từ 6-8 cánh, tinh dầu dồi dào.",
    ingredients: "100% hoa hồi tự nhiên sấy khô.",
    origin: "Vùng núi Lạng Sơn - Cao Bằng.",
    pack: "Túi zip bảo quản 250g.",
    usage: "Dùng rang thơm trước khi nấu nước dùng phở, gia vị ướp thịt nướng, lẩu bò.",
    createdAt: new Date().toISOString()
  },
  {
    id: "noni",
    name: "Nước Cốt Nhàu – Chiết Xuất Từ Quả Nhàu Tự Nhiên",
    category: "Đồ uống – Sản phẩm từ thiên nhiên",
    group: "drink",
    price: 149000,
    image: "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=800&q=80",
    description: "Nước cốt nhàu lên men tự nhiên theo công thức cổ truyền, giàu chất chống oxy hóa, hỗ trợ hệ tiêu hóa, xương khớp và tăng cường đề kháng.",
    features: "Không thêm đường hóa học, không chất bảo quản công nghiệp.",
    ingredients: "Quả nhàu chín mọng lên men nguyên chất.",
    origin: "Vùng trồng thảo dược sạch miền Trung.",
    pack: "Chai thủy tinh 500ml.",
    usage: "Uống 30ml mỗi ngày trước bữa ăn hoặc pha cùng chút mật ong ấm.",
    createdAt: new Date().toISOString()
  },
  {
    id: "fermented",
    name: "Trà Búp Lên Men Tự Nhiên – Hương Vị Đậm Đà Độc Đáo",
    category: "Trà – Đặc sản",
    group: "tea",
    price: 165000,
    image: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=800&q=80",
    description: "Dòng trà bánh lên men vi sinh tự nhiên theo kỹ thuật truyền thống độc đáo; nước trà đỏ ánh hổ phách sóng sánh, vị êm dịu, không gây mất ngủ.",
    features: "Càng ủ lâu càng quý, hương thơm thoang thoảng mùi mật và gỗ rừng.",
    ingredients: "Búp trà xanh lên men tự nhiên.",
    origin: "Vùng chè hữu cơ nguyên sinh Yên Bái.",
    pack: "Hộp bánh trà ép 357g bọc giấy dó.",
    usage: "Tách 5-7g trà, tráng nhanh bằng nước sôi, hãm và thưởng thức nhiều tuần nước.",
    createdAt: new Date().toISOString()
  }
];

// Chính sách cửa hàng
const policies = {
  shipping: ["Chính sách giao hàng", "Yên Bình Market hỗ trợ giao hàng toàn quốc qua Viettel Post / GHTK. Đơn hàng nội tỉnh nhận trong 24h, đơn hàng liên tỉnh nhận trong 2-3 ngày. Miễn phí vận chuyển cho đơn hàng từ 500.000đ."],
  returns: ["Chính sách đổi trả", "Khách hàng được quyền kiểm tra hàng trước khi thanh toán. Đổi trả miễn phí 100% trong vòng 7 ngày nếu sản phẩm có lỗi rách vỡ, ẩm mốc hoặc không đúng mô tả sản phẩm."],
  privacy: ["Chính sách bảo mật", "Chúng tôi cam kết bảo mật tuyệt đối thông tin cá nhân gồm tên, số điện thoại, địa chỉ của quý khách. Thông tin chỉ được sử dụng cho mục đích liên hệ giao hàng và bảo hành."],
  guide: ["Hướng dẫn mua hàng", "Bước 1: Chọn sản phẩm yêu thích và thêm vào giỏ.\nBước 2: Vào giỏ hàng kiểm tra và chọn 'Tiến hành đặt hàng'.\nBước 3: Điền thông tin giao hàng và chọn 'Gửi yêu cầu đặt hàng'. Nhân viên cửa hàng sẽ gọi xác nhận ngay."]
};

/* ========================================================
   1. CƠ SỞ DỮ LIỆU BROWSER DATABASE (IndexedDB Service)
   ======================================================== */
class DatabaseService {
  constructor(dbName = "YenBinhMarketDB", version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Store sản phẩm
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", { keyPath: "id" });
          productStore.createIndex("group", "group", { unique: false });
          productStore.createIndex("category", "category", { unique: false });
        }
        // Store đơn hàng
        if (!db.objectStoreNames.contains("orders")) {
          db.createObjectStore("orders", { keyPath: "id", autoIncrement: true });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        // Nạp sản phẩm khởi tạo nếu cơ sở dữ liệu trống
        const count = await this.countProducts();
        if (count === 0) {
          for (const item of initialProducts) {
            await this.addProduct(item);
          }
        }
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error("Database open error:", e);
        reject(e);
      };
    });
  }

  // Đếm tổng số sản phẩm trong DB
  countProducts() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("products", "readonly");
      const store = tx.objectStore("products");
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Lấy tất cả sản phẩm
  getAllProducts() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("products", "readonly");
      const store = tx.objectStore("products");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Lấy 1 sản phẩm theo ID
  getProduct(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("products", "readonly");
      const store = tx.objectStore("products");
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Thêm sản phẩm mới (kèm ảnh base64 hoặc URL)
  addProduct(product) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("products", "readwrite");
      const store = tx.objectStore("products");
      const req = store.put(product);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Xóa sản phẩm khỏi database
  deleteProduct(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("products", "readwrite");
      const store = tx.objectStore("products");
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // Khôi phục dữ liệu ban đầu
  async resetToDefault() {
    const tx = this.db.transaction("products", "readwrite");
    const store = tx.objectStore("products");
    await new Promise((res, rej) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => res();
      clearReq.onerror = () => rej(clearReq.error);
    });
    for (const item of initialProducts) {
      await this.addProduct(item);
    }
  }

  // Lưu đơn hàng vào database
  createOrder(order) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("orders", "readwrite");
      const store = tx.objectStore("orders");
      const req = store.add(order);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

// Khởi tạo Database Service
const db = new DatabaseService();

/* ========================================================
   2. TRẠNG THÁI ỨNG DỤNG (STATE)
   ======================================================== */
let currentProducts = [];
let cart = JSON.parse(localStorage.getItem("yb_cart") || "{}");
let activeProductId = null;
let searchTerm = "";
let selectedCategory = "all";
let currentImageBase64 = ""; // Giữ chuỗi ảnh đang chọn tải lên

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

// Điều hướng màn hình (View Router)
function showView(name) {
  document.querySelectorAll("main > .view, main > section.view").forEach((el) => {
    el.hidden = el.id !== name + "-view";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

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
    renderManageList();
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
   5. GIỎ HÀNG & THANH TOÁN (Cart & Checkout)
   ======================================================== */
function addToCart(id, count = 1) {
  const p = currentProducts.find((item) => item.id === id);
  if (!p) return;
  cart[id] = Math.min(99, (cart[id] || 0) + count);
  saveCart();
  renderCartCount();
  toast(`Đã thêm "${p.name.slice(0, 30)}..." vào giỏ!`);
}

function saveCart() {
  localStorage.setItem("yb_cart", JSON.stringify(cart));
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
  if (!confirm("Bạn có chắc muốn khôi phục lại 6 sản phẩm mẫu ban đầu trong Database? Mọi sản phẩm tự tạo sẽ bị đặt lại.")) return;
  try {
    await db.resetToDefault();
    toast("Đã khôi phục dữ liệu mặc định!");
    await loadProductsFromDB();
  } catch (err) {
    console.error(err);
    toast("Lỗi khi khôi phục dữ liệu.");
  }
}

/* ========================================================
   7. KHỞI TẠO VÀ GẮN SỰ KIỆN (DOM Ready)
   ======================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  // Khởi tạo icon
  if (window.lucide) lucide.createIcons();

  // Khởi tạo cơ sở dữ liệu IndexedDB
  try {
    await db.init();
    $("manage-status").textContent = "Cơ sở dữ liệu Database (IndexedDB) sẵn sàng kết nối.";
    $("manage-status").className = "sm:col-span-2 text-sm text-[#174d37] font-semibold";
    await loadProductsFromDB();
  } catch (err) {
    console.error("Lỗi khởi tạo DB:", err);
    $("manage-status").textContent = "Không thể khởi tạo cơ sở dữ liệu trình duyệt.";
    $("manage-status").className = "sm:col-span-2 text-sm text-red-600";
  }

  // Khởi tạo sự kiện upload ảnh
  setupImageUploadHandlers();

  // Hiển thị số lượng giỏ hàng
  renderCartCount();

  // Điều hướng trang theo data-go
  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.go;
      if (target === "products") {
        showView("home");
        setTimeout(() => $("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
    showView("home");
    filterProducts();
    setTimeout(() => $("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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

  // Nút tài khoản
  $("account-button").onclick = () => {
    toast("Tính năng tài khoản thành viên đang được nâng cấp.");
  };

  // Xem chính sách
  document.querySelectorAll("[data-policy]").forEach((btn) => {
    btn.onclick = () => {
      const [title, copy] = policies[btn.dataset.policy] || ["Chính sách", ""];
      $("policy-title").textContent = title;
      $("policy-copy").textContent = copy;
      showView("policy");
    };
  });

  // Submit đơn hàng
  $("order-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const items = getCartEntries();
    if (!items.length) {
      toast("Giỏ hàng của bạn đang trống!");
      return;
    }

    const orderSubmitBtn = $("order-submit");
    orderSubmitBtn.disabled = true;
    orderSubmitBtn.textContent = "Đang lưu đơn hàng vào Database...";

    const orderCode = "YB-" + Date.now().toString(36).toUpperCase();
    const orderData = {
      orderCode,
      customerName: $("customer-name").value.trim(),
      customerPhone: $("customer-phone").value.trim(),
      customerAddress: $("customer-address").value.trim(),
      customerNote: $("customer-note").value.trim(),
      paymentMethod: document.querySelector('input[name="payment"]:checked').value,
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
      showView("success");
    } catch (err) {
      console.error(err);
      toast("Không thể lưu đơn hàng vào Database. Vui lòng thử lại!");
    } finally {
      orderSubmitBtn.disabled = false;
      orderSubmitBtn.textContent = "Gửi yêu cầu đặt hàng";
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
