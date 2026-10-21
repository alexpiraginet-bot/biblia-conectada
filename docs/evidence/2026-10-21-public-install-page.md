# Instalação pública e ícone do iPhone — 21/10/2026

Alex confirmou que a letra B também aparece ao adicionar um atalho novo no Safari. Portanto, não se trata apenas da aparência de um atalho antigo. A falha física continua válida; não foi reproduzida no Windows.

## Diferença confirmada de acesso

O PNG180 atual, no domínio principal `alexpiraginet-bot-biblia-conectada.vercel.app`, responde HTTP200 `image/png` sem autenticação. O mesmo caminho nos aliases `alexpiraginet-bot-biblia-conectada-lexprojects.vercel.app` e `alexpiraginet-bot-biblia-conectada-git-main-lexprojects.vercel.app` responde HTTP302 para autenticação quando consultado anonimamente. O projeto tem SSO de previews ativo. Não sabemos qual endereço completo estava aberto no aparelho; esta diferença não prova a causa do relato.

O código público do [IconLoader do WebKit](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/loader/icon/IconLoader.cpp) omite credenciais ao buscar ícones. Isso justifica garantir uma origem pública para a instalação, mas não demonstra que esse carregador seja exatamente o fluxo nativo da versão de iOS de Alex. A consulta de configuração do firewall retornou `404 Seawall Config not found`; isso não prova ausência de todas as proteções da plataforma. Nenhuma proteção foi alterada.

## Mudança

- `/instalar` é um documento HTML completo e prerenderizado por um Route Handler puro. Não participa do layout React nem carrega bundles de cliente. A identidade de instalação está no início do head.
- A mesma imagem PNG180 declarada para Apple aparece no corpo. A mensagem indica somente o carregamento da imagem; não afirma que o Safari já aceitou o ícone ou que o app foi instalado. Há erro e recarregamento se a imagem falhar; as instruções funcionam sem JavaScript.
- Os links do aviso de instalação, rodapé e Sobre apontam explicitamente para o domínio principal público. A navegação é documental, evitando permanecer em um alias de prévia protegido.
- Nome, arte e caminhos dos ícones, manifesto, `id`, `start_url` e dados locais do aplicativo são preservados. O manifesto continua iniciando a Bíblia em `/`, não nas instruções.
- O documento usa os tokens de cor e tema existentes. CSS e dois scripts pequenos são inline para permitir a experiência sem o shell; não há dependência nova, coleta, chamada de IA ou fonte remota. Créditos vêm das fontes de dados existentes.

O parecer local `gemma4:12b-it-qat` sugeriu verificar identidade e erro de carregamento; esses pontos foram incorporados à validação. Suas afirmações genéricas de garantia de compatibilidade e disparo automático da instalação não foram aceitas: a instalação continua manual no Safari.

## Validação

Testes de integração do documento, política de instalação e rotas: 76 aprovados. Build completo, auditoria de UI/UX/performance e conferência de publicação registrados ao concluir a rodada.

Artefatos: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/icon-install/`; investigação anterior de HTTP e decodificação em `icon-direct-followup/`.

## Limite e próximo teste físico

Abrir `/instalar` no domínio principal pelo Safari, conferir a imagem dourada no corpo e então a prévia de Compartilhar → Adicionar à Tela de Início. Não é preciso apagar dados nem excluir um atalho para conferir essa prévia. Somente o aparelho pode confirmar que a letra B deixou de aparecer.
