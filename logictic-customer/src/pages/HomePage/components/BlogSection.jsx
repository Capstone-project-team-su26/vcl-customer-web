import React from "react";
import { ArrowRightOutlined } from "@ant-design/icons";
import { BLOG_POSTS } from "../data/homeData";

export default function BlogSection() {
  return (
    <section className="home-section home-section--gray">
      <div className="home-section-inner">
        <span className="section-label">BLOG</span>
        <h2 className="section-title">Bản tin Mua hộ & Ký gửi</h2>
        <div className="blog-grid">
          {BLOG_POSTS.map((post) => (
            <div key={post.title} className="blog-card">
              <div className="blog-card-img" style={{ background: post.bg }}>
                {post.emoji}
              </div>
              <div className="blog-card-body">
                <h3>{post.title}</h3>
                <div className="blog-meta">
                  <span>{post.category}</span> | {post.date} | {post.read}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <button type="button" className="view-more-btn">
            Xem thêm <ArrowRightOutlined />
          </button>
        </div>
      </div>
    </section>
  );
}
