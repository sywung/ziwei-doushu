export const metadata = { title: '隐私政策 · 紫微命盘', description: '紫微命盘隐私政策' };

export default function PrivacyPage() {
  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-0)', borderBottom: '1px solid var(--bdr)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--tx-3)', textDecoration: 'none' }}>
          <span style={{ fontSize: '16px' }}>‹</span>
          <span>返回首页</span>
        </a>
        <div style={{ width: '1px', height: '20px', background: 'var(--bdr-med)' }} />
        <span style={{ fontSize: '12px', color: 'var(--ac)', letterSpacing: '0.2em' }}>紫微命盘</span>
      </header>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px 80px', color: 'var(--tx-1)', lineHeight: 1.8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>隐私政策</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026年10月</p>

      <p>本站为个人自架的开源紫微排盘（上游 Renhuai123/ziwei-doushu，MIT），没有账号、会员或付费功能。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. 处理哪些信息</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li><strong>出生信息</strong>：公历年月日、时辰、性别、出生地，只在起盘与查询解读时送到本站服务器计算，服务器不另行保存</li>
        <li><strong>AI 提问</strong>：使用 AI 问盘或合盘时，命盘结构、断语节录与你的问题会送到 Azure OpenAI 产生回答</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. 第三方</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>Azure OpenAI：处理 AI 问盘、合盘</li>
        <li>哔哩哔哩：在三纪字幕导播点播影片时，才载入其嵌入播放器（会传送浏览器资讯给 B 站）</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. 本地存储</h2>
      <p>浏览器 localStorage 只保存主题偏好与三纪字幕导播的收藏，不会上传。可在浏览器设置中清除。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. 未成年人</h2>
      <p>命理内容仅供参考，未成年人请在监护人同意下使用，并不得将解读用于重大人生决策。</p>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--tx-3)' }}>
          <a href="/terms" style={{ color: 'var(--ac)' }}>服务条款</a> · <a href="/" style={{ color: 'var(--ac)' }}>返回首页</a>
        </p>
      </main>
    </>
  );
}
