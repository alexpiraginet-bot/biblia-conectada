# Bíblia Conectada para Igrejas

Esta entrega separa a proposta visual da base executável do backend. Nenhum serviço de nuvem, pagamento ou aplicativo de loja foi ativado por este pacote.

## Abra primeiro

Abra **projeto.html** no navegador. É um arquivo único, funciona offline e contém:

- A visão do produto e o caminho mensagem → passagens → conexões → plano semanal.
- App da comunidade com navegação clicável.
- Painel da igreja: edite um aviso, publique na demonstração e veja a prévia mudar.
- Duas igrejas fictícias; trocar uma não altera os conteúdos da outra.
- Gestão da plataforma, ofertas, arquitetura e etapas de entrega.
- Temas Dia/Noite, módulos opcionais e reinício da demonstração.

As edições da proposta ficam apenas na memória da aba. Recarregar descarta alterações. Seus indicadores e dados são exemplos; não representam igrejas clientes, pagamentos ou resultados comerciais.

## Backend real, local

O código está em `../../platform/`. O console **console.html** é outro produto da entrega: usa a API e grava no banco de desenvolvimento. Não compartilha os dados da simulação em projeto.html.

Requisitos: **Node.js 24 LTS**. Dentro da pasta `platform`:

```sh
npm ci
npm run setup
npm run dev
```

No Windows, também é possível executar `Abrir-Backend.ps1`, preservando a estrutura de pastas do pacote. O script instala as dependências se ausentes, prepara a demonstração e inicia o servidor. Não apaga o banco existente.

- Proposta: <http://127.0.0.1:4318/projeto>
- Console: <http://127.0.0.1:4318/console>
- Saúde da API: <http://127.0.0.1:4318/health>

O comando setup gera contas fictícias e senhas aleatórias em `platform/.local/demo-credentials.json`. Abra esse arquivo **localmente** para copiar uma conta de administrador para o console. Ele é privado, ignorado pelo Git e não acompanha o ZIP. Não envie o arquivo nem suas senhas por mensagens. A API não oferece um endpoint que revele essas credenciais.

O console permite testar avisos, rascunhos, publicação e auditoria. Os contratos de API incluem também agenda, campanhas e identidade visual. O banco persiste em `platform/.local/database`; esse diretório não acompanha o pacote. O backend usa PostgreSQL embarcado via PGlite no desenvolvimento e possui adaptador e migrações para PostgreSQL em servidor.

## O que ainda exige implantação

Esta é uma fundação executável, não uma operação SaaS comercial completa. A próxima etapa é escolher o ambiente de banco/servidor e a igreja piloto, implantar autenticação de produção com MFA/recuperação, backups e restauração, proteção de borda e observabilidade. Cadastro de igrejas/equipes ainda não é um painel operacional de provisionamento.

Login Google, push, armazenamento de arquivos, cobrança da assinatura, Pix confirmado por PSP, fluxo de aprovação/agendamento, apps exclusivos e publicação nas lojas são etapas planejadas. Não estão simulados como serviços ativos na API. O app da Bíblia Conectada existente não foi substituído ou alterado por esta entrega.

Leitura técnica: `platform/README.md`, `docs/SAAS-IGREJAS.md` e `docs/SAAS-ENTREGA.md` na raiz do pacote. `qa/` contém evidências de navegador, não dados de usuários.
