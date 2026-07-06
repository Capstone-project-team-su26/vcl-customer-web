import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagOutlined,
  UserOutlined,
} from "@ant-design/icons";

import Header from "../../../../layouts/HeaderLayout/Headeer";
import "./InternationalShoppingExperienceBlog.css";

const CATEGORY = {
  title: "Kinh nghiệm mua hàng quốc tế",
  subtitle: "Mẹo mua hàng an toàn và tiết kiệm",
  eyebrow: "Kinh nghiệm mua hộ",
  description:
    "Tổng hợp kinh nghiệm chọn shop, kiểm tra sản phẩm, so sánh chi phí và hạn chế rủi ro khi mua hàng từ nước ngoài.",
  accent: "#0f766e",
  accentDark: "#134e4a",
};

const MOCK_POSTS = [
  {
    id: "shopping-1",
    slug: "kiem-tra-shop-truoc-khi-mua",
    title: "5 bước kiểm tra shop trước khi đặt mua hàng quốc tế",
    excerpt:
      "Đánh giá uy tín shop, số lượt bán, phản hồi khách hàng và chính sách đổi trả trước khi quyết định đặt mua.",
    content:
      "Trước khi đặt mua, hãy kiểm tra lịch sử hoạt động của shop, số lượng đánh giá và phản hồi gần đây.\nNên ưu tiên shop có thông tin sản phẩm rõ ràng, hình ảnh thật và chính sách đổi trả minh bạch.\nVới đơn giá trị cao, khách hàng nên yêu cầu tư vấn trước để kiểm tra khả năng vận chuyển và bảo hiểm.",
    author: "Buying Team",
    createdAt: "2026-07-02",
    readTimeMinutes: 5,
    tags: ["Mua hộ", "Kinh nghiệm", "Shop uy tín"],
  },
  {
    id: "shopping-2",
    slug: "chon-size-mau-sac-khi-order",
    title: "Lưu ý chọn size, màu sắc và biến thể khi order hàng",
    excerpt:
      "Sai size hoặc chọn nhầm biến thể là lỗi phổ biến khi mua hàng quốc tế, đặc biệt với thời trang và phụ kiện.",
    content:
      "Khi gửi link sản phẩm, khách hàng nên ghi rõ size, màu, số lượng và hình ảnh biến thể cần mua.\nVới sản phẩm thời trang, nên kiểm tra bảng size của từng shop thay vì chỉ dựa vào size thường dùng ở Việt Nam.\nNếu chưa chắc chắn, hãy thêm ghi chú để nhân viên kiểm tra lại trước khi đặt mua.",
    author: "Buying Team",
    createdAt: "2026-06-25",
    readTimeMinutes: 4,
    tags: ["Order", "Thời trang", "Mua hàng"],
  },
  {
    id: "shopping-3",
    slug: "toi-uu-phi-mua-ho",
    title: "Cách tối ưu phí mua hộ khi mua nhiều sản phẩm",
    excerpt:
      "Gộp nhiều link hợp lý, chọn tuyến phù hợp và khai báo thông tin đầy đủ giúp đơn hàng được xử lý nhanh hơn.",
    content:
      "Nếu mua nhiều sản phẩm từ cùng một thị trường, khách hàng nên gom link vào cùng yêu cầu để dễ theo dõi và tối ưu vận chuyển.\nCần lưu ý phí nội địa của từng shop có thể khác nhau, vì vậy báo giá chính thức sẽ được xác nhận sau khi kiểm tra link.\nVới hàng dễ vỡ hoặc giá trị cao, bảo hiểm và đóng gói gia cố là lựa chọn nên cân nhắc.",
    author: "Pricing Team",
    createdAt: "2026-06-18",
    readTimeMinutes: 4,
    tags: ["Chi phí", "Mua hộ", "Tiết kiệm"],
  },
];

