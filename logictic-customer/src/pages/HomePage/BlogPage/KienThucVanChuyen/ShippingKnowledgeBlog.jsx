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
import "./ShippingKnowledgeBlog.css";

const CATEGORY = {
  title: "Kiến thức vận chuyển",
  subtitle: "Giải đáp các vấn đề về vận chuyển hàng hóa",
  eyebrow: "Kiến thức vận chuyển",
  description:
    "Giải thích khối lượng quy đổi, đóng gói, bảo hiểm, phụ phí và các lưu ý quan trọng khi vận chuyển hàng quốc tế.",
  accent: "#ea580c",
  accentDark: "#9a3412",
};

const MOCK_POSTS = [
  {
    id: "shipping-1",
    slug: "khoi-luong-quy-doi-la-gi",
    title: "Khối lượng quy đổi là gì và vì sao ảnh hưởng đến cước phí?",
    excerpt:
      "Hàng nhẹ nhưng cồng kềnh có thể bị tính cước theo kích thước thay vì cân nặng thực tế.",
    content:
      "Khối lượng quy đổi được tính dựa trên kích thước kiện hàng và hệ số của từng phương thức vận chuyển.\nNếu khối lượng quy đổi lớn hơn khối lượng thực tế, cước thường được tính theo khối lượng quy đổi.\nVì vậy, đóng gói gọn gàng và đúng kích thước giúp tối ưu chi phí vận chuyển.",
    author: "Shipping Team",
    createdAt: "2026-07-04",
    readTimeMinutes: 5,
    tags: ["Khối lượng quy đổi", "Cước phí", "Đóng gói"],
  },
  {
    id: "shipping-2",
    slug: "dong-goi-hang-de-vo",
    title: "Cách đóng gói hàng dễ vỡ trước khi gửi kho",
    excerpt:
      "Sử dụng vật liệu chống sốc, ghi chú hàng dễ vỡ và cân nhắc bảo hiểm để giảm rủi ro trong quá trình vận chuyển.",
    content:
      "Hàng dễ vỡ nên được bọc chống sốc, chèn khoảng trống trong hộp và sử dụng thùng cứng phù hợp.\nKhách hàng nên ghi chú rõ loại hàng khi tạo yêu cầu để kho có phương án xử lý cẩn thận hơn.\nVới hàng giá trị cao, bảo hiểm là lựa chọn nên cân nhắc để giảm rủi ro tài chính khi xảy ra sự cố.",
    author: "Warehouse Team",
    createdAt: "2026-06-28",
    readTimeMinutes: 4,
    tags: ["Đóng gói", "Hàng dễ vỡ", "Bảo hiểm"],
  },
  {
    id: "shipping-3",
    slug: "phu-phi-van-chuyen-thuong-gap",
    title: "Các loại phụ phí vận chuyển thường gặp",
    excerpt:
      "Một số loại hàng có thể phát sinh phí xử lý, phí đóng gói, phí lưu kho hoặc phí hàng đặc biệt.",
    content:
      "Phụ phí vận chuyển có thể phát sinh khi hàng cần xử lý riêng, đóng gói lại, lưu kho lâu hoặc yêu cầu chứng từ bổ sung.\nMột số mặt hàng như chất lỏng, hàng có pin, hàng thương hiệu hoặc thực phẩm cần kiểm tra trước khi vận chuyển.\nKhách hàng nên cung cấp thông tin đầy đủ để được báo phí minh bạch trước khi xác nhận.",
    author: "Pricing Team",
    createdAt: "2026-06-16",
    readTimeMinutes: 5,
    tags: ["Phụ phí", "Vận chuyển", "Hàng đặc biệt"],
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
    id: post.id || post.blogId || post.postId || post.slug || `post-${index}`,
    slug:
      post.slug || post.blogSlug || post.id || post.blogId || `post-${index}`,
    title: post.title || post.name || "Bài viết chưa có tiêu đề",
    excerpt:
      post.excerpt ||
      post.summary ||
      post.description ||
      "Nội dung đang được cập nhật.",
    content:
      post.content ||
      post.body ||
      post.detail ||
      post.fullContent ||
      post.description ||
      post.excerpt ||
      "Nội dung chi tiết đang được cập nhật.",
    author:
      post.authorName ||
      post.author ||
      post.createdBy ||
      "Việt Nam Logistic",
    createdAt: post.createdAt || post.publishedAt || post.updatedAt || "",
    readTime:
      typeof readTimeMinutes === "number"
        ? `${readTimeMinutes} phút đọc`
        : readTime || "5 phút đọc",
    imageUrl:
      post.imageUrl ||
      post.thumbnailUrl ||
      post.thumbnail ||
      post.coverImage ||
      "",
    tags: Array.isArray(post.tags)
      ? post.tags
      : post.tag
        ? [post.tag]
        : [CATEGORY.title],
  };
};

const ShippingKnowledgeBlog = () => {
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
                Cập nhật bài viết mới nhất, kinh nghiệm thực tế và hướng dẫn dễ
                áp dụng cho khách hàng sử dụng dịch vụ logistics.
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

export default ShippingKnowledgeBlog;