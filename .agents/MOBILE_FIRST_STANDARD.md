# DIRETIVA GLOBAL ARQUITETURAL: 100% MOBILE FIRST

**Esta diretiva aplica-se a toda a plataforma Profundidade, existente e futura.**

---

## 1. Princípio Fundamental

> **"Como um utilizador faria isto no smartphone?"**
> 
> O Profundidade é concebido **primeiro para smartphone**, desde a arquitetura da interface até aos fluxos de utilização.
> O desktop é uma expansão natural da experiência móvel, e não o contrário.

---

## 2. Não Fazer "Desktop Responsivo"
Não é permitido:
* Reduzir apenas a largura;
* Esconder elementos vitais;
* Diminuir fontes para tamanhos ilegíveis;
* Empilhar colunas automaticamente sem redesenho;
* Forçar tabelas densas com scroll infinito descontrolado no telemóvel.

**Cada interface deve ser desenhada para mobile quando necessário.**

---

## 3. Ergonomia e Padrões Obrigatórios

1. **Alvos de Toque (Touch Targets)**:
   * Todo o botão, link e seletor deve ter dimensões mínimas de **$44 \times 44\text{ px}$**.
   * As ações primárias devem ficar ao alcance natural do polegar.

2. **Prevenção de Zoom no iOS Safari**:
   * Todos os campos `<input>`, `<textarea>` e `<select>` em ecrãs móveis devem ter tamanho de fonte mínimo de **16px** (definido globalmente em `globals.css`).

3. **Margem Inferior de Segurança (Safe Area)**:
   * Todo o contentor de página que possua a barra de navegação móvel (`MobileBottomNav`) deve conter espaçamento inferior seguro:
     `pb-28 md:pb-12`.

4. **Tabelas vs. Cartões**:
   * Em dispositivos móveis (`< 768px`), apresentar dados densos sob a forma de **Cards Tácteis** (`md:hidden`), preservando a tabela detalhada apenas no desktop (`hidden md:block`).

5. **Formulários**:
   * Devem ser guiados em etapas claras (**Passo 1 → Passo 2 → Passo 3 → Confirmar**).
   * Poucos campos por ecrã, com validação imediata e cálculos automáticos sempre que possível.

6. **Operações de Campo & Imagens**:
   * Captura de fotos com câmara nativa, georreferenciação por GPS e carimbo meteorológico.
   * As imagens devem ser comprimidas no cliente com Canvas HTML5 (`compressImageForMobile`) antes do upload para poupar largura de banda 3G/4G em Angola.
   * Rascunhos locais (`saveOfflineDraft`) para tolerância a quebras de rede.

---

## 4. Ordem Absoluta de Desenvolvimento

Ao criar ou modificar qualquer funcionalidade:
1. **Desenha primeiro a experiência mobile.**
2. **Implementa mobile.**
3. **Testa mobile.**
4. **Expande para tablet.**
5. **Expande para desktop.**

*Profundidade = Mobile First por princípio, não apenas por responsividade.*
