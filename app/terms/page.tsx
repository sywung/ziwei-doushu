export const metadata = { title: '服务条款 · 紫微命盘', description: '紫微命盘服务条款与用户协议' };

export default function TermsPage() {
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
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>服务条款</h1>
        <p style={{ fontSize: 12, color: 'var(--tx-3)', marginBottom: 32 }}>最后更新：2026年10月</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>1. 服务概述</h2>
      <p>紫微命盘（以下简称"本平台"）基于倪海厦《天纪》紫微斗数体系提供命盘排盘与解读服务。本平台所有命理内容仅供参考，<strong>不构成任何医疗、投资、法律、心理咨询或人生重大决策建议</strong>。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>2. 用户行为规范</h2>
      <p>使用本平台即表示您同意：</p>
      <ul style={{ paddingLeft: 24 }}>
        <li>仅出于合法、个人参考目的使用本平台</li>
        <li>不传播本平台内容用于商业销售、转载或公开发布</li>
        <li>不进行扰乱平台正常运行的行为</li>
        <li>提交的出生信息真实有效；本平台对错误信息导致的解读偏差不承担责任</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>3. 授权</h2>
      <ul style={{ paddingLeft: 24 }}>
        <li>程序代码来自开源项目 Renhuai123/ziwei-doushu（MIT）</li>
        <li>三纪字幕导播的判语语料为 CC BY-NC-SA 4.0，<strong>不可商用</strong></li>
        <li>13 维解读资料集与古籍、影片内容的著作权归原作者所有</li>
      </ul>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>4. 免责声明</h2>
      <p>本平台命理内容基于传统紫微斗数与倪海厦体系的知识整理，<strong>不保证 100% 准确</strong>。命运受天、地、人三才共同影响，本平台输出仅作为认识自我的参考，使用者应理性看待，不应过度依赖任何单一命理判断。</p>
      <p>因使用本平台内容产生的任何后果（包括但不限于决策失误、心理影响、关系变化等），本平台不承担法律责任。</p>

      <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>5. 服务变更</h2>
      <p>本站为个人自架，服务可能随时调整或停止。</p>

        <p style={{ marginTop: 48, fontSize: 12, color: 'var(--tx-3)' }}>
          <a href="/privacy" style={{ color: 'var(--ac)' }}>隐私政策</a> · <a href="/" style={{ color: 'var(--ac)' }}>返回首页</a>
        </p>
      </main>
    </>
  );
}
