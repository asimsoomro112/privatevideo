// ===========================================
// HerPrivateCinema - Auth Layout
// ===========================================
// Layout for login/signup pages. No navbar, centered card.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh overflow-y-auto bg-bg-primary flex items-start justify-center px-4 py-6 sm:items-center sm:py-8">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,#3b0b36_0%,#140814_30%,#050505_70%)] opacity-90" />

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
