export default function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem('paporla-theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (theme === 'dark') {
                document.documentElement.classList.add('dark');
              } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `,
      }}
    />
  )
}
