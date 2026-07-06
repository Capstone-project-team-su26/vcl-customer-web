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
import "./ImportGuideBlog.css";

const CATEGORY = {
  title: "Hướng dẫn nhập hàng",
  subtitle: "Kiến thức nhập hàng dành cho cá nhân và chủ shop",
  eyebrow: "Nhập hàng quốc tế",
  description:
    "Hướng dẫn chuẩn bị nguồn hàng, chứng từ, tuyến vận chuyển và quy trình nhập hàng phù hợp cho cá nhân, chủ shop và doanh nghiệp nhỏ.",
  accent: "#7c3aed",
  accentDark: "#4c1d95",
};

const MOCK_POSTS = [
  {
    id: "import-1",
    slug: "quy-trinh-nhap-hang-co-ban",
    title: "Quy trình nhập hàng cơ bản cho người mới bắt đầu",
    excerpt:
      "Từ tìm nguồn hàng, kiểm tra chi phí, tạo yêu cầu đến theo dõi vận chuyển về Việt Nam.",
    content:
      "Người mới nhập hàng nên bắt đầu từ nhóm sản phẩm rõ nguồn gốc, dễ vận chuyển và ít yêu cầu chứng từ đặc biệt.\nSau khi có nguồn hàng, cần tính tổng chi phí gồm tiền hàng, phí nội địa, phí dịch vụ, vận chuyển quốc tế và phụ phí nếu có.\nKhi hàng về kho, việc theo dõi trạng thái giúp bạn chủ động bổ sung thông tin và nhận hàng đúng kế hoạch.",
    author: "Import Team",
    createdAt: "2026-07-03",
    readTimeMinutes: 6,
    tags: ["Nhập hàng", "Người mới", "Quy trình"],
  },
  {
    id: "import-2",
    slug: "chuan-bi-chung-tu-nhap-hang",
    title: "Những chứng từ nên chuẩn bị khi nhập hàng",
    excerpt:
      "Hóa đơn, thông tin sản phẩm, giá trị khai báo và mô tả hàng hóa giúp quá trình xử lý minh bạch hơn.",
    content:
      "Tùy loại hàng, khách hàng có thể cần chuẩn bị hóa đơn, thông tin thành phần, hình ảnh sản phẩm hoặc giấy tờ liên quan.\nHàng có thương hiệu hoặc hàng chuyên ngành thường cần kiểm tra kỹ hơn trước khi vận chuyển.\nChuẩn bị thông tin từ đầu giúp giảm thời gian chờ xử lý tại kho và hạn chế phát sinh chi phí.",
    author: "Documentation Team",
    createdAt: "2026-06-22",
    readTimeMinutes: 5,
    tags: ["Chứng từ", "Khai báo", "Nhập khẩu"],
  },
  {
    id: "import-3",
    slug: "chon-tuyen-nhap-hang-phu-hop",
    title: "Cách chọn tuyến nhập hàng phù hợp với nhu cầu",
    excerpt:
      "Tuyến nhanh phù hợp hàng cần gấp, tuyến tiết kiệm phù hợp hàng nặng hoặc không yêu cầu thời gian giao nhanh.",
    content:
      "Khi chọn tuyến nhập hàng, khách hàng nên cân nhắc thời gian, đơn giá, loại hàng và yêu cầu bảo hiểm.\nHàng nhẹ, giá trị cao có thể phù hợp đường bay; hàng cồng kềnh hoặc không gấp có thể cân nhắc đường biển.\nViệc chọn đúng tuyến giúp cân bằng giữa chi phí và tốc độ giao hàng.",
    author: "Route Team",
    createdAt: "2026-06-15",
    readTimeMinutes: 4,
    tags: ["Tuyến vận chuyển", "Đường bay", "Đường biển"],
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

const ImportGuideBlog = () => {
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
                Tổng hợp kiến thức nhập hàng, cách chuẩn bị chứng từ, chọn tuyến
                vận chuyển và tối ưu chi phí cho cá nhân, chủ shop.
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

export default ImportGuideBlog;