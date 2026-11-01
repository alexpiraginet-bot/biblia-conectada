# Segurança do painel — 01/11/2026

## Como usar

1. Abra `https://www.bibliaconectada.company/admin` e entre com a senha atual.
2. **Manter conectado por 30 dias** vem marcado. Desmarcado, a sessão dura até oito horas. Não há renovação silenciosa ilimitada; a validade aparece em Segurança.
3. Em **Segurança → Alterar senha**, informe a senha atual e repita a nova, de 16 a 128 caracteres. Uma frase longa é válida. A troca mantém este navegador conectado e encerra todas as outras sessões.
4. Em **Face ID e chaves de acesso**, nomeie o aparelho, confirme a senha atual e toque em **Cadastrar chave de acesso**. O sistema oferece a biometria ou o código de desbloqueio disponível. Depois, na tela de login, use **Entrar com Face ID / biometria**.
5. **Sair** revoga a sessão no servidor. Remover uma chave exige a senha atual e também encerra os outros acessos. A senha continua sendo alternativa caso o aparelho seja perdido.

O Safari/navegador decide quando oferecer salvar ou atualizar a senha; os campos têm `username`, `current-password` e `new-password` apropriados. O site não consegue forçar o aviso do gerenciador. No iPhone, conferir o app Senhas e o preenchimento automático. Chaves podem ser sincronizadas pelo gerenciador do sistema; uma chave cadastrada não equivale necessariamente a um único dispositivo físico. Biometria nunca é enviada ao servidor.

## Implementação

- `runtime.ts`: configuração, origem, corpos limitados, cookies e rate limit com IP opaco e temporário. Nenhum dado de acesso administrativo entra nas métricas dos leitores.
- `admin-security.ts`: credencial persistida, scrypt assíncrono N=32768/r=8/p=3, salt aleatório de 16 bytes e derivação de 64 bytes; comparação constante. A senha aleatória inicial só usa SHA-256 enquanto não houver troca. Após a troca, o bootstrap não é um caminho alternativo.
- Sessões v2: nonce aleatório de 256 bits assinado, chave Redis derivada do hash do token, expiração absoluta e revisão da credencial. Sessões antigas v1 exigem novo login após esta atualização; a senha atual continua válida.
- Troca/remoção usam CAS Lua: credencial, revisão e nova sessão são gravadas juntas. Requisição antiga não sobrescreve mudança nova. Operações que dependem de uma sessão conferem novamente a existência dela na transação, para não desfazer um logout concorrente.
- `admin-passkeys.ts`: SimpleWebAuthn server 14.0.3/browser 14.0.0, atestado `none`, autenticação de usuário obrigatória, chave residente e autenticador da plataforma no cadastro. RP `bibliaconectada.company`, origem exata `https://www.bibliaconectada.company`. Prévias usam somente o próprio `VERCEL_URL`; não recebem a autorização do domínio de produção.
- Desafio aleatório de uso único, TTL de cinco minutos, cookie próprio HttpOnly, cadastro vinculado à sessão e à senha atual. Origem, RP, assinatura, user handle, revisão e contador são verificados. Máximo cinco chaves; o servidor guarda apenas chave pública, contador, nome e metadados de backup, nunca segredo biométrico.
- O módulo do navegador é carregado por import dinâmico apenas nas telas do painel. O pacote de servidor não entra no cliente nem no fluxo público de leitura.
- Indisponibilidade ou corrupção do banco falham de forma fechada, sem recriar acesso automaticamente. Os nomes das chaves são renderizados como texto pelo React.

## Operação e recuperação

`AUDIENCE_ADMIN_PASSWORD_HASH`, KV e segredo de assinatura permanecem privados no ambiente. A credencial vive em `bc:{audience}:production:admin:credential`; sessões e desafios usam sufixos distintos e TTL. Não excluir essa credencial como limpeza de rotina: ela contém o hash escolhido e as chaves públicas do administrador. Não expor endpoint de reset público.

Mudança do hash inicial de ambiente **não** substitui silenciosamente uma senha já salva: a divergência trava o acesso. Para recuperação excepcional, confirmar o pedido do titular, guardar um backup privado do registro, definir um novo bootstrap aleatório no ambiente e recriar somente a credencial administrativa do ambiente certo, com nova revisão. Rotação do segredo/novo bootstrap revoga os cookies existentes; chaves de acesso precisam de avaliação e recadastro conforme a recuperação. Nunca apagar namespaces da Jornada ou da audiência como parte de um reset de senha. O procedimento de recuperação não foi executado nesta entrega.

## Evidências e limites

- Testes de senha incorreta, revogação, expiração, races, logout durante alteração, corrupção do armazenamento, limite de tentativas e isolamento.
- WebAuthn com assinatura ES256 real: cadastro/autenticação, UV, RP/origem/challenge incorretos, assinatura inválida, contador regressivo, user handle incorreto, replay, mudança de senha durante confirmação e remoção.
- Fluxo de UI executado em Chromium com autenticador virtual e funções reais do backend, sobre Redis simulado: cadastro, login biométrico, recarga mantendo sessão, troca, recusa da senha antiga e duração 30 dias/oito horas. Isto não substitui o teste físico de Face ID no iPhone.
- Integrações reais de Redis são opt-in `AUDIENCE_INTEGRATION=1`, executadas somente no build de prévia em namespaces aleatórios `admin-qa`/`audience-qa`; removem apenas as próprias chaves ao final. Nenhuma senha ou chave de acesso de produção é alterada pelos testes.
- Build, revisão visual, orçamento e prova de publicação devem ser consultados no registro de entrega; este documento descreve o fluxo e não é, sozinho, prova de publicação.

Referências: [SimpleWebAuthn servidor](https://simplewebauthn.dev/docs/packages/server), [navegador](https://simplewebauthn.dev/docs/packages/browser), [Apple Passkeys](https://developer.apple.com/passkeys/), [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
