<template>
  <div class="disclaimer-overlay">
    <div class="disclaimer-modal" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div class="disclaimer-badge">NOTICE</div>
      <h2 id="disclaimer-title" class="disclaimer-title">免责声明</h2>
      <p class="disclaimer-intro">
        本站为开放社区，所有帖子、评论、外链文档、图片、视频与第三方资源均由用户提供或引用。
      </p>

      <div class="disclaimer-list">
        <div class="disclaimer-item">
          <span class="item-dot"></span>
          <span>平台不保证任何内容的真实性、完整性、安全性、可用性、合法性或时效性。</span>
        </div>
        <div class="disclaimer-item">
          <span class="item-dot"></span>
          <span>外部链接、Markdown 文档、图片、视频及代码内容可能失效、变更或包含风险，请自行甄别。</span>
        </div>
        <div class="disclaimer-item">
          <span class="item-dot"></span>
          <span>因访问、下载、引用或使用站内内容造成的误导、损失、兼容性问题或安全问题，平台不承担责任。</span>
        </div>
      </div>

      <p class="disclaimer-footer">
        继续访问即视为你已理解并接受以上说明。
      </p>

      <button class="acknowledge-btn" type="button" @click="$emit('acknowledge')">
        我已知悉并继续访问
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['acknowledge'])
</script>

<style scoped>
.disclaimer-overlay {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.16), transparent 42%),
    rgba(15, 24, 31, 0.58);
  backdrop-filter: blur(12px);
}

.disclaimer-modal {
  width: min(100%, 560px);
  padding: 30px 30px 24px;
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(247, 244, 239, 0.98));
  box-shadow:
    0 28px 70px rgba(16, 28, 38, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(161, 166, 144, 0.28);
  color: #2d3533;
}

.disclaimer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(166, 72, 49, 0.1);
  color: #8f402d;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.disclaimer-title {
  margin: 16px 0 10px;
  font-size: 28px;
  font-weight: 700;
  color: #052630;
}

.disclaimer-intro,
.disclaimer-footer {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #556060;
}

.disclaimer-list {
  display: grid;
  gap: 12px;
  margin: 22px 0 18px;
}

.disclaimer-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(242, 239, 229, 0.9);
  border: 1px solid rgba(161, 166, 144, 0.24);
  font-size: 14px;
  line-height: 1.75;
  color: #33403c;
}

.item-dot {
  width: 8px;
  height: 8px;
  margin-top: 9px;
  border-radius: 999px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #cc4e4d, #dd9f23);
  box-shadow: 0 0 0 4px rgba(204, 78, 77, 0.12);
}

.acknowledge-btn {
  width: 100%;
  margin-top: 22px;
  height: 48px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #052630, #2b4776);
  color: #f8f4eb;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  box-shadow: 0 16px 32px rgba(43, 71, 118, 0.22);
}

.acknowledge-btn:hover {
  transform: translateY(-1px);
  filter: saturate(1.05);
  box-shadow: 0 18px 36px rgba(43, 71, 118, 0.26);
}

.acknowledge-btn:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .disclaimer-overlay {
    padding: 16px;
  }

  .disclaimer-modal {
    padding: 24px 20px 20px;
    border-radius: 22px;
  }

  .disclaimer-title {
    font-size: 24px;
  }

  .disclaimer-item {
    padding: 12px 14px;
  }
}
</style>
