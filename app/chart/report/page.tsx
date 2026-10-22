import { Suspense } from 'react';
import ReportView from './ReportView';

export const metadata = {
  title: '命盘报告 · 紫微斗数 13 维解读',
};

/** 可列印的命盘报告：/chart/report?key=YYYY-MM-DD-时辰序号-性别 */
export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportView />
    </Suspense>
  );
}
