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
import "./LogisticsNewsBlog.css";

const CATEGORY = {
  title: "Tin tức Logistics",
  subtitle: "Thông tin mới nhất về thị trường logistics",
  eyebrow: "Blog Logistics",
  description:
    "Cập nhật xu hướng thị trường, thay đổi vận chuyển, thông quan và những thông tin quan trọng trong ngành logistics.",
  accent: "#1557c0",
  accentDark: "#0b2d62",
};

const MOCK_POSTS = [
  {
    id: "logistics-1",
    slug: "xu-huong-logistics-2026",
    title: "Xu hướng logistics quốc tế cần chú ý trong năm 2026",
    excerpt:
      "Các doanh nghiệp cần theo dõi biến động tuyến vận chuyển, chi phí nhiên liệu và năng lực kho bãi để tối ưu kế hoạch nhập hàng.",
    content:
      "Thị trường logistics quốc tế đang thay đổi nhanh do nhu cầu thương mại điện tử, biến động chi phí vận chuyển và yêu cầu minh bạch trạng thái đơn hàng.\nDoanh nghiệp nên theo dõi thời gian vận chuyển, năng lực kho quốc tế và các yêu cầu chứng từ để tránh phát sinh chi phí không cần thiết.\nVới hàng cá nhân và hàng thương mại nhỏ, việc lựa chọn tuyến phù hợp giúp cân bằng giữa chi phí, thời gian và mức độ an toàn của kiện hàng.",
    author: "Logistics Team",
    createdAt: "2026-07-01",
    readTimeMinutes: 5,
    tags: ["Logistics", "Thị trường", "Vận chuyển"],
  },
  {
    id: "logistics-2",
    slug: "toi-uu-chi-phi-kho-quoc-te",
    title: "Cách tối ưu chi phí khi hàng về kho quốc tế",
    excerpt:
      "Chuẩn bị mã ký gửi, thông tin kiện và chứng từ từ đầu giúp kho xử lý nhanh hơn và giảm nguy cơ phát sinh phí lưu kho.",
    content:
      "Khi gửi hàng về kho quốc tế, khách hàng nên ghi đúng mã ký gửi và thông tin người nhận theo hướng dẫn.\nNếu hàng có thương hiệu, pin, chất lỏng hoặc mỹ phẩm, nên kiểm tra trước điều kiện vận chuyển để tránh bị giữ lại.\nViệc gom kiện hợp lý cũng giúp tối ưu chi phí vận chuyển quốc tế trong nhiều trường hợp.",
    author: "Warehouse Team",
    createdAt: "2026-06-26",
    readTimeMinutes: 4,
    tags: ["Kho quốc tế", "Chi phí", "Ký gửi"],
  },
  {
    id: "logistics-3",
    slug: "theo-doi-hanh-trinh-don-hang",
    title: "Vì sao theo dõi trạng thái đơn hàng lại quan trọng?",
    excerpt:
      "Theo dõi từng mốc xử lý giúp khách hàng chủ động thanh toán, bổ sung thông tin và nhận hàng đúng kế hoạch.",
    content:
      "Một đơn hàng quốc tế thường đi qua nhiều trạng thái như tiếp nhận, kiểm nhận, xuất kho, vận chuyển, nhập kho Việt Nam và giao hàng.\nKhi trạng thái được cập nhật rõ ràng, khách hàng dễ nhận biết thời điểm cần bổ sung chứng từ hoặc xác nhận thanh toán.\nĐiều này đặc biệt quan trọng với hàng giá trị cao, hàng cần bảo hiểm hoặc các lô hàng có thời gian giao gấp.",
    author: "Customer Success",
    createdAt: "2026-06-20",
    readTimeMinutes: 4,
    tags: ["Theo dõi", "Đơn hàng", "Hỗ trợ"],
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

const LogisticsNewsBlog = () => {
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
                Cập nhật tin tức logistics, xu hướng vận chuyển quốc tế, thông
                quan, kho bãi và các thay đổi quan trọng trong ngành.
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

export default LogisticsNewsBlog;