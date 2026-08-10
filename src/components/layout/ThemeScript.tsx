export default function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `,
      }}
    />
  )
}
