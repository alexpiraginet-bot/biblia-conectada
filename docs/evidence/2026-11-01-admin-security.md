# Painel: senha, biometria e sessão — 01/11/2026

Base: `7b3610632d05f572c88bec80bee9e41880733e2a`, branch `codex/admin-security`.

Pedido: permitir trocar e salvar a senha, usar Face ID e manter conectado. [Fluxo, arquitetura e recuperação](../SEGURANCA-DO-PAINEL.md).

## Verificação local

- Suíte completa: 73 arquivos, 1.138 testes aprovados; duas integrações reais condicionais ainda separadas do teste local.
- 37 casos aprovados nas suítes de audiência/autenticação: hash com salt, confirmação da senha atual, revogação, expiração, CAS concorrente, logout durante mutação, corrupção, limite de tentativas e WebAuthn real com assinatura ES256. Nenhuma chamada ao banco de produção.
- Chromium com autenticador virtual e funções reais do backend, Redis de teste: cadastro, saída, entrada por chave, recarga mantendo sessão, troca de senha, recusa da anterior e períodos de 30 dias/oito horas aprovados. Nenhuma senha em localStorage. Não é ensaio de Face ID físico.
- UI/UX: 375 e 1440 px, Dia/Noite; quatro combinações aprovadas. Sem overflow, alvos de pelo menos 44 px, contraste mínimo observado 6,97:1 Dia e 8,01:1 Noite. Foco afastado do Menu flutuante; mensagem de erro/sucesso acessível.
- Revisão independente de performance/segurança encontrou um bloqueio ao voltar para a rota preservada pelo Next Activity durante operação. Corrigido com aborto, identidade/geração e restauração dos controles. Reteste quatro cenários aprovado: login, troca, logout e 401 antigo. As APIs desses ensaios visuais foram interceptadas.
- ESLint e TypeScript sem erro/aviso no código alterado. Pacote WebAuthn do navegador sob demanda apenas no painel; pacote de servidor restrito às rotas de autenticação.

Evidências completas ficam na pasta privada de trabalho `admin-security-20261101`: `browser-report.json`, `ui/report.json`, capturas e logs. A revisão local Ollama foi usada como crítica auxiliar; as conclusões vêm dos testes e da inspeção, não da resposta do modelo.

## Portões de publicação

O build completo, orçamento de JS, integração Redis no build de prévia e estado READY precisam ser conferidos antes de promover. `AUDIENCE_INTEGRATION=1` somente em Preview, com chaves aleatórias isoladas e limpeza. Remover a variável após o ensaio. Não adicionar endpoint de teste/reset na produção.

Na produção, conferir `/admin` e `/api/admin/security`, login com a senha atual, sessão de 30 dias e revogação no logout. Não trocar a senha escolhida pelo titular nem cadastrar passkey de QA. Face ID físico e a oferta de salvar senha dependem do iPhone/gerenciador do usuário.
