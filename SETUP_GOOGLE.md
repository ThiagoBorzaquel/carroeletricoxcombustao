# Configuração do Google

## Domínio

Use o domínio final:

`carroeletricoxcombustao.com.br`

Se estiver no GitHub Pages, configure também o arquivo `CNAME` com esse valor.

## Search Console

O projeto já inclui:

- `robots.txt`
- `sitemap.xml`
- meta `google-site-verification`
- arquivo `google-site-verification.html`
- `canonical`

Substitua os placeholders:

- `REPLACE_WITH_SEARCH_CONSOLE_TOKEN` em `index.html`
- `REPLACE_WITH_SEARCH_CONSOLE_HTML_FILE_TOKEN` em `google-site-verification.html`

Depois:

1. Adicione a propriedade no Google Search Console.
2. Valide por meta tag ou arquivo HTML.
3. Envie o sitemap:
   `https://carroeletricoxcombustao.com.br/sitemap.xml`

## AdSense

O projeto já inclui:

- meta `google-adsense-account`
- script do AdSense no `index.html`
- `ads.txt`

Substitua:

- `REPLACE_WITH_YOUR_PUBLISHER_ID` no `index.html`
- `REPLACE_WITH_YOUR_PUBLISHER_ID` em `ads.txt`

Exemplo de publisher ID:

`ca-pub-1234567890123456`

## Open Graph

Os metadados usam:

`https://carroeletricoxcombustao.com.br/assets/og-cover.png`

Crie essa imagem para melhorar o preview no Google e nas redes sociais.