const formatDate = (value) => {
  if (!value) {
    return "Mới cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const normalizePost = (post, index = 0) => {
  const readTime = post.readTime || post.readTimeText || post.readingTime;
  const readTimeMinutes = post.readTimeMinutes || post.readingTimeMinutes;

  return {
    id: post.id || post.slug || `post-${index}`,
    slug: post.slug || post.id || `post-${index}`,
    title: post.title || "Bài viết chưa có tiêu đề",
    excerpt: post.excerpt || "Nội dung đang được cập nhật.",
    content:
      post.content ||
      post.description ||
      post.excerpt ||
      "Nội dung chi tiết đang được cập nhật.",
    author: post.author || "Việt Nam Logistic",
    createdAt: post.createdAt || "",
    readTime:
      typeof readTimeMinutes === "number"
        ? `${readTimeMinutes} phút đọc`
        : readTime || "5 phút đọc",
    imageUrl: post.imageUrl || "",
    tags: Array.isArray(post.tags) ? post.tags : [CATEGORY.title],
  };
};

const InternationalShoppingExperienceBlog = () => {
  const navigate = useNavigate();

  const [posts] = useState(MOCK_POSTS.map(normalizePost));
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchText, setSearchText] = useState("");

  const filteredPosts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return posts;
    }

    return posts.filter((post) => {
      const searchableText = [
        post.title,
        post.excerpt,
        post.author,
        ...post.tags,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [posts, searchText]);

  const openPostDetail = (post) => {
    setSelectedPost(post);

    window.setTimeout(() => {
      document
        .getElementById("blog-topic-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const resetPage = () => {
    setSearchText("");
    setSelectedPost(null);

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  };

  const detailParagraphs = useMemo(() => {
    if (!selectedPost?.content) {
      return [];
    }

    return String(selectedPost.content)
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }, [selectedPost]);

  return (
    <>
      <Header />

      <main
        className="blog-topic-page"
        style={{
          "--blog-accent": CATEGORY.accent,
          "--blog-accent-dark": CATEGORY.accentDark,
        }}
      >
        <section className="blog-topic-hero">
          <div className="blog-topic-container blog-topic-hero__inner">
            <div className="blog-topic-hero__content">
              <nav className="blog-topic-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  Trang chủ
                </button>
                <span>/</span>
                <button type="button" onClick={() => navigate("/blog")}>
                  Blog
                </button>
                <span>/</span>
                <strong>{CATEGORY.title}</strong>
              </nav>

              <span className="blog-topic-eyebrow">
                <BookOutlined />
                {CATEGORY.eyebrow}
              </span>

              <h1>{CATEGORY.title}</h1>
              <p>{CATEGORY.description}</p>

              <div className="blog-topic-search">
                <SearchOutlined />
                <input
                  type="search"
                  placeholder="Tìm kiếm bài viết..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />

                {searchText && (
                  <button type="button" onClick={() => setSearchText("")}>
                    Xóa
                  </button>
                )}
              </div>
            </div>

            <div className="blog-topic-hero-card">
              <span className="blog-topic-hero-card__icon">
                <FileSearchOutlined />
              </span>

              <small>Chuyên mục</small>
              <strong>{CATEGORY.subtitle}</strong>
              <p>
                Cập nhật kinh nghiệm mua hàng quốc tế, cách chọn shop uy tín,
                kiểm tra thông tin sản phẩm và tối ưu chi phí mua hộ.
              </p>

              <div className="blog-topic-hero-card__meta">
                <span>{posts.length} bài viết</span>
                <span>Có tìm kiếm</span>
              </div>
            </div>
          </div>
        </section>

        <section className="blog-topic-section">
          <div className="blog-topic-container">
            <div className="blog-topic-toolbar">
              <div>
                <span>Danh sách bài viết</span>
                <h2>{CATEGORY.subtitle}</h2>
              </div>

              <button type="button" onClick={resetPage}>
                <ReloadOutlined />
                Làm mới
              </button>
            </div>

            {filteredPosts.length > 0 ? (
              <div className="blog-topic-grid">
                {filteredPosts.map((post) => (
                  <article className="blog-topic-card" key={post.id}>
                    <div className="blog-topic-card__thumb">
                      {post.imageUrl ? (
                        <img src={post.imageUrl} alt={post.title} />
                      ) : (
                        <GlobalOutlined />
                      )}
                    </div>

                    <div className="blog-topic-card__content">
                      <div className="blog-topic-card__meta">
                        <span>
                          <CalendarOutlined /> {formatDate(post.createdAt)}
                        </span>
                        <span>
                          <ClockCircleOutlined /> {post.readTime}
                        </span>
                      </div>

                      <h3>{post.title}</h3>
                      <p>{post.excerpt}</p>

                      <div className="blog-topic-card__tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span key={tag}>
                            <TagOutlined />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button type="button" onClick={() => openPostDetail(post)}>
                        Xem chi tiết
                        <ArrowRightOutlined />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="blog-topic-empty">
                <SearchOutlined />
                <strong>Không tìm thấy bài viết phù hợp</strong>
                <p>Thử nhập từ khóa khác hoặc xóa bộ lọc tìm kiếm hiện tại.</p>
              </div>
            )}
          </div>
        </section>

        {selectedPost && (
          <section className="blog-topic-detail-section" id="blog-topic-detail">
            <div className="blog-topic-container">
              <article className="blog-topic-detail-card">
                <div className="blog-topic-detail-card__head">
                  <div>
                    <span className="blog-topic-detail-label">
                      Chi tiết bài viết
                    </span>
                    <h2>{selectedPost.title}</h2>
                  </div>
                </div>

                <div className="blog-topic-detail-meta">
                  <span>
                    <UserOutlined /> {selectedPost.author}
                  </span>
                  <span>
                    <CalendarOutlined /> {formatDate(selectedPost.createdAt)}
                  </span>
                  <span>
                    <ClockCircleOutlined /> {selectedPost.readTime}
                  </span>
                </div>

                <div className="blog-topic-detail-tags">
                  {selectedPost.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="blog-topic-detail-content">
                  {detailParagraphs.length > 0 ? (
                    detailParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))
                  ) : (
                    <p>{selectedPost.excerpt}</p>
                  )}
                </div>

                <div className="blog-topic-detail-actions">
                  <button type="button" onClick={() => setSelectedPost(null)}>
                    Đóng chi tiết
                  </button>

                  <button type="button" onClick={() => navigate("/lien-he")}>
                    Cần tư vấn thêm
                    <ArrowRightOutlined />
                  </button>
                </div>
              </article>
            </div>
          </section>
        )}
      </main>
    </>
  );
};

export default InternationalShoppingExperienceBlog;