export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-6">
      <h1 className="text-4xl font-bold text-cyan">RedBlue Arena</h1>
      <p className="max-w-md text-neutral-400">
        Live cybersecurity assessment. Admins create matches at{' '}
        <code className="text-gold">/admin</code>; candidates join via their
        red or blue link.
      </p>
    </main>
  );
}
