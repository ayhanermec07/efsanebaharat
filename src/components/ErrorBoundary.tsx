import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
          <div role="alert" className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-stone-900">Sayfa yüklenemedi</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">Geçici bir sorun oluştu. Sayfayı yenileyebilir veya ana sayfaya dönebilirsiniz.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-brand px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">Yenile</button>
              <a href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-5 py-3 font-semibold text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">Ana sayfa</a>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
