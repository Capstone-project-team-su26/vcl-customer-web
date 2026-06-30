import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import { BLOG_POSTS } from "../data/homeData";
import "./BlogSection.css";

export default function BlogSection() {
  return (
    <section
      className="blog-news-section"
      aria-labelledby="blog-news-title"
    >
      <div
        className="blog-news-decoration blog-news-decoration--one"
        aria-hidden="true"
      />

      <div
        className="blog-news-decoration blog-news-decoration--two"
        aria-hidden="true"
      />

      <div className="blog-news-container">
        <header className="blog-news-header">
          <span className="blog-news-label">
            <span className="blog-news-label-dot" />
            KIẾN THỨC LOGISTICS
          </span>

          <h2
            id="blog-news-title"
            className="blog-news-title"
          >
            Bản tin mua hộ
            <strong>và ký gửi hàng hóa</strong>
          </h2>

          <p className="blog-news-description">
            Cập nhật hướng dẫn, kinh nghiệm mua hàng quốc tế,
            quy trình ký gửi và những thông tin hữu ích giúp
            bạn tối ưu chi phí vận chuyển.
          </p>
        </header>

        <div className="blog-news-grid">
          {BLOG_POSTS.map((post, index) => {
            const articlePath = post.path || "/blog";
            const isFeatured = index === 0;

            return (
              <article
                key={`${post.title}-${index}`}
                className={`blog-news-card ${
                  isFeatured
                    ? "blog-news-card--featured"
                    : ""
                }`}
                style={{
                  "--blog-card-background":
                    post.bg || "#e3f2fd",
                }}
              >
                <Link
                  to={articlePath}
                  className="blog-news-image-wrapper"
                  aria-label={`Đọc bài viết: ${post.title}`}
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.imageAlt || post.title}
                      className="blog-news-image"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <span
                      className="blog-news-emoji"
                      aria-hidden="true"
                    >
                      {post.emoji || "📦"}
                    </span>
                  )}

                  <span className="blog-news-category">
                    {post.category}
                  </span>

                  <span className="blog-news-image-overlay" />
                </Link>

                <div className="blog-news-card-body">
                  <div className="blog-news-meta">
                    <span>
                      <CalendarOutlined />
                      {post.date}
                    </span>

                    <span className="blog-news-meta-separator">
                      •
                    </span>

                    <span>
                      <ClockCircleOutlined />
                      {post.read}
                    </span>
                  </div>

                  <h3 className="blog-news-card-title">
                    <Link to={articlePath}>
                      {post.title}
                    </Link>
                  </h3>

                  <p className="blog-news-card-description">
                    {post.description ||
                      "Khám phá những thông tin hữu ích về mua hộ, ký gửi và vận chuyển hàng hóa quốc tế."}
                  </p>

                  <Link
                    to={articlePath}
                    className="blog-news-read-more"
                  >
                    <span>Đọc bài viết</span>
                    <ArrowRightOutlined />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="blog-news-actions">
          <Link
            to="/blog"
            className="blog-news-view-all"
          >
            <span>Xem tất cả bài viết</span>
            <ArrowRightOutlined />
          </Link>
        </div>
      </div>
    </section>
  );
}