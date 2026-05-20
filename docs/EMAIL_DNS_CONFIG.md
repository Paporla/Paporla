# CONFIGURACIÓN DNS PARA EMAILS - PAPORLA

## Problema: Emails llegan a SPAM

Para que los emails de Paporla lleguen a la bandeja de entrada y no a spam, necesitas configurar 3 registros DNS en tu dominio (paporla.com).

---

## PASO 1: Verificar dominio en Resend

1. Ve a https://resend.com/domains
2. Haz clic en "Add Domain"
3. Ingresa: `paporla.com`
4. Resend te dará los registros DNS que necesitas agregar

---

## PASO 2: Agregar registros DNS

En tu proveedor de DNS (Cloudflare, GoDaddy, Namecheap, etc.), agrega estos registros:

### SPF (Sender Policy Framework)

```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:spf.resend.com ~all
```

**Qué hace:** Autoriza a Resend a enviar emails en nombre de paporla.com

---

### DKIM (DomainKeys Identified Mail)

Resend te dará 2 registros DKIM únicos. Se ven así:

```
Tipo: TXT
Nombre: resend._domainkey
Valor: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN... (clave larga)
```

```
Tipo: TXT
Nombre: resend2._domainkey
Valor: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN... (otra clave)
```

**Qué hace:** Firma digitalmente los emails para verificar que son legítimos

---

### DMARC (Domain-based Message Authentication)

```
Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=quarantine; rua=mailto:dmarc@paporla.com; ruf=mailto:dmarc@paporla.com; fo=1
```

**Qué hace:** Indica a los proveedores de email qué hacer con emails que fallan SPF/DKIM

**Explicación del valor:**
- `p=quarantine`: Emails sospechosos van a spam (no rechazados)
- `rua=`: Reportes agregados diarios
- `ruf=`: Reportes de fallos individuales
- `fo=1`: Reportar todos los fallos

---

## PASO 3: Verificar configuración

Después de agregar los registros (puede tardar hasta 48 horas en propagarse):

1. Ve a https://resend.com/domains
2. Haz clic en "Verify Domain"
3. Debería aparecer como "Verified" con check verde

---

## PASO 4: Configurar email de envío

En tu `.env.local` y `.env.production`:

```env
RESEND_FROM_EMAIL=noreply@paporla.com
```

**Importante:** El email debe ser del dominio verificado. No uses `gmail.com` u otros.

---

## PASO 5: Warm-up del dominio (primeras 2-4 semanas)

Los dominios nuevos necesitan "calentarse" para ganar reputación:

- **Semana 1:** Máximo 50 emails/día
- **Semana 2:** Máximo 100 emails/día
- **Semana 3:** Máximo 500 emails/día
- **Semana 4+:** Sin límite

Resend maneja esto automáticamente en su plan gratuito.

---

## VERIFICACIÓN

Para verificar que todo funciona:

1. Envía un email de prueba desde la app
2. Revisa los headers del email recibido
3. Deberías ver:
   - `SPF: PASS`
   - `DKIM: PASS`
   - `DMARC: PASS`

Herramientas útiles:
- https://www.mail-tester.com/ (envía email aquí para testear)
- https://dkimvalidator.com/

---

## NOTAS IMPORTANTES

- Los registros DNS pueden tardar hasta 48 horas en propagarse
- Si usas Cloudflare, asegúrate de que los registros TXT no estén "proxied"
- Nunca compartas tu RESEND_API_KEY públicamente
- Monitorea los reportes DMARC en dmarc@paporla.com
