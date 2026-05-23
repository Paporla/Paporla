# CONFIGURACION DNS PARA EMAILS - PAPORLA

## Problema: Emails llegan a SPAM

Para que los emails lleguen a la bandeja de entrada necesitas configurar 3 registros DNS.

---

## PASO 1: Verificar dominio en Resend

1. Ve a **https://resend.com/domains**
2. Click en **"Add Domain"**
3. Ingresa: `paporla.com`
4. Resend te dara los registros DNS exactos que necesitas

---

## PASO 2: Agregar registros DNS

En tu proveedor de DNS (donde compraste el dominio), agrega estos registros:

### 1. SPF (Sender Policy Framework)

| Campo           | Valor                                |
| --------------- | ------------------------------------ |
| **Tipo**        | `TXT`                                |
| **Nombre/Host** | `@`                                  |
| **Valor**       | `v=spf1 include:spf.resend.com ~all` |
| **TTL**         | `Auto` o `3600`                      |

**Que hace:** Autoriza a Resend a enviar emails en nombre de paporla.com

---

### 2. DKIM (DomainKeys Identified Mail)

Resend te dara **2 registros DKIM** unicos. Se ven asi:

| Campo           | Valor                                                    |
| --------------- | -------------------------------------------------------- |
| **Tipo**        | `TXT`                                                    |
| **Nombre/Host** | `resend._domainkey`                                      |
| **Valor**       | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...` (clave larga) |

| Campo           | Valor                                                   |
| --------------- | ------------------------------------------------------- |
| **Tipo**        | `TXT`                                                   |
| **Nombre/Host** | `resend2._domainkey`                                    |
| **Valor**       | `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...` (otra clave) |

**Que hace:** Firma digitalmente los emails para verificar que son legitimos

---

### 3. DMARC (Domain-based Message Authentication)

| Campo           | Valor                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Tipo**        | `TXT`                                                                                      |
| **Nombre/Host** | `_dmarc`                                                                                   |
| **Valor**       | `v=DMARC1; p=quarantine; rua=mailto:dmarc@paporla.com; ruf=mailto:dmarc@paporla.com; fo=1` |
| **TTL**         | `Auto` o `3600`                                                                            |

**Que hace:** Indica a Gmail/Yahoo que hacer con emails que fallan SPF/DKIM

**Explicacion:**

- `p=quarantine` = Emails sospechosos van a spam (no rechazados)
- `rua=` = Reportes agregados diarios
- `ruf=` = Reportes de fallos individuales
- `fo=1` = Reportar todos los fallos

---

## PASO 3: Verificar en Resend

1. Ve a **https://resend.com/domains**
2. Click en **"Verify Domain"**
3. Debe aparecer como **"Verified"** con check verde

Si dice "Pending", espera unos minutos y vuelve a intentar. La propagacion DNS puede tardar hasta 48 horas pero normalmente es rapida.

---

## PASO 4: Configurar email de envio

En tu `.env.local` y `.env.production`:

```env
RESEND_FROM_EMAIL=noreply@paporla.com
```

**Importante:** El email debe ser del dominio verificado. NO uses gmail.com u otros.

---

## PASO 5: Warm-up del dominio (primeras 2-4 semanas)

Los dominios nuevos necesitan "calentarse" para ganar reputacion:

| Semana | Limite diario  |
| ------ | -------------- |
| 1      | 50 emails/dia  |
| 2      | 100 emails/dia |
| 3      | 500 emails/dia |
| 4+     | Sin limite     |

Resend maneja esto automaticamente en su plan gratuito.

---

## VERIFICACION

Para verificar que todo funciona:

1. Envia un email de prueba desde la app
2. Ve a **https://www.mail-tester.com/**
3. Envia un email a la direccion que te dan ahi
4. Deberias obtener **8/10 o mas**

Si el puntaje es bajo, mail-tester te dira exactamente que falta.

---

## NOTAS IMPORTANTES

- Los registros DNS pueden tardar hasta 48 horas en propagarse
- Si usas Cloudflare, asegurate de que los registros TXT **NO** esten en modo "Proxied" (deben ser DNS only)
- Nunca compartas tu RESEND_API_KEY publicamente
- Monitorea los reportes DMARC en dmarc@paporla.com

---

## SI SIGUEN LLEGANDO A SPAM

1. Verifica que los 3 registros DNS esten correctos en **https://mxtoolbox.com/**
2. Usa **https://www.mail-tester.com/** para diagnosticar el problema exacto
3. Asegurate de que el dominio tenga al menos 7 dias de antiguedad
4. No envies mas de 50 emails/dia en la primera semana
