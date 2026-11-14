# Correção de direção: a mesma Bíblia Conectada no iPhone

Decisão de continuidade em 31/10/2026, após Alex mostrar o menu nativo “Seu caminho de leitura” e perguntar por que só havia funções de leitura e por que a home estava diferente.

## O que foi esclarecido

O leitor offline era a primeira etapa técnica, não uma redução do produto. O handoff anterior priorizou essa etapa, propôs uma navegação pequena e omitiu um módulo explícito de Início/Descobrir. Esta orientação corrige essa ambiguidade e prevalece sobre propostas anteriores de uma home centrada somente em leitura.

O objetivo é preservar a experiência e as capacidades da Bíblia Conectada, adaptadas ao iPhone. SwiftUI, gestos, materiais e leitura offline devem melhorar essa experiência. Não substituir a home de descoberta por uma biblioteca genérica ou transformar o menu global em um menu exclusivo do leitor.

Evidência desta revisão: a home pública respondeu HTTP 200 e seu HTML contém “Tudo se conecta”, Céu em 3D, Mapa de Jesus, Cronologia, Interlinear, No seu coração, Liturgia diária e Minha jornada. O branch remoto `codex/ios-native-app` ainda estava em `07425ea`, sem código em `apps/ios/`. O print comprova o menu exibido; não permite auditar a home fechada ou atribuir a implementação local do Mac. Não afirmar que o binário foi corrigido por atualizar este documento.

## Início / Descobrir

Implementar um módulo `DiscoverHome` explícito, acessível como Início em qualquer área. Em uma instalação nova, ele é a entrada do produto; “Continuar leitura” é uma ação destacada. Restaurar uma sessão de leitura já aberta pode continuar funcionando, desde que Início permaneça acessível.

Preservar a composição e os papéis da home publicada: “Uma história. Tudo se conecta.”, descoberta por passagem ou palavra, céu/constelação de conexões, continuar/começar leitura, No seu coração, mapas, cronologia, liturgia do dia, Jornada e Como funciona. Referências: `site/src/app/page.tsx`, seus componentes e `design/README.md`. Ajustar hierarquia e densidade ao dispositivo, sem exigir uma cópia pixel a pixel da página longa.

Manter a marca, tipografia e hierarquia editorial. Bordô e ouro nos controles e entorno; céu em fundo neutro com luz, estrelas e cores discretas. Respeitar Dia/Noite, contraste e movimento reduzido. Visualização baseada em relações reais; imagem ou captura não substitui interação funcional. Preservar texto, fontes e licenças.

## Menu global completo

Usar o botão central inferior e painel flutuante de vidro como direção, com área segura, rótulos claros, categorias, rolagem e fechamento acessível. O menu do leitor pode coexistir como ação contextual, mas não substitui o menu global. O título global pode ser “Explore a Bíblia Conectada”.

O catálogo de referência é `site/src/components/shell/nav.ts`, não uma lista abreviada escrita separadamente. Manter um registro de destinos nativos com cobertura explícita de cada entrada. Agrupar atalhos equivalentes é permitido; não eliminar a capacidade correspondente. Organizar as famílias abaixo sem transformar tudo em uma fileira de pequenas abas.

| Família | Capacidades/destinos que precisam ser preservados |
| --- | --- |
| Início e orientação | Início, Como funciona; Descobertas da home |
| Ler e estudar | Ler a Bíblia, seleção Open NBV, Liturgia diária (Hoje), Interlinear, No seu coração, Estudar com IA |
| Explorar | Buscar, Constelação, Céu em 3D, Arcos em 2D, Mapa de Jesus, Cronologia, Linha do tempo, Temas, Palavras, Ler lado a lado |
| Minha jornada | Minha jornada/pontos, Ponte, Trilhas, Mesa, Salvos |
| Sobre e preferências | Dados e fontes, Sobre e créditos, aparência, fontes e privacidade |

“Instalar no celular” é uma ação específica da web: no app instalado, registrar sua adaptação para “Sobre o app”, versão/ajuda e compartilhamento do link público, sem ensinar a instalar um atalho Safari dentro do app nativo. Biblioteca pode agrupar Salvos e preferências, mantendo acessos compreensíveis. O modo “À luz de Jesus” pertence a No seu coração e também precisa ser preservado.

## Continuação na sessão Mac

1. Preservar o trabalho local; fazer `git fetch origin`, revisar este documento no remoto e integrar as mudanças sem `reset --hard`. Não reinstalar nem recriar o app só para receber a orientação.
2. Inventariar código, rotas e telas reais do build atual. Criar uma matriz por destino do catálogo web: equivalente nativo, situação real, dependências e prova. Distinguir nativo, integração web restrita, indisponível offline e ainda não implementado.
3. Reorganizar o shell, a home e o menu global usando o código já funcional. Não alterar o site para que ele se pareça com a versão nativa reduzida.
4. Implementar os módulos ausentes por etapas funcionais, até cobrir o produto. Não preencher o menu com botões sem destino nem considerar que esconder as ausências satisfaz a migração. Builds intermediários devem ser apresentados ao Alex como incompletos, com a matriz de pendências.
5. Preservar a arquitetura de segurança: WebKit restrito para Arcos; sessão mobile própria para IA/voz e Jornada; não forjar Origin, expor chaves ou somar pontos locais para acelerar a paridade. As etapas técnicas continuam válidas.

## Aceite da experiência completa

- Capturas e gravação do binário real: home e menu aberto, lado a lado com o site na mesma largura e tema; iPhone pequeno e grande, Dia/Noite. Identificar commit, scheme, Simulator/dispositivo e tamanho. Não usar mockup como evidência.
- Testar cada destino: abrir pelo menu, executar sua função principal, voltar à home/leitura e manter estado. Rótulo visível sozinho não prova funcionalidade.
- Conferir rolagem, área segura, teclado, Dynamic Type, VoiceOver, redução de movimento/transparência e leitura sem sobreposição. Preservar o repouso contextual do menu em Arcos com alternativa acessível.
- Testar modo avião e comunicar honestamente as áreas dependentes de rede; isso não exige tornar IA/3D remoto offline.
- Não declarar a migração completa, equivalente ao site ou pronta para distribuição pública enquanto faltarem famílias da matriz. O TestFlight pode receber uma beta técnica identificada como parcial, sem confundi-la com a entrega final.

A atualização deste handoff não altera nem testa o aplicativo local do Mac. A sessão que possui o código deve implementar e devolver evidências reais antes de afirmar que a correção chegou ao app.
