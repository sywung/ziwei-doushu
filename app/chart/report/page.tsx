import { Suspense } from 'react';
import ReportView from './ReportView';

export const metadata = {
  title: '命盘报告 · 紫微斗数 13 维解读',
};

/** 可列印的命盤報告：/chart/report?key=YYYY-MM-DD-時辰序號-性別 */
export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportView />
    </Suspense>
  );
}
