// Se ejecuta ANTES del primer pintado (inline en <head>) para decidir el
// tema sin parpadeo (FOUC). Regla: oscuro por defecto; solo si el usuario
// eligio 'light' explicitamente con el toggle, arrancamos en claro.
export default function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var stored = localStorage.getItem('paporla-theme');
              if (stored === 'light') {
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
  )
}
