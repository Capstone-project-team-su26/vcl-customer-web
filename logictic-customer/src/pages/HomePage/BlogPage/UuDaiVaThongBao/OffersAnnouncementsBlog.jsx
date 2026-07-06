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
import "./OffersAnnouncementsBlog.css";

const CATEGORY = {
  title: "Ưu đãi & Thông báo",
  subtitle: "Chương trình ưu đãi và thông báo hệ thống",
  eyebrow: "Ưu đãi và thông báo",
  description:
    "Cập nhật chương trình ưu đãi, thay đổi dịch vụ, lịch vận hành kho và thông báo quan trọng dành cho khách hàng.",
  accent: "#dc2626",
  accentDark: "#7f1d1d",
};

const MOCK_POSTS = [
  {
    id: "offer-1",
    slug: "uu-dai-phi-mua-ho-khach-moi",
    title: "Ưu đãi phí mua hộ dành cho khách hàng mới",
    excerpt:
      "Khách hàng mới có thể nhận ưu đãi phí dịch vụ trong lần tạo yêu cầu đầu tiên theo điều kiện áp dụng.",
    content:
      "Chương trình ưu đãi giúp khách hàng mới trải nghiệm quy trình mua hộ với chi phí dễ tiếp cận hơn.\nƯu đãi có thể áp dụng theo thời gian, giá trị đơn hàng hoặc nhóm sản phẩm cụ thể.\nKhách hàng nên kiểm tra điều kiện áp dụng trước khi xác nhận thanh toán để tránh hiểu nhầm về phạm vi ưu đãi.",
    author: "Marketing Team",
    createdAt: "2026-07-05",
    readTimeMinutes: 3,
    tags: ["Ưu đãi", "Mua hộ", "Khách mới"],
  },
  {
    id: "offer-2",
    slug: "thong-bao-lich-van-hanh-kho",
    title: "Thông báo lịch vận hành kho quốc tế",
    excerpt:
      "Lịch tiếp nhận và xuất kho có thể thay đổi vào cuối tuần, ngày lễ hoặc thời điểm cao điểm vận chuyển.",
    content:
      "Khách hàng nên theo dõi thông báo lịch vận hành kho để chủ động thời gian gửi hàng và tạo yêu cầu.\nTrong các giai đoạn cao điểm, thời gian xử lý có thể kéo dài hơn dự kiến do lượng kiện tăng.\nHệ thống sẽ cập nhật trạng thái khi kiện hàng được tiếp nhận và xử lý tại kho.",
    author: "Operations Team",
    createdAt: "2026-06-30",
    readTimeMinutes: 4,
    tags: ["Thông báo", "Kho", "Lịch vận hành"],
  },
  {
    id: "offer-3",
    slug: "cap-nhat-chinh-sach-bao-hiem",
    title: "Cập nhật chính sách bảo hiểm hàng hóa",
    excerpt:
      "Một số nhóm hàng giá trị cao được khuyến nghị khai báo giá trị và đăng ký bảo hiểm trước khi vận chuyển.",
    content:
      "Bảo hiểm hàng hóa giúp giảm rủi ro tài chính khi xảy ra mất mát hoặc hư hỏng thuộc phạm vi chính sách.\nKhách hàng cần khai báo giá trị chính xác và lưu giữ chứng từ liên quan để hỗ trợ xử lý khiếu nại nếu có sự cố.\nPhạm vi và điều kiện bồi thường sẽ được áp dụng theo chính sách tại thời điểm tạo yêu cầu.",
    author: "Policy Team",
    createdAt: "2026-06-21",
    readTimeMinutes: 4,
    tags: ["Bảo hiểm", "Chính sách", "Thông báo"],
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

const OffersAnnouncementsBlog = () => {
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
                Theo dõi các chương trình ưu đãi, thông báo vận hành kho,
                cập nhật chính sách và thông tin quan trọng dành cho khách hàng.
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

export default OffersAnnouncementsBlog;